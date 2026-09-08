import { memo } from 'react';
import type { CanvasNode, CanvasEdge } from '../../types/graph';
import { EDGE_TYPE_STYLES } from '../../constants/theme';

interface ConnectionEdgeProps {
  edge: CanvasEdge;
  fromNode: CanvasNode;
  toNode: CanvasNode;
  isHighlighted?: boolean;
  outPortIndex?: number;
  totalOutPorts?: number;
  inPortIndex?: number;
  totalInPorts?: number;
  overridePillPos?: { x: number; y: number };
  layer?: 'all' | 'path' | 'pill';
  /**
   * Hop-depth of this edge from the focused node (min of endpoint depths).
   * Undefined = no focus. Drives path dimming; pills at depth >= 3 are hidden
   * by the parent, depth-2 pills render dimmed here.
   */
  focusDepth?: number;
  onSelect?: (edge: CanvasEdge) => void;
}

function getCubicBezierPoint(
  t: number,
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number
): { x: number; y: number } {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  const x = mt3 * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3 * x3;
  const y = mt3 * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y3;

  return { x: Math.round(x), y: Math.round(y) };
}

function parseEdgePill(text: string): { method: string; detail: string; color: string; border: string } {
  // Strip a redundant leading verb: intra-file edges already read "CALL x".
  const clean = text.trim().replace(/^calls\s+/i, '');
  const upper = clean.toUpperCase();
  const http = upper.match(/^(POST|GET|PUT|DELETE|PATCH)\b/);
  if (http) {
    const isWrite = http[1] !== 'GET';
    return {
      method: http[1],
      detail: clean.slice(http[1].length).trim() || '/action',
      color: isWrite ? '#fb7185' : '#34d399',
      border: isWrite ? '#fb718566' : '#34d39966',
    };
  }
  if (/^SQL\b/i.test(clean) || /\b(SELECT|INSERT|UPDATE)\b/i.test(clean)) {
    return { method: 'SQL', detail: clean.replace(/^SQL\b/i, '').trim() || 'db', color: '#34d399', border: '#05966966' };
  }
  // Whole-word guard vocabulary only: "initAudioContext" must NOT match.
  if (/\b(guard|middleware|csrf|session|passes context|validated context|applies guard|auth check)\b/i.test(clean)) {
    return { method: 'GUARD', detail: clean.replace(/middleware|guard|applies|passes/i, '').trim() || 'auth', color: '#fbbf24', border: '#d9770666' };
  }
  if (/^(CH\.|STEP)\b/i.test(clean)) {
    return { method: 'STEP', detail: clean, color: '#c084fc', border: '#9333ea66' };
  }
  return { method: 'CALL', detail: clean, color: '#828fff', border: '#4f46e566' };
}

export function computeEdgePillGeometry(
  edge: CanvasEdge,
  fromNode: CanvasNode,
  toNode: CanvasNode,
  outPortIndex = 0,
  totalOutPorts = 1,
  inPortIndex = 0,
  totalInPorts = 1
): { x: number; y: number; width: number; height: number } {
  const rawStartX = fromNode.x + fromNode.width;
  const rawEndX = toNode.x;
  const isLeftToRight = rawEndX >= rawStartX - 20;

  let startX: number;
  let startY: number;
  let endX: number;
  let endY: number;
  let controlX1: number;
  let controlY1: number;
  let controlX2: number;
  let controlY2: number;
  let pillT = 0.5;
  let pillDX = 0;
  let pillAnchor = 0; // vertical only: +1 hug target, -1 hug caller
  let isVertical = false;

  // Same-column stacked nodes (function swimlanes): route straight down/up
  // instead of the giant backward loop. Pill sits in the caller-adjacent gap
  // (never mid-column on top of a card), fanned across gutter lanes per
  // out-port so same-caller fan-outs can't stack.
  const sameColumn = Math.abs(toNode.x - fromNode.x) < 40;
  const verticalGap = toNode.y - fromNode.y;

  if (sameColumn && Math.abs(verticalGap) > 10) {
    const downward = verticalGap > 0;
    // Fan out endpoints across the card edge so same-caller lines diverge
    // instead of drawing on top of each other.
    startX = totalOutPorts > 1
      ? fromNode.x + (fromNode.width * (outPortIndex + 1)) / (totalOutPorts + 1)
      : fromNode.x + fromNode.width / 2;
    startY = downward ? fromNode.y + fromNode.height : fromNode.y;
    endX = totalInPorts > 1
      ? toNode.x + (toNode.width * (inPortIndex + 1)) / (totalInPorts + 1)
      : toNode.x + toNode.width / 2;
    endY = downward ? toNode.y : toNode.y + toNode.height;
    controlX1 = startX;
    controlY1 = startY;
    controlX2 = endX;
    controlY2 = endY;
    pillT = 0.5;
    isVertical = true;
    // Anchor the pill at whichever end fans out more: a 7-way fan-out spreads
    // across 7 gaps at the many-end, instead of stacking in 1 gap. Lanes
    // alternate left/right so the rare shared-gap pair still separates.
    // pillAnchor: +1 = hug target card, -1 = hug caller card.
    pillAnchor = totalOutPorts > totalInPorts ? 1 : -1;
    const laneIdx = pillAnchor === 1 ? inPortIndex : outPortIndex;
    pillDX = laneIdx % 2 === 0 ? 108 : -108;
  } else if (isLeftToRight) {
    startX = fromNode.x + fromNode.width;
    startY = totalOutPorts > 1
      ? fromNode.y + (fromNode.height * (outPortIndex + 1)) / (totalOutPorts + 1)
      : fromNode.y + fromNode.height / 2;

    endX = toNode.x;
    endY = totalInPorts > 1
      ? toNode.y + (toNode.height * (inPortIndex + 1)) / (totalInPorts + 1)
      : toNode.y + toNode.height / 2;

    const dx = Math.abs(endX - startX);
    const isCrossColumnJump = dx > 500;

    if (isCrossColumnJump) {
      const archY = Math.min(startY, endY) - 105;
      controlX1 = startX + 90;
      controlY1 = archY;
      controlX2 = endX - 90;
      controlY2 = archY;
      pillT = 0.32;
    } else {
      controlX1 = startX + Math.max(dx * 0.45, 55);
      controlY1 = startY;
      controlX2 = endX - Math.max(dx * 0.45, 55);
      controlY2 = endY;

      pillT = totalInPorts > 1
        ? 0.32 + (inPortIndex / Math.max(1, totalInPorts - 1)) * 0.36
        : totalOutPorts > 1
        ? 0.32 + (outPortIndex / Math.max(1, totalOutPorts - 1)) * 0.36
        : 0.5;
    }
  } else {
    startX = fromNode.x;
    startY = fromNode.y + fromNode.height * 0.7;
    endX = toNode.x + toNode.width;
    endY = toNode.y + toNode.height * 0.7;

    const dx = Math.abs(startX - endX) * 0.35;
    const dy = Math.max(Math.abs(endY - startY), 70);
    controlX1 = startX - Math.max(dx, 70);
    controlY1 = startY + dy * 0.4;
    controlX2 = endX + Math.max(dx, 70);
    controlY2 = endY + dy * 0.4;
    pillT = 0.5;
  }

  const _pt = getCubicBezierPoint(
    pillT,
    startX, startY,
    controlX1, controlY1,
    controlX2, controlY2,
    endX, endY
  );
  const x = (isVertical ? startX : _pt.x) + pillDX;
  // Vertical pills sit in the gap hugging the anchor end (target when fanning
  // out, caller when fanning in): each anchor card owns its gap.
  const y = isVertical
    ? (pillAnchor === 1
        ? endY + (endY > startY ? -22 : 22)
        : startY + (endY > startY ? 22 : -22))
    : _pt.y;

  const rawText = edge.label || edge.dataPassed || '';
  const parsed = parseEdgePill(rawText);
  const pillLabel = `${parsed.method} ${parsed.detail}`;
  const width = Math.min(160, Math.max(68, pillLabel.length * 6.5 + 18));

  return { x, y, width, height: 26 };
}

function ConnectionEdgeComponent({
  edge,
  fromNode,
  toNode,
  isHighlighted = false,
  outPortIndex = 0,
  totalOutPorts = 1,
  inPortIndex = 0,
  totalInPorts = 1,
  overridePillPos,
  layer = 'all',
  focusDepth,
  onSelect,
}: ConnectionEdgeProps) {
  const rawStartX = fromNode.x + fromNode.width;
  const rawEndX = toNode.x;
  const isLeftToRight = rawEndX >= rawStartX - 20;

  let startX: number;
  let startY: number;
  let endX: number;
  let endY: number;
  let controlX1: number;
  let controlY1: number;
  let controlX2: number;
  let controlY2: number;
  let pillT = 0.5;
  let pillDX = 0;
  let pillAnchor = 0; // vertical only: +1 hug target, -1 hug caller
  let isVertical = false;

  // Same-column stacked nodes (function swimlanes): route straight down/up
  // instead of the giant backward loop. Pill sits in the caller-adjacent gap
  // (never mid-column on top of a card), fanned across gutter lanes per
  // out-port so same-caller fan-outs can't stack.
  const sameColumn = Math.abs(toNode.x - fromNode.x) < 40;
  const verticalGap = toNode.y - fromNode.y;

  if (sameColumn && Math.abs(verticalGap) > 10) {
    const downward = verticalGap > 0;
    // Fan out endpoints across the card edge so same-caller lines diverge
    // instead of drawing on top of each other.
    startX = totalOutPorts > 1
      ? fromNode.x + (fromNode.width * (outPortIndex + 1)) / (totalOutPorts + 1)
      : fromNode.x + fromNode.width / 2;
    startY = downward ? fromNode.y + fromNode.height : fromNode.y;
    endX = totalInPorts > 1
      ? toNode.x + (toNode.width * (inPortIndex + 1)) / (totalInPorts + 1)
      : toNode.x + toNode.width / 2;
    endY = downward ? toNode.y : toNode.y + toNode.height;
    controlX1 = startX;
    controlY1 = startY;
    controlX2 = endX;
    controlY2 = endY;
    pillT = 0.5;
    isVertical = true;
    // Anchor the pill at whichever end fans out more: a 7-way fan-out spreads
    // across 7 gaps at the many-end, instead of stacking in 1 gap. Lanes
    // alternate left/right so the rare shared-gap pair still separates.
    // pillAnchor: +1 = hug target card, -1 = hug caller card.
    pillAnchor = totalOutPorts > totalInPorts ? 1 : -1;
    const laneIdx = pillAnchor === 1 ? inPortIndex : outPortIndex;
    pillDX = laneIdx % 2 === 0 ? 108 : -108;
  } else if (isLeftToRight) {
    startX = fromNode.x + fromNode.width;
    startY = totalOutPorts > 1
      ? fromNode.y + (fromNode.height * (outPortIndex + 1)) / (totalOutPorts + 1)
      : fromNode.y + fromNode.height / 2;

    endX = toNode.x;
    endY = totalInPorts > 1
      ? toNode.y + (toNode.height * (inPortIndex + 1)) / (totalInPorts + 1)
      : toNode.y + toNode.height / 2;

    const dx = Math.abs(endX - startX);
    const isCrossColumnJump = dx > 500;

    if (isCrossColumnJump) {
      // Arch cleanly overhead so the line NEVER cuts through intermediate column cards
      const archY = Math.min(startY, endY) - 105;
      controlX1 = startX + 90;
      controlY1 = archY;
      controlX2 = endX - 90;
      controlY2 = archY;
      pillT = 0.32; // Sit safely near the ascending arch in the source gutter
    } else {
      // Normal connection corridor with generous spacing
      controlX1 = startX + Math.max(dx * 0.45, 55);
      controlY1 = startY;
      controlX2 = endX - Math.max(dx * 0.45, 55);
      controlY2 = endY;

      // Stagger pill placement along the curve (32% to 68%) to guarantee ZERO label overlap
      pillT = totalInPorts > 1
        ? 0.32 + (inPortIndex / Math.max(1, totalInPorts - 1)) * 0.36
        : totalOutPorts > 1
        ? 0.32 + (outPortIndex / Math.max(1, totalOutPorts - 1)) * 0.36
        : 0.5;
    }
  } else {
    // Backward routing / cycle: outward arc below
    startX = fromNode.x;
    startY = fromNode.y + fromNode.height * 0.7;
    endX = toNode.x + toNode.width;
    endY = toNode.y + toNode.height * 0.7;

    const dx = Math.abs(startX - endX) * 0.35;
    const dy = Math.max(Math.abs(endY - startY), 70);
    controlX1 = startX - Math.max(dx, 70);
    controlY1 = startY + dy * 0.4;
    controlX2 = endX + Math.max(dx, 70);
    controlY2 = endY + dy * 0.4;
    pillT = 0.5;
  }

  // Calculate the EXACT mathematical point on the cubic Bezier curve for the pill
  const computedPoint = getCubicBezierPoint(
    pillT,
    startX, startY,
    controlX1, controlY1,
    controlX2, controlY2,
    endX, endY
  );

  const pillX = overridePillPos ? overridePillPos.x : (isVertical ? startX : computedPoint.x) + pillDX;
  const pillY = overridePillPos
    ? overridePillPos.y
    : isVertical
      ? (pillAnchor === 1
          ? endY + (endY > startY ? -22 : 22)
          : startY + (endY > startY ? 22 : -22))
      : computedPoint.y;

  const pathD = `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;

  const style = EDGE_TYPE_STYLES[edge.type] || EDGE_TYPE_STYLES.render;
  const active = edge.isActive || isHighlighted;
  const strokeColor = active ? style.activeStroke : '#3b404d';
  const strokeWidth = active ? 2.5 : 1.5;
  // Hop-depth dimming: focused path stays bright, depth-2 fades, deeper fades to hairline.
  const focusPathOpacity =
    focusDepth === undefined ? undefined : focusDepth <= 1 ? 1 : focusDepth === 2 ? 0.45 : 0.15;

  // Keep canvas pill short & crisp (under 18 chars) to prevent line crowding
  const rawText = edge.label || edge.dataPassed || '';
  const parsed = parseEdgePill(rawText);
  const pillLabel = `${parsed.method} ${parsed.detail}`;
  const pillWidth = Math.min(160, Math.max(68, pillLabel.length * 6.5 + 18));

  // PATH ONLY LAYER
  if (layer === 'path') {
    return (
      <g>
        {/* Invisible thick stroke for mouse clicking on the line */}
        <path
          d={pathD}
          fill="none"
          stroke="transparent"
          strokeWidth={24}
          strokeLinecap="round"
          className="cursor-pointer"
          onClick={() => onSelect && onSelect(edge)}
        />

        {/* Dark background shadow stroke */}
        <path
          d={pathD}
          fill="none"
          stroke="#010102"
          strokeWidth={strokeWidth + 3}
          strokeLinecap="round"
        />

        {/* Main visible connection line */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="transition-colors duration-150"
          opacity={focusPathOpacity ?? (active ? 1 : 0.8)}
        />

        {/* Target Arrow / Port Dot */}
        <circle
          cx={endX}
          cy={endY}
          r={active ? 4.5 : 3.5}
          fill={strokeColor}
          stroke="#010102"
          strokeWidth={1.5}
        />
      </g>
    );
  }

  // PILL ONLY LAYER (Always rendered in top SVG layer so no line can ever cover it!)
  if (layer === 'pill') {
    if (!rawText) return null;
    if (focusDepth !== undefined && focusDepth >= 3) return null;
    return (
      <g
        transform={`translate(${pillX}, ${pillY})`}
        className="cursor-pointer group"
        onClick={() => onSelect && onSelect(edge)}
        opacity={focusDepth === 2 ? 0.55 : 1}
      >
        <rect
          x={-pillWidth / 2}
          y={-12}
          width={pillWidth}
          height={24}
          rx={6}
          fill="#0a0b0f"
          stroke={active ? style.activeStroke : parsed.border}
          strokeWidth={1.2}
          className="transition-all duration-150 group-hover:border-[#5e6ad2] group-hover:fill-[#12131a] shadow-md"
        />
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="10"
          fontFamily="JetBrains Mono, monospace"
          className="select-none pointer-events-none font-medium"
        >
          <tspan fill={parsed.color} fontWeight="bold">{parsed.method} </tspan>
          <tspan fill={active ? '#f7f8f8' : '#d0d6e0'}>{parsed.detail.slice(0, 14)}</tspan>
        </text>
      </g>
    );
  }

  // FALLBACK LAYER ('all')
  return (
    <g className="cursor-pointer group" onClick={() => onSelect && onSelect(edge)}>
      <path d={pathD} fill="none" stroke="#010102" strokeWidth={strokeWidth + 3} strokeLinecap="round" />
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" opacity={focusPathOpacity ?? (active ? 1 : 0.8)} />
      {rawText && (
        <g transform={`translate(${pillX}, ${pillY})`}>
          <rect x={-pillWidth / 2} y={-12} width={pillWidth} height={24} rx={6} fill="#0a0b0f" stroke={active ? style.activeStroke : parsed.border} strokeWidth={1.2} />
          <text textAnchor="middle" dominantBaseline="middle" fontSize="10" fontFamily="JetBrains Mono, monospace">
            <tspan fill={parsed.color} fontWeight="bold">{parsed.method} </tspan>
            <tspan fill={active ? '#f7f8f8' : '#d0d6e0'}>{parsed.detail.slice(0, 14)}</tspan>
          </text>
        </g>
      )}
      <circle cx={endX} cy={endY} r={active ? 4.5 : 3.5} fill={strokeColor} stroke="#010102" strokeWidth={1.5} />
    </g>
  );
}

export const ConnectionEdge = memo(ConnectionEdgeComponent);
