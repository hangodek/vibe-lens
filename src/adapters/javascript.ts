import type { ParsedSymbol, CodeEvent } from '../types/ast';
import type { LanguageAdapter, AdapterFileContext, AdapterResult } from './types';
import { maskLines, findClosingBrace, findCallSites, splitParams, symbolId } from './braceUtils';

interface PendingDecl {
  kind: ParsedSymbol['kind'];
  name: string;
  signature: string;
  params: string[];
  startLine1: number; // 1-indexed def line
  bodyOpenLine0: number; // 0-indexed line containing the opening `{`
}

export const javascriptAdapter: LanguageAdapter = {
  id: 'javascript',
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],

  parse(ctx: AdapterFileContext): AdapterResult {
    const { fileId, lines } = ctx;
    const masked = maskLines(lines);
    const functions: ParsedSymbol[] = [];
    const events: CodeEvent[] = [];
    const usedIds = new Set<string>();

    const decls: PendingDecl[] = [];

    const pushDecl = (d: PendingDecl) => {
      // Avoid duplicates from overlapping patterns (e.g. `export function` also
      // matching a bare `function` alternative in a second pass — we run one pass).
      if (decls.some((x) => x.name === d.name && x.startLine1 === d.startLine1)) return;
      decls.push(d);
    };

    const funcDeclRe = /^\s*(?:export\s+default\s+)?(?:export\s+)?(?:async\s+)?function\s*(\*?)\s*([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/;
    const arrowRe = /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/;
    const arrowSingleRe = /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?([A-Za-z_$][\w$]*)\s*=>/;
    const funcExprRe = /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function\s*\*?\s*\(([^)]*)\)/;
    const methodRe = /^\s*(?:static\s+)?(?:async\s+)?(?:get\s+|set\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/;
    const listenerRe = /([\w$.[\]"'\s]+?)\.addEventListener\s*\(\s*["'`]([^"'`]+)["'`]\s*,\s*([^,)]+)/;
    const onAssignRe = /([\w$.[\]"'\s]+?)\.(on\w+)\s*=\s*function/;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const m = masked[i];

      let dm: RegExpExecArray | null;
      if ((dm = funcDeclRe.exec(m)) !== null) {
        const name = dm[2];
        const params = splitParams(dm[3] ?? '');
        pushDecl({
          kind: 'function',
          name,
          signature: raw.trim().slice(0, 160),
          params,
          startLine1: i + 1,
          bodyOpenLine0: i,
        });
        continue;
      }
      if ((dm = arrowRe.exec(m)) !== null) {
        const name = dm[1];
        const params = splitParams(dm[2] ?? '');
        pushDecl({
          kind: 'function',
          name,
          signature: raw.trim().slice(0, 160),
          params,
          startLine1: i + 1,
          bodyOpenLine0: i,
        });
        continue;
      }
      if ((dm = arrowSingleRe.exec(m)) !== null) {
        const name = dm[1];
        pushDecl({
          kind: 'function',
          name,
          signature: raw.trim().slice(0, 160),
          params: [dm[2]],
          startLine1: i + 1,
          bodyOpenLine0: i,
        });
        continue;
      }
      // `const name = function (...)` / `= async function* (...)`: same shape
      // as an arrow, brace body resolved in the materialize pass.
      if ((dm = funcExprRe.exec(m)) !== null) {
        const name = dm[1];
        pushDecl({
          kind: 'function',
          name,
          signature: raw.trim().slice(0, 160),
          params: splitParams(dm[2] ?? ''),
          startLine1: i + 1,
          bodyOpenLine0: i,
        });
        continue;
      }
      // Class/object methods: only inside a class/object context would be ideal;
      // accept conservatively (name + parens + trailing brace).
      if ((dm = methodRe.exec(m)) !== null) {
        const name = dm[1];
        if (!['if', 'for', 'while', 'switch', 'catch'].includes(name)) {
          pushDecl({
            kind: 'method',
            name,
            signature: raw.trim().slice(0, 160),
            params: splitParams(dm[2] ?? ''),
            startLine1: i + 1,
            bodyOpenLine0: i,
          });
          continue;
        }
      }
      // DOM listeners: run on the RAW line — the masked line has string
      // contents (incl. the event name) blanked out.
      const lm = listenerRe.exec(raw);
      if (lm) {
        const eventName = lm[2];
        const receiver = lm[1].trim().slice(0, 60);
        const handlerRaw = lm[3].trim();
        // Arrow callbacks: resolve the first in-file function call inside them
        let handler = handlerRaw.slice(0, 60);
        const direct = handlerRaw.match(/^([A-Za-z_$][\w$]*)/);
        if (direct && !['e', 'ev', 'evt', 'event'].includes(direct[1])) {
          handler = direct[1];
        } else {
          // Look ahead up to 6 lines for the first call that is not the
          // addEventListener itself
          const ahead = masked.slice(i, Math.min(masked.length, i + 7)).join('\n');
          const inner = [...ahead.matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)]
            .map((x) => x[1])
            .filter((n) => n !== 'addEventListener' && !['e', 'ev', 'evt', 'event'].includes(n));
          if (inner.length > 0) handler = inner[0];
        }
        const targetMatch = raw.match(/(getElementById\(["'`]([^"'`]+)["'`]\)|querySelector(All)?\(["'`]([^"'`]+)["'`]\))/);
        events.push({
          name: eventName,
          source: 'addEventListener',
          handler,
          line: i + 1,
          target: targetMatch ? targetMatch[2] ?? targetMatch[4] : receiver || undefined,
        });
        continue;
      }
      const om = onAssignRe.exec(m);
      if (om) {
        events.push({
          name: om[2],
          source: 'property-assignment',
          handler: `function@${i + 1}`,
          line: i + 1,
          target: om[1].trim().slice(0, 60),
        });
      }
    }

    // Materialize symbols with brace-matched bodies
    for (const d of decls) {
      const defMasked = masked[d.bodyOpenLine0] ?? '';
      let endLine1: number;
      if (!defMasked.includes('{')) {
        // Single-expression arrow (`() => fetch(x)`): the body is the def
        // line itself. When the arrow dangles (`=>` with nothing after),
        // absorb up to 2 following non-blank continuation lines.
        let end0 = d.bodyOpenLine0;
        if (/=>\s*$/.test(defMasked)) {
          for (let k = 1; k <= 2 && d.bodyOpenLine0 + k < masked.length; k++) {
            if ((masked[d.bodyOpenLine0 + k] ?? '').trim() === '') break;
            end0 = d.bodyOpenLine0 + k;
          }
        }
        endLine1 = end0 + 1;
      } else {
        const end0 = findClosingBrace(masked, d.bodyOpenLine0);
        endLine1 = end0 >= 0 ? end0 + 1 : Math.min(lines.length, d.startLine1 + 12);
      }
      const bodyLines = lines.slice(d.startLine1 - 1, endLine1);
      const maskedBody = masked.slice(d.startLine1 - 1, endLine1);
      const calls = findCallSites(maskedBody, d.startLine1);
      // Enrich args from raw lines where the call was found
      for (const c of calls) {
        const rawLine = lines[c.line - 1] ?? '';
        const argMatch = rawLine.match(new RegExp(`${escapeRe(c.baseName)}\\s*\\(([^)]{0,120})\\)`));
        if (argMatch) c.args = argMatch[1].trim();
      }
      functions.push({
        id: symbolId(fileId, d.name, usedIds),
        fileId,
        kind: d.kind,
        name: d.name,
        signature: d.signature,
        params: d.params,
        startLine: d.startLine1,
        endLine: endLine1,
        body: bodyLines.join('\n'),
        calls,
        calledBy: [],
        confidence: 'high',
      });
    }

    // calledBy backlinks
    const byName = new Map<string, ParsedSymbol[]>();
    for (const f of functions) {
      if (!byName.has(f.name)) byName.set(f.name, []);
      byName.get(f.name)!.push(f);
    }
    for (const f of functions) {
      for (const c of f.calls) {
        const targets = byName.get(c.baseName);
        if (targets) {
          for (const t of targets) {
            if (t.id !== f.id && !t.calledBy.includes(f.name)) t.calledBy.push(f.name);
          }
        }
      }
    }

    return { functions, events, confidence: 'high' };
  },
};

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
