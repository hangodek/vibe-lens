import type { ParsedCodeFile, NodeType, StateVariable, ComponentProp, ApiCall, MiniPreviewType } from '../types/ast';
import { detectStack } from './stackDetector';

export function parseSourceCode(path: string, code: string): ParsedCodeFile {
  const fileName = path.split('/').pop() || 'Untitled.tsx';
  const lines = code.split('\n');
  const lineCount = lines.length;
  const { stack, isBackend } = detectStack(path, code);
  const lowerPath = path.toLowerCase();

  // 1. Universal Architectural Role Detection
  let type: NodeType = isBackend ? 'api' : 'component';
  if (lowerPath.includes('cmd/') || lowerPath.includes('/server/') || code.includes('func main()')) {
    type = 'layout'; // Server Entrypoint / Root Runner
  } else if (lowerPath.includes('template') || lowerPath.includes('pages/') || lowerPath.endsWith('.html') || lowerPath.endsWith('.vue') || lowerPath.endsWith('.svelte')) {
    type = 'page'; // Screen / View
  } else if (lowerPath.includes('route') || lowerPath.includes('handler') || lowerPath.includes('controller') || lowerPath.includes('/api/')) {
    type = 'api'; // HTTP Controller / Router
  } else if (lowerPath.includes('service') || lowerPath.includes('usecase') || lowerPath.includes('logic')) {
    type = 'hook'; // Business Logic Service
  } else if (lowerPath.includes('repo') || lowerPath.includes('database') || lowerPath.includes('store') || lowerPath.includes('model')) {
    type = 'store'; // Data Storage / Repository
  } else if (lowerPath.includes('middleware')) {
    type = 'context'; // Middleware Security Guard
  }

  // 2. Universal Import & Dependency Extractor (Go, Python, JS/TS, Rust)
  const imports: string[] = [];
  const jsImportRegex = /(?:import\s+(?:{[^}]+}|\w+|\*\s+as\s+\w+)?\s+from\s+|from\s+)(?:['"]([^'"]+)['"]|([a-zA-Z0-9_.]+)\s+import)/g;
  let match;
  while ((match = jsImportRegex.exec(code)) !== null) {
    const raw = match[1] || match[2];
    const clean = raw.split('/').pop() || raw;
    if (!imports.includes(clean)) imports.push(clean);
  }
  // Go imports: e.g. "car.go/internal/product" -> "product" and "internal/product"
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
  // Functions: JS/TS, Python def, Go func, struct types
  const symbolRegex = /(?:func\s+(?:\([^)]+\)\s+)?([A-Za-z0-9_]+)|type\s+([A-Za-z0-9_]+)\s+struct|def\s+([A-Za-z0-9_]+)|(?:export\s+)?(?:function|const)\s+([A-Za-z0-9_]+))/g;
  while ((match = symbolRegex.exec(code)) !== null) {
    const name = match[1] || match[2] || match[3] || match[4];
    if (name && name.length > 1 && !['if', 'for', 'while', 'switch', 'return', 'let', 'var', 'nil', 'err'].includes(name)) {
      if (!components.includes(name)) components.push(name);
    }
  }

  // 4. Universal Route & HTTP Endpoint Extractor (Go 1.22 ServeMux, Gin, FastAPI, Express)
  const apiCalls: ApiCall[] = [];
  // Go 1.22 ServeMux: mux.HandleFunc("GET /products", h.ShowList)
  const goMuxRegex = /(?:HandleFunc|Handle)\(\s*["'](?:(GET|POST|PUT|DELETE|PATCH)\s+)?(\/[^"']*)["']/g;
  while ((match = goMuxRegex.exec(code)) !== null) {
    apiCalls.push({
      endpoint: match[2],
      method: (match[1] as any) || 'GET',
      triggeredBy: 'ServeMux Route Handler',
      purpose: `Routes ${match[1] || 'GET'} ${match[2]}`,
    });
  }
  // FastAPI / Flask / Express / Gin
  const serverRouteRegex = /(?:@(?:app|router)\.|r\.|app\.)(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/gi;
  while ((match = serverRouteRegex.exec(code)) !== null) {
    apiCalls.push({
      endpoint: match[2],
      method: match[1].toUpperCase() as any,
      triggeredBy: 'Route Endpoint',
      purpose: `Exposes ${match[1].toUpperCase()} ${match[2]}`,
    });
  }
  // Client fetch
  const fetchRegex = /fetch\(\s*['"`]([^'"`]+)['"`](?:,\s*\{[^}]*method:\s*['"](\w+)['"])?/g;
  while ((match = fetchRegex.exec(code)) !== null) {
    apiCalls.push({
      endpoint: match[1],
      method: (match[2] as any) || 'GET',
      triggeredBy: 'HTTP Client Invocation',
      purpose: `Dispatches network request to ${match[1]}`,
    });
  }

  // 5. Universal Template Partials & Rendered Children
  const renderedChildren: string[] = [];
  // Go template: {{template "product_card" .}}
  const goTmplRegex = /\{\{template\s+["']([a-zA-Z0-9_]+)["']/g;
  while ((match = goTmplRegex.exec(code)) !== null) {
    if (!renderedChildren.includes(match[1])) renderedChildren.push(match[1]);
  }
  // JSX / XML tags
  const tagRegex = /<([A-Z]\w+)(?:\s|\/|>)/g;
  while ((match = tagRegex.exec(code)) !== null) {
    if (!['React', 'Fragment'].includes(match[1]) && !renderedChildren.includes(match[1])) {
      renderedChildren.push(match[1]);
    }
  }
  // Script / Client JS linked in HTML
  const scriptRegex = /<script\s+[^>]*src=["'][^"']*\/([a-zA-Z0-9_.]+)/g;
  while ((match = scriptRegex.exec(code)) !== null) {
    if (!renderedChildren.includes(match[1])) renderedChildren.push(match[1]);
  }

  // 6. Universal State Extractor (React useState, Vue ref, Svelte $state, Go fields)
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

  // 7. Event Handlers
  const events: { name: string; handler: string; targetAction: string }[] = [];
  const eventRegex = /(?:on|@|v-on:)([A-Za-z]+)=\{(\w+)\}/g;
  while ((match = eventRegex.exec(code)) !== null) {
    events.push({
      name: match[1].toLowerCase(),
      handler: match[2],
      targetAction: `Triggers ${match[2]} on event`,
    });
  }

  let previewType: MiniPreviewType = isBackend ? 'api-schema' : 'generic';
  if (stack === 'vue') previewType = 'vue-template';
  if (stack === 'svelte') previewType = 'svelte-runes';
  if (stack === 'python') previewType = 'python-service';

  const id = 'file-' + Math.random().toString(36).substring(2, 9);

  return {
    id,
    path,
    name: fileName,
    type,
    code,
    lineCount,
    description: `A ${stack} ${type} file with ${lineCount} lines containing ${components.slice(0, 3).join(', ') || fileName}.`,
    whyAiMadeThis: `Modularized ${stack} unit generated by AI to isolate state and responsibilities.`,
    imports,
    exports: components.slice(0, 5),
    components,
    states,
    props: [],
    hooks: [],
    apiCalls,
    renderedChildren,
    events,
    stack,
    previewType,
  };
}
