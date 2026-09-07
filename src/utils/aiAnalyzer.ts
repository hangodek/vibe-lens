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

function buildUnifiedPrompt(files: RawFile[], projectName: string): string {
  const fileExcerpts = files
    .map((f) => `=== FILE: ${f.path} (${f.name}) ===\n${f.code.slice(0, 3000)}`)
    .join('\n\n');

  return `You are an elite Lead Software Architect explaining a codebase to a vibe coder.
Analyze this codebase for project "${projectName}".

Return ONLY a valid JSON object matching this exact schema:
{
  "stack": "e.g. Go 1.22 + SSR HTML Templates + Vanilla JS",
  "summary": "Clear, concise 1-2 sentence explanation of what this application does and how it runs.",
  "files": [
    {
      "path": "exact file path",
      "name": "filename",
      "role": "view" | "controller" | "service" | "storage" | "gateway" | "guard" | "utility",
      "plainEnglish": "What THIS specific file does in simple, human English.",
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
      "whatHappens": "Visitor submits login form with email & password",
      "dataPassed": "POST /login (email, password payload)",
      "codeSnippet": "http.HandleFunc(\\"POST /login\\", h.Login)"
    }
  ],
  "journeys": [
    {
      "id": "journey-1",
      "title": "User Login & Session Flow",
      "description": "Visitor logs in from HTML form down to database query.",
      "steps": [
        {
          "file": "file path in chain",
          "action": "Human explanation of what happens in this step",
          "dataPassed": "Parameters or payload passed to the next step",
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

  if (onProgress) onProgress({ message: `Reading and assembling ${rawFiles.length} files...`, percent: 15 });

  // Prioritize meaningful source files up to 25 files for single-pass analysis
  const targetFiles = rawFiles.slice(0, 25);
  const prompt = buildUnifiedPrompt(targetFiles, projectName);

  if (onProgress) onProgress({ message: `AI agent analyzing architecture and data flows...`, percent: 45 });

  const rawResponse = await executeAIPrompt(prompt);
  if (onProgress) onProgress({ message: 'Parsing architectural connections and data flows...', percent: 80 });

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

  // Ensure any files not explicitly in AI output are indexed cleanly
  for (const rf of rawFiles) {
    if (!fileMap[rf.path]) {
      fileMap[rf.path] = {
        path: rf.path,
        name: rf.name,
        role: rf.path.includes('repo') ? 'storage' : rf.path.includes('service') ? 'service' : rf.path.includes('handler') ? 'controller' : 'view',
        plainEnglish: `${rf.name} participates as an active component in this application.`,
        inbound: 'Receives requests from callers.',
        outbound: 'Returns processed output.',
        calls: [],
        calledBy: [],
        dataShape: [],
        blastRadius: {
          score: 'low',
          riskLabel: `${rf.name} Unit`,
          safeInvariants: ['Preserve function and type signatures'],
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
    summary: parsed.summary || 'Application analyzed by AI.',
    analyzedAt: new Date().toISOString(),
    analyzer: 'ai',
    files: fileMap,
    connections: parsed.connections || [],
    journeys: parsed.journeys || [],
    workspaces: parsed.workspaces || [],
  };

  await saveProjectMaster(master);
  if (onProgress) onProgress({ message: 'Architecture visualizer ready!', percent: 100 });

  return master;
}
