import { describe, it, expect } from 'bun:test';
import { computeFocusDepths, edgeFocusDepth, nodeOpacityForDepth } from '../src/utils/focusDepths';

const chain = [
  { from: 'a', to: 'b' },
  { from: 'b', to: 'c' },
  { from: 'c', to: 'd' },
  { from: 'b', to: 'e' },
];

describe('computeFocusDepths', () => {
  it('grades hop depth outward from the focus node', () => {
    const depths = computeFocusDepths(chain, 'b');
    expect(depths.get('b')).toBe(0);
    expect(depths.get('a')).toBe(1);
    expect(depths.get('c')).toBe(1);
    expect(depths.get('e')).toBe(1);
    expect(depths.get('d')).toBe(2);
  });

  it('returns an empty map without a focus id', () => {
    expect(computeFocusDepths(chain, null).size).toBe(0);
    expect(computeFocusDepths(chain, undefined).size).toBe(0);
  });

  it('caps depth at MAX_FOCUS_DEPTH and leaves the rest unreachable', () => {
    const long = [
      { from: 'n0', to: 'n1' },
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' },
      { from: 'n3', to: 'n4' },
      { from: 'n4', to: 'n5' },
    ];
    const depths = computeFocusDepths(long, 'n0');
    expect(depths.get('n3')).toBe(3);
    expect(depths.has('n4')).toBe(false);
    expect(depths.has('n5')).toBe(false);
  });

  it('ignores edges touching unknown nodes when a known set is given', () => {
    const depths = computeFocusDepths(
      [...chain, { from: 'b', to: 'ghost' }],
      'b',
      new Set(['a', 'b', 'c'])
    );
    expect(depths.has('ghost')).toBe(false);
    expect(depths.get('c')).toBe(1);
  });

  it('returns empty map when the focus id itself is unknown', () => {
    expect(computeFocusDepths(chain, 'ghost', new Set(['a', 'b'])).size).toBe(0);
  });
});

describe('edgeFocusDepth + nodeOpacityForDepth', () => {
  it('uses the closer endpoint', () => {
    expect(edgeFocusDepth(1, 2)).toBe(1);
    expect(edgeFocusDepth(undefined, 2)).toBe(2);
    expect(edgeFocusDepth(undefined, undefined)).toBe(Infinity);
  });

  it('grades opacity 1 / 1 / 0.55 / 0.18', () => {
    expect(nodeOpacityForDepth(undefined)).toBe(1);
    expect(nodeOpacityForDepth(0)).toBe(1);
    expect(nodeOpacityForDepth(1)).toBe(1);
    expect(nodeOpacityForDepth(2)).toBe(0.55);
    expect(nodeOpacityForDepth(3)).toBe(0.18);
    expect(nodeOpacityForDepth(99)).toBe(0.18);
  });
});
