import type { ParsedCodeFile, NodeType, StateVariable, ComponentProp, ApiCall } from '../types/ast';

export function parseSourceCode(path: string, code: string): ParsedCodeFile {
  const fileName = path.split('/').pop() || 'Untitled.tsx';
  const lines = code.split('\n');
  const lineCount = lines.length;

  // Determine Node Type
  let type: NodeType = 'component';
  if (path.includes('/api/') || path.includes('route.ts') || path.includes('route.js')) {
    type = 'api';
  } else if (path.includes('use') || path.startsWith('hooks/') || fileName.startsWith('use')) {
    type = 'hook';
  } else if (path.includes('store') || path.includes('zustand') || path.includes('slice')) {
    type = 'store';
  } else if (path.includes('context') || path.includes('Context')) {
    type = 'context';
  } else if (fileName.startsWith('layout.') || path.includes('layout.')) {
    type = 'layout';
  } else if (fileName.startsWith('page.') || path.includes('pages/')) {
    type = 'page';
  }

  // Extract Imports
  const imports: string[] = [];
  const importRegex = /import\s+(?:{[^}]+}|\w+|\*\s+as\s+\w+)?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const importPath = match[1];
    const importName = importPath.split('/').pop() || importPath;
    if (!imports.includes(importName)) {
      imports.push(importName);
    }
  }

  // Extract Components
  const components: string[] = [];
  const compRegex = /(?:export\s+(?:default\s+)?)?function\s+([A-Z]\w+)/g;
  while ((match = compRegex.exec(code)) !== null) {
    if (!components.includes(match[1])) components.push(match[1]);
  }
  const constCompRegex = /(?:export\s+)?const\s+([A-Z]\w+)\s*=\s*(?:\([^)]*\)|React\.memo)/g;
  while ((match = constCompRegex.exec(code)) !== null) {
    if (!components.includes(match[1])) components.push(match[1]);
  }

  // Extract States (useState, etc.)
  const states: StateVariable[] = [];
  const stateRegex = /const\s+\[\s*(\w+)\s*,\s*(\w+)\s*\]\s*=\s*useState(?:<[^>]+>)?\(([^)]*)\)/g;
  while ((match = stateRegex.exec(code)) !== null) {
    const varName = match[1];
    const setterName = match[2];
    const initVal = match[3].trim();
    states.push({
      name: varName,
      setter: setterName,
      initialValue: initVal || 'undefined',
      purpose: `Tracks the dynamic value of '${varName}' and re-renders when ${setterName}() is called.`,
      modifiedBy: [setterName]
    });
  }

  // Extract Props from interface or destructuring
  const props: ComponentProp[] = [];
  const propsRegex = /(?:interface|type)\s+\w+Props\s*(?:=\s*)?\{([^}]+)\}/s;
  const propsMatch = propsRegex.exec(code);
  if (propsMatch) {
    const propLines = propsMatch[1].split('\n');
    for (const pLine of propLines) {
      const trimmed = pLine.trim();
      const pMatch = /^(\w+)(\?)?:\s*([^;]+);?/.exec(trimmed);
      if (pMatch) {
        props.push({
          name: pMatch[1],
          required: !pMatch[2],
          type: pMatch[3].trim()
        });
      }
    }
  }

  // Extract Hooks
  const hooks: string[] = [];
  const hookRegex = /(use[A-Z]\w+)\(/g;
  while ((match = hookRegex.exec(code)) !== null) {
    if (!hooks.includes(match[1])) hooks.push(match[1]);
  }

  // Extract API calls
  const apiCalls: ApiCall[] = [];
  const fetchRegex = /fetch\(\s*['"`]([^'"`]+)['"`](?:,\s*\{[^}]*method:\s*['"](\w+)['"])?/g;
  while ((match = fetchRegex.exec(code)) !== null) {
    apiCalls.push({
      endpoint: match[1],
      method: (match[2] as any) || 'GET',
      triggeredBy: 'Function Execution',
      purpose: `Dispatches network request to ${match[1]}`
    });
  }

  // Extract JSX rendered children (<ComponentName />)
  const renderedChildren: string[] = [];
  const jsxRegex = /<([A-Z]\w+)(?:\s|\/|>)/g;
  while ((match = jsxRegex.exec(code)) !== null) {
    const compTag = match[1];
    if (compTag !== 'React' && !renderedChildren.includes(compTag)) {
      renderedChildren.push(compTag);
    }
  }

  // Extract Event Handlers
  const events: { name: string; handler: string; targetAction: string }[] = [];
  const eventRegex = /on([A-Z]\w+)=\{(\w+)\}/g;
  while ((match = eventRegex.exec(code)) !== null) {
    events.push({
      name: match[1].toLowerCase(),
      handler: match[2],
      targetAction: `Triggers ${match[2]} when ${match[1]} occurs`
    });
  }

  const id = 'file-' + Math.random().toString(36).substring(2, 9);

  return {
    id,
    path,
    name: fileName,
    type,
    code,
    lineCount,
    description: `A ${type} file with ${lineCount} lines containing ${components.join(', ') || fileName}.`,
    whyAiMadeThis: `Your AI agent generated this ${type} to decouple user interaction and modularize the codebase.`,
    imports,
    exports: components,
    components,
    states,
    props,
    hooks,
    apiCalls,
    renderedChildren,
    events
  };
}
