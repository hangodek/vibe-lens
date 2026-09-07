import type { CanvasNode, CanvasEdge } from '../../types/graph';
import { EDGE_TYPE_STYLES } from '../../constants/theme';

interface ConnectionEdgeProps {
  edge: CanvasEdge;
  fromNode: CanvasNode;
  toNode: CanvasNode;
}

export function ConnectionEdge({ edge, fromNode, toNode }: ConnectionEdgeProps) {
  // Compute connector anchor points
  const startX = fromNode.x + fromNode.width;
  const startY = fromNode.y + fromNode.height / 2;
  const endX = toNode.x;
  const endY = toNode.y + toNode.height / 2;

  // Compute smooth bezier curve controls
  const dx = Math.abs(endX - startX) * 0.55;
  const controlX1 = startX + Math.max(dx, 40);
  const controlY1 = startY;
  const controlX2 = endX - Math.max(dx, 40);
  const controlY2 = endY;

  const pathD = `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  const style = EDGE_TYPE_STYLES[edge.type] || EDGE_TYPE_STYLES.render;
  const strokeColor = edge.isActive ? style.activeStroke : style.stroke;
  const strokeWidth = edge.isActive ? 2.5 : 1.5;

  return (
    <g className="transition-all duration-300">
      {/* Background shadow stroke for contrast */}
      <path
        d={pathD}
        fill="none"
        stroke="#010102"
        strokeWidth={strokeWidth + 3}
        strokeLinecap="round"
      />

      {/* Main connection line */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={edge.animated || edge.type === 'data' ? '6 6' : style.strokeDasharray}
        className={edge.animated ? 'animate-edge-flow' : ''}
        strokeLinecap="round"
        opacity={edge.isActive ? 1 : 0.85}
      />

      {/* Edge label pill if provided */}
      {edge.label && (
        <g transform={`translate(${midX}, ${midY})`}>
          <rect
            x={-edge.label.length * 3.5 - 8}
            y={-10}
            width={edge.label.length * 7 + 16}
            height={20}
            rx={10}
            fill="#08090a"
            stroke={edge.isActive ? style.activeStroke : '#23252a'}
            strokeWidth={1}
          />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fill={edge.isActive ? '#f7f8f8' : '#8a8f98'}
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
        r={3.5}
        fill={strokeColor}
        stroke="#010102"
        strokeWidth={1.5}
      />
    </g>
  );
}
