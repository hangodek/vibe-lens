export type NodeType = 
  | 'page' 
  | 'layout' 
  | 'component' 
  | 'hook' 
  | 'context' 
  | 'api' 
  | 'store';

export type LayerMode = 'screen' | 'data' | 'trace';

export type StackType = 
  | 'react'
  | 'vue'
  | 'svelte'
  | 'python'
  | 'go'
  | 'html'
  | 'generic';

export type PipelineRole = 
  | 'view' 
  | 'script' 
  | 'guard' 
  | 'controller' 
  | 'service' 
  | 'storage' 
  | 'gateway' 
  | 'utility';

export interface FlowExplanation {
  inbound: string;
  processing: string;
  outbound: string;
}

export type MiniPreviewType =
  | 'prompt-bar'
  | 'canvas'
  | 'gallery'
  | 'meter'
  | 'billing-modal'
  | 'cart-drawer'
  | 'product-card'
  | 'api-terminal'
  | 'api-schema'
  | 'vue-template'
  | 'svelte-runes'
  | 'python-service'
  | 'generic';

export interface BlastRadius {
  score: 'low' | 'moderate' | 'high';
  riskLabel: string;
  description: string;
  impactedFiles: string[];
  safeInvariants: string[];
}

export interface ScreenLocation {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  zoneLabel: string;
}

export interface StateVariable {
  name: string;
  setter: string;
  initialValue: string;
  purpose: string;
  modifiedBy: string[];
}

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface ApiCall {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  triggeredBy: string;
  purpose: string;
}

export interface ApiContract {
  endpoint: string;
  method: string;
  requestSchema?: string;
  responseSchema?: string;
}

export interface ParsedCodeFile {
  id: string;
  path: string;
  name: string;
  type: NodeType;
  code: string;
  lineCount: number;
  description: string;
  whyAiMadeThis: string;
  imports: string[];
  exports: string[];
  components: string[];
  states: StateVariable[];
  props: ComponentProp[];
  hooks: string[];
  apiCalls: ApiCall[];
  renderedChildren: string[];
  events: { name: string; handler: string; targetAction: string }[];
  previewType?: MiniPreviewType;
  stack?: StackType;
  pipelineRole?: PipelineRole;
  guards?: string[];
  scriptBindings?: string[];
  flowExplanation?: FlowExplanation;
  apiContract?: ApiContract;
  blastRadius?: BlastRadius;
  screenLocation?: ScreenLocation;
  routes?: string[];
  dataEntities?: string[];
}

export interface StorybookNarrative {
  chapterNumber: number;
  chapterTitle: string;
  story: string;
  humanCausality: string;
}

export interface TraceStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  activeNodeId: string;
  targetNodeId?: string;
  payload?: Record<string, unknown>;
  fileSnippet?: string;
  lineHighlight?: number;
  codeLine?: string;
  dataPassed?: string;
  codeExplanation?: string;
  storybook?: StorybookNarrative;
}

export interface ExecutionTrace {
  id: string;
  title: string;
  triggerLabel: string;
  description: string;
  steps: TraceStep[];
}

export interface VibeProject {
  id: string;
  name: string;
  framework: string;
  tagline: string;
  description: string;
  files: ParsedCodeFile[];
  traces: ExecutionTrace[];
  connections?: Array<{
    from: string;
    to: string;
    whatHappens: string;
    dataPassed: string;
    codeSnippet?: string;
  }>;
}
