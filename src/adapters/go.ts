import type { ParsedSymbol, CodeEvent } from '../types/ast';
import type { LanguageAdapter, AdapterFileContext, AdapterResult } from './types';
import { maskLines, findClosingBrace, findCallSites, splitParams, symbolId } from './braceUtils';

export const goAdapter: LanguageAdapter = {
  id: 'go',
  extensions: ['.go'],

  parse(ctx: AdapterFileContext): AdapterResult {
    const { fileId, lines } = ctx;
    const masked = maskLines(lines);
    const functions: ParsedSymbol[] = [];
    const events: CodeEvent[] = [];
    const usedIds = new Set<string>();

    // func [receiver] Name(params) [returns] {
    const funcRe = /^\s*func\s+(?:\(\s*(\w+)\s+([^)]+)\)\s+)?([A-Za-z_][\w]*)\s*\(([^)]*)\)/;
    // mux.HandleFunc("METHOD /path", h.Login) / Handle("/path", h)
    const muxRe = /(HandleFunc|Handle)\(\s*"((?:GET|POST|PUT|DELETE|PATCH)\s+)?([^"]*)"\s*,\s*([^,)]+)/;
    // r.GET("/path", h.Login) style (gin/echo/chi)
    const verbRe = /\.(Get|Post|Put|Delete|Patch|Handle|Use)\(\s*"([^"]*)"\s*,?\s*([^,)]*)/;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const m = masked[i];

      const fm = funcRe.exec(m);
      if (fm) {
        const receiver = fm[1] ? `(${fm[1]} ${fm[2]}) ` : '';
        const name = fm[3];
        if (name === 'init' || name === 'main' || /^[A-Za-z_]/.test(name)) {
          const params = splitParams(fm[4] ?? '').filter((p) => p !== fm[1]);
          const end0 = findClosingBrace(masked, i);
          const endLine1 = end0 >= 0 ? end0 + 1 : Math.min(lines.length, i + 13);
          const bodyLines = lines.slice(i, endLine1);
          const maskedBody = masked.slice(i, endLine1);
          const calls = findCallSites(maskedBody, i + 1);
          for (const c of calls) {
            const rawLine = lines[c.line - 1] ?? '';
            const argMatch = rawLine.match(new RegExp(`${escapeRe(c.baseName)}\\s*\\(([^)]{0,140})\\)`));
            if (argMatch) c.args = argMatch[1].trim();
          }
          functions.push({
            id: symbolId(fileId, name, usedIds),
            fileId,
            kind: fm[1] ? 'method' : name === 'main' ? 'entrypoint' : 'function',
            name,
            signature: `func ${receiver}${name}(${fm[4] ?? ''})`.slice(0, 180),
            params,
            startLine: i + 1,
            endLine: endLine1,
            body: bodyLines.join('\n'),
            calls,
            calledBy: [],
            confidence: 'high',
          });
        }
      }

      const mm = muxRe.exec(raw);
      if (mm) {
        const method = (mm[2] ?? 'GET').trim() || 'GET';
        const route = mm[3];
        const handler = mm[4].trim().replace(/^&/, '').slice(0, 80);
        events.push({
          name: `${method} ${route}`,
          source: mm[1],
          handler,
          line: i + 1,
        });
        continue;
      }
      const vm = verbRe.exec(m);
      if (vm && /["']\//.test(raw)) {
        const method = vm[1].toUpperCase();
        if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
          events.push({
            name: `${method} ${vm[2]}`,
            source: `router.${vm[1]}`,
            handler: (vm[3] ?? '').trim().slice(0, 80),
            line: i + 1,
          });
        }
      }
    }

    // calledBy backlinks (base-name match covers h.Login / s.repo.X via baseName)
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
