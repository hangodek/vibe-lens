import type { CanvasEdge } from '../types/graph';

export const MAX_FOCUS_DEPTH = 3;
const MAX_VISITED = 500;

/**
 * Hop-depth of every node reachable from `focusId` over undirected edges.
 * Depth 0 = focus node itself, 1 = direct callers/callees, etc.
 * Unreachable nodes are absent from the map (treated as Infinity).
 * Pure function — unit-tested, no React.
 */
export function computeFocusDepths(
  edges: Pick<CanvasEdge, 'from' | 'to'>[],
  focusId: string | null | undefined,
  knownIds?: Set<string> | string[]
): Map<string, number> {
  const depths = new Map<string, number>();
  if (!focusId) return depths;

  const known = knownIds instanceof Set ? knownIds : knownIds ? new Set(knownIds) : null;
  const adj = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (known && (!known.has(a) || !known.has(b))) return;
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a)!.add(b);
  };
  for (const e of edges) {
    link(e.from, e.to);
    link(e.to, e.from);
  }
  if (known && !known.has(focusId)) return depths;

  const queue: Array<[string, number]> = [[focusId, 0]];
  depths.set(focusId, 0);
  while (queue.length > 0 && depths.size < MAX_VISITED) {
    const [id, d] = queue.shift()!;
    if (d >= MAX_FOCUS_DEPTH) continue;
    for (const next of adj.get(id) ?? []) {
      if (!depths.has(next)) {
        depths.set(next, d + 1);
        queue.push([next, d + 1]);
      }
    }
  }
  return depths;
}

/** Edge depth = closer of its two endpoints (Infinity when unfocused). */
export function edgeFocusDepth(
  fromDepth: number | undefined,
  toDepth: number | undefined
): number {
  const a = fromDepth ?? Infinity;
  const b = toDepth ?? Infinity;
  return Math.min(a, b);
}

/** Canvas opacity for a node at a given focus depth (undefined = no focus). */
export function nodeOpacityForDepth(depth: number | undefined): number {
  if (depth === undefined) return 1;
  if (depth <= 1) return 1;
  if (depth === 2) return 0.55;
  return 0.18;
}
