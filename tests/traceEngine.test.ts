import { describe, it, expect } from 'bun:test';
import { calculateLayout } from '../src/utils/traceEngine';
import { parseSourceCode } from '../src/utils/astParser';
import { computeEdgePillGeometry } from '../src/components/canvas/ConnectionEdge';

describe('traceEngine - Collision-Free Layout & Clean Pipelines', () => {
  it('guarantees zero bounding box collisions across feature nodes', () => {
    const files = [
      parseSourceCode('web/templates/auth/login.html', '{{template "footer"}}'),
      parseSourceCode('web/templates/auth/register.html', '<form></form>'),
      parseSourceCode('web/templates/auth/profile.html', '<div>Profile</div>'),
      parseSourceCode('internal/auth/routes.go', 'mux.Handle("GET /login")'),
      parseSourceCode('internal/auth/handler.go', 'func Login() {}'),
      parseSourceCode('internal/auth/service.go', 'func Authenticate() {}'),
      parseSourceCode('internal/auth/repository.go', 'func QueryUser() {}'),
      parseSourceCode('web/static/javascript/profile.js', 'console.log("logout")'),
    ];

    const { nodes, edges } = calculateLayout(files, 'screen');
    expect(nodes.length).toBe(files.length);

    // Verify zero collisions
    let collisions = 0;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        if (Math.abs(a.x - b.x) < a.width && Math.abs(a.y - b.y) < a.height) {
          collisions++;
        }
      }
    }
    expect(collisions).toBe(0);
    expect(edges.length).toBeGreaterThan(0);
  });

  it('guarantees zero collisions for both active and idle nodes in trace mode', () => {
    const files = [
      parseSourceCode('web/templates/auth/login.html', '{{template "footer"}}'),
      parseSourceCode('internal/auth/handler.go', 'func Login() {}'),
      parseSourceCode('internal/auth/service.go', 'func Authenticate() {}'),
      parseSourceCode('internal/idle1.go', 'func A() {}'),
      parseSourceCode('internal/idle2.go', 'func B() {}'),
      parseSourceCode('internal/idle3.go', 'func C() {}'),
      parseSourceCode('internal/idle4.go', 'func D() {}'),
      parseSourceCode('internal/idle5.go', 'func E() {}'),
    ];

    const dummyTrace = {
      id: 'test-trace',
      title: 'Login Flow',
      triggerLabel: 'Start',
      description: 'Login',
      steps: [
        {
          id: 'step-1',
          stepNumber: 1,
          title: 'Submit',
          description: 'Submits form',
          activeNodeId: files[0].id,
          targetNodeId: files[1].id,
        },
        {
          id: 'step-2',
          stepNumber: 2,
          title: 'Authenticate',
          description: 'Runs auth',
          activeNodeId: files[1].id,
          targetNodeId: files[2].id,
        },
      ],
    };

    const { nodes } = calculateLayout(files, 'trace', dummyTrace, 0);
    expect(nodes.length).toBe(files.length);

    // Verify zero collisions among all nodes (both active and idle grid)
    let collisions = 0;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        if (Math.abs(a.x - b.x) < a.width && Math.abs(a.y - b.y) < a.height) {
          collisions++;
        }
      }
    }
    expect(collisions).toBe(0);
  });

  it('populates rich architectural data on nodes and edges with dataPassed', () => {
    const files = [
      parseSourceCode('web/templates/auth/login.html', '<form action="/login">'),
      parseSourceCode('internal/auth/handler.go', 'func Login() {}'),
    ];
    files[0].description = 'Renders login form with email & password fields.';
    files[1].description = 'Receives POST /login and authenticates user credentials.';

    const aiConnections = [
      {
        from: 'web/templates/auth/login.html',
        to: 'internal/auth/handler.go',
        whatHappens: 'Visitor submits email & password credentials',
        dataPassed: 'POST /login (email, password)',
        codeSnippet: 'http.HandleFunc("/login", h.Login)',
      },
    ];

    const { nodes, edges } = calculateLayout(files, 'screen', undefined, 0, aiConnections);

    expect(nodes.length).toBe(2);
    expect(nodes[0].plainEnglish).toBe('Renders login form with email & password fields.');
    expect(edges.length).toBe(1);
    expect(edges[0].dataPassed).toBe('POST /login (email, password)');
    expect(edges[0].whatHappens).toContain('Visitor submits email & password');
    expect(edges[0].codeSnippet).toContain('HandleFunc');
  });

  it('fans out function nodes with intra-file call edges (single-file project)', () => {
    const files = [
      parseSourceCode(
        'static/app.js',
        `function handleNoteOn(noteName) {
  playNoteSound(noteName);
}
function playNoteSound(noteName) {
  initAudioContext();
}
function initAudioContext() {
}`
      ),
    ];

    const { nodes, edges } = calculateLayout(files, 'screen', undefined, 0, []);

    // One node per function, not one node for the file
    expect(nodes.length).toBe(3);
    expect(nodes.every((n) => n.id.includes('::'))).toBe(true);
    const ids = new Set(nodes.map((n) => n.id));
    const edgeKeys = new Set(edges.map((e) => `${e.from}->${e.to}`));
    const onId = [...ids].find((id) => id.endsWith('::handleNoteOn'))!;
    const soundId = [...ids].find((id) => id.endsWith('::playNoteSound'))!;
    const ctxId = [...ids].find((id) => id.endsWith('::initAudioContext'))!;
    expect(edgeKeys.has(`${onId}->${soundId}`)).toBe(true);
    expect(edgeKeys.has(`${soundId}->${ctxId}`)).toBe(true);
    // Intra-file edges carry caller/target + line provenance
    const edge = edges.find((e) => e.from === onId)!;
    expect(edge.callerFunction).toBe('handleNoteOn');
    expect(edge.targetFunction).toBe('playNoteSound');
  });

  it('merges AI edges with heuristic gap-filling instead of leaving files edgeless', () => {
    const files = [
      parseSourceCode('web/templates/auth/login.html', '<form action="/login">'),
      parseSourceCode('internal/shared/middleware/auth.go', 'func RequireAuth(next http.HandlerFunc) http.HandlerFunc { return next; }'),
      parseSourceCode('internal/auth/handler.go', 'func Login() {}'),
      parseSourceCode('internal/auth/service.go', 'func Authenticate() {}'),
    ];

    // AI only covered the Guard -> Controller pair; heuristics must wire the rest.
    const aiConnections = [
      {
        from: 'internal/shared/middleware/auth.go',
        to: 'internal/auth/handler.go',
        whatHappens: 'Passes verified request downstream',
        dataPassed: 'Validated context',
      },
    ];

    const { edges } = calculateLayout(files, 'screen', undefined, 0, aiConnections);
    // Edges land on function endpoints (fileId::symbol); assert by names.
    const named = new Set(edges.map((e) => `${e.fromName}->${e.toName}`));

    // AI pair preserved …
    expect([...named].some((k) => k.startsWith('RequireAuth') && k.endsWith('Login'))).toBe(true);
    // … heuristic gap-fills View -> Guard and Controller -> Service …
    expect([...named].some((k) => k.startsWith('login.html') && k.includes('RequireAuth'))).toBe(true);
    expect([...named].some((k) => k.startsWith('Login') && k.endsWith('Authenticate'))).toBe(true);
    // … and does NOT add a duplicate View -> Controller bypass over the guard path.
    expect([...named].some((k) => k.startsWith('login.html') && k.endsWith('Login'))).toBe(false);

    // Every non-gateway file has at least one incoming edge (nobody sits edgeless).
    const targetFiles = new Set(
      edges.map((e) => (e.to.includes('::') ? e.to.slice(0, e.to.indexOf('::')) : e.to))
    );
    expect(targetFiles.has(files[1].id)).toBe(true);
    expect(targetFiles.has(files[2].id)).toBe(true);
    expect(targetFiles.has(files[3].id)).toBe(true);
  });

  it('aligns all trace steps horizontally on a clean baseline with wide spacing', () => {
    const files = [
      parseSourceCode('web/templates/auth/login.html', '<form>'),
      parseSourceCode('internal/shared/middleware/auth.go', 'func M() {}'),
      parseSourceCode('internal/auth/handler.go', 'func H() {}'),
      parseSourceCode('internal/auth/service.go', 'func S() {}'),
      parseSourceCode('internal/auth/repository.go', 'func R() {}'),
    ];

    const trace = {
      id: 'trace-login',
      title: 'Login Flow',
      triggerLabel: 'Submit',
      description: 'Login',
      steps: [
        { id: 's1', stepNumber: 1, title: 'Input', description: 'Input', activeNodeId: files[0].id, targetNodeId: files[1].id },
        { id: 's2', stepNumber: 2, title: 'Guard', description: 'Guard', activeNodeId: files[1].id, targetNodeId: files[2].id },
        { id: 's3', stepNumber: 3, title: 'Handler', description: 'Handler', activeNodeId: files[2].id, targetNodeId: files[3].id },
        { id: 's4', stepNumber: 4, title: 'Service', description: 'Service', activeNodeId: files[3].id, targetNodeId: files[4].id },
        { id: 's5', stepNumber: 5, title: 'Repo', description: 'Repo', activeNodeId: files[4].id },
      ],
    };

    const { nodes, edges } = calculateLayout(files, 'trace', trace, 0);

    // Verify all trace steps share identical baseline Y coordinate (straight horizontal line)
    const traceNodes = nodes.filter((n) => n.badge !== 'Idle');
    expect(traceNodes.length).toBe(5);
    const baselineY = traceNodes[0].y;
    expect(baselineY).toBe(190);
    traceNodes.forEach((n) => expect(n.y).toBe(baselineY));

    // Verify spacing between each consecutive node is >= 300px
    for (let i = 0; i < traceNodes.length - 1; i++) {
      const gap = traceNodes[i + 1].x - (traceNodes[i].x + traceNodes[i].width);
      expect(gap).toBeGreaterThanOrEqual(300);
    }

    // Verify all edges travel strictly left-to-right (fromNode.x < toNode.x)
    edges.forEach((edge) => {
      const src = traceNodes.find((n) => n.id === edge.from)!;
      const tgt = traceNodes.find((n) => n.id === edge.to)!;
      expect(tgt.x).toBeGreaterThan(src.x);
    });
  });

  it('preserves AI causality fields (caller, target, parameters, why) on edges', () => {
    const files = [
      parseSourceCode('web/templates/auth/login.html', '<form action="/login">'),
      parseSourceCode('internal/auth/handler.go', 'func Login() {}'),
    ];

    const aiConnections = [
      {
        from: 'web/templates/auth/login.html',
        to: 'internal/auth/handler.go',
        whatHappens: 'Visitor submits credentials',
        dataPassed: 'POST /login',
        codeSnippet: 'h.service.Authenticate(email, password)',
        callerFunction: "<form action='/login'>",
        targetFunction: 'Login(w, r)',
        parametersPassed: 'email (string), password (string)',
        whyCalled: 'To verify password hash with bcrypt',
      },
    ];

    const { edges } = calculateLayout(files, 'screen', undefined, 0, aiConnections);

    expect(edges.length).toBe(1);
    expect(edges[0].callerFunction).toBe("<form action='/login'>");
    expect(edges[0].targetFunction).toBe('Login(w, r)');
    expect(edges[0].parametersPassed).toContain('email');
    expect(edges[0].whyCalled).toContain('bcrypt');
  });

  it('eliminates duplicate View->Controller bypass when guard exists in domain', () => {
    const files = [
      parseSourceCode('web/templates/auth/login.html', '<form>'),
      parseSourceCode('internal/shared/middleware/auth.go', 'func RequireAuth(next http.HandlerFunc) {}'),
      parseSourceCode('internal/auth/handler.go', 'func Login() {}'),
    ];

    const { edges } = calculateLayout(files, 'screen', undefined, 0, []);

    // Edges now land on function endpoints; assert by endpoint name + role chain.
    const viewToGuard = edges.filter(
      (e) => e.fromName === 'login.html' && e.toName === 'RequireAuth'
    );
    const guardToController = edges.filter(
      (e) => e.fromName === 'RequireAuth' && e.toName === 'Login'
    );
    const directBypass = edges.filter(
      (e) => e.fromName === 'login.html' && e.toName === 'Login'
    );

    expect(viewToGuard.length).toBeGreaterThanOrEqual(1);
    expect(guardToController.length).toBeGreaterThanOrEqual(1);
    expect(directBypass.length).toBe(0);
  });

  it('function nodes carry FN badge data (kind + signature), not the file role', () => {
    const files = [
      parseSourceCode(
        'static/app.js',
        `function handleNoteOn(noteName) {\n  playNoteSound(noteName);\n}\nfunction playNoteSound(noteName) {\n}`
      ),
    ];

    const { nodes } = calculateLayout(files, 'screen', undefined, 0, []);

    // Fan-out: one node per function
    expect(nodes.length).toBe(2);
    for (const n of nodes) {
      expect(n.id).toContain('::');
      expect(n.signature).toBeDefined();
    }
    const on = nodes.find((n) => n.name === 'handleNoteOn')!;
    expect(on.signature).toContain('handleNoteOn(noteName)');
  });

  it('same-column edges route vertically with pills clear of cards and each other', () => {
    const files = [
      parseSourceCode(
        'static/app.js',
        `function a() {\n  b();\n  c();\n}\nfunction b() {\n}\nfunction c() {\n}`
      ),
    ];

    const { nodes, edges } = calculateLayout(files, 'screen', undefined, 0, []);
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const intra = edges.filter((e) => {
      const f = nodeById.get(e.from)!;
      const t = nodeById.get(e.to)!;
      return Math.abs(f.x - t.x) < 40;
    });
    expect(intra.length).toBeGreaterThanOrEqual(2);

    // Replicate the GraphCanvas pill pipeline (geometry + relaxation)
    const outM = new Map<string, string[]>();
    const inM = new Map<string, string[]>();
    for (const e of edges) {
      if (!outM.has(e.from)) outM.set(e.from, []);
      outM.get(e.from)!.push(e.id);
      if (!inM.has(e.to)) inM.set(e.to, []);
      inM.get(e.to)!.push(e.id);
    }
    const pos: Record<string, { x: number; y: number; width: number; height: number }> = {};
    for (const e of edges) {
      const f = nodeById.get(e.from)!;
      const t = nodeById.get(e.to)!;
      const fe = outM.get(e.from) ?? [e.id];
      const te = inM.get(e.to) ?? [e.id];
      pos[e.id] = computeEdgePillGeometry(e, f, t, fe.indexOf(e.id), fe.length, te.indexOf(e.id), te.length);
    }
    const isVert = (id: string) => {
      const e = edges.find((x) => x.id === id)!;
      return Math.abs(nodeById.get(e.from)!.x - nodeById.get(e.to)!.x) < 40;
    };
    const list = edges.filter((e) => pos[e.id]);
    for (let pass = 0; pass < 6; pass++) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const p1 = pos[list[i].id];
          const p2 = pos[list[j].id];
          const dx = Math.abs(p1.x - p2.x);
          const dy = Math.abs(p1.y - p2.y);
          if (dx < (p1.width + p2.width) / 2 + 14 && dy < 28) {
            if (isVert(list[i].id) && isVert(list[j].id)) {
              const push = ((p1.width + p2.width) / 2 + 14 - dx) / 2 + 2;
              if (p1.x <= p2.x) {
                p1.x = Math.max(p1.width / 2 + 4, p1.x - push);
                p2.x += push;
              } else {
                p1.x += push;
                p2.x = Math.max(p2.width / 2 + 4, p2.x - push);
              }
            } else {
              const push = (28 - dy) / 2 + 2;
              if (p1.y <= p2.y) {
                p1.y -= push;
                p2.y += push;
              } else {
                p1.y += push;
                p2.y -= push;
              }
            }
          }
        }
      }
    }

    // No pill may sit on top of a card
    for (const e of list) {
      const p = pos[e.id];
      for (const n of nodes) {
        const ox = Math.max(0, Math.min(p.x + p.width / 2, n.x + n.width) - Math.max(p.x - p.width / 2, n.x));
        const oy = Math.max(0, Math.min(p.y + 13, n.y + n.height) - Math.max(p.y - 13, n.y));
        expect(ox <= 4 || oy <= 4).toBe(true);
      }
    }
    // No two pills may overlap each other
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = pos[list[i].id];
        const b = pos[list[j].id];
        const separated =
          Math.abs(a.x - b.x) >= (a.width + b.width) / 2 + 6 ||
          Math.abs(a.y - b.y) >= 26;
        expect(separated).toBe(true);
      }
    }
  });
});
