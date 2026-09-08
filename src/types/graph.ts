import type { NodeType, MiniPreviewType, PipelineRole } from './ast';

export interface CanvasNode {
  id: string;
  fileId: string;
  name: string;
  path?: string;
  type: NodeType;
  role?: PipelineRole;
  plainEnglish?: string;
  inbound?: string;
  outbound?: string;
  routes?: string[];
  dataEntities?: string[];
  focalCode?: string;
  focalLine?: number;
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
  fromName?: string;
  toName?: string;
  label?: string;
  dataPassed?: string;
  whatHappens?: string;
  codeSnippet?: string;
  callerFunction?: string;
  targetFunction?: string;
  parametersPassed?: string;
  whyCalled?: string;
  type: 'render' | 'data' | 'api' | 'event';
  isActive?: boolean;
  animated?: boolean;
}

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}
