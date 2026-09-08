import { memo } from 'react';
import type { CanvasNode, CanvasEdge } from '../../types/graph';
import { EDGE_TYPE_STYLES } from '../../constants/theme';

interface ConnectionEdgeProps {
  edge: CanvasEdge;
  fromNode: CanvasNode;
  toNode: CanvasNode;
  isHighlighted?: boolean;
  onSelect?: (edge: CanvasEdge) => void;
}

function ConnectionEdgeComponent({
  edge,
  fromNode,
  toNode,
  isHighlighted = false,
  onSelect,
}: ConnectionEdgeProps) {
  const rawStartX = fromNode.x + fromNode.width;
  const rawEndX = toNode.x;
  const isLeftToRight = rawEndX >= rawStartX - 20;

  // Port staggering so parallel lines entering/exiting the same node never stack
  const hash = edge.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const startPortOffset = ((hash % 5) - 2) * 16; // -32, -16, 0, 16, 32
  const endPortOffset = (((hash >> 2) % 5) - 2) * 16;

  let startX: number;
  let startY: number;
  let endX: number;
  let endY: number;
  let controlX1: number;
  let controlY1: number;
  let controlX2: number;
  let controlY2: number;
  let pillX: number;
  let pillY: number;

  if (isLeftToRight) {
    startX = fromNode.x + fromNode.width;
    startY = fromNode.y + fromNode.height / 2 + startPortOffset;
    endX = toNode.x;
    endY = toNode.y + toNode.height / 2 + endPortOffset;

    const dx = Math.abs(endX - startX);
    const isCrossColumnJump = dx > 340;

    if (isCrossColumnJump) {
      // Arch cleanly overhead so the line NEVER cuts through intermediate column cards
      const archY = Math.min(startY, endY) - 75;
      controlX1 = startX + 80;
      controlY1 = archY;
      controlX2 = endX - 80;
      controlY2 = archY;

      // Position pill safely in the source node gutter (never inside middle column cards)
      pillX = startX + 65;
      pillY = startY - 22;
    } else {
      // Normal adjacent node connection
      controlX1 = startX + Math.max(dx * 0.5, 45);
      controlY1 = startY;
      controlX2 = endX - Math.max(dx * 0.5, 45);
      controlY2 = endY;

      pillX = (startX + endX) / 2;
      pillY = (startY + endY) / 2 + ((hash % 3) - 1) * 12;
    }
  } else {
    // Backward routing / cycle: outward arc below
    startX = fromNode.x;
    startY = fromNode.y + fromNode.height * 0.7;
    endX = toNode.x + toNode.width;
    endY = toNode.y + toNode.height * 0.7;

    const dx = Math.abs(startX - endX) * 0.35;
    const dy = Math.max(Math.abs(endY - startY), 60);
    controlX1 = startX - Math.max(dx, 60);
    controlY1 = startY + dy * 0.4;
    controlX2 = endX + Math.max(dx, 60);
    controlY2 = endY + dy * 0.4;

    pillX = (startX + endX) / 2;
    pillY = Math.max(startY, endY) + 30;
  }

  const pathD = `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;

  const style = EDGE_TYPE_STYLES[edge.type] || EDGE_TYPE_STYLES.render;
  const active = edge.isActive || isHighlighted;
  const strokeColor = active ? style.activeStroke : '#3b404d';
  const strokeWidth = active ? 2.5 : 1.5;

  // Keep canvas pill short & crisp (under 20 chars) to prevent line crowding
  const rawText = edge.label || edge.dataPassed || '';
  const displayText = rawText.length > 20 ? rawText.slice(0, 19) + '…' : rawText;
  const pillWidth = displayText ? Math.min(160, displayText.length * 6.5 + 16) : 0;

  return (
    <g
      className="cursor-pointer group"
      onClick={() => onSelect && onSelect(edge)}
    >
      {/* Invisible thick stroke for easy mouse clicking */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        strokeLinecap="round"
      />

      {/* Dark background shadow stroke */}
      <path
        d={pathD}
        fill="none"
        stroke="#010102"
        strokeWidth={strokeWidth + 3}
        strokeLinecap="round"
      />

      {/* Visible connection line */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className="transition-colors duration-150 group-hover:stroke-[#828fff]"
        opacity={active ? 1 : 0.8}
      />

      {/* Always-visible Data Passed Pill: Tells the coder what is passing! */}
      {displayText && (
        <g transform={`translate(${pillX}, ${pillY})`}>
          <rect
            x={-pillWidth / 2}
            y={-11}
            width={pillWidth}
            height={22}
            rx={6}
            fill="#090a0d"
            stroke={active ? style.activeStroke : '#2e323b'}
            strokeWidth={1}
            className="transition-all duration-150 group-hover:border-[#5e6ad2] group-hover:fill-[#121318]"
          />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fill={active ? '#f7f8f8' : '#c3c8d4'}
            fontSize="10"
            fontFamily="JetBrains Mono, monospace"
            className="select-none pointer-events-none font-medium truncate"
          >
            {displayText}
          </text>
        </g>
      )}

      {/* Target Arrow / Port Dot */}
      <circle
        cx={endX}
        cy={endY}
        r={active ? 4.5 : 3.5}
        fill={strokeColor}
        stroke="#010102"
        strokeWidth={1.5}
        className="transition-colors duration-150 group-hover:fill-[#828fff]"
      />
    </g>
  );
}

export const ConnectionEdge = memo(ConnectionEdgeComponent);
