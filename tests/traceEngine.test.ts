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
});
