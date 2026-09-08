import type { ParsedCodeFile, NodeType, StateVariable, ComponentProp, ApiCall, MiniPreviewType, PipelineRole, FlowExplanation } from '../types/ast';
import { detectStack } from './stackDetector';
import { parseWithAdapter } from '../adapters/registry';

/** Deterministic djb2 hash, base36 — disambiguates truncated file slugs. */
function hashSlug(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function generateFlowExplanation(
  role: PipelineRole,
  fileName: string,
  apiCalls: ApiCall[],
  guards: string[],
  scriptBindings: string[],
  components: string[]
): FlowExplanation {
  if (role === 'view') {
    return {
      inbound: 'Visitor navigates to route in browser or clicks a link.',
      processing: `Renders HTML view template (${fileName}) and interpolates dynamic context data.`,
      outbound: scriptBindings.length > 0
        ? `Binds client interactivity via script: ${scriptBindings.join(', ')}.`
        : 'Dispatches form submissions to server route controllers.',
    };
  }
  if (role === 'script') {
    return {
      inbound: 'User triggers client event (click, form input, button press).',
      processing: `Executes client-side DOM logic, captures CSRF token, and manages UI states (${components.slice(0, 3).join(', ') || fileName}).`,
      outbound: apiCalls.length > 0
        ? `Dispatches async fetch to backend API: ${apiCalls.map((a) => `${a.method} ${a.endpoint}`).join(', ')}.`
        : 'Updates DOM directly with toasts, modals, or animations.',
    };
  }
  if (role === 'guard') {
    return {
      inbound: 'Intercepts incoming HTTP request before it reaches the controller handler.',
      processing: `Evaluates security constraints: ${guards.join(', ') || 'auth verification, session cookies, CSRF validation, or rate limits'}.`,
      outbound: 'Permits request to proceed if valid; otherwise blocks execution with redirect or HTTP error.',
    };
  }
  if (role === 'controller') {
    return {
      inbound: apiCalls.length > 0
        ? `Receives incoming HTTP route: ${apiCalls.map((a) => `${a.method} ${a.endpoint}`).join(', ')}.`
        : 'Receives routed HTTP request from router entrypoint.',
      processing: 'Parses request parameters, extracts form data, and orchestrates domain business services.',
      outbound: 'Returns JSON response or calls template engine to render the outbound view.',
    };
  }
  if (role === 'service') {
    return {
      inbound: 'Invoked by controller handlers with validated domain input data.',
      processing: 'Applies core business rules, entity validations, hashing, and calculation pipelines.',
      outbound: 'Calls database repository methods to persist, update, or retrieve records.',
    };
  }
  if (role === 'storage') {
    return {
      inbound: 'Invoked by service layer with query parameters or entity records.',
      processing: 'Executes SQL database queries, manages transaction boundaries, and maps rows to structs.',
      outbound: 'Returns typed entity records or database errors to the service layer.',
    };
  }
  if (role === 'gateway') {
    return {
      inbound: 'Application process bootstrap (server startup & HTTP listener).',
      processing: 'Connects to database, loads environment variables, and registers module routers.',
      outbound: 'Dispatches incoming network traffic across registered module route controllers.',
    };
  }
  return {
    inbound: 'Imported by multiple files across the codebase.',
    processing: 'Provides reusable utility functions, helpers, or shared type contracts.',
    outbound: 'Supplies calculation or format results to consuming callers.',
  };
}

export function parseSourceCode(path: string, code: string): ParsedCodeFile {
  const fileName = path.split('/').pop() || 'Untitled.tsx';
  const lines = code.split('\n');
  const lineCount = lines.length;
  const { stack, isBackend } = detectStack(path, code);
  const lowerPath = path.toLowerCase();

  // 1. Universal Architectural Role Detection
  let type: NodeType = isBackend ? 'api' : 'component';
  let pipelineRole: PipelineRole = 'utility';

  if (lowerPath.includes('cmd/') || lowerPath.includes('/server/') || code.includes('func main()')) {
    type = 'layout';
    pipelineRole = 'gateway';
  } else if (lowerPath.includes('middleware') || (lowerPath.endsWith('.go') && code.includes('func(') && code.includes('http.Handler'))) {
    type = 'context';
    pipelineRole = 'guard';
  } else if (lowerPath.includes('route') || lowerPath.includes('handler') || lowerPath.includes('controller') || lowerPath.includes('/api/')) {
    type = 'api';
    pipelineRole = 'controller';
  } else if (lowerPath.includes('service') || lowerPath.includes('usecase') || lowerPath.includes('logic')) {
    type = 'hook';
    pipelineRole = 'service';
  } else if (lowerPath.includes('repo') || lowerPath.includes('database') || lowerPath.includes('store') || lowerPath.includes('model')) {
    type = 'store';
    pipelineRole = 'storage';
  } else if (
    lowerPath.endsWith('.js') ||
    lowerPath.endsWith('.jsx') ||
    lowerPath.endsWith('.ts') ||
    (lowerPath.endsWith('.tsx') && !lowerPath.includes('pages/') && !lowerPath.includes('app/'))
  ) {
    // Any standalone script file is a script: client interactivity, listeners,
    // fetch calls. (Origin check: index.html <script src="app.js">.)
    type = 'component';
    pipelineRole = 'script';
  } else if (lowerPath.includes('template') || lowerPath.includes('pages/') || lowerPath.endsWith('.html') || lowerPath.endsWith('.vue') || lowerPath.endsWith('.svelte')) {
    type = 'page';
    pipelineRole = 'view';
  }

  // 2. Universal Import & Dependency Extractor
  const imports: string[] = [];
  const jsImportRegex = /(?:import\s+(?:{[^}]+}|\w+|\*\s+as\s+\w+)?\s+from\s+|from\s+)(?:['"]([^'"]+)['"]|([a-zA-Z0-9_.]+)\s+import)/g;
  let match;
  while ((match = jsImportRegex.exec(code)) !== null) {
    const raw = match[1] || match[2];
    const clean = raw.split('/').pop() || raw;
    if (!imports.includes(clean)) imports.push(clean);
  }
  const goImportRegex = /"([^"]+)"/g;
  if (lowerPath.endsWith('.go')) {
    while ((match = goImportRegex.exec(code)) !== null) {
      const imp = match[1];
      if (imp.includes('/')) {
        const segs = imp.split('/');
        const pkg = segs[segs.length - 1];
        if (pkg && !imports.includes(pkg)) imports.push(pkg);
        if (segs.length >= 2) {
          const subpkg = `${segs[segs.length - 2]}/${pkg}`;
          if (!imports.includes(subpkg)) imports.push(subpkg);
        }
      }
    }
  }

  // 3. Universal Function, Struct & Component Extractor
  const components: string[] = [];
  const symbolRegex = /(?:func\s+(?:\([^)]+\)\s+)?([A-Za-z0-9_]+)|type\s+([A-Za-z0-9_]+)\s+struct|def\s+([A-Za-z0-9_]+)|(?:export\s+)?(?:function|const)\s+([A-Za-z0-9_]+))/g;
  while ((match = symbolRegex.exec(code)) !== null) {
    const name = match[1] || match[2] || match[3] || match[4];
    if (name && name.length > 1 && !['if', 'for', 'while', 'switch', 'return', 'let', 'var', 'nil', 'err'].includes(name)) {
      if (!components.includes(name)) components.push(name);
    }
  }

  // 4. Universal Route & HTTP Endpoint Extractor
  const apiCalls: ApiCall[] = [];
  const goMuxRegex = /(?:HandleFunc|Handle)\(\s*["'](?:(GET|POST|PUT|DELETE|PATCH)\s+)?(\/[^"']*)["']/g;
  while ((match = goMuxRegex.exec(code)) !== null) {
    apiCalls.push({
      endpoint: match[2],
      method: (match[1] as any) || 'GET',
      triggeredBy: 'ServeMux Route Handler',
      purpose: `Routes ${match[1] || 'GET'} ${match[2]}`,
    });
  }
  const serverRouteRegex = /(?:@(?:app|router)\.|r\.|app\.)(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/gi;
  while ((match = serverRouteRegex.exec(code)) !== null) {
    apiCalls.push({
      endpoint: match[2],
      method: match[1].toUpperCase() as any,
      triggeredBy: 'Route Endpoint',
      purpose: `Exposes ${match[1].toUpperCase()} ${match[2]}`,
    });
  }
  const fetchRegex = /fetch\(\s*['"`]([^'"`]+)['"`](?:,\s*\{[^}]*method:\s*['"](\w+)['"])?/g;
  while ((match = fetchRegex.exec(code)) !== null) {
    apiCalls.push({
      endpoint: match[1],
      method: (match[2] as any) || 'GET',
      triggeredBy: 'Client Fetch Invocation',
      purpose: `Dispatches network request to ${match[1]}`,
    });
  }

  // 5. Middleware Guards & Security Wrappers
  const guards: string[] = [];
  const guardRegex = /middleware\.([A-Za-z0-9_]+)/g;
  while ((match = guardRegex.exec(code)) !== null) {
    const gName = `middleware.${match[1]}`;
    if (!guards.includes(gName)) guards.push(gName);
  }

  // 6. Client Script Bindings & Template Partials
  const scriptBindings: string[] = [];
  const scriptRegex = /<script\s+[^>]*src=["'][^"']*\/([a-zA-Z0-9_.-]+)/g;
  while ((match = scriptRegex.exec(code)) !== null) {
    if (!scriptBindings.includes(match[1])) scriptBindings.push(match[1]);
  }

  const renderedChildren: string[] = [...scriptBindings];
  const goTmplRegex = /\{\{template\s+["']([a-zA-Z0-9_]+)["']/g;
  while ((match = goTmplRegex.exec(code)) !== null) {
    if (!renderedChildren.includes(match[1])) renderedChildren.push(match[1]);
  }
  const tagRegex = /<([A-Z]\w+)(?:\s|\/|>)/g;
  while ((match = tagRegex.exec(code)) !== null) {
    if (!['React', 'Fragment'].includes(match[1]) && !renderedChildren.includes(match[1])) {
      renderedChildren.push(match[1]);
    }
  }

  // 7. States
  const states: StateVariable[] = [];
  const stateRegex = /const\s+\[\s*(\w+)\s*,\s*(\w+)\s*\]\s*=\s*useState(?:<[^>]+>)?\(([^)]*)\)/g;
  while ((match = stateRegex.exec(code)) !== null) {
    states.push({
      name: match[1],
      setter: match[2],
      initialValue: match[3].trim() || 'undefined',
      purpose: `Tracks dynamic value of '${match[1]}'`,
      modifiedBy: [match[2]],
    });
  }

  const flowExplanation = generateFlowExplanation(pipelineRole, fileName, apiCalls, guards, scriptBindings, components);

  // Collision-proof file id: short paths get a slug; long paths OR paths
  // that would otherwise collide (e.g. rack_protection.rb vs rack-protection.rb)
  // incorporate a deterministic hash of the raw path string so every distinct
  // source file has a unique CanvasNode id across any tree depth or naming style.
  const slug = path.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const id = `file-${slug.slice(0, 36)}-${hashSlug(path)}`;

  // Function-level IR via language adapter (deterministic; never random)
  const adapterResult = parseWithAdapter(id, path, code);

  return {
    id,
    path,
    name: fileName,
    type,
    code,
    lineCount,
    description: flowExplanation.processing,
    whyAiMadeThis: flowExplanation.outbound,
    imports,
    exports: components.slice(0, 5),
    components,
    states,
    props: [],
    hooks: [],
    apiCalls,
    renderedChildren,
    events: adapterResult.events.map((e) => ({
      name: e.name,
      handler: e.handler,
      targetAction: e.target ?? e.source,
    })),
    functions: adapterResult.functions,
    codeEvents: adapterResult.events,
    symbolConfidence: adapterResult.confidence,
    stack,
    pipelineRole,
    guards,
    scriptBindings,
    flowExplanation,
  };
}
