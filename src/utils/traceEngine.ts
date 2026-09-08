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

  const NODE_WIDTH = 280;
  const NODE_HEIGHT = 145;
  const GAP_X = 340; // Generous 340px horizontal breathing room between architectural columns
  const GAP_Y = 72;  // Ample 72px vertical breathing room between rows

  // 1. TRACE MODE: Clean Horizontal Assembly Line
  if (mode === 'trace' && activeTrace) {
    const uniqueIds = Array.from(
      new Set(
        activeTrace.steps.flatMap((s) => [s.activeNodeId, s.targetNodeId]).filter(Boolean) as string[]
      )
    );

    // Baseline: Single straight horizontal line (y = 190) with 340px wide corridor
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
        focalCode: file.focalCode,
        focalLine: file.focalLine,
        inbound: file.flowExplanation?.inbound,
        outbound: file.flowExplanation?.outbound,
        routes: file.routes,
        dataEntities: file.dataEntities,
        x: 80 + index * (NODE_WIDTH + 340),
        y: 190,
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

      // Clean, short label on the canvas pill (under 20 chars) to prevent line crowding
      const pillLabel = step.dataPassed
        ? step.dataPassed.length > 20
          ? step.dataPassed.slice(0, 18) + '…'
          : step.dataPassed
        : `Step ${step.stepNumber} → ${nextStep.stepNumber}`;

      edges.push({
        id: `trace-edge-${i}`,
        from: step.activeNodeId,
        to: nextStep.activeNodeId, // Always connects to next step forward
        label: pillLabel,
        dataPassed: step.dataPassed || step.description,
        whatHappens: step.storybook?.story || step.description,
        codeSnippet: step.codeLine,
        type: 'event',
        isActive: isCurrent || isPastOrActive,
        animated: false,
      });
    }

    // Idle files placed well below the active pipeline (y = 560) in a clean 4-column shelf
    const idleFiles = files.filter((f) => !uniqueIds.includes(f.id));
    const IDLE_COLS = 4;
    const IDLE_WIDTH = 250;
    const IDLE_HEIGHT = 85;

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
        focalCode: file.focalCode,
        focalLine: file.focalLine,
        inbound: file.flowExplanation?.inbound,
        outbound: file.flowExplanation?.outbound,
        routes: file.routes,
        dataEntities: file.dataEntities,
        x: 80 + col * (IDLE_WIDTH + 45),
        y: 560 + row * (IDLE_HEIGHT + 30),
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
  // Stage 1: Routers, Gateways & Guards (Middlewares)
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
    const colX = 80 + colIdx * (NODE_WIDTH + GAP_X);
    colFiles.forEach((file, rowIdx) => {
      const nodeY = 90 + rowIdx * (NODE_HEIGHT + GAP_Y);

      nodes.push({
        id: file.id,
        fileId: file.id,
        name: file.name,
        path: file.path,
        type: file.type,
        role: file.pipelineRole,
        plainEnglish: file.description,
        focalCode: file.focalCode,
        focalLine: file.focalLine,
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

          const shortLabel = conn.dataPassed
            ? conn.dataPassed.length > 20
              ? conn.dataPassed.slice(0, 18) + '…'
              : conn.dataPassed
            : 'calls';

          edges.push({
            id: `edge-${src.id}-${tgt.id}`,
            from: src.id,
            to: tgt.id,
            fromName: src.name,
            toName: tgt.name,
            label: shortLabel,
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

  // B. Cross-directory pipeline linkages including middlewares & client scripts
  files.forEach((src) => {
    files.forEach((tgt) => {
      if (src.id === tgt.id) return;
      const key = `${src.id}->${tgt.id}`;
      if (edgeSet.has(key)) return;

      const srcRole = src.pipelineRole;
      const tgtRole = tgt.pipelineRole;

      const srcDomain = src.path.toLowerCase().includes('auth') ? 'auth' : src.path.toLowerCase().includes('product') ? 'product' : src.path.toLowerCase().includes('order') || src.path.toLowerCase().includes('cart') ? 'order' : '';
      const tgtDomain = tgt.path.toLowerCase().includes('auth') ? 'auth' : tgt.path.toLowerCase().includes('product') ? 'product' : tgt.path.toLowerCase().includes('order') || tgt.path.toLowerCase().includes('cart') ? 'order' : '';

      const isDomainMatch = srcDomain && tgtDomain && srcDomain === tgtDomain;

      // 1. Gateway -> Middleware (main.go -> csrf.go, auth.go)
      if (srcRole === 'gateway' && tgtRole === 'guard') {
        edgeSet.add(key);
        edges.push({
          id: `edge-${src.id}-${tgt.id}`,
          from: src.id,
          to: tgt.id,
          fromName: src.name,
          toName: tgt.name,
          label: 'applies middleware',
          dataPassed: 'HTTP handler stack',
          whatHappens: `${src.name} registers security guard ${tgt.name} to intercept incoming traffic.`,
          type: 'data',
        });
      }

      // 2. View -> Client Script (home.html -> homepage.js)
      else if ((srcRole === 'view' || src.type === 'page') && tgtRole === 'script' && isDomainMatch) {
        edgeSet.add(key);
        edges.push({
          id: `edge-${src.id}-${tgt.id}`,
          from: src.id,
          to: tgt.id,
          fromName: src.name,
          toName: tgt.name,
          label: 'binds script',
          dataPassed: 'DOM event listeners',
          whatHappens: `${src.name} loads interactive script ${tgt.name}.`,
          type: 'render',
        });
      }

      // 3. View/Script -> Middleware/Guard (login.html -> auth.go, homepage.js -> csrf.go)
      else if ((srcRole === 'view' || srcRole === 'script') && tgtRole === 'guard' && (isDomainMatch || tgt.path.includes('csrf') || tgt.path.includes('session'))) {
        edgeSet.add(key);
        edges.push({
          id: `edge-${src.id}-${tgt.id}`,
          from: src.id,
          to: tgt.id,
          fromName: src.name,
          toName: tgt.name,
          label: 'HTTP request',
          dataPassed: 'Intercepts request',
          whatHappens: `${src.name} dispatches action intercepted by security guard ${tgt.name}.`,
          type: 'data',
        });
      }

      // 4. Middleware/Guard -> Controller (auth.go -> auth/handler.go)
      else if (tgtRole === 'controller' && srcRole === 'guard' && (isDomainMatch || src.path.includes('session') || src.path.includes('auth'))) {
        edgeSet.add(key);
        edges.push({
          id: `edge-${src.id}-${tgt.id}`,
          from: src.id,
          to: tgt.id,
          fromName: src.name,
          toName: tgt.name,
          label: 'passes context',
          dataPassed: 'Validated context',
          whatHappens: `${src.name} passes verified request downstream to ${tgt.name} controller.`,
          type: 'data',
        });
      }

      // 5. View -> Controller (direct if no guard in domain)
      else if (isDomainMatch && (srcRole === 'view' || src.type === 'page') && (tgtRole === 'controller' || tgt.path.includes('handler'))) {
        edgeSet.add(key);
        edges.push({
          id: `edge-${src.id}-${tgt.id}`,
          from: src.id,
          to: tgt.id,
          fromName: src.name,
          toName: tgt.name,
          label: 'POST /form',
          dataPassed: 'Form submit payload',
          whatHappens: `${src.name} sends user action to ${tgt.name} controller.`,
          type: 'data',
        });
      }

      // 6. Controller -> Service (auth/handler.go -> auth/service.go)
      else if (isDomainMatch && (srcRole === 'controller' || src.path.includes('handler')) && (tgtRole === 'service' || tgt.path.includes('service'))) {
        edgeSet.add(key);
        edges.push({
          id: `edge-${src.id}-${tgt.id}`,
          from: src.id,
          to: tgt.id,
          fromName: src.name,
          toName: tgt.name,
          label: 'calls service',
          dataPassed: 'Validated domain input',
          whatHappens: `${src.name} delegates business logic to ${tgt.name}.`,
          type: 'data',
        });
      }

      // 7. Service -> Storage (auth/service.go -> auth/repository.go)
      else if (isDomainMatch && (srcRole === 'service' || src.path.includes('service')) && (tgtRole === 'storage' || tgt.path.includes('repo') || tgt.path.includes('model'))) {
        edgeSet.add(key);
        edges.push({
          id: `edge-${src.id}-${tgt.id}`,
          from: src.id,
          to: tgt.id,
          fromName: src.name,
          toName: tgt.name,
          label: 'SQL query',
          dataPassed: 'SQL parameters & entities',
          whatHappens: `${src.name} calls database repository ${tgt.name} to persist or read records.`,
          type: 'data',
        });
      }
    });
  });

  return { nodes, edges };
}
