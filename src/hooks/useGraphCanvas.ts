import { useState, useCallback, useRef, type MouseEvent, type WheelEvent } from 'react';
import type { ViewportState, CanvasNode } from '../types/graph';

export function useGraphCanvas(initialNodes: CanvasNode[]) {
  const [viewport, setViewport] = useState<ViewportState>({ x: 40, y: 40, zoom: 0.9 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Pan canvas
  const handleMouseDown = useCallback((e: MouseEvent) => {
    // Only pan if clicking canvas background (not inside a node)
    if ((e.target as HTMLElement).closest('.canvas-node')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
  }, [viewport]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning) {
      setViewport((prev) => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      }));
    } else if (draggingNodeId) {
      const newX = (e.clientX - viewport.x) / viewport.zoom - dragOffset.x;
      const newY = (e.clientY - viewport.y) / viewport.zoom - dragOffset.y;
      setNodePositions((prev) => ({
        ...prev,
        [draggingNodeId]: { x: Math.round(newX), y: Math.round(newY) }
      }));
    }
  }, [isPanning, panStart, draggingNodeId, viewport, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggingNodeId(null);
  }, []);

  // Zoom canvas
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setViewport((prev) => {
      const nextZoom = Math.min(Math.max(prev.zoom * zoomFactor, 0.35), 2.2);
      return { ...prev, zoom: nextZoom };
    });
  }, []);

  const zoomIn = () => setViewport(v => ({ ...v, zoom: Math.min(v.zoom + 0.15, 2.2) }));
  const zoomOut = () => setViewport(v => ({ ...v, zoom: Math.max(v.zoom - 0.15, 0.35) }));
  const resetView = () => setViewport({ x: 40, y: 40, zoom: 0.9 });

  const startNodeDrag = (nodeId: string, e: MouseEvent, currentX: number, currentY: number) => {
    e.stopPropagation();
    setDraggingNodeId(nodeId);
    const canvasX = (e.clientX - viewport.x) / viewport.zoom;
    const canvasY = (e.clientY - viewport.y) / viewport.zoom;
    setDragOffset({
      x: canvasX - currentX,
      y: canvasY - currentY,
    });
  };

  // Merge default node positions with drag offsets
  const activeNodes = initialNodes.map(node => {
    const custom = nodePositions[node.id];
    return custom ? { ...node, x: custom.x, y: custom.y } : node;
  });

  return {
    viewport,
    setViewport,
    canvasRef,
    isPanning,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    zoomIn,
    zoomOut,
    resetView,
    startNodeDrag,
    activeNodes
  };
}
