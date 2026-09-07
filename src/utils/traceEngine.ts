import type { ParsedCodeFile, LayerMode, ExecutionTrace } from '../types/ast';
import type { CanvasNode, CanvasEdge } from '../types/graph';

export function calculateLayout(
  files: ParsedCodeFile[],
  mode: LayerMode,
  activeTrace?: ExecutionTrace,
  activeStepIndex: number = 0,
  connections?: Array<{ from: string; to: string; whatHappens: string; dataPassed: string; codeSnippet?: string }>
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];

  const NODE_WIDTH = 270;
  const NODE_HEIGHT = 145;
  const GAP_X = 75;
  const GAP_Y = 24;

  // 1. TRACE MODE: Step-by-Step Narrative Flow
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
        path: file.path,
        type: file.type,
        role: file.pipelineRole,
        plainEnglish: file.description,
        inbound: file.flowExplanation?.inbound,
        outbound: file.flowExplanation?.outbound,
        routes: file.routes,
        dataEntities: file.dataEntities,
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
        dataPassed: step.description,
        whatHappens: step.storybook?.story || step.description,
        type: 'event',
        isActive: isCurrent || isPastOrActive,
        animated: false,
      });
    }

    const idleFiles = files.filter((f) => !uniqueIds.includes(f.id));
    const IDLE_COLS = 3;
    const IDLE_WIDTH = 240;
    const IDLE_HEIGHT = 90;

    idleFiles.forEach((file, idx) => {
      const col = idx % IDLE_COLS;
      const row = Math.floor(idx / IDLE_COLS);
      nodes.push({
        id: file.id,
        fileId: file.id,
        name: file.name,
        path: file.path,
        type: file.type,
        role: file.pipelineRole,
        plainEnglish: file.description,
        inbound: file.flowExplanation?.inbound,
        outbound: file.flowExplanation?.outbound,
        routes: file.routes,
        dataEntities: file.dataEntities,
        x: 80 + col * (IDLE_WIDTH + 30),
        y: 480 + row * (IDLE_HEIGHT + 25),
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

  // 2. UNIVERSAL 4-STAGE LEFT-TO-RIGHT PIPELINE LAYOUT
  // Stage 0: Views & Client Templates (Left)
  // Stage 1: Routers, Gateways & Guards
  // Stage 2: HTTP Controllers & Request Handlers
  // Stage 3: Business Services & Logic
  // Stage 4: Repositories & Database Storage (Right)
  const columns: ParsedCodeFile[][] = [[], [], [], [], []];

  files.forEach((f) => {
    const role = f.pipelineRole;
    if (role === 'view' || role === 'script' || f.type === 'page' || f.path.endsWith('.html')) {
      columns[0].push(f);
    } else if (role === 'gateway' || role === 'guard' || f.path.includes('middleware') || f.path.includes('cmd/')) {
      columns[1].push(f);
    } else if (role === 'controller' || f.type === 'api' || f.path.includes('handler') || f.path.includes('route')) {
      columns[2].push(f);
    } else if (role === 'service' || f.path.includes('service') || f.path.includes('usecase')) {
      columns[3].push(f);
    } else {
      columns[4].push(f); // storage, database, models, utils
    }
  });

  columns.forEach((colFiles, colIdx) => {
    const colX = 60 + colIdx * (NODE_WIDTH + GAP_X);
    colFiles.forEach((file, rowIdx) => {
      const nodeY = 80 + rowIdx * (NODE_HEIGHT + GAP_Y);

      nodes.push({
        id: file.id,
        fileId: file.id,
        name: file.name,
        path: file.path,
        type: file.type,
        role: file.pipelineRole,
        plainEnglish: file.description,
        inbound: file.flowExplanation?.inbound,
        outbound: file.flowExplanation?.outbound,
        routes: file.routes,
        dataEntities: file.dataEntities,
        x: colX,
        y: nodeY,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        label: file.path,
        stateCount: file.states.length,
        hookCount: file.hooks.length,
        apiCount: file.apiCalls.length,
        previewType: file.previewType,
        riskScore: file.blastRadius?.score,
      });
    });
  });

  // 3. PIPELINE EDGE RESOLVER: Connects nodes & labels what data is passed
  const edgeSet = new Set<string>();

  // A. If AI provided verified connections, use them first!
  if (connections && connections.length > 0) {
    connections.forEach((conn) => {
      const src = files.find((f) => f.path.includes(conn.from) || conn.from.includes(f.path) || f.name === conn.from);
      const tgt = files.find((f) => f.path.includes(conn.to) || conn.to.includes(f.path) || f.name === conn.to);

      if (src && tgt && src.id !== tgt.id) {
        const key = `${src.id}->${tgt.id}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({
            id: `edge-${src.id}-${tgt.id}`,
            from: src.id,
            to: tgt.id,
            fromName: src.name,
            toName: tgt.name,
            label: conn.dataPassed || 'calls',
            dataPassed: conn.dataPassed,
            whatHappens: conn.whatHappens,
            codeSnippet: conn.codeSnippet,
            type: 'data',
            isActive: false,
            animated: false,
          });
        }
      }
    });
  }

  // B. Cross-directory pipeline linkages (View -> Controller -> Service -> Repository)
  files.forEach((src) => {
    files.forEach((tgt) => {
      if (src.id === tgt.id) return;
      const key = `${src.id}->${tgt.id}`;
      if (edgeSet.has(key)) return;

      const srcRole = src.pipelineRole;
      const tgtRole = tgt.pipelineRole;
      const srcName = src.name.toLowerCase().replace(/\.[^.]+$/, '');
      const tgtName = tgt.name.toLowerCase().replace(/\.[^.]+$/, '');

      // Check domain match across directories (e.g. templates/auth/login.html -> internal/auth/handler.go)
      const srcDomain = src.path.toLowerCase().includes('auth') ? 'auth' : src.path.toLowerCase().includes('product') ? 'product' : src.path.toLowerCase().includes('order') || src.path.toLowerCase().includes('cart') ? 'order' : '';
      const tgtDomain = tgt.path.toLowerCase().includes('auth') ? 'auth' : tgt.path.toLowerCase().includes('product') ? 'product' : tgt.path.toLowerCase().includes('order') || tgt.path.toLowerCase().includes('cart') ? 'order' : '';

      const isDomainMatch = srcDomain && tgtDomain && srcDomain === tgtDomain;

      // View -> Controller (e.g. login.html -> auth/handler.go)
      if (isDomainMatch && (srcRole === 'view' || src.type === 'page') && (tgtRole === 'controller' || tgt.path.includes('handler'))) {
        edgeSet.add(key);
        edges.push({
          id: `edge-${src.id}-${tgt.id}`,
          from: src.id,
          to: tgt.id,
          fromName: src.name,
          toName: tgt.name,
          label: 'POST form data',
          dataPassed: 'Dispatches HTTP request payload',
          whatHappens: `${src.name} sends user action to ${tgt.name} controller.`,
          type: 'data',
        });
      }

      // Controller -> Service (e.g. auth/handler.go -> auth/service.go)
      else if (isDomainMatch && (srcRole === 'controller' || src.path.includes('handler')) && (tgtRole === 'service' || tgt.path.includes('service'))) {
        edgeSet.add(key);
        edges.push({
          id: `edge-${src.id}-${tgt.id}`,
          from: src.id,
          to: tgt.id,
          fromName: src.name,
          toName: tgt.name,
          label: 'calls domain service',
          dataPassed: 'Passes validated input data',
          whatHappens: `${src.name} delegates business logic to ${tgt.name}.`,
          type: 'data',
        });
      }

      // Service -> Storage (e.g. auth/service.go -> auth/repository.go)
      else if (isDomainMatch && (srcRole === 'service' || src.path.includes('service')) && (tgtRole === 'storage' || tgt.path.includes('repo') || tgt.path.includes('model'))) {
        edgeSet.add(key);
        edges.push({
          id: `edge-${src.id}-${tgt.id}`,
          from: src.id,
          to: tgt.id,
          fromName: src.name,
          toName: tgt.name,
          label: 'executes SQL query',
          dataPassed: 'SQL query params & entities',
          whatHappens: `${src.name} calls database repository ${tgt.name} to persist or read records.`,
          type: 'data',
        });
      }
    });
  });

  return { nodes, edges };
}
