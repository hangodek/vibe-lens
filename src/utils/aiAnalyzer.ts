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

// Selects the 5 to 8 files that form the primary execution chain across ANY stack
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

  // 1. User entry screens & templates (HTML / TSX / Vue / Svelte / Blade)
  addMatching((p) => p.endsWith('.html') || p.endsWith('.tsx') || p.endsWith('.vue') || p.includes('template') || p.includes('page'), 2);

  // 2. Middlewares & Guards (Auth / Session / RateLimit)
  addMatching((p) => p.includes('middleware') || p.includes('guard') || p.includes('auth'), 1);

  // 3. Controllers & Route Handlers
  addMatching((p) => p.includes('handler') || p.includes('controller') || p.includes('route'), 2);

  // 4. Domain Services & Business Logic
  addMatching((p) => p.includes('service') || p.includes('usecase') || p.includes('logic'), 2);

  // 5. Database Repositories & SQL Models
  addMatching((p) => p.includes('repo') || p.includes('model') || p.includes('database') || p.includes('store'), 2);

  // Fallback to first few files if structure is unconventional
  if (selected.length < 3) {
    for (const f of files) {
      if (!added.has(f.path)) {
        selected.push(f);
        added.add(f.path);
        if (selected.length >= 6) break;
      }
    }
  }

  return selected;
}

function buildUnifiedPrompt(files: RawFile[], projectName: string): string {
  const fileExcerpts = files
    .map((f) => `=== FILE: ${f.path} (${f.name}) ===\n${f.code.slice(0, 1600)}`)
    .join('\n\n');

  return `You are an elite Lead Software Architect explaining a codebase to a vibe coder.
Analyze this codebase execution chain for project "${projectName}".

Return ONLY a valid JSON object matching this exact schema:
{
  "stack": "e.g. Go 1.22 + SSR HTML Templates + Vanilla JS",
  "summary": "Clear 1-2 sentence explanation of how the application runs and processes requests.",
  "files": [
    {
      "path": "exact file path",
      "name": "filename",
      "role": "view" | "controller" | "service" | "storage" | "gateway" | "guard" | "utility",
      "plainEnglish": "What THIS specific file does in simple human English.",
      "inbound": "What enters this file (e.g. HTTP POST /login with form credentials)",
      "outbound": "What this file produces or calls (e.g. Calls authService.Login(), sets cookie)",
      "routes": ["GET /profile", "POST /login"],
      "dataShape": [
        {
          "name": "User",
          "kind": "struct",
          "fields": [{ "name": "Email", "type": "string", "purpose": "User email address" }]
        }
      ],
      "blastRadius": {
        "score": "low" | "moderate" | "high",
        "riskLabel": "e.g. Core Auth Controller",
        "safeInvariants": ["Keep existing HTTP handler signatures intact"],
        "impactedFiles": ["dependent file paths"]
      }
    }
  ],
  "connections": [
    {
      "from": "source file path (e.g. web/templates/auth/login.html)",
      "to": "target file path (e.g. internal/auth/handler.go)",
      "whatHappens": "Visitor submits login form with credentials",
      "dataPassed": "POST /login",
      "codeSnippet": "http.HandleFunc(\\"POST /login\\", h.Login)"
    }
  ],
  "journeys": [
    {
      "id": "journey-1",
      "title": "User Execution Journey",
      "description": "User form input down to database persistence",
      "steps": [
        {
          "file": "file path in chain",
          "action": "Human explanation of what happens in this step",
          "dataPassed": "Parameters or payload passed to next step",
          "codeLine": "The exact line of code responsible",
          "codeExplanation": "Why this line exists and what it does"
        }
      ]
    }
  ],
  "workspaces": [
    {
      "id": "auth",
      "name": "Authentication",
      "description": "Login, registration, and session cookies",
      "files": ["file paths"],
      "icon": "ShieldCheck"
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

  // Select the focused 5-8 core chain files (~10k chars total) for ultra-fast 8s AI execution
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

  // Ensure any files not in the core AI chain are given clean roles and descriptions
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
        : 'utility';

      fileMap[rf.path] = {
        path: rf.path,
        name: rf.name,
        role,
        plainEnglish: `${rf.name} provides supporting domain functionality for this application.`,
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
