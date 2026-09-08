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

// ---- Language-agnostic function IR ----
// The core engine (layout, canvas, inspector, traces) only ever sees these
// types. Language adapters (src/adapters/*) convert source text into this IR,
// so supporting a new language never touches core code.

export type SymbolKind =
  | 'function'
  | 'method'
  | 'class'
  | 'listener'
  | 'route'
  | 'entrypoint';

export interface SymbolCallSite {
  /** Name as written at the call site, e.g. "playNoteSound", "s.repo.FindByEmail" */
  name: string;
  /** Short base name used for resolution, e.g. "FindByEmail" */
  baseName: string;
  /** Raw argument text, e.g. "email, password" */
  args: string;
  /** 1-indexed line number of the call */
  line: number;
}

export interface ParsedSymbol {
  /** Deterministic id: `${fileId}::${name}` (+ `#n` suffix on collision) */
  id: string;
  fileId: string;
  kind: SymbolKind;
  name: string;
  /** Full signature as written, e.g. "function playNoteSound(noteName)" */
  signature: string;
  /** Parameter names, e.g. ["noteName"] */
  params: string[];
  /** 1-indexed, inclusive */
  startLine: number;
  endLine: number;
  /** Exact source lines startLine..endLine */
  body: string;
  /** Intra-file calls found in the body */
  calls: SymbolCallSite[];
  /** Filled post-parse by cross-referencing all symbols in the file */
  calledBy: string[];
  /** Adapter confidence: 'high' (grammar-grade) | 'low' (generic fallback) */
  confidence: 'high' | 'low';
  /** AI-written prose, filled by enrichment (never topology) */
  plainEnglish?: string;
  whyCalled?: string;
}

export interface CodeEvent {
  /** e.g. "click", "keydown", "DOMContentLoaded", "change" */
  name: string;
  /** e.g. "addEventListener", "@click", "onClick" */
  source: string;
  /** Handler symbol name if resolvable, e.g. "handleNoteOn" */
  handler: string;
  /** 1-indexed line number */
  line: number;
  /** e.g. ".piano-key-white", "window", "#theme-select" */
  target?: string;
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
  /** Function-level symbols from the language adapter (absent on legacy/preset files) */
  functions?: ParsedSymbol[];
  /** DOM/framework event bindings with line numbers */
  codeEvents?: CodeEvent[];
  /** 'high' when a dedicated adapter parsed this file, 'low' for generic fallback */
  symbolConfidence?: 'high' | 'low';
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
  focalCode?: string;
  focalLine?: number;
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
  /** Function-level walk: symbol ids from ParsedSymbol.id, when the trace is symbol-granular */
  activeFunctionId?: string;
  targetFunctionId?: string;
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
    callerFunction?: string;
    targetFunction?: string;
    parametersPassed?: string;
    whyCalled?: string;
  }>;
}
