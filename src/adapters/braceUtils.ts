import type { SymbolCallSite } from '../types/ast';

export interface LineInfo {
  /** Masked line: strings, template literals, line comments replaced with spaces (1:1 columns preserved) */
  masked: string;
}

/**
 * Mask string literals, template literals and line comments so brace matching
 * and call detection never fire inside strings/comments. Block comments are
 * tracked across lines via the returned inBlock state.
 */
export function maskLine(line: string, inBlock: boolean): { masked: string; inBlock: boolean } {
  let out = '';
  let i = 0;
  let quote: string | null = null;
  while (i < line.length) {
    const ch = line[i];
    const next = line[i + 1] ?? '';
    if (inBlock) {
      if (ch === '*' && next === '/') {
        inBlock = false;
        out += '  ';
        i += 2;
        continue;
      }
      out += ch === '\t' ? '\t' : ' ';
      i++;
      continue;
    }
    if (quote) {
      if (ch === '\\') {
        out += '  ';
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      out += ch === '\t' ? '\t' : ' ';
      i++;
      continue;
    }
    if (ch === '/' && next === '/') {
      out += ' '.repeat(line.length - i);
      break;
    }
    if (ch === '/' && next === '*') {
      inBlock = true;
      out += '  ';
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      out += ' ';
      i++;
      continue;
    }
    out += ch;
    i++;
  }
  return { masked: out, inBlock };
}

export function maskLines(lines: string[]): string[] {
  let inBlock = false;
  return lines.map((line) => {
    const r = maskLine(line, inBlock);
    inBlock = r.inBlock;
    return r.masked;
  });
}

export function countChar(s: string, ch: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) if (s[i] === ch) n++;
  return n;
}

/**
 * Given masked lines and the 0-indexed line where a `{` opens a body, find the
 * 0-indexed line where the matching `}` closes it. Returns -1 if unbalanced.
 */
export function findClosingBrace(masked: string[], openLine: number): number {
  let depth = 0;
  for (let i = openLine; i < masked.length; i++) {
    depth += countChar(masked[i], '{') - countChar(masked[i], '}');
    if (i === openLine) {
      if (!masked[i].includes('{')) return -1;
      // Balanced on the def line itself (`{ ... }`): single-line body.
      if (depth <= 0) return i;
      continue;
    }
    if (depth <= 0) return i;
  }
  return -1;
}

/**
 * Indent-based body end (Python-style): first line after start with
 * indentation <= baseIndent (skipping blanks). Returns 0-indexed end line.
 */
export function findIndentEnd(lines: string[], startLine: number): number {
  const base = indentOf(lines[startLine] ?? '');
  let end = lines.length - 1;
  for (let i = startLine + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;
    if (indentOf(line) <= base) {
      end = i - 1;
      break;
    }
  }
  while (end > startLine && lines[end].trim() === '') end--;
  return end;
}

function indentOf(line: string): number {
  const m = line.match(/^[ \t]*/);
  return m ? m[0].length : 0;
}

const CALL_RE = /([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)\s*\(/g;
const KEYWORDS = new Set([
  'if', 'for', 'while', 'switch', 'catch', 'return', 'function', 'typeof',
  'import', 'export', 'new', 'delete', 'void', 'in', 'of', 'await', 'yield',
  'class', 'extends', 'super', 'this', 'do', 'else', 'try', 'finally',
]);

/**
 * Find call sites in masked body lines (1-indexed line numbers returned).
 * `ownNames` — symbols defined in the same file (for cheap intra-file marking;
 * resolution itself happens in a later pass).
 */
export function findCallSites(
  maskedBody: string[],
  startLine1: number,
  ownNames?: Set<string>
): SymbolCallSite[] {
  const calls: SymbolCallSite[] = [];
  const seen = new Set<string>();
  maskedBody.forEach((line, idx) => {
    CALL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = CALL_RE.exec(line)) !== null) {
      const raw = m[1].replace(/\s+/g, '');
      const parts = raw.split('.');
      const baseName = parts[parts.length - 1];
      if (!baseName || KEYWORDS.has(baseName) || KEYWORDS.has(parts[0])) continue;
      if (/^\d/.test(baseName)) continue;
      const lineNo = startLine1 + idx;
      const key = `${baseName}@${lineNo}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // Extract raw args from the ORIGINAL spacing-free match tail is unreliable
      // on masked text; args captured by caller from raw lines when needed.
      calls.push({ name: raw, baseName, args: '', line: lineNo });
    }
  });
  void ownNames;
  return calls;
}

/** Split a comma-separated param list, ignoring nested () [] {} and defaults. */
export function splitParams(paramText: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of paramText) {
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    if (ch === ')' || ch === ']' || ch === '}') depth--;
    if (ch === ',' && depth === 0) {
      const name = cleanParamName(cur);
      if (name) out.push(name);
      cur = '';
    } else {
      cur += ch;
    }
  }
  const last = cleanParamName(cur);
  if (last) out.push(last);
  return out;
}

function cleanParamName(raw: string): string {
  let s = raw.trim();
  // strip default value
  const eq = s.indexOf('=');
  if (eq >= 0) s = s.slice(0, eq).trim();
  // strip type annotation (TS/Go): "name: type" / "name type"
  const colon = s.indexOf(':');
  if (colon >= 0) s = s.slice(0, colon).trim();
  // strip rest/spread, pointers, receiver noise
  s = s.replace(/^\.{3}/, '').replace(/^\*+/, '').trim();
  // Go "name type" pairs: take first token; "(r *T)" receiver handled by callers
  const tok = s.split(/\s+/)[0] ?? '';
  if (!/^[A-Za-z_$][\w$]*$/.test(tok)) return '';
  if (['...', '_'].includes(tok)) return '';
  return tok;
}

/** Deterministic symbol id: fileId::name, with #n suffix on collision. */
export function symbolId(fileId: string, name: string, used: Set<string>): string {
  let id = `${fileId}::${name}`;
  let n = 2;
  while (used.has(id)) {
    id = `${fileId}::${name}#${n++}`;
  }
  used.add(id);
  return id;
}
