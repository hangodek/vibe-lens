import type { ParsedSymbol, CodeEvent } from '../types/ast';

export interface AdapterFileContext {
  fileId: string;
  path: string;
  code: string;
  lines: string[];
}

export interface AdapterResult {
  functions: ParsedSymbol[];
  events: CodeEvent[];
  confidence: 'high' | 'low';
}

/**
 * A language adapter converts source text into the language-agnostic IR
 * (ParsedSymbol[] + CodeEvent[]). Core code (layout, canvas, inspector,
 * traces, AI prompts) must never branch on language — it only sees IR.
 */
export interface LanguageAdapter {
  /** Stable id, e.g. 'javascript', 'go', 'python', 'html', 'generic' */
  id: string;
  /** File extensions this adapter claims, lowercase with dot, e.g. ['.js', '.jsx'] */
  extensions: string[];
  parse(ctx: AdapterFileContext): AdapterResult;
}
