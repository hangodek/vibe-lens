import { useState, useEffect, useMemo, memo } from 'react';
import type { CanvasNode, CanvasEdge } from '../../types/graph';
import { useGraphCanvas } from '../../hooks/useGraphCanvas';
import { computeFocusDepths, edgeFocusDepth, nodeOpacityForDepth } from '../../utils/focusDepths';
import { GraphNode } from './GraphNode';
import { ConnectionEdge, computeEdgePillGeometry } from './ConnectionEdge';
import { EdgeDetailDrawer } from './EdgeDetailDrawer';
import { Minimap } from './Minimap';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';

interface GraphCanvasProps {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedFileId: string | null;
  selectedNodeId?: string | null;
  /** When this id changes, the camera flies to center that node. */
  focusNodeId?: string | null;
  activeTraceStepNodeId?: string;
  scopeKey?: string;
  onSelectNode: (fileId: string) => void;
}

export function GraphCanvasComponent({
  nodes,
  edges,
  selectedFileId,
  selectedNodeId,
  focusNodeId,
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
    focusNode,
    startNodeDrag,
    activeNodes,
  } = useGraphCanvas(nodes, scopeKey);

  // Fly the camera whenever the focus target changes (selection / trace step).
  useEffect(() => {
    if (focusNodeId) focusNode(focusNodeId);
  }, [focusNodeId, focusNode]);

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

  // Hop-depth focus grading: the focus node stays bright, direct
  // callers/callees stay bright, depth-2 dims, everything else fades.
  // Hover previews live; selection pins. Falls back to the file id so
  // file-level selection (explorer, trace steps) still works.
  const activeFocusId = hoveredNodeId || selectedNodeId || selectedFileId;
  const nodeDepths = useMemo(() => {
    if (!activeFocusId) return new Map<string, number>();
    const known = new Set(activeNodes.map((n) => n.id));
    const seeds = activeNodes
      .filter((n) => n.id === activeFocusId || n.fileId === activeFocusId)
      .map((n) => n.id);
    const merged = new Map<string, number>();
    for (const seed of seeds) {
      for (const [id, d] of computeFocusDepths(edges, seed, known)) {
        if (!merged.has(id) || merged.get(id)! > d) merged.set(id, d);
      }
    }
    return merged;
  }, [activeFocusId, activeNodes, edges]);

  const connectedEdgeIds = new Set<string>();
  if (activeFocusId) {
    edges.forEach((e) => {
      const d = edgeFocusDepth(nodeDepths.get(e.from), nodeDepths.get(e.to));
      if (d <= 1) connectedEdgeIds.add(e.id);
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

    // 2D bounding-box collision relaxation pass (3 iterations).
    // Same-column (vertical) pills resolve HORIZONTALLY so they stay inside
    // their safe gap; everything else resolves vertically as before.
    const isVerticalEdge = (e: CanvasEdge) => {
      const f = nodeMap.get(e.from);
      const t = nodeMap.get(e.to);
      return !!f && !!t && Math.abs(f.x - t.x) < 40;
    };
    const edgeList = edges.filter((e) => posMap[e.id]);
    for (let pass = 0; pass < 6; pass++) {
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
            if (isVerticalEdge(edgeList[i]) && isVerticalEdge(edgeList[j])) {
              const pushX = (requiredX - dx) / 2 + 2;
              if (p1.x <= p2.x) {
                p1.x = Math.max(p1.width / 2 + 4, p1.x - pushX);
                p2.x = p2.x + pushX;
              } else {
                p1.x = p1.x + pushX;
                p2.x = Math.max(p2.width / 2 + 4, p2.x - pushX);
              }
            } else {
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

              const pathDepth = activeFocusId
                ? edgeFocusDepth(nodeDepths.get(edge.from), nodeDepths.get(edge.to))
                : undefined;

              return (
                <ConnectionEdge
                  key={`path-${edge.id}`}
                  edge={edge}
                  isHighlighted={connectedEdgeIds.has(edge.id) || selectedEdge?.id === edge.id}
                  focusDepth={pathDepth}
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

              const pillDepth = activeFocusId
                ? edgeFocusDepth(nodeDepths.get(edge.from), nodeDepths.get(edge.to))
                : undefined;
              // Pills beyond depth 2 stay hidden so the focused path declutters.
              if (pillDepth !== undefined && pillDepth >= 3) return null;

              return (
                <ConnectionEdge
                  key={`pill-${edge.id}`}
                  edge={edge}
                  isHighlighted={connectedEdgeIds.has(edge.id) || selectedEdge?.id === edge.id}
                  focusDepth={pillDepth}
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
            const depth = activeFocusId ? (nodeDepths.get(node.id) ?? Infinity) : undefined;
            const opacity = nodeOpacityForDepth(depth);
            const isSelected =
              selectedNodeId != null
                ? node.id === selectedNodeId
                : node.fileId === selectedFileId;

            return (
              <div
                key={node.id}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                style={{ opacity, transition: 'opacity 150ms ease-out' }}
              >
                <GraphNode
                  node={node}
                  isSelected={isSelected}
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
