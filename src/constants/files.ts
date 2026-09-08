/**
 * Single source of truth for which file extensions VibeLens ingests.
 * Dedicated adapters cover JS/TS, Go, Python, HTML/Vue/Svelte; every other
 * listed language falls back to the generic heuristic adapter (low
 * confidence) so polyglot projects still render file nodes instead of an
 * empty canvas.
 */
export const ALLOWED_CODE_EXTENSIONS: readonly string[] = [
  // Dedicated adapters
  '.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs',
  '.vue', '.svelte', '.html', '.htm',
  '.py', '.pyi', '.go',
  // Generic fallback: C-family + systems
  '.c', '.h', '.cc', '.cpp', '.hpp', '.hh', '.cs', '.swift', '.m', '.mm',
  '.rs', '.zig',
  // Generic fallback: JVM / BEAM / scripting
  '.java', '.kt', '.kts', '.scala', '.groovy', '.clj', '.cljs',
  '.ex', '.exs', '.eex', '.heex', '.erl',
  '.rb', '.php', '.pl', '.pm', '.lua', '.dart',
  '.r', '.jl', '.hs', '.ml', '.fs', '.fsx', '.elm',
  '.sh', '.bash', '.ps1', '.vb', '.sql',
];

const ALLOWED_SET = new Set(ALLOWED_CODE_EXTENSIONS);

export function hasAllowedCodeExtension(path: string): boolean {
  const dot = path.toLowerCase().lastIndexOf('.');
  if (dot < 0) return false;
  return ALLOWED_SET.has(path.toLowerCase().slice(dot));
}
