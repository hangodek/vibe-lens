import type { NodeType, MiniPreviewType } from './ast';

export interface CanvasNode {
  id: string;
  fileId: string;
  name: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  badge?: string;
  stateCount?: number;
  hookCount?: number;
  apiCount?: number;
  isEntry?: boolean;
  previewType?: MiniPreviewType;
  riskScore?: 'low' | 'moderate' | 'high';
}

export interface CanvasEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  type: 'render' | 'data' | 'api' | 'event';
  isActive?: boolean;
  animated?: boolean;
}

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}
