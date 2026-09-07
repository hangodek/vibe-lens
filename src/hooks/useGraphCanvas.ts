import { useState, useCallback, useRef, useEffect, type MouseEvent } from 'react';
import type { ViewportState, CanvasNode } from '../types/graph';

export function useGraphCanvas(initialNodes: CanvasNode[], scopeKey: string = '') {
  const [viewport, setViewport] = useState<ViewportState>({ x: 60, y: 50, zoom: 0.85 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Reset custom node drag positions whenever scope changes
  useEffect(() => {
    setNodePositions({});
  }, [scopeKey]);

  // Non-passive wheel event listener to PREVENT BROWSER ZOOM and enable focal zoom
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handleNativeWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setViewport((prev) => {
        let zoomFactor = 1;
        if (e.ctrlKey) {
          zoomFactor = Math.exp(-e.deltaY * 0.015);
        } else {
          zoomFactor = e.deltaY < 0 ? 1.09 : 0.91;
        }

        const nextZoom = Math.min(Math.max(prev.zoom * zoomFactor, 0.2), 2.5);
        const newX = mouseX - (mouseX - prev.x) * (nextZoom / prev.zoom);
        const newY = mouseY - (mouseY - prev.y) * (nextZoom / prev.zoom);

        return {
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY * 10) / 10,
          zoom: nextZoom,
        };
      });
    };

    el.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleNativeWheel);
    };
  }, []);

  // Pan canvas via mouse drag with hardware vsync requestAnimationFrame
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('.canvas-node')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
  }, [viewport]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanning && !draggingNodeId) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const clientX = e.clientX;
    const clientY = e.clientY;

    rafRef.current = requestAnimationFrame(() => {
      if (isPanning) {
        setViewport((prev) => ({
          ...prev,
          x: clientX - panStart.x,
          y: clientY - panStart.y,
        }));
      } else if (draggingNodeId) {
        const newX = (clientX - viewport.x) / viewport.zoom - dragOffset.x;
        const newY = (clientY - viewport.y) / viewport.zoom - dragOffset.y;
        setNodePositions((prev) => ({
          ...prev,
          [draggingNodeId]: { x: Math.round(newX), y: Math.round(newY) }
        }));
      }
    });
  }, [isPanning, panStart, draggingNodeId, viewport, dragOffset]);

  const handleMouseUp = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setIsPanning(false);
    setDraggingNodeId(null);
  }, []);

  const zoomIn = () => setViewport((v) => ({ ...v, zoom: Math.min(v.zoom + 0.15, 2.5) }));
  const zoomOut = () => setViewport((v) => ({ ...v, zoom: Math.max(v.zoom - 0.15, 0.2) }));
  const resetView = () => setViewport({ x: 60, y: 50, zoom: 0.85 });

  // Auto-fit / Frame All camera
  const autoFit = useCallback(() => {
    if (!canvasRef.current || initialNodes.length === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const width = rect.width || 1200;
    const height = rect.height || 800;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    initialNodes.forEach((n) => {
      const pos = nodePositions[n.id] || { x: n.x, y: n.y };
      if (pos.x < minX) minX = pos.x;
      if (pos.x + n.width > maxX) maxX = pos.x + n.width;
      if (pos.y < minY) minY = pos.y;
      if (pos.y + n.height > maxY) maxY = pos.y + n.height;
    });

    const graphWidth = Math.max(maxX - minX + 120, 400);
    const graphHeight = Math.max(maxY - minY + 120, 300);

    const zoomX = (width - 100) / graphWidth;
    const zoomY = (height - 100) / graphHeight;
    const targetZoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.3), 1.1);

    const centerX = minX + (maxX - minX) / 2;
    const centerY = minY + (maxY - minY) / 2;

    setViewport({
      x: Math.round(width / 2 - centerX * targetZoom),
      y: Math.round(height / 2 - centerY * targetZoom),
      zoom: targetZoom,
    });
  }, [initialNodes, nodePositions]);

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

  // Merge default node positions with custom drag offsets
  const activeNodes = initialNodes.map((node) => {
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
    zoomIn,
    zoomOut,
    resetView,
    autoFit,
    startNodeDrag,
    activeNodes,
  };
}
