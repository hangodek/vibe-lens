import type { ParsedSymbol, CodeEvent } from '../types/ast';
import type { LanguageAdapter, AdapterFileContext, AdapterResult } from './types';
import { maskLines, findClosingBrace, findCallSites, splitParams, symbolId } from './braceUtils';

/**
 * Generic fallback adapter for any language without a dedicated grammar
 * (Ruby, Java, Rust, Elixir, C/C++, Swift, Kotlin, PHP, Zig, etc.).
 *
 * Supports three universal grammar families:
 *   1. Brace-delimited functions/methods: `[modifiers] [type] name(params) [throws/returns] {`
 *   2. Ruby-style defs: `def name[(params)] ... end`
 *   3. Elixir-style defs: `def[p] name[(params)] do ... end`
 *
 * All symbols are flagged `confidence: 'low'` so the UI can badge them.
 */
export const genericAdapter: LanguageAdapter = {
  id: 'generic',
  extensions: [],

  parse(ctx: AdapterFileContext): AdapterResult {
    const { fileId, lines } = ctx;
    const masked = maskLines(lines);
    const functions: ParsedSymbol[] = [];
    const events: CodeEvent[] = [];
    const usedIds = new Set<string>();

    // 1. Brace languages: Java, C#, C/C++, Rust (fn), Zig (fn ... RetType {), Swift (func), Kotlin (fun), PHP
    const braceDefRe = /^[ \t]*(?:(?:public|private|protected|static|final|native|synchronized|abstract|default|async|pub|fn|fun|func)\s+)*(?:[\w<>\[\],?*&]+\s+)?([A-Za-z_][\w:]*)\s*\(([^;{}]*?)\)\s*(?:throws\s+[\w,\s]+)?(?:->\s*[^;{]+)?(?:[!A-Za-z_][\w<>\[\],?*&!.]*\s+)?\{/;

    // 2. Ruby: `def name[(params)]`
    const rubyDefRe = /^[ \t]*def\s+(?:self\.)?([A-Za-z_][\w!?=]*)\s*(?:\(([^)]*)\))?\s*$/;

    // 3. Elixir / Erlang-like: `def[p] name[(params)] do`
    const elixirDefRe = /^[ \t]*(?:def|defp)\s+([A-Za-z_][\w!?]*)\s*(?:\(([^)]*)\))?\s+do\s*$/;

    const SKIP_NAMES = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'else', 'do', 'try', 'finally', 'match', 'loop']);

    for (let i = 0; i < lines.length; i++) {
      const lineMasked = masked[i];
      const rawLine = lines[i];

      // A. Brace match
      let bm = braceDefRe.exec(lineMasked);
      if (bm) {
        const name = bm[1].split(':').pop() ?? '';
        if (name && name.length >= 2 && !SKIP_NAMES.has(name)) {
          const end0 = findClosingBrace(masked, i);
          const endLine1 = end0 >= 0 ? end0 + 1 : Math.min(lines.length, i + 30);
          const bodyLines = lines.slice(i, endLine1);
          const calls = findCallSites(masked.slice(i, endLine1), i + 1);
          functions.push({
            id: symbolId(fileId, name, usedIds),
            fileId,
            kind: 'function',
            name,
            signature: rawLine.trim().slice(0, 160),
            params: splitParams(bm[2] ?? ''),
            startLine: i + 1,
            endLine: endLine1,
            body: bodyLines.join('\n'),
            calls,
            calledBy: [],
            confidence: 'low',
          });
          continue;
        }
      }

      // B. Ruby `def ... end`
      let rm = rubyDefRe.exec(rawLine);
      if (rm) {
        const name = rm[1];
        if (name && !SKIP_NAMES.has(name)) {
          // Find matching `end` by tracking block depth (def/class/module/do/if/case/begin)
          const baseIndent = (rawLine.match(/^[ \t]*/) ?? [''])[0].length;
          let endLine1 = Math.min(lines.length, i + 40);
          for (let j = i + 1; j < lines.length && j <= i + 150; j++) {
            const trimmed = lines[j].trim();
            const ind = (lines[j].match(/^[ \t]*/) ?? [''])[0].length;
            if (trimmed === 'end' && ind <= baseIndent) {
              endLine1 = j + 1;
              break;
            }
          }
          const bodyLines = lines.slice(i, endLine1);
          const calls = findCallSites(masked.slice(i, endLine1), i + 1);
          functions.push({
            id: symbolId(fileId, name, usedIds),
            fileId,
            kind: 'function',
            name,
            signature: rawLine.trim().slice(0, 160),
            params: splitParams(rm[2] ?? ''),
            startLine: i + 1,
            endLine: endLine1,
            body: bodyLines.join('\n'),
            calls,
            calledBy: [],
            confidence: 'low',
          });
          continue;
        }
      }

      // C. Elixir `def ... do ... end`
      let em = elixirDefRe.exec(rawLine);
      if (em) {
        const name = em[1];
        if (name && !SKIP_NAMES.has(name)) {
          const baseIndent = (rawLine.match(/^[ \t]*/) ?? [''])[0].length;
          let endLine1 = Math.min(lines.length, i + 40);
          for (let j = i + 1; j < lines.length && j <= i + 150; j++) {
            const trimmed = lines[j].trim();
            const ind = (lines[j].match(/^[ \t]*/) ?? [''])[0].length;
            if (trimmed === 'end' && ind <= baseIndent) {
              endLine1 = j + 1;
              break;
            }
          }
          const bodyLines = lines.slice(i, endLine1);
          const calls = findCallSites(masked.slice(i, endLine1), i + 1);
          functions.push({
            id: symbolId(fileId, name, usedIds),
            fileId,
            kind: 'function',
            name,
            signature: rawLine.trim().slice(0, 160),
            params: splitParams(em[2] ?? ''),
            startLine: i + 1,
            endLine: endLine1,
            body: bodyLines.join('\n'),
            calls,
            calledBy: [],
            confidence: 'low',
          });
          continue;
        }
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

    return { functions, events, confidence: 'low' };
  },
};
