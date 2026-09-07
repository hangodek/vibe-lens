import { describe, it, expect } from 'bun:test';
import { extractJsonFromResponse } from '../src/utils/aiClient';

describe('AI Client JSON Extractor', () => {
  it('extracts pure JSON strings directly', () => {
    const raw = '{"status": "ok", "count": 42}';
    const parsed = extractJsonFromResponse<{ status: string; count: number }>(raw);
    expect(parsed.status).toBe('ok');
    expect(parsed.count).toBe(42);
  });

  it('extracts JSON wrapped in markdown code fences', () => {
    const raw = '```json\n{\n  "name": "auth-service",\n  "role": "service"\n}\n```';
    const parsed = extractJsonFromResponse<{ name: string; role: string }>(raw);
    expect(parsed.name).toBe('auth-service');
    expect(parsed.role).toBe('service');
  });

  it('extracts JSON surrounded by AI conversational prelude and postscript', () => {
    const raw = 'Here is the analyzed architecture JSON:\n\n{\n  "files": [\n    { "path": "main.go", "role": "gateway" }\n  ]\n}\n\nHope this helps!';
    const parsed = extractJsonFromResponse<{ files: Array<{ path: string; role: string }> }>(raw);
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].path).toBe('main.go');
    expect(parsed.files[0].role).toBe('gateway');
  });

  it('throws an informative error if no JSON object is found', () => {
    expect(() => extractJsonFromResponse('This is plain text with no brackets.')).toThrow();
  });
});
