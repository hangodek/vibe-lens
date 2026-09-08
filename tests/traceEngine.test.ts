import { describe, it, expect } from 'bun:test';
import { calculateLayout } from '../src/utils/traceEngine';
import { parseSourceCode } from '../src/utils/astParser';

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

    const viewToGuard = edges.filter(
      (e) =>
        (e.from === files[0].id && e.to === files[1].id) ||
        (e.fromName === 'login.html' && e.toName === 'auth.go')
    );
    const guardToController = edges.filter(
      (e) =>
        (e.from === files[1].id && e.to === files[2].id) ||
        (e.fromName === 'auth.go' && e.toName === 'handler.go')
    );
    const directBypass = edges.filter(
      (e) =>
        (e.from === files[0].id && e.to === files[2].id) ||
        (e.fromName === 'login.html' && e.toName === 'handler.go')
    );

    expect(viewToGuard.length).toBeGreaterThanOrEqual(1);
    expect(guardToController.length).toBeGreaterThanOrEqual(1);
    expect(directBypass.length).toBe(0);
  });
});
