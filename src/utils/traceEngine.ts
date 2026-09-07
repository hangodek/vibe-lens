import type { ParsedCodeFile, LayerMode, ExecutionTrace } from '../types/ast';
import type { CanvasNode, CanvasEdge } from '../types/graph';

export function calculateLayout(
  files: ParsedCodeFile[],
  mode: LayerMode,
  activeTrace?: ExecutionTrace,
  activeStepIndex: number = 0
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];

  const NODE_WIDTH = 270;
  const NODE_HEIGHT = 175;
  const HORIZONTAL_GAP = 140;
  const VERTICAL_GAP = 80;

  if (mode === 'trace' && activeTrace) {
    // Collect both active and target node IDs to ensure all interacting nodes are on the main workflow stage
    const stepNodeIds: string[] = [];
    activeTrace.steps.forEach((s) => {
      if (s.activeNodeId && !stepNodeIds.includes(s.activeNodeId)) {
        stepNodeIds.push(s.activeNodeId);
      }
      if (s.targetNodeId && !stepNodeIds.includes(s.targetNodeId)) {
        stepNodeIds.push(s.targetNodeId);
      }
    });
    const uniqueIds = stepNodeIds;

    // Place trace nodes horizontally across stages
    uniqueIds.forEach((fileId, index) => {
      const file = files.find(f => f.id === fileId);
      if (!file) return;

      const currentStep = activeTrace.steps[activeStepIndex];
      const isCurrentlyActive = currentStep && currentStep.activeNodeId === fileId;

      nodes.push({
        id: file.id,
        fileId: file.id,
        name: file.name,
        type: file.type,
        x: 100 + index * (NODE_WIDTH + HORIZONTAL_GAP),
        y: 200 + (index % 2 === 1 ? 40 : -40),
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        label: file.name,
        badge: isCurrentlyActive ? 'ACTIVE EXECUTION' : `Stage ${index + 1}`,
        stateCount: file.states.length,
        hookCount: file.hooks.length,
        apiCount: file.apiCalls.length,
        previewType: file.previewType,
        riskScore: file.blastRadius?.score,
      });
    });

    // Add trace edges between consecutive steps
    for (let i = 0; i < activeTrace.steps.length - 1; i++) {
      const step = activeTrace.steps[i];
      const nextStep = activeTrace.steps[i + 1];
      const isPastOrActive = i < activeStepIndex;
      const isCurrentTransition = i === activeStepIndex - 1;

      edges.push({
        id: `trace-edge-${i}`,
        from: step.activeNodeId,
        to: step.targetNodeId || nextStep.activeNodeId,
        label: `Step ${step.stepNumber} → ${nextStep.stepNumber}`,
        type: 'event',
        isActive: isCurrentTransition || isPastOrActive,
        animated: isCurrentTransition
      });
    }

    // Include other files placed subtly below if they exist
    files.forEach((file) => {
      if (!uniqueIds.includes(file.id)) {
        nodes.push({
          id: file.id,
          fileId: file.id,
          name: file.name,
          type: file.type,
          x: 100 + nodes.length * 80,
          y: 480,
          width: 220,
          height: 120,
          label: file.name,
          badge: 'Idle',
          previewType: file.previewType,
          riskScore: file.blastRadius?.score,
        });
      }
    });

    return { nodes, edges };
  }

  if (mode === 'data') {
    // Categorize: Stores & Contexts -> Hooks & Logic -> UI Consumers -> API Targets
    const storesAndContexts = files.filter(f => f.type === 'store' || f.type === 'context');
    const hooks = files.filter(f => f.type === 'hook');
    const pagesAndComps = files.filter(f => f.type === 'page' || f.type === 'component' || f.type === 'layout');
    const apis = files.filter(f => f.type === 'api');

    const columns = [
      { title: 'Global State / Stores', items: storesAndContexts, colX: 60 },
      { title: 'Hooks & Data Fetching', items: hooks, colX: 420 },
      { title: 'UI Subscriber Views', items: pagesAndComps, colX: 780 },
      { title: 'Backend / APIs', items: apis, colX: 1140 },
    ];

    columns.forEach(({ items, colX }) => {
      items.forEach((file, rowIdx) => {
        nodes.push({
          id: file.id,
          fileId: file.id,
          name: file.name,
          type: file.type,
          x: colX,
          y: 80 + rowIdx * (NODE_HEIGHT + VERTICAL_GAP),
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          label: file.name,
          badge: file.type.toUpperCase(),
          stateCount: file.states.length,
          hookCount: file.hooks.length,
          apiCount: file.apiCalls.length,
          previewType: file.previewType,
          riskScore: file.blastRadius?.score,
        });
      });
    });

    // Build data connections
    files.forEach(source => {
      // If a component imports/uses a hook
      source.hooks.forEach(hookName => {
        const targetHook = files.find(f => f.name.includes(hookName) || f.components.includes(hookName));
        if (targetHook && targetHook.id !== source.id) {
          edges.push({
            id: `edge-${targetHook.id}-${source.id}`,
            from: targetHook.id,
            to: source.id,
            label: 'feeds state',
            type: 'data',
            animated: true
          });
        }
      });

      // If a hook or component calls an API
      source.apiCalls.forEach(api => {
        const targetApi = files.find(f => f.type === 'api');
        if (targetApi) {
          edges.push({
            id: `api-edge-${source.id}-${targetApi.id}`,
            from: source.id,
            to: targetApi.id,
            label: api.method,
            type: 'api'
          });
        }
      });
    });

    return { nodes, edges };
  }

  // Default: Screen / UI Layout Flow
  const rootPage = files.find(f => f.type === 'page' || f.type === 'layout') || files[0];
  const children = files.filter(f => f.id !== rootPage?.id);

  if (rootPage) {
    nodes.push({
      id: rootPage.id,
      fileId: rootPage.id,
      name: rootPage.name,
      type: rootPage.type,
      x: 100,
      y: 220,
      width: NODE_WIDTH + 20,
      height: NODE_HEIGHT + 10,
      label: rootPage.name,
      badge: 'ROOT ROUTE',
      isEntry: true,
      stateCount: rootPage.states.length,
      hookCount: rootPage.hooks.length,
      previewType: rootPage.previewType,
      riskScore: rootPage.blastRadius?.score,
    });
  }

  // Lay out children in a tree grid
  const childComps = children.filter(c => c.type === 'component');
  const helpers = children.filter(c => c.type !== 'component');

  childComps.forEach((file, idx) => {
    const nodeY = 80 + idx * (NODE_HEIGHT + 40);
    nodes.push({
      id: file.id,
      fileId: file.id,
      name: file.name,
      type: file.type,
      x: 480,
      y: nodeY,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      label: file.name,
      badge: 'SUB-VIEW',
      stateCount: file.states.length,
      previewType: file.previewType,
      riskScore: file.blastRadius?.score,
    });

    if (rootPage) {
      edges.push({
        id: `render-${rootPage.id}-${file.id}`,
        from: rootPage.id,
        to: file.id,
        label: 'renders',
        type: 'render'
      });
    }
  });

  helpers.forEach((file, idx) => {
    nodes.push({
      id: file.id,
      fileId: file.id,
      name: file.name,
      type: file.type,
      x: 840,
      y: 120 + idx * (NODE_HEIGHT + 50),
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      label: file.name,
      badge: file.type.toUpperCase(),
      previewType: file.previewType,
      riskScore: file.blastRadius?.score,
    });

    // Link helper to child component or root page
    if (childComps[0]) {
      edges.push({
        id: `helper-${childComps[0].id}-${file.id}`,
        from: childComps[0].id,
        to: file.id,
        label: file.type === 'api' ? 'requests' : 'binds',
        type: file.type === 'api' ? 'api' : 'data'
      });
    }
  });

  return { nodes, edges };
}
