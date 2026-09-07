import type { ParsedCodeFile, NodeType, StateVariable, ComponentProp, ApiCall, MiniPreviewType } from '../types/ast';
import { detectStack } from './stackDetector';

export function parseSourceCode(path: string, code: string): ParsedCodeFile {
  const fileName = path.split('/').pop() || 'Untitled.tsx';
  const lines = code.split('\n');
  const lineCount = lines.length;
  const { stack, isBackend } = detectStack(path, code);

  // 1. Determine Node Type
  let type: NodeType = isBackend ? 'api' : 'component';
  if (path.includes('/api/') || path.includes('route.') || code.includes('@app.') || code.includes('gin.Context')) {
    type = 'api';
  } else if (path.includes('use') || path.startsWith('hooks/') || fileName.startsWith('use')) {
    type = 'hook';
  } else if (path.includes('store') || path.includes('zustand') || path.includes('pinia') || code.includes('defineStore')) {
    type = 'store';
  } else if (path.includes('context') || path.includes('Context')) {
    type = 'context';
  } else if (fileName.startsWith('layout.') || path.includes('layout.')) {
    type = 'layout';
  } else if (fileName.startsWith('page.') || fileName.startsWith('+page') || path.includes('pages/')) {
    type = 'page';
  }

  // 2. Extract Imports (Universal: JS/TS, Python, Go, Rust)
  const imports: string[] = [];
  const jsImportRegex = /(?:import\s+(?:{[^}]+}|\w+|\*\s+as\s+\w+)?\s+from\s+|from\s+)(?:['"]([^'"]+)['"]|([a-zA-Z0-9_.]+)\s+import)/g;
  let match;
  while ((match = jsImportRegex.exec(code)) !== null) {
    const raw = match[1] || match[2];
    const clean = raw.split('/').pop() || raw;
    if (!imports.includes(clean)) imports.push(clean);
  }
  const goImportRegex = /import\s+(?:\(\s*([^)]+)\s*\)|"([^"]+)")/g;
  while ((match = goImportRegex.exec(code)) !== null) {
    const raw = match[2] || match[1];
    raw.split('\n').forEach((l) => {
      const pkg = l.replace(/["\s]/g, '').split('/').pop();
      if (pkg && !imports.includes(pkg)) imports.push(pkg);
    });
  }

  // 3. Extract Components / Functions
  const components: string[] = [];
  const fnRegex = /(?:export\s+(?:default\s+)?)?(?:function|def|func|const)\s+([A-Za-z0-9_]+)/g;
  while ((match = fnRegex.exec(code)) !== null) {
    const name = match[1];
    if (name.length > 1 && !['if', 'for', 'while', 'switch', 'return', 'let', 'var'].includes(name)) {
      if (!components.includes(name)) components.push(name);
    }
  }

  // 4. Extract States (React useState, Vue ref/reactive, Svelte $state)
  const states: StateVariable[] = [];
  const reactStateRegex = /const\s+\[\s*(\w+)\s*,\s*(\w+)\s*\]\s*=\s*useState(?:<[^>]+>)?\(([^)]*)\)/g;
  while ((match = reactStateRegex.exec(code)) !== null) {
    states.push({
      name: match[1],
      setter: match[2],
      initialValue: match[3].trim() || 'undefined',
      purpose: `Tracks dynamic value of '${match[1]}' and triggers UI re-renders on update.`,
      modifiedBy: [match[2]],
    });
  }
  const vueStateRegex = /const\s+(\w+)\s*=\s*(?:ref|reactive)\(([^)]*)\)/g;
  while ((match = vueStateRegex.exec(code)) !== null) {
    states.push({
      name: match[1],
      setter: `${match[1]}.value`,
      initialValue: match[2].trim() || 'undefined',
      purpose: `Vue reactive variable '${match[1]}'. Modifying triggers DOM patch.`,
      modifiedBy: [match[1]],
    });
  }
  const svelteStateRegex = /let\s+(\w+)\s*=\s*\$state\(([^)]*)\)/g;
  while ((match = svelteStateRegex.exec(code)) !== null) {
    states.push({
      name: match[1],
      setter: `${match[1]} = ...`,
      initialValue: match[2].trim() || 'undefined',
      purpose: `Svelte 5 rune state '${match[1]}'. Fine-grained reactive signal.`,
      modifiedBy: [match[1]],
    });
  }

  // 5. Extract Props
  const props: ComponentProp[] = [];
  const propRegex = /(\w+)(\?)?:\s*([a-zA-Z0-9_<>[\]|& ]+);/g;
  while ((match = propRegex.exec(code)) !== null) {
    if (!['constructor', 'return', 'super'].includes(match[1])) {
      props.push({ name: match[1], required: !match[2], type: match[3].trim() });
    }
  }

  // 6. Extract Hooks & Dependencies
  const hooks: string[] = [];
  const hookRegex = /(use[A-Z]\w+)\(/g;
  while ((match = hookRegex.exec(code)) !== null) {
    if (!hooks.includes(match[1])) hooks.push(match[1]);
  }

  // 7. Extract API Endpoints & Calls (Client fetch + Server routes)
  const apiCalls: ApiCall[] = [];
  const clientFetchRegex = /fetch\(\s*['"`]([^'"`]+)['"`](?:,\s*\{[^}]*method:\s*['"](\w+)['"])?/g;
  while ((match = clientFetchRegex.exec(code)) !== null) {
    apiCalls.push({
      endpoint: match[1],
      method: (match[2] as any) || 'GET',
      triggeredBy: 'HTTP Invocation',
      purpose: `Dispatches network request to ${match[1]}`,
    });
  }
  // Server routes: Python FastAPI / Flask / Go Gin / Express
  const serverRouteRegex = /@(?:app|router)\.(get|post|put|delete)\(\s*['"]([^'"]+)['"]/gi;
  while ((match = serverRouteRegex.exec(code)) !== null) {
    apiCalls.push({
      endpoint: match[2],
      method: match[1].toUpperCase() as any,
      triggeredBy: 'Route Handler',
      purpose: `Exposes ${match[1].toUpperCase()} endpoint at ${match[2]}`,
    });
  }
  const goRouteRegex = /r\.(GET|POST|PUT|DELETE)\(\s*['"]([^'"]+)['"]/g;
  while ((match = goRouteRegex.exec(code)) !== null) {
    apiCalls.push({
      endpoint: match[2],
      method: match[1] as any,
      triggeredBy: 'Gin Router',
      purpose: `Gin endpoint listening on ${match[2]}`,
    });
  }

  // 8. Rendered Children / Tags
  const renderedChildren: string[] = [];
  const tagRegex = /<([A-Z]\w+)(?:\s|\/|>)/g;
  while ((match = tagRegex.exec(code)) !== null) {
    if (!['React', 'Fragment'].includes(match[1]) && !renderedChildren.includes(match[1])) {
      renderedChildren.push(match[1]);
    }
  }

  // 9. Event Handlers
  const events: { name: string; handler: string; targetAction: string }[] = [];
  const eventRegex = /(?:on|@|v-on:)([A-Za-z]+)=\{(\w+)\}/g;
  while ((match = eventRegex.exec(code)) !== null) {
    events.push({
      name: match[1].toLowerCase(),
      handler: match[2],
      targetAction: `Triggers ${match[2]} on event`,
    });
  }

  // Assign appropriate preview type
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
    props,
    hooks,
    apiCalls,
    renderedChildren,
    events,
    stack,
    previewType,
  };
}
