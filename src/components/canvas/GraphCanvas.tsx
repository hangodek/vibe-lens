import { useState } from 'react';
import type { CanvasNode, CanvasEdge } from '../../types/graph';
import { useGraphCanvas } from '../../hooks/useGraphCanvas';
import { GraphNode } from './GraphNode';
import { ConnectionEdge } from './ConnectionEdge';
import { Minimap } from './Minimap';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';

interface GraphCanvasProps {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedFileId: string | null;
  activeTraceStepNodeId?: string;
  scopeKey?: string;
  onSelectNode: (fileId: string) => void;
}

export function GraphCanvas({
  nodes,
  edges,
  selectedFileId,
  activeTraceStepNodeId,
  scopeKey = '',
  onSelectNode,
}: GraphCanvasProps) {
  const {
    viewport,
    canvasRef,
    isPanning,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    zoomIn,
    zoomOut,
    resetView,
    autoFit,
    startNodeDrag,
    activeNodes,
  } = useGraphCanvas(nodes, scopeKey);

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Map to find nodes quickly for edge drawing
  const nodeMap = new Map<string, CanvasNode>();
  activeNodes.forEach((n) => nodeMap.set(n.id, n));

  // Determine active edge highlights for hovered or selected node
  const activeFocusId = hoveredNodeId || selectedFileId;
  const connectedEdgeIds = new Set<string>();
  const connectedNodeIds = new Set<string>();

  if (activeFocusId) {
    connectedNodeIds.add(activeFocusId);
    edges.forEach((e) => {
      if (e.from === activeFocusId || e.to === activeFocusId) {
        connectedEdgeIds.add(e.id);
        connectedNodeIds.add(e.from);
        connectedNodeIds.add(e.to);
      }
    });
  }

  return (
    <div
      ref={canvasRef}
      className={`relative w-full h-full overflow-hidden bg-[#010102] select-none ${
        isPanning ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        backgroundImage: `radial-gradient(#1c1d22 1px, transparent 1px)`,
        backgroundSize: `${24 * viewport.zoom}px ${24 * viewport.zoom}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
      }}
    >
      {/* Transformed Stage */}
      <div
        className="absolute origin-top-left transition-transform duration-75 ease-out"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          width: '5000px',
          height: '4000px',
        }}
      >
        {/* SVG Edges Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {edges.map((edge) => {
            const fromNode = nodeMap.get(edge.from);
            const toNode = nodeMap.get(edge.to);
            if (!fromNode || !toNode) return null;

            const isHoverHighlighted = connectedEdgeIds.has(edge.id);

            return (
              <ConnectionEdge
                key={edge.id}
                edge={{
                  ...edge,
                  isActive: edge.isActive || isHoverHighlighted,
                  animated: edge.animated || isHoverHighlighted,
                }}
                fromNode={fromNode}
                toNode={toNode}
              />
            );
          })}
        </svg>

        {/* HTML Nodes Layer */}
        <div className="absolute inset-0 z-20 pointer-events-auto">
          {activeNodes.map((node) => {
            const isFaded = activeFocusId && !connectedNodeIds.has(node.id) && !connectedNodeIds.has(node.fileId);

            return (
              <div
                key={node.id}
                onMouseEnter={() => setHoveredNodeId(node.fileId)}
                onMouseLeave={() => setHoveredNodeId(null)}
                className={`transition-opacity duration-200 ${isFaded ? 'opacity-40' : 'opacity-100'}`}
              >
                <GraphNode
                  node={node}
                  isSelected={node.fileId === selectedFileId}
                  isTraceActive={node.fileId === activeTraceStepNodeId}
                  onSelect={onSelectNode}
                  onStartDrag={startNodeDrag}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Canvas Zoom Controls with Auto-Fit */}
      <div className="absolute bottom-4 left-4 z-30 flex items-center gap-1 bg-[#08090a]/90 backdrop-blur-md border border-[#23252a] rounded-lg p-1 shadow-lg">
        <button
          onClick={zoomIn}
          className="p-1.5 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#121316] rounded transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={zoomOut}
          className="p-1.5 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#121316] rounded transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-[#23252a] mx-0.5" />
        <span className="text-[11px] font-mono text-[#8a8f98] px-1.5 min-w-[42px] text-center">
          {Math.round(viewport.zoom * 100)}%
        </span>
        <div className="w-[1px] h-4 bg-[#23252a] mx-0.5" />
        <button
          onClick={autoFit}
          className="p-1.5 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#121316] rounded transition-colors cursor-pointer"
          title="Auto-Fit / Frame All"
        >
          <Maximize2 className="w-3.5 h-3.5 text-[#5e6ad2]" />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#121316] rounded transition-colors cursor-pointer"
          title="Reset Viewport"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Spatial Minimap */}
      <Minimap
        nodes={activeNodes}
        viewport={viewport}
        selectedFileId={selectedFileId}
      />
    </div>
  );
}
