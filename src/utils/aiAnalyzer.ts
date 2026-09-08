import type {
  VibeLensProjectMaster,
  VibeMasterFile,
  VibeMasterJourney,
  VibeMasterWorkspace,
  VibeMasterConnection,
} from '../types/vibeproject';
import { executeAIPrompt, extractJsonFromResponse } from './aiClient';
import { loadProjectMaster, saveProjectMaster } from './aiStorage';

export interface RawFile {
  path: string;
  name: string;
  code: string;
  lineCount: number;
}

export interface AnalysisProgress {
  message: string;
  percent: number;
}

// Selects the core execution chain files (gateways, guards, handlers, services, storage, views, scripts)
function selectCoreExecutionFiles(files: RawFile[]): RawFile[] {
  const selected: RawFile[] = [];
  const added = new Set<string>();

  const addMatching = (predicate: (p: string) => boolean, limit = 2) => {
    let count = 0;
    for (const f of files) {
      if (!added.has(f.path) && predicate(f.path.toLowerCase())) {
        selected.push(f);
        added.add(f.path);
        count++;
        if (count >= limit) break;
      }
    }
  };

  // 1. Entry / Gateway (main.go, server.ts, app.tsx)
  addMatching((p) => p.includes('main.') || p.includes('server.') || p.includes('manage.py'), 1);

  // 2. Middlewares & Security Guards (auth.go, csrf.go, session.go)
  addMatching((p) => p.includes('middleware') || p.includes('guard'), 2);

  // 3. User views & templates (login.html, home.html, page.tsx)
  addMatching((p) => p.endsWith('.html') || p.endsWith('.tsx') || p.endsWith('.vue') || p.includes('template') || p.includes('page'), 2);

  // 4. Client Interactive Scripts (homepage.js, cart.js)
  addMatching((p) => p.endsWith('.js') && (p.includes('static') || p.includes('javascript') || p.includes('scripts')), 2);

  // 5. Controllers & Route Handlers (auth/handler.go, product/handler.go)
  addMatching((p) => p.includes('handler') || p.includes('controller') || p.includes('route'), 2);

  // 6. Domain Services & Business Logic (auth/service.go, product/service.go)
  addMatching((p) => p.includes('service') || p.includes('usecase') || p.includes('logic'), 2);

  // 7. Database Repositories & SQL Models (auth/repository.go, product/repository.go)
  addMatching((p) => p.includes('repo') || p.includes('model') || p.includes('database') || p.includes('store'), 2);

  // Fallback to first few files if structure is unconventional
  if (selected.length < 3) {
    for (const f of files) {
      if (!added.has(f.path)) {
        selected.push(f);
        added.add(f.path);
        if (selected.length >= 8) break;
      }
    }
  }

  return selected;
}

function buildUnifiedPrompt(files: RawFile[], projectName: string): string {
  const fileExcerpts = files
    .map((f) => {
      const lines = f.code.split('\n');
      const sample = lines.slice(0, 45).join('\n');
      return `=== FILE: ${f.path} (${lines.length} total lines) ===\n${sample}`;
    })
    .join('\n\n');

  return `You are a Lead Software Architect analyzing this codebase for a visual architecture tool.
Project: "${projectName}".

Determine:
1. Every file role, clear plain-English explanation of its purpose, and the key 5-15 line code snippet with line numbers that defines what this file does.
2. The exact connection graph (including middlewares like auth.go/csrf.go and client scripts like homepage.js): which file connects to which, what data is passed, and what happens.

Return ONLY a valid JSON object matching this exact schema:
{
  "stack": "e.g. Go 1.22 + SSR HTML Templates + Vanilla JS",
  "summary": "Clear 1-2 sentence explanation of how the application runs and processes requests.",
  "files": [
    {
      "path": "exact file path",
      "name": "filename",
      "role": "view" | "controller" | "service" | "storage" | "gateway" | "guard" | "script" | "utility",
      "plainEnglish": "What THIS specific file does in 1-2 clear human sentences",
      "focalCode": "The exact 5-15 lines of code that represent this file core function",
      "focalLine": 24,
      "inbound": "What triggers or passes into it",
      "outbound": "What it produces or passes out",
      "routes": ["POST /login"]
    }
  ],
  "connections": [
    {
      "from": "source file path",
      "to": "target file path",
      "whatHappens": "What occurs between them (e.g. Visitor enters credentials and submits form)",
      "dataPassed": "Short label (under 20 chars, e.g. POST /login)",
      "callerFunction": "Function or element in source file e.g. <form action='/login'>",
      "targetFunction": "Function invoked in target e.g. Login(w, r)",
      "parametersPassed": "Parameters passed with types e.g. email (string), password (string)",
      "whyCalled": "Why target is called e.g. To check bcrypt password hash against database",
      "codeSnippet": "Key code line linking them e.g. h.service.Authenticate(email, password)"
    }
  ],
  "journeys": [
    {
      "id": "journey-1",
      "title": "User Execution Flow",
      "description": "Form input through middleware, handler, service, and database",
      "steps": [
        {
          "file": "file path in chain",
          "action": "Human explanation of what happens in this step",
          "dataPassed": "Parameters or payload passed to next step",
          "codeLine": "The exact line of code responsible",
          "codeExplanation": "Why this line exists and what it does",
          "lineHighlight": 24
        }
      ]
    }
  ]
}

SOURCE FILES:
${fileExcerpts}`;
}

export async function analyzeProjectWithAI(
  projectId: string,
  projectName: string,
  rawFiles: RawFile[],
  onProgress?: (p: AnalysisProgress) => void,
  forceRescan = false
): Promise<VibeLensProjectMaster> {
  if (!forceRescan) {
    const cached = await loadProjectMaster(projectId);
    if (cached && Object.keys(cached.files || {}).length > 0) {
      if (onProgress) onProgress({ message: 'Loaded verified mental model from cache', percent: 100 });
      return cached;
    }
  }

  if (onProgress) onProgress({ message: `Selecting core execution chain...`, percent: 20 });

  const targetFiles = selectCoreExecutionFiles(rawFiles);
  const prompt = buildUnifiedPrompt(targetFiles, projectName);

  if (onProgress) onProgress({ message: `OpenCode analyzing execution flow and code lines...`, percent: 50 });

  const rawResponse = await executeAIPrompt(prompt);
  if (onProgress) onProgress({ message: 'Parsing step causality and data handoffs...', percent: 85 });

  const parsed = extractJsonFromResponse<{
    stack?: string;
    summary?: string;
    files?: VibeMasterFile[];
    connections?: VibeMasterConnection[];
    journeys?: VibeMasterJourney[];
    workspaces?: VibeMasterWorkspace[];
  }>(rawResponse);

  const fileMap: Record<string, VibeMasterFile> = {};
  if (parsed.files && Array.isArray(parsed.files)) {
    for (const f of parsed.files) {
      fileMap[f.path] = f;
    }
  }

  // Ensure any files not in the core AI chain have clean roles, descriptions and focal code snippets
  for (const rf of rawFiles) {
    if (!fileMap[rf.path]) {
      const p = rf.path.toLowerCase();
      const role = p.includes('repo') || p.includes('model')
        ? 'storage'
        : p.includes('service') || p.includes('usecase')
        ? 'service'
        : p.includes('handler') || p.includes('controller') || p.includes('route')
        ? 'controller'
        : p.endsWith('.html') || p.endsWith('.tsx') || p.endsWith('.vue')
        ? 'view'
        : p.includes('middleware') || p.includes('guard')
        ? 'guard'
        : p.endsWith('.js')
        ? 'script'
        : 'utility';

      // Find first meaningful function/struct/class/form line for focal highlight
      const lines = rf.code.split('\n');
      let focalLine = 1;
      for (let i = 0; i < Math.min(lines.length, 60); i++) {
        const line = lines[i];
        if (line.includes('func ') || line.includes('class ') || line.includes('type ') || line.includes('def ') || line.includes('<form') || line.includes('export ') || line.includes('function ')) {
          focalLine = i + 1;
          break;
        }
      }
      const focalCode = lines.slice(Math.max(0, focalLine - 1), Math.min(lines.length, focalLine + 12)).join('\n');

      fileMap[rf.path] = {
        path: rf.path,
        name: rf.name,
        role,
        plainEnglish: `${rf.name} provides supporting domain functionality for this application.`,
        focalCode,
        focalLine,
        inbound: 'Receives caller parameters.',
        outbound: 'Returns processed output.',
        calls: [],
        calledBy: [],
        dataShape: [],
        blastRadius: {
          score: 'low',
          riskLabel: `${rf.name} Unit`,
          safeInvariants: ['Preserve exported function signatures'],
          impactedFiles: [],
        },
        userJourneys: [],
      };
    }
  }

  const master: VibeLensProjectMaster = {
    id: projectId,
    name: projectName,
    stack: parsed.stack || 'Fullstack Application',
    summary: parsed.summary || 'Application analyzed by OpenCode.',
    analyzedAt: new Date().toISOString(),
    analyzer: 'opencode',
    files: fileMap,
    connections: parsed.connections || [],
    journeys: parsed.journeys || [],
    workspaces: parsed.workspaces || [],
  };

  await saveProjectMaster(master);
  if (onProgress) onProgress({ message: 'Execution flow ready!', percent: 100 });

  return master;
}
