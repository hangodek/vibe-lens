import type { ParsedCodeFile, LayerMode, ExecutionTrace } from '../types/ast';
import type { CanvasNode, CanvasEdge } from '../types/graph';
import type { VibeMasterConnection } from '../types/vibeproject';

export function calculateLayout(
  files: ParsedCodeFile[],
  mode: LayerMode,
  activeTrace?: ExecutionTrace,
  activeStepIndex: number = 0,
  connections?: VibeMasterConnection[]
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];

  const NODE_WIDTH = 290;
  const NODE_HEIGHT = 175;
  const GAP_X = 440; // Wide 440px horizontal breathing room between architectural columns
  const GAP_Y = 96;  // Generous 96px vertical breathing room between rows

  // 1. TRACE MODE: Clean Horizontal Assembly Line
  if (mode === 'trace' && activeTrace) {
    const uniqueIds = Array.from(
      new Set(
        activeTrace.steps.flatMap((s) => [s.activeNodeId, s.targetNodeId]).filter(Boolean) as string[]
      )
    );

    // Baseline: Single straight horizontal line (y = 190) with wide 420px corridor
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
        x: 80 + index * (NODE_WIDTH + 420),
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

    // Idle files placed well below the active pipeline (y = 580) in a clean 4-column shelf
    const idleFiles = files.filter((f) => !uniqueIds.includes(f.id));
    const IDLE_COLS = 4;
    const IDLE_WIDTH = 260;
    const IDLE_HEIGHT = 110;

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
        x: 80 + col * (IDLE_WIDTH + 50),
        y: 580 + row * (IDLE_HEIGHT + 35),
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
  //
  // FUNCTION FAN-OUT: files that carry function-level symbols expand into one
  // node per symbol (id = fileId::name). Files without symbols keep a single
  // fallback node. Intra-file call edges come from the deterministic call graph.
  const FN_NODE_WIDTH = 250;
  const FN_NODE_HEIGHT = 120;
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

  // Order symbols for stable layout: entrypoints first, then by start line
  const orderSymbols = (f: ParsedCodeFile) =>
    [...(f.functions ?? [])].sort((a, b) => {
      const rank = (k: string) => (k === 'entrypoint' ? 0 : k === 'route' ? 1 : k === 'listener' ? 2 : 3);
      return rank(a.kind) - rank(b.kind) || a.startLine - b.startLine;
    });

  const pushFunctionNode = (
    file: ParsedCodeFile,
    fn: NonNullable<ParsedCodeFile['functions']>[number],
    x: number,
    y: number
  ) => {
    const callNames = fn.calls.map((c) => c.baseName).filter((n, i, arr) => arr.indexOf(n) === i);
    nodes.push({
      id: fn.id,
      fileId: file.id,
      name: fn.name,
      path: file.path,
      type: file.type,
      role: file.pipelineRole,
      signature: fn.signature,
      symbolKind: fn.kind,
      plainEnglish: fn.plainEnglish || `${fn.name} in ${file.name}`,
      focalCode: fn.body,
      focalLine: fn.startLine,
      inbound: fn.calledBy.length > 0 ? `Called by ${fn.calledBy.slice(0, 3).join(', ')}` : file.flowExplanation?.inbound,
      outbound: callNames.length > 0 ? `Calls ${callNames.slice(0, 3).join(', ')}` : file.flowExplanation?.outbound,
      routes: file.routes,
      dataEntities: file.dataEntities,
      x,
      y,
      width: FN_NODE_WIDTH,
      height: FN_NODE_HEIGHT,
      label: `${file.name} › ${fn.name}`,
      badge: `${fn.kind} · L${fn.startLine}`,
      stateCount: 0,
      hookCount: fn.calls.length,
      apiCount: 0,
      previewType: file.previewType,
      riskScore: file.blastRadius?.score,
    });
  };

  columns.forEach((colFiles, colIdx) => {
    const colX = 80 + colIdx * (NODE_WIDTH + GAP_X);
    let cursorY = 90;
    colFiles.forEach((file) => {
      const symbols = orderSymbols(file);
      if (symbols.length === 0) {
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
          y: cursorY,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          label: file.path,
          stateCount: file.states.length,
          hookCount: file.hooks.length,
          apiCount: file.apiCalls.length,
          previewType: file.previewType,
          riskScore: file.blastRadius?.score,
        });
        cursorY += NODE_HEIGHT + GAP_Y;
      } else {
        // Swimlane: compact stacked function nodes under a file header offset.
        // 44px gaps leave room for the vertical edge pills between cards.
        symbols.forEach((fn) => {
          pushFunctionNode(file, fn, colX + 12, cursorY);
          cursorY += FN_NODE_HEIGHT + 44;
        });
        cursorY += GAP_Y - 18;
      }
    });
  });

  // 3. INTRA-FILE CALL EDGES from the deterministic function IR.
  // These are facts parsed from bodies — never hallucinated — and they are
  // what lets a single-file project (e.g. piano app.js) render a real graph.
  const pushIntraFileEdges = () => {
    const edgeSet = new Set(edges.map((e) => `${e.from}->${e.to}`));
    for (const file of files) {
      const symbols = file.functions ?? [];
      if (symbols.length === 0) continue;
      const byName = new Map<string, (typeof symbols)[number][]>();
      for (const s of symbols) {
        if (!byName.has(s.name)) byName.set(s.name, []);
        byName.get(s.name)!.push(s);
      }
      for (const caller of symbols) {
        const seenTargets = new Set<string>();
        for (const call of caller.calls) {
          const targets = byName.get(call.baseName);
          if (!targets) continue;
          for (const target of targets) {
            if (target.id === caller.id || seenTargets.has(target.id)) continue;
            seenTargets.add(target.id);
            const key = `${caller.id}->${target.id}`;
            if (edgeSet.has(key)) continue;
            edgeSet.add(key);
            edges.push({
              id: `edge-${caller.id}-${target.id}`,
              from: caller.id,
              to: target.id,
              fromName: caller.name,
              toName: target.name,
              label: call.args ? `${target.name}(${call.args.slice(0, 24)})` : target.name,
              dataPassed: call.args || target.name,
              whatHappens: `${caller.name} invokes ${target.name} at line ${call.line}`,
              codeSnippet: target.signature,
              callerFunction: caller.name,
              targetFunction: target.name,
              parametersPassed: call.args,
              whyCalled: `Direct call at ${file.name}:${call.line}`,
              type: 'data',
              isActive: false,
              animated: false,
            });
          }
        }
      }
    }
    return edgeSet;
  };

  // 4. PIPELINE EDGE RESOLVER: Connects nodes & labels what data is passed
  const edgeSet = new Set<string>();

  const resolveEndpointNode = (
    file: ParsedCodeFile,
    fnNameHint?: string,
    role: 'src' | 'tgt' = 'tgt'
  ): { id: string; name: string } => {
    const fns = file.functions ?? [];
    if (fns.length === 0) return { id: file.id, name: file.name };
    if (fnNameHint) {
      const direct = fns.find((f) => f.name === fnNameHint);
      if (direct) return { id: direct.id, name: direct.name };
    }
    if (role === 'tgt') {
      const entry = fns.find((f) => f.kind === 'entrypoint' || f.name === 'init' || f.name === 'main') || fns[0];
      return { id: entry.id, name: entry.name };
    }
    const top = fns.find((f) => f.kind === 'entrypoint' || f.name === 'init' || f.name === 'main') || fns[0];
    return { id: top.id, name: top.name };
  };

  // A. AI-verified connections first — then heuristics fill gaps for pairs
  // the AI missed (no early return: uncovered files would otherwise sit edgeless)
  const hasAiConnections = !!(connections && connections.length > 0);
  if (hasAiConnections) {
    const resolveConnectionFile = (ref: string) => {
      if (!ref) return undefined;
      const exact = files.find((f) => f.path === ref);
      if (exact) return exact;
      const byName = files.find((f) => f.name === ref);
      if (byName) return byName;
      const normalize = (p: string) => p.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
      const normRef = normalize(ref);
      return files.find((f) => {
        const normPath = normalize(f.path);
        return normPath === normRef || normPath.endsWith('/' + normRef) || normRef.endsWith('/' + normPath);
      });
    };

    connections.forEach((conn) => {
      const srcFile = resolveConnectionFile(conn.from);
      const tgtFile = resolveConnectionFile(conn.to);

      if (srcFile && tgtFile && srcFile.id !== tgtFile.id) {
        const srcEndpoint = resolveEndpointNode(srcFile, conn.callerFunction, 'src');
        const tgtEndpoint = resolveEndpointNode(tgtFile, conn.targetFunction, 'tgt');

        const key = `${srcEndpoint.id}->${tgtEndpoint.id}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);

          const shortLabel = conn.dataPassed
            ? conn.dataPassed.length > 20
              ? conn.dataPassed.slice(0, 18) + '…'
              : conn.dataPassed
            : 'calls';

          edges.push({
            id: `edge-${srcEndpoint.id}-${tgtEndpoint.id}`,
            from: srcEndpoint.id,
            to: tgtEndpoint.id,
            fromName: srcEndpoint.name,
            toName: tgtEndpoint.name,
            label: shortLabel,
            dataPassed: conn.dataPassed,
            whatHappens: conn.whatHappens,
            codeSnippet: conn.codeSnippet,
            callerFunction: conn.callerFunction,
            targetFunction: conn.targetFunction,
            parametersPassed: conn.parametersPassed,
            whyCalled: conn.whyCalled,
            type: 'data',
            isActive: false,
            animated: false,
          });
        }
      }
    });

    // No early return: fall through to heuristics to wire pairs the AI missed.
  }

  // B. Heuristic pipeline linkages fill gaps the AI missed. Pairs already
  // claimed by AI edges are skipped via edgeSet. The View->Controller direct
  // edge is skipped when THIS source view already routes through a guard
  // (checked against edges claimed so far — prevents duplicate corridors).
  // Heuristic edges land on function endpoints when the file expanded into
  // function nodes, so every line connects to a rendered node (never dangles).
  const pushHeuristicEdge = (
    src: ParsedCodeFile,
    tgt: ParsedCodeFile,
    edge: Omit<CanvasEdge, 'id' | 'from' | 'to' | 'fromName' | 'toName'> & { label: string }
  ) => {
    const srcEndpoint = resolveEndpointNode(src, undefined, 'src');
    const tgtEndpoint = resolveEndpointNode(tgt, undefined, 'tgt');
    const endpointKey = `${srcEndpoint.id}->${tgtEndpoint.id}`;
    if (edgeSet.has(endpointKey)) return;
    edgeSet.add(`${src.id}->${tgt.id}`);
    edgeSet.add(endpointKey);
    edges.push({
      id: `edge-${srcEndpoint.id}-${tgtEndpoint.id}`,
      from: srcEndpoint.id,
      to: tgtEndpoint.id,
      fromName: srcEndpoint.name,
      toName: tgtEndpoint.name,
      ...edge,
    });
  };

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
        pushHeuristicEdge(src, tgt, {
          label: 'applies guard',
          dataPassed: 'HTTP handler stack',
          whatHappens: `${src.name} registers security guard ${tgt.name} to intercept incoming traffic.`,
          type: 'data',
        });
      }

      // 2. View -> Client Script (home.html -> homepage.js, index.html -> app.js).
      // Script tags are entry-agnostic: any view may load any script.
      else if ((srcRole === 'view' || src.type === 'page') && tgtRole === 'script') {
        pushHeuristicEdge(src, tgt, {
          label: 'binds script',
          dataPassed: 'DOM event listeners',
          whatHappens: `${src.name} loads interactive script ${tgt.name}.`,
          type: 'render',
        });
      }

      // 3. View/Script -> Middleware/Guard (login.html -> auth.go, homepage.js -> csrf.go)
      else if ((srcRole === 'view' || srcRole === 'script') && tgtRole === 'guard' && (isDomainMatch || tgt.path.includes('csrf') || tgt.path.includes('session'))) {
        const routeMethod = src.routes?.[0] ? src.routes[0].split(' ')[0] : 'POST';
        pushHeuristicEdge(src, tgt, {
          label: `${routeMethod} request`,
          dataPassed: 'Intercepts credentials',
          whatHappens: `${src.name} dispatches action intercepted by security guard ${tgt.name}.`,
          type: 'data',
        });
      }

      // 4. Middleware/Guard -> Controller (auth.go -> auth/handler.go)
      else if (tgtRole === 'controller' && srcRole === 'guard' && (isDomainMatch || src.path.includes('session') || src.path.includes('auth'))) {
        pushHeuristicEdge(src, tgt, {
          label: 'passes context',
          dataPassed: 'Validated context',
          whatHappens: `${src.name} passes verified request downstream to ${tgt.name} controller.`,
          type: 'data',
        });
      }

      // 5. View -> Controller direct edge — but ONLY when this source view does
      // NOT already route through a guard (checked against edges claimed so far,
      // AI or heuristic). Kills the duplicate-corridor overlap without leaving
      // guard-less views disconnected.
      else if (isDomainMatch && (srcRole === 'view' || src.type === 'page') && (tgtRole === 'controller' || tgt.path.includes('handler'))) {
        const routesViaGuard = [...edgeSet].some((k) => {
          const [fromId, toId] = k.split('->');
          if (fromId !== src.id && !fromId.startsWith(`${src.id}::`)) return false;
          const hop = files.find((f) => f.id === toId || toId.startsWith(`${f.id}::`));
          return hop?.pipelineRole === 'guard';
        });
        if (routesViaGuard) {
          // Skip: View -> Guard -> Controller already covers this path.
        } else {
          pushHeuristicEdge(src, tgt, {
            label: 'POST /form',
            dataPassed: 'Form submit payload',
            whatHappens: `${src.name} sends user action directly to ${tgt.name} controller.`,
            type: 'data',
          });
        }
      }

      // 6. Controller -> Service (auth/handler.go -> auth/service.go)
      else if (isDomainMatch && (srcRole === 'controller' || src.path.includes('handler')) && (tgtRole === 'service' || tgt.path.includes('service'))) {
        pushHeuristicEdge(src, tgt, {
          label: 'calls service',
          dataPassed: 'Validated domain input',
          whatHappens: `${src.name} delegates business logic to ${tgt.name}.`,
          type: 'data',
        });
      }

      // 7. Service -> Storage (auth/service.go -> auth/repository.go)
      else if (isDomainMatch && (srcRole === 'service' || src.path.includes('service')) && (tgtRole === 'storage' || tgt.path.includes('repo') || tgt.path.includes('model'))) {
        pushHeuristicEdge(src, tgt, {
          label: 'SQL query',
          dataPassed: 'SQL parameters & entities',
          whatHappens: `${src.name} calls database repository ${tgt.name} to persist or read records.`,
          type: 'data',
        });
      }
    });
  });

  // Intra-file call edges always run last: they wire function nodes inside the
  // same file and can never duplicate file-level pairs (different id space).
  pushIntraFileEdges();

  return { nodes, edges };
}
