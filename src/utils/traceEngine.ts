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

  const NODE_WIDTH = 260;
  const NODE_HEIGHT = 160;

  // 1. TRACE MODE: Linear / Branching Horizontal Stage
  if (mode === 'trace' && activeTrace) {
    const uniqueIds = Array.from(
      new Set(
        activeTrace.steps.flatMap((s) => [s.activeNodeId, s.targetNodeId]).filter(Boolean) as string[]
      )
    );

    uniqueIds.forEach((fileId, index) => {
      const file = files.find((f) => f.id === fileId);
      if (!file) return;

      const currentStep = activeTrace.steps[activeStepIndex];
      const isCurrentlyActive = currentStep && currentStep.activeNodeId === fileId;

      nodes.push({
        id: file.id,
        fileId: file.id,
        name: file.name,
        type: file.type,
        x: 100 + index * (NODE_WIDTH + 120),
        y: 200 + (index % 2 === 1 ? 30 : -30),
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        label: file.name,
        badge: isCurrentlyActive ? 'ACTIVE STAGE' : `Stage ${index + 1}`,
        stateCount: file.states.length,
        hookCount: file.hooks.length,
        apiCount: file.apiCalls.length,
        previewType: file.previewType,
        riskScore: file.blastRadius?.score,
      });
    });

    for (let i = 0; i < activeTrace.steps.length - 1; i++) {
      const step = activeTrace.steps[i];
      const nextStep = activeTrace.steps[i + 1];
      const isPastOrActive = i < activeStepIndex;
      const isCurrent = i === activeStepIndex - 1;

      edges.push({
        id: `trace-edge-${i}`,
        from: step.activeNodeId,
        to: step.targetNodeId || nextStep.activeNodeId,
        label: `Ch.${step.stepNumber} → Ch.${nextStep.stepNumber}`,
        type: 'event',
        isActive: isCurrent || isPastOrActive,
        animated: isCurrent,
      });
    }

    files.forEach((file) => {
      if (!uniqueIds.includes(file.id)) {
        nodes.push({
          id: file.id,
          fileId: file.id,
          name: file.name,
          type: file.type,
          x: 100 + (nodes.length - uniqueIds.length) * 90,
          y: 480,
          width: 220,
          height: 110,
          label: file.name,
          badge: 'Idle',
          previewType: file.previewType,
          riskScore: file.blastRadius?.score,
        });
      }
    });

    return { nodes, edges };
  }

  // 2. UNIVERSAL DOMAIN & ARCHITECTURAL CLUSTER GRID
  // Categorize files into 5 Clean Architecture tiers across any language (Go, Python, React, Vue, Rails)
  const tiers: { title: string; colBaseX: number; badge: string; items: ParsedCodeFile[] }[] = [
    { title: 'Entrypoint / Runner', colBaseX: 60, badge: 'ENTRYPOINT', items: [] },
    { title: 'HTTP Routes & Handlers', colBaseX: 420, badge: 'CONTROLLER', items: [] },
    { title: 'Business Services', colBaseX: 780, badge: 'SERVICE', items: [] },
    { title: 'Data Stores & Repos', colBaseX: 1140, badge: 'STORAGE', items: [] },
    { title: 'Views & Templates', colBaseX: 1500, badge: 'VIEW', items: [] },
  ];

  files.forEach((f) => {
    const p = f.path.toLowerCase();
    if (p.includes('cmd/') || p.includes('/server/') || p.includes('main.') || p.includes('app.tsx') || f.code.includes('func main()')) {
      tiers[0].items.push(f);
    } else if (f.type === 'api' || p.includes('route') || p.includes('handler') || p.includes('controller') || f.apiCalls.length > 0) {
      tiers[1].items.push(f);
    } else if (f.type === 'hook' || p.includes('service') || p.includes('usecase') || p.includes('logic')) {
      tiers[2].items.push(f);
    } else if (f.type === 'store' || p.includes('repo') || p.includes('database') || p.includes('model') || p.includes('schema')) {
      tiers[3].items.push(f);
    } else {
      tiers[4].items.push(f);
    }
  });

  // Lay out each tier in a compact 2D multi-column grid (max 4 rows high to prevent 8000px towers!)
  tiers.forEach((tier) => {
    tier.items.forEach((file, idx) => {
      const subCol = Math.floor(idx / 4);
      const row = idx % 4;

      nodes.push({
        id: file.id,
        fileId: file.id,
        name: file.name,
        type: file.type,
        x: tier.colBaseX + subCol * (NODE_WIDTH + 24),
        y: 80 + row * (NODE_HEIGHT + 24),
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        label: file.path,
        badge: tier.badge,
        stateCount: file.states.length,
        hookCount: file.hooks.length,
        apiCount: file.apiCalls.length,
        previewType: file.previewType,
        riskScore: file.blastRadius?.score,
      });
    });
  });

  // 3. UNIVERSAL DEPENDENCY LINK RESOLVER (True Import / Reference Resolution)
  const edgeSet = new Set<string>();

  files.forEach((src) => {
    files.forEach((tgt) => {
      if (src.id === tgt.id) return;
      const tgtBase = tgt.name.replace(/\.[^.]+$/, '');
      const parts = tgt.path.split('/');
      const tgtDir = parts.length > 1 ? parts[parts.length - 2] : '';

      // Check for matching import, package name, or template inclusion
      const isImported = src.imports.some((imp) => imp.includes(tgtBase) || (tgtDir && imp.includes(tgtDir)));
      const isRendered = src.renderedChildren.some((rc) => rc.toLowerCase() === tgtBase.toLowerCase());
      const isCodeRef = src.code.includes(tgtBase) || (tgtDir && src.code.includes(tgtDir));

      if (isImported || isRendered || (src.type === 'layout' && isCodeRef && tgt.type !== 'store')) {
        const edgeKey = `${src.id}->${tgt.id}`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          edges.push({
            id: `edge-${src.id}-${tgt.id}`,
            from: src.id,
            to: tgt.id,
            label: isRendered ? 'renders' : tgt.type === 'api' ? 'routes' : 'uses',
            type: isRendered ? 'render' : tgt.type === 'api' ? 'api' : 'data',
          });
        }
      }
    });
  });

  return { nodes, edges };
}
