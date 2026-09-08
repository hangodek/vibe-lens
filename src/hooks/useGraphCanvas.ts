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
  const focusAnimRef = useRef<number | null>(null);
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const cancelFocus = useCallback(() => {
    if (focusAnimRef.current) cancelAnimationFrame(focusAnimRef.current);
    focusAnimRef.current = null;
  }, []);

  // Auto-fit / Frame All camera with active pipeline prioritization
  const autoFit = useCallback(() => {
    if (!canvasRef.current || initialNodes.length === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const width = rect.width || 1200;
    const height = rect.height || 800;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    // Prioritize active pipeline steps over idle storage cards in trace mode
    const activePipelineNodes = initialNodes.filter((n) => n.badge !== 'Idle');
    const nodesToFrame = activePipelineNodes.length > 0 ? activePipelineNodes : initialNodes;

    nodesToFrame.forEach((n) => {
      const pos = nodePositions[n.id] || { x: n.x, y: n.y };
      if (pos.x < minX) minX = pos.x;
      if (pos.x + n.width > maxX) maxX = pos.x + n.width;
      if (pos.y < minY) minY = pos.y;
      if (pos.y + n.height > maxY) maxY = pos.y + n.height;
    });

    const graphWidth = Math.max(maxX - minX + 160, 400);
    const graphHeight = Math.max(maxY - minY + 160, 300);

    const zoomX = (width - 120) / graphWidth;
    const zoomY = (height - 120) / graphHeight;
    const targetZoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.4), 1.05);

    const centerX = minX + (maxX - minX) / 2;
    const centerY = minY + (maxY - minY) / 2;

    setViewport({
      x: Math.round(width / 2 - centerX * targetZoom),
      y: Math.round(height / 2 - centerY * targetZoom),
      zoom: Number(targetZoom.toFixed(2)),
    });
  }, [initialNodes, nodePositions]);

  // Keep a ref to the latest autoFit so the scope effect below only
  // re-fires on scopeKey changes — not on every drag (which changes
  // nodePositions and therefore autoFit's identity).
  const autoFitRef = useRef(autoFit);
  autoFitRef.current = autoFit;

  // Reset custom node drag positions and auto-center viewport whenever scope changes
  useEffect(() => {
    setNodePositions({});
    const timer = setTimeout(() => {
      autoFitRef.current();
    }, 60);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey]);

  // Re-fit on window resize
  useEffect(() => {
    const handleResize = () => autoFit();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [autoFit]);

  // Non-passive wheel event listener to PREVENT BROWSER ZOOM and enable focal zoom
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handleNativeWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (focusAnimRef.current) cancelAnimationFrame(focusAnimRef.current);
      focusAnimRef.current = null;

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
          x: Math.round(newX),
          y: Math.round(newY),
          zoom: nextZoom,
        };
      });
    };

    el.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleNativeWheel);
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Don't start panning from nodes or interactive UI chrome (toolbar, zoom controls, drawers)
    if (target.closest('.canvas-node, button, input, select, textarea, a')) return;
    cancelFocus();
    setIsPanning(true);
    setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
  }, [viewport.x, viewport.y, cancelFocus]);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (draggingNodeId) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const canvasX = (e.clientX - viewport.x) / viewport.zoom;
        const canvasY = (e.clientY - viewport.y) / viewport.zoom;
        setNodePositions((prev) => ({
          ...prev,
          [draggingNodeId]: {
            x: Math.round(canvasX - dragOffset.x),
            y: Math.round(canvasY - dragOffset.y),
          },
        }));
      });
      return;
    }

    if (!isPanning) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setViewport((prev) => ({
        ...prev,
        x: Math.round(e.clientX - panStart.x),
        y: Math.round(e.clientY - panStart.y),
      }));
    });
  }, [isPanning, panStart, draggingNodeId, viewport, dragOffset]);

  const handleMouseUp = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setIsPanning(false);
    setDraggingNodeId(null);
  }, []);

  // Release pan/drag even when the pointer is released outside the canvas
  useEffect(() => {
    const release = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setIsPanning(false);
      setDraggingNodeId(null);
    };
    window.addEventListener('mouseup', release);
    window.addEventListener('mouseleave', release);
    return () => {
      window.removeEventListener('mouseup', release);
      window.removeEventListener('mouseleave', release);
    };
  }, []);

  const zoomIn = () => setViewport((v) => ({ ...v, zoom: Math.min(v.zoom + 0.15, 2.5) }));
  const zoomOut = () => setViewport((v) => ({ ...v, zoom: Math.max(v.zoom - 0.15, 0.2) }));
  const resetView = () => setViewport({ x: 60, y: 50, zoom: 0.85 });

  /**
   * Fly the camera to center a node. Resolves exact node id first, then falls
   * back to the first node of a matching file (trace steps are file-keyed).
   * Skips when the node is already near the viewport center. Manual pan, wheel
   * zoom, or drag cancels an in-flight animation. Honors reduced-motion.
   */
  const focusNode = useCallback((nodeId: string) => {
    const el = canvasRef.current;
    if (!el || !nodeId) return;
    const n =
      initialNodes.find((x) => x.id === nodeId) ??
      initialNodes.find((x) => x.fileId === nodeId);
    if (!n) return;
    const pos = nodePositions[n.id] ?? { x: n.x, y: n.y };
    const rect = el.getBoundingClientRect();
    const width = rect.width || 1200;
    const height = rect.height || 800;

    const from = viewportRef.current;
    const targetZoom = Math.min(Math.max(from.zoom < 0.85 ? 1.0 : from.zoom, 0.2), 2.5);
    const to = {
      x: Math.round(width / 2 - (pos.x + n.width / 2) * targetZoom),
      y: Math.round(height / 2 - (pos.y + n.height / 2) * targetZoom),
      zoom: targetZoom,
    };

    // Already there? Don't animate.
    const nodeScreenX = pos.x * from.zoom + from.x + (n.width / 2) * from.zoom;
    const nodeScreenY = pos.y * from.zoom + from.y + (n.height / 2) * from.zoom;
    if (
      Math.abs(nodeScreenX - width / 2) < width * 0.3 &&
      Math.abs(nodeScreenY - height / 2) < height * 0.3 &&
      Math.abs(from.zoom - targetZoom) < 0.01
    ) {
      return;
    }

    if (focusAnimRef.current) cancelAnimationFrame(focusAnimRef.current);
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setViewport(to);
      return;
    }
    const start = { x: from.x, y: from.y, zoom: from.zoom };
    const t0 = performance.now();
    const DURATION = 250;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      setViewport({
        x: Math.round(start.x + (to.x - start.x) * eased),
        y: Math.round(start.y + (to.y - start.y) * eased),
        zoom: Number((start.zoom + (to.zoom - start.zoom) * eased).toFixed(3)),
      });
      if (t < 1) {
        focusAnimRef.current = requestAnimationFrame(step);
      } else {
        focusAnimRef.current = null;
      }
    };
    focusAnimRef.current = requestAnimationFrame(step);
  }, [initialNodes, nodePositions]);

  const startNodeDrag = (nodeId: string, e: MouseEvent, currentX: number, currentY: number) => {
    e.stopPropagation();
    cancelFocus();
    setDraggingNodeId(nodeId);
    const canvasX = (e.clientX - viewport.x) / viewport.zoom;
    const canvasY = (e.clientY - viewport.y) / viewport.zoom;
    setDragOffset({
      x: canvasX - currentX,
      y: canvasY - currentY,
    });
  };

  const activeNodes = initialNodes.map((n) => {
    const customPos = nodePositions[n.id];
    return customPos ? { ...n, x: customPos.x, y: customPos.y } : n;
  });

  return {
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
  };
}
