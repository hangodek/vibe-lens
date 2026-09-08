import { useState, useEffect, useMemo, memo } from 'react';
import type { CanvasNode, CanvasEdge } from '../../types/graph';
import { useGraphCanvas } from '../../hooks/useGraphCanvas';
import { GraphNode } from './GraphNode';
import { ConnectionEdge, computeEdgePillGeometry } from './ConnectionEdge';
import { EdgeDetailDrawer } from './EdgeDetailDrawer';
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

export function GraphCanvasComponent({
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
  const [selectedEdge, setSelectedEdge] = useState<CanvasEdge | null>(null);

  // Map to find nodes quickly for edge drawing (memoized: stable identity for downstream memos)
  const nodeMap = useMemo(() => {
    const map = new Map<string, CanvasNode>();
    activeNodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [activeNodes]);

  // Clear a stale edge selection when the workspace/trace changes or its endpoints vanish
  useEffect(() => {
    if (!selectedEdge) return;
    const stillExists = edges.some((e) => e.id === selectedEdge.id);
    const fromNode = nodeMap.get(selectedEdge.from);
    const toNode = nodeMap.get(selectedEdge.to);
    if (!stillExists || !fromNode || !toNode) {
      setSelectedEdge(null);
    }
  }, [scopeKey, edges, nodeMap, selectedEdge]);

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

  // Pre-calculate deterministic in/out port ordering so parallel lines never overlap
  const outEdgesMap = useMemo(() => {
    const map = new Map<string, string[]>();
    edges.forEach((e) => {
      if (!map.has(e.from)) map.set(e.from, []);
      map.get(e.from)!.push(e.id);
    });
    return map;
  }, [edges]);

  const inEdgesMap = useMemo(() => {
    const map = new Map<string, string[]>();
    edges.forEach((e) => {
      if (!map.has(e.to)) map.set(e.to, []);
      map.get(e.to)!.push(e.id);
    });
    return map;
  }, [edges]);

  // Pre-calculate and relax 2D pill positions across ALL edges so no two pills on the canvas ever collide
  const edgePillPositions = useMemo(() => {
    const posMap: Record<string, { x: number; y: number; width: number; height: number }> = {};
    edges.forEach((edge) => {
      const fromNode = nodeMap.get(edge.from);
      const toNode = nodeMap.get(edge.to);
      if (!fromNode || !toNode) return;

      const fromEdges = outEdgesMap.get(edge.from) || [];
      const outPortIndex = fromEdges.indexOf(edge.id);
      const totalOutPorts = fromEdges.length;

      const toEdges = inEdgesMap.get(edge.to) || [];
      const inPortIndex = toEdges.indexOf(edge.id);
      const totalInPorts = toEdges.length;

      posMap[edge.id] = computeEdgePillGeometry(
        edge,
        fromNode,
        toNode,
        outPortIndex,
        totalOutPorts,
        inPortIndex,
        totalInPorts
      );
    });

    // 2D bounding-box collision relaxation pass (3 iterations)
    const edgeList = edges.filter((e) => posMap[e.id]);
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < edgeList.length; i++) {
        for (let j = i + 1; j < edgeList.length; j++) {
          const p1 = posMap[edgeList[i].id];
          const p2 = posMap[edgeList[j].id];
          if (!p1 || !p2) continue;

          const dx = Math.abs(p1.x - p2.x);
          const dy = Math.abs(p1.y - p2.y);
          const requiredX = (p1.width + p2.width) / 2 + 14;
          const requiredY = 28;

          if (dx < requiredX && dy < requiredY) {
            const pushY = (requiredY - dy) / 2 + 2;
            if (p1.y <= p2.y) {
              p1.y -= pushY;
              p2.y += pushY;
            } else {
              p1.y += pushY;
              p2.y -= pushY;
            }
          }
        }
      }
    }

    return posMap;
  }, [edges, nodeMap, outEdgesMap, inEdgesMap]);

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
      {/* Transformed Stage - Crisp Vector Scaling with Zero Blur */}
      <div
        className={`absolute origin-top-left ${isPanning ? 'will-change-transform' : ''}`}
        style={{
          transform: `translate3d(${Math.round(viewport.x)}px, ${Math.round(viewport.y)}px, 0) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
          width: '4000px',
          height: '3000px',
        }}
      >
        {/* SVG Edges Layer with Separated Line & Pill Passes (Zero line-over-pill bug) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {/* Pass 1: All Paths, Lines & Terminal Arrows */}
          <g id="canvas-edge-paths" className="pointer-events-auto">
            {edges.map((edge) => {
              const fromNode = nodeMap.get(edge.from);
              const toNode = nodeMap.get(edge.to);
              if (!fromNode || !toNode) return null;

              const fromEdges = outEdgesMap.get(edge.from) || [];
              const outPortIndex = fromEdges.indexOf(edge.id);
              const totalOutPorts = fromEdges.length;

              const toEdges = inEdgesMap.get(edge.to) || [];
              const inPortIndex = toEdges.indexOf(edge.id);
              const totalInPorts = toEdges.length;

              return (
                <ConnectionEdge
                  key={`path-${edge.id}`}
                  edge={edge}
                  isHighlighted={connectedEdgeIds.has(edge.id) || selectedEdge?.id === edge.id}
                  fromNode={fromNode}
                  toNode={toNode}
                  outPortIndex={outPortIndex}
                  totalOutPorts={totalOutPorts}
                  inPortIndex={inPortIndex}
                  totalInPorts={totalInPorts}
                  layer="path"
                  onSelect={setSelectedEdge}
                />
              );
            })}
          </g>

          {/* Pass 2: All Text Pills & Badges (Rendered strictly on top so no line can ever cover them!) */}
          <g id="canvas-edge-pills" className="pointer-events-auto">
            {edges.map((edge) => {
              const fromNode = nodeMap.get(edge.from);
              const toNode = nodeMap.get(edge.to);
              if (!fromNode || !toNode) return null;

              const fromEdges = outEdgesMap.get(edge.from) || [];
              const outPortIndex = fromEdges.indexOf(edge.id);
              const totalOutPorts = fromEdges.length;

              const toEdges = inEdgesMap.get(edge.to) || [];
              const inPortIndex = toEdges.indexOf(edge.id);
              const totalInPorts = toEdges.length;

              return (
                <ConnectionEdge
                  key={`pill-${edge.id}`}
                  edge={edge}
                  isHighlighted={connectedEdgeIds.has(edge.id) || selectedEdge?.id === edge.id}
                  fromNode={fromNode}
                  toNode={toNode}
                  outPortIndex={outPortIndex}
                  totalOutPorts={totalOutPorts}
                  inPortIndex={inPortIndex}
                  totalInPorts={totalInPorts}
                  overridePillPos={edgePillPositions[edge.id]}
                  layer="pill"
                  onSelect={setSelectedEdge}
                />
              );
            })}
          </g>
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
                style={{ opacity: isFaded ? 0.35 : 1 }}
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

      {/* Slide-Up Bottom Data Flow Drawer: Answers "What happened & what is passed?" */}
      <EdgeDetailDrawer
        edge={selectedEdge}
        fromNode={selectedEdge ? nodeMap.get(selectedEdge.from) : undefined}
        toNode={selectedEdge ? nodeMap.get(selectedEdge.to) : undefined}
        onClose={() => setSelectedEdge(null)}
        onDeepDiveFile={(fileId) => {
          onSelectNode(fileId);
        }}
      />
    </div>
  );
}

export const GraphCanvas = memo(GraphCanvasComponent);
