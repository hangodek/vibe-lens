import type { AdapterResult } from './types';
import { javascriptAdapter } from './javascript';
import { goAdapter } from './go';
import { pythonAdapter } from './python';
import { htmlAdapter } from './html';
import { genericAdapter } from './generic';
import type { LanguageAdapter } from './types';

const ADAPTERS: LanguageAdapter[] = [
  javascriptAdapter,
  goAdapter,
  pythonAdapter,
  htmlAdapter,
];

const byExtension = new Map<string, LanguageAdapter>();
for (const a of ADAPTERS) {
  for (const ext of a.extensions) {
    if (!byExtension.has(ext)) byExtension.set(ext, a);
  }
}

export function getAdapterForPath(path: string): LanguageAdapter {
  const lower = path.toLowerCase();
  const dot = lower.lastIndexOf('.');
  if (dot >= 0) {
    const hit = byExtension.get(lower.slice(dot));
    if (hit) return hit;
  }
  return genericAdapter;
}

export function parseWithAdapter(
  fileId: string,
  path: string,
  code: string
): AdapterResult {
  const adapter = getAdapterForPath(path);
  try {
    return adapter.parse({ fileId, path, code, lines: code.split('\n') });
  } catch {
    return { functions: [], events: [], confidence: 'low' };
  }
}

export function listAdapters(): Array<{ id: string; extensions: string[] }> {
  return [...ADAPTERS.map((a) => ({ id: a.id, extensions: a.extensions })), { id: 'generic', extensions: [] }];
}
