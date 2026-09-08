import type { ParsedSymbol, CodeEvent } from '../types/ast';
import type { LanguageAdapter, AdapterFileContext, AdapterResult } from './types';
import { maskLines, findIndentEnd, findCallSites, splitParams, symbolId } from './braceUtils';

// Python decorators that declare routes/listeners, mapped to event sources
const DECORATOR_RE =
  /^\s*@\s*(app|router|blueprint|api|bp)(?:\.(route|get|post|put|delete|patch))?\s*\(\s*["']([^"'"]+)["']/;
const SIGNAL_RE = /^\s*([A-Za-z_][\w.]*)\.(connect|receiver)\s*\(/;
const DEF_RE = /^(\s*)(?:async\s+)?def\s+([A-Za-z_][\w]*)\s*\(([^)]*)\)\s*(?:->\s*[^:]+)?\s*:/;
const CLASS_RE = /^(\s*)class\s+([A-Za-z_][\w]*)\s*(?:\(([^)]*)\))?\s*:/;

export const pythonAdapter: LanguageAdapter = {
  id: 'python',
  extensions: ['.py'],

  parse(ctx: AdapterFileContext): AdapterResult {
    const { fileId, lines } = ctx;
    const masked = maskLines(lines);
    const functions: ParsedSymbol[] = [];
    const events: CodeEvent[] = [];
    const usedIds = new Set<string>();

    // Track class context for method kind
    const classStack: { name: string; indent: number }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const m = masked[i];

      const cm = CLASS_RE.exec(m);
      if (cm) {
        const indent = cm[1].length;
        while (classStack.length > 0 && classStack[classStack.length - 1].indent >= indent) {
          classStack.pop();
        }
        classStack.push({ name: cm[2], indent });
        continue;
      }

      const dm = DEF_RE.exec(m);
      if (dm) {
        const indent = dm[1].length;
        while (classStack.length > 0 && classStack[classStack.length - 1].indent >= indent) {
          classStack.pop();
        }
        const name = dm[2];
        let params = splitParams(dm[3] ?? '');
        // Drop self/cls first param for methods
        if (classStack.length > 0 && (params[0] === 'self' || params[0] === 'cls')) {
          params = params.slice(1);
        }
        const end0 = findIndentEnd(lines, i);
        const endLine1 = end0 + 1;
        const bodyLines = lines.slice(i, endLine1);
        const maskedBody = masked.slice(i, endLine1);
        const calls = findCallSites(maskedBody, i + 1);
        for (const c of calls) {
          const rawLine = lines[c.line - 1] ?? '';
          const argMatch = rawLine.match(new RegExp(`${escapeRe(c.baseName)}\\s*\\(([^)]{0,140})\\)`));
          if (argMatch) c.args = argMatch[1].trim();
        }
        // Decorator directly above becomes a route/listener event
        const decoLine = lines[i - 1] ?? '';
        const deco = DECORATOR_RE.exec(decoLine);
        if (deco) {
          events.push({
            name: deco[3],
            source: `decorator:${deco[1]}${deco[2] ? '.' + deco[2] : ''}`,
            handler: name,
            line: i - 1 + 1,
          });
        }
        functions.push({
          id: symbolId(fileId, name, usedIds),
          fileId,
          kind: classStack.length > 0 ? 'method' : name === 'main' ? 'entrypoint' : 'function',
          name,
          signature: raw.trim().slice(0, 180),
          params,
          startLine: i + 1,
          endLine: endLine1,
          body: bodyLines.join('\n'),
          calls,
          calledBy: [],
          confidence: 'high',
        });
        continue;
      }

      const sm = SIGNAL_RE.exec(m);
      if (sm) {
        events.push({
          name: sm[2],
          source: `signal:${sm[1]}`,
          handler: raw.slice(0, 80),
          line: i + 1,
        });
      }
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
