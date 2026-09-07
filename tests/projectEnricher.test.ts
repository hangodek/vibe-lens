import { describe, it, expect } from 'bun:test';
import { enrichProjectWithMaster } from '../src/utils/projectEnricher';
import { VibeProject, ParsedCodeFile } from '../src/types/ast';
import { VibeLensProjectMaster } from '../src/types/vibeproject';

describe('Project Enricher (AI Master Data Integrator)', () => {
  const dummyProject: VibeProject = {
    id: 'test-proj',
    name: 'test-app',
    framework: 'Generic App',
    tagline: 'Initial scan',
    description: 'Initial description',
    files: [
      {
        id: 'file-1',
        path: 'internal/auth/handler.go',
        name: 'handler.go',
        type: 'api',
        pipelineRole: 'utility',
        code: 'package auth\nfunc HandleLogin() {}',
        lineCount: 20,
        description: 'Raw fallback',
        whyAiMadeThis: 'Unknown',
        imports: [],
        exports: ['HandleLogin'],
        components: ['HandleLogin'],
        states: [],
        props: [],
        hooks: [],
        apiCalls: [],
        renderedChildren: [],
        events: [],
      } as ParsedCodeFile,
      {
        id: 'file-2',
        path: 'views/login.html',
        name: 'login.html',
        type: 'page',
        pipelineRole: 'view',
        code: '<form action="/login">',
        lineCount: 15,
        description: 'HTML form',
        whyAiMadeThis: 'UI',
        imports: [],
        exports: [],
        components: [],
        states: [],
        props: [],
        hooks: [],
        apiCalls: [],
        renderedChildren: [],
        events: [],
      } as ParsedCodeFile,
    ],
    traces: [],
  };

  const dummyMaster: VibeLensProjectMaster = {
    id: 'test-proj',
    name: 'test-app',
    stack: 'Go 1.22 + SSR HTML',
    summary: 'A secure authentication and session management portal.',
    analyzedAt: new Date().toISOString(),
    analyzer: 'agy',
    files: {
      'internal/auth/handler.go': {
        path: 'internal/auth/handler.go',
        name: 'handler.go',
        role: 'controller',
        plainEnglish: 'Handles incoming POST /login requests, verifies password hashes, and issues auth cookies.',
        inbound: 'Receives POST /login form dispatch from login.html',
        outbound: 'Returns session cookie and redirects user to dashboard',
        calls: ['authService.VerifyPassword'],
        calledBy: ['main.go'],
        dataShape: [
          {
            name: 'LoginCredentials',
            kind: 'struct',
            fields: [
              { name: 'Email', type: 'string', purpose: 'User login email address' },
              { name: 'Password', type: 'string', purpose: 'Raw password string' },
            ],
          },
        ],
        blastRadius: {
          score: 'high',
          riskLabel: 'Core Auth Controller',
          safeInvariants: ['Must validate CSRF token before checking password'],
          impactedFiles: ['views/login.html', 'internal/auth/service.go'],
        },
        userJourneys: ['User Login Journey'],
      },
    },
    journeys: [
      {
        id: 'journey-login',
        title: 'User Login Journey',
        description: 'User enters credentials and logs in.',
        steps: [
          { file: 'views/login.html', action: 'User submits login form' },
          { file: 'internal/auth/handler.go', action: 'Verifies credentials and issues cookie' },
        ],
      },
    ],
    workspaces: [
      {
        id: 'ws-auth',
        name: 'Authentication Subsystem',
        description: 'Login and session handling',
        files: ['internal/auth/handler.go', 'views/login.html'],
      },
    ],
  };

  it('enriches files with authentic plainEnglish and pipeline role from AI master', () => {
    const enriched = enrichProjectWithMaster(dummyProject, dummyMaster);
    const handler = enriched.files.find((f) => f.path === 'internal/auth/handler.go')!;

    expect(handler.pipelineRole).toBe('controller');
    expect(handler.description).toContain('Handles incoming POST /login requests');
    expect(handler.flowExplanation?.inbound).toContain('Receives POST /login form dispatch');
  });

  it('maps dataShape struct fields into states for the Data Shape panel', () => {
    const enriched = enrichProjectWithMaster(dummyProject, dummyMaster);
    const handler = enriched.files.find((f) => f.path === 'internal/auth/handler.go')!;

    expect(handler.states.length).toBe(2);
    expect(handler.states[0].name).toBe('LoginCredentials.Email');
    expect(handler.states[0].initialValue).toBe('string');
    expect(handler.states[1].name).toBe('LoginCredentials.Password');
  });

  it('transforms AI journeys into authentic execution traces with linked step node IDs', () => {
    const enriched = enrichProjectWithMaster(dummyProject, dummyMaster);

    expect(enriched.traces.length).toBe(1);
    expect(enriched.traces[0].title).toBe('User Login Journey');
    expect(enriched.traces[0].steps.length).toBe(2);
    expect(enriched.traces[0].steps[0].activeNodeId).toBe('file-2'); // login.html
    expect(enriched.traces[0].steps[0].targetNodeId).toBe('file-1'); // handler.go
  });

  it('updates project framework and summary from AI master', () => {
    const enriched = enrichProjectWithMaster(dummyProject, dummyMaster);

    expect(enriched.framework).toContain('Go 1.22 + SSR HTML');
    expect(enriched.description).toBe('A secure authentication and session management portal.');
  });
});
