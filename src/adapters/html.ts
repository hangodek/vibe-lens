import type { CodeEvent } from '../types/ast';
import type { LanguageAdapter, AdapterFileContext, AdapterResult } from './types';
import { javascriptAdapter } from './javascript';

/**
 * HTML adapter: extracts <script src>, inline <script> blocks (delegated to
 * the JS adapter with line offsets), and inline event-handler attributes.
 */
export const htmlAdapter: LanguageAdapter = {
  id: 'html',
  extensions: ['.html', '.htm', '.vue', '.svelte'],

  parse(ctx: AdapterFileContext): AdapterResult {
    const { fileId, lines } = ctx;
    const events: CodeEvent[] = [];

    const scriptSrcRe = /<script[^>]*\ssrc=["']([^"']+)["']/gi;
    const inlineAttrRe = /\s(on\w+)\s*=\s*["']([^"']{1,120})["']/g;

    const full = lines.join('\n');
    let m: RegExpExecArray | null;
    while ((m = scriptSrcRe.exec(full)) !== null) {
      const upTo = full.slice(0, m.index);
      events.push({
        name: 'script-src',
        source: 'script-tag',
        handler: m[1],
        line: upTo.split('\n').length,
        target: m[1],
      });
    }
    while ((m = inlineAttrRe.exec(full)) !== null) {
      const upTo = full.slice(0, m.index);
      events.push({
        name: m[1],
        source: 'inline-attribute',
        handler: m[2],
        line: upTo.split('\n').length,
      });
    }

    // Inline <script> blocks (no src) -> delegate to JS adapter, shift lines
    const blockRe = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script\s*>/gi;
    const functions = [];
    let bm: RegExpExecArray | null;
    while ((bm = blockRe.exec(full)) !== null) {
      const body = bm[1];
      if (!body.trim()) continue;
      const blockStartLine1 = full.slice(0, bm.index).split('\n').length;
      const bodyOffset = (bm[0].slice(0, bm[0].indexOf(body)).split('\n').length - 1);
      const sub = javascriptAdapter.parse({
        fileId,
        path: ctx.path,
        code: body,
        lines: body.split('\n'),
      });
      for (const f of sub.functions) {
        const shift = blockStartLine1 + bodyOffset - 1;
        functions.push({
          ...f,
          startLine: f.startLine + shift,
          endLine: f.endLine + shift,
          calls: f.calls.map((c) => ({ ...c, line: c.line + shift })),
        });
      }
      for (const e of sub.events) {
        events.push({ ...e, line: e.line + blockStartLine1 + bodyOffset - 1 });
      }
    }

    return { functions, events, confidence: 'high' };
  },
};
