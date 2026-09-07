import { memo } from 'react';
import type { CanvasNode, CanvasEdge } from '../../types/graph';
import { EDGE_TYPE_STYLES } from '../../constants/theme';

interface ConnectionEdgeProps {
  edge: CanvasEdge;
  fromNode: CanvasNode;
  toNode: CanvasNode;
  isHighlighted?: boolean;
}

function ConnectionEdgeComponent({ edge, fromNode, toNode, isHighlighted = false }: ConnectionEdgeProps) {
  // Determine relative layout direction to prevent reverse knotting / looping
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

  if (isLeftToRight) {
    startX = fromNode.x + fromNode.width;
    startY = fromNode.y + fromNode.height / 2;
    endX = toNode.x;
    endY = toNode.y + toNode.height / 2;

    const dx = Math.abs(endX - startX) * 0.55;
    controlX1 = startX + Math.max(dx, 40);
    controlY1 = startY;
    controlX2 = endX - Math.max(dx, 40);
    controlY2 = endY;
  } else {
    // Backward routing / cycle: connect left-to-right with an outward smooth arc
    startX = fromNode.x;
    startY = fromNode.y + fromNode.height * 0.7;
    endX = toNode.x + toNode.width;
    endY = toNode.y + toNode.height * 0.7;

    const dx = Math.abs(startX - endX) * 0.35;
    const dy = Math.max(Math.abs(endY - startY), 50);
    controlX1 = startX - Math.max(dx, 50);
    controlY1 = startY + dy * 0.3;
    controlX2 = endX + Math.max(dx, 50);
    controlY2 = endY + dy * 0.3;
  }

  const pathD = `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  const style = EDGE_TYPE_STYLES[edge.type] || EDGE_TYPE_STYLES.render;
  const active = edge.isActive || isHighlighted;
  const strokeColor = active ? style.activeStroke : style.stroke;
  const strokeWidth = active ? 2.5 : 1.5;

  return (
    <g>
      {/* Background shadow stroke for high-contrast visibility */}
      <path
        d={pathD}
        fill="none"
        stroke="#010102"
        strokeWidth={strokeWidth + 2.5}
        strokeLinecap="round"
      />

      {/* Main connection line: zero animations when idle for 60 FPS performance */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={active ? '6 6' : style.strokeDasharray}
        className={active ? 'animate-edge-flow' : ''}
        strokeLinecap="round"
        opacity={active ? 1 : 0.75}
      />

      {/* Edge label pill: only rendered when line is active/hovered to avoid cluttering */}
      {active && edge.label && (
        <g transform={`translate(${midX}, ${midY})`}>
          <rect
            x={-edge.label.length * 3.5 - 8}
            y={-10}
            width={edge.label.length * 7 + 16}
            height={20}
            rx={10}
            fill="#08090a"
            stroke={style.activeStroke}
            strokeWidth={1}
          />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#f7f8f8"
            fontSize="10"
            fontFamily="JetBrains Mono, monospace"
            className="select-none pointer-events-none"
          >
            {edge.label}
          </text>
        </g>
      )}

      {/* Target connection point circle */}
      <circle
        cx={endX}
        cy={endY}
        r={active ? 4 : 3}
        fill={strokeColor}
        stroke="#010102"
        strokeWidth={1.5}
      />
    </g>
  );
}

export const ConnectionEdge = memo(ConnectionEdgeComponent);
