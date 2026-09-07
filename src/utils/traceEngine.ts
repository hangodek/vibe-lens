import type { ParsedCodeFile, LayerMode, ExecutionTrace } from '../types/ast';
import type { CanvasNode, CanvasEdge } from '../types/graph';

// Domain namespace classifier for Feature Islands (Auth, Product, Checkout, Server, Shared)
function getDomainNamespace(path: string): { key: string; label: string; order: number } {
  const low = path.toLowerCase();
  if (low.includes('cmd/') || low.includes('/server/') || low.includes('main.')) {
    return { key: 'server', label: 'Server Gateway', order: 0 };
  }
  if (low.includes('auth') || low.includes('login') || low.includes('register') || low.includes('profile')) {
    return { key: 'auth', label: 'Authentication', order: 1 };
  }
  if (low.includes('product') || low.includes('home') || low.includes('catalog') || low.includes('detail') || low.includes('item')) {
    return { key: 'product', label: 'Product Catalog', order: 2 };
  }
  if (low.includes('order') || low.includes('cart') || low.includes('checkout') || low.includes('billing')) {
    return { key: 'order', label: 'Order & Checkout', order: 3 };
  }
  // Generic folder fallback
  const parts = path.split('/');
  const folder = parts.length > 2 ? parts[1] : parts.length > 1 ? parts[0] : 'shared';
  return {
    key: folder.toLowerCase(),
    label: folder.charAt(0).toUpperCase() + folder.slice(1) + ' Foundation',
    order: 4,
  };
}

export function calculateLayout(
  files: ParsedCodeFile[],
  mode: LayerMode,
  activeTrace?: ExecutionTrace,
  activeStepIndex: number = 0
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];

  const NODE_WIDTH = 250;
  const NODE_HEIGHT = 110;
  const GAP_X = 60;
  const GAP_Y = 20;
  const ISLAND_GAP_Y = 70;

  // 1. TRACE MODE: Horizontal Staged Sequence
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
        x: 80 + index * (NODE_WIDTH + 110),
        y: 200 + (index % 2 === 1 ? 25 : -25),
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        label: file.name,
        badge: isCurrentlyActive ? 'ACTIVE' : `Step ${index + 1}`,
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
        animated: false,
      });
    }

    // Idle files placed in collision-free wrapped multi-column grid below
    const idleFiles = files.filter((f) => !uniqueIds.includes(f.id));
    const IDLE_COLS = 3;
    const IDLE_WIDTH = 220;
    const IDLE_HEIGHT = 80;

    idleFiles.forEach((file, idx) => {
      const col = idx % IDLE_COLS;
      const row = Math.floor(idx / IDLE_COLS);
      nodes.push({
        id: file.id,
        fileId: file.id,
        name: file.name,
        type: file.type,
        x: 80 + col * (IDLE_WIDTH + 30),
        y: 450 + row * (IDLE_HEIGHT + 25),
        width: IDLE_WIDTH,
        height: IDLE_HEIGHT,
        label: file.name,
        badge: 'Idle',
        previewType: file.previewType,
        riskScore: file.blastRadius?.score,
      });
    });

    return { nodes, edges };
  }

  // 2. FEATURE ISLANDS SPATIAL LAYOUT (Zero Collisions & Domain Separation)
  // Partition files into ordered Feature Islands
  const islandMap = new Map<string, { label: string; order: number; files: ParsedCodeFile[] }>();

  files.forEach((f) => {
    const { key, label, order } = getDomainNamespace(f.path);
    if (!islandMap.has(key)) {
      islandMap.set(key, { label, order, files: [] });
    }
    islandMap.get(key)!.files.push(f);
  });

  const sortedIslands = Array.from(islandMap.values()).sort((a, b) => a.order - b.order);

  let currentIslandY = 80;

  sortedIslands.forEach((island) => {
    // 4 Architecture Pipeline Columns per Feature: Views -> Controllers -> Services -> Storage
    const cols: [ParsedCodeFile[], ParsedCodeFile[], ParsedCodeFile[], ParsedCodeFile[]] = [[], [], [], []];

    island.files.forEach((f) => {
      const p = f.path.toLowerCase();
      if (f.type === 'page' || p.includes('template') || p.endsWith('.html') || p.endsWith('.js')) {
        cols[0].push(f); // Col 0: Views, Templates, Client scripts
      } else if (f.type === 'api' || p.includes('route') || p.includes('handler')) {
        cols[1].push(f); // Col 1: Routes & HTTP Handlers
      } else if (f.type === 'hook' || p.includes('service') || p.includes('validator') || p.includes('logic')) {
        cols[2].push(f); // Col 2: Services & Logic
      } else {
        cols[3].push(f); // Col 3: Repositories & Storage
      }
    });

    const maxRows = Math.max(1, ...cols.map((c) => c.length));

    cols.forEach((colFiles, colIdx) => {
      const colX = 60 + colIdx * (NODE_WIDTH + GAP_X);
      colFiles.forEach((file, rowIdx) => {
        const nodeY = currentIslandY + rowIdx * (NODE_HEIGHT + GAP_Y);

        nodes.push({
          id: file.id,
          fileId: file.id,
          name: file.name,
          type: file.type,
          x: colX,
          y: nodeY,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          label: file.path,
          badge: island.label,
          stateCount: file.states.length,
          hookCount: file.hooks.length,
          apiCount: file.apiCalls.length,
          previewType: file.previewType,
          riskScore: file.blastRadius?.score,
        });
      });
    });

    // Advance to next feature island with safe non-overlapping vertical buffer
    currentIslandY += maxRows * (NODE_HEIGHT + GAP_Y) + ISLAND_GAP_Y;
  });

  // 3. CLEAN PIPELINE EDGE RESOLVER (Eliminate Spiderweb Over-Connecting)
  const edgeSet = new Set<string>();

  files.forEach((src) => {
    files.forEach((tgt) => {
      if (src.id === tgt.id) return;
      const tgtBase = tgt.name.replace(/\.[^.]+$/, '');
      const srcParts = src.path.split('/');
      const tgtParts = tgt.path.split('/');
      const srcDir = srcParts.length > 1 ? srcParts.slice(0, -1).join('/') : '';
      const tgtDir = tgtParts.length > 1 ? tgtParts.slice(0, -1).join('/') : '';
      const tgtPkg = tgtParts.length > 1 ? tgtParts[tgtParts.length - 2] : '';

      // Rule A: Cross-package imports (e.g. main.go -> internal/product, order/service -> product)
      const isCrossImport =
        srcDir !== tgtDir &&
        src.imports.some((imp) => imp === tgtPkg || imp === `internal/${tgtPkg}` || imp === tgtBase);

      // Rule B: Intra-domain clean pipeline (routes -> handler -> service -> repository)
      const isDomainPipeline =
        srcDir === tgtDir &&
        ((src.path.includes('routes') && tgt.path.includes('handler')) ||
          (src.path.includes('handler') && tgt.path.includes('service')) ||
          (src.path.includes('service') && tgt.path.includes('repository')));

      // Rule C: Template partial renders and client script binding (e.g. home.html -> product_card.html)
      const isRender = src.renderedChildren.some((rc) => rc.toLowerCase() === tgtBase.toLowerCase());

      if (isCrossImport || isDomainPipeline || isRender) {
        const key = `${src.id}->${tgt.id}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({
            id: `edge-${src.id}-${tgt.id}`,
            from: src.id,
            to: tgt.id,
            label: isRender ? 'renders' : isDomainPipeline ? 'calls' : 'imports',
            type: isRender ? 'render' : 'data',
            isActive: false,
            animated: false,
          });
        }
      }
    });
  });

  return { nodes, edges };
}
