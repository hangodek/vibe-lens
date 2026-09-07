import type { VibeLensProjectMaster, VibeMasterFile, VibeMasterJourney, VibeMasterWorkspace } from '../types/vibeproject';
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

function chunkFiles(files: RawFile[], maxChunkChars = 28000): RawFile[][] {
  const chunks: RawFile[][] = [];
  let currentChunk: RawFile[] = [];
  let currentSize = 0;

  for (const file of files) {
    const fileSize = file.code.length;
    if (currentChunk.length > 0 && (currentSize + fileSize > maxChunkChars || currentChunk.length >= 15)) {
      chunks.push(currentChunk);
      currentChunk = [file];
      currentSize = fileSize;
    } else {
      currentChunk.push(file);
      currentSize += fileSize;
    }
  }

  if (currentChunk.length > 0) chunks.push(currentChunk);
  return chunks;
}

function buildChunkPrompt(chunk: RawFile[], allPaths: string[]): string {
  const filesPayload = chunk.map(f => `--- FILE: ${f.path} (${f.name}) ---\n${f.code.slice(0, 3500)}`).join('\n\n');

  return `You are a Principal Software Architect. Analyze the following source files from a codebase.
All files in project: [${allPaths.slice(0, 50).join(', ')}]

Return ONLY valid JSON (no markdown, no extra commentary) matching this schema:
{
  "files": [
    {
      "path": "exact file path",
      "name": "filename",
      "role": "view" | "controller" | "service" | "storage" | "gateway" | "guard" | "utility" | "script",
      "plainEnglish": "Concise 1-2 sentence description explaining what THIS specific file actually does, its functions, and purpose.",
      "inbound": "What triggers or passes data into this file",
      "outbound": "What this file calls, outputs, or writes to",
      "calls": ["function or file calls"],
      "calledBy": ["callers"],
      "dataShape": [
        { "name": "StructOrClassName", "kind": "struct"|"class"|"interface"|"state"|"table", "fields": [{ "name": "fieldName", "type": "string" }] }
      ],
      "blastRadius": {
        "score": "low" | "moderate" | "high",
        "riskLabel": "e.g. Core Authentication Service",
        "safeInvariants": ["Key invariant 1", "Key invariant 2"],
        "impactedFiles": ["dependent file paths"]
      }
    }
  ]
}

SOURCE FILES:
${filesPayload}`;
}

function buildSynthesisPrompt(projectName: string, filesSummary: Record<string, VibeMasterFile>): string {
  const summaryList = Object.values(filesSummary).map(f => `- ${f.path} [role: ${f.role}]: ${f.plainEnglish}`).join('\n');

  return `You are a Principal Software Architect. Synthesize the overall architecture, dynamic feature workspaces, and end-to-end user journeys for "${projectName}".

Return ONLY valid JSON matching this schema:
{
  "stack": "e.g. Go 1.22 + SSR HTML Templates + Vanilla JS",
  "summary": "High-level architectural overview of what this application does and how layers connect.",
  "workspaces": [
    {
      "id": "workspace-slug",
      "name": "Workspace Title (e.g. Authentication, Product Catalog, Order & Checkout)",
      "description": "Domain purpose",
      "files": ["file paths belonging to this subsystem"],
      "icon": "ShieldCheck" | "Boxes" | "ShoppingCart" | "Server" | "LayoutGrid"
    }
  ],
  "journeys": [
    {
      "id": "journey-id",
      "title": "User Registration Journey",
      "description": "How a visitor signs up from HTML form down to database commit.",
      "steps": [
        { "file": "path/to/file.html", "action": "User submits registration credentials", "dataTransformed": "Form POST payload" },
        { "file": "path/to/handler.go", "action": "Validates input and dispatches to auth service" },
        { "file": "path/to/service.go", "action": "Hashes password with bcrypt" },
        { "file": "path/to/repository.go", "action": "Inserts user record into PostgreSQL" }
      ]
    }
  ]
}

FILES IN PROJECT:
${summaryList}`;
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
    if (cached) {
      if (onProgress) onProgress({ message: 'Loaded from local cache', percent: 100 });
      return cached;
    }
  }

  const allPaths = rawFiles.map(f => f.path);
  const chunks = chunkFiles(rawFiles);
  const analyzedFiles: Record<string, VibeMasterFile> = {};

  if (onProgress) onProgress({ message: `Preparing AI analysis for ${rawFiles.length} files...`, percent: 5 });

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const percent = Math.round(10 + (i / chunks.length) * 60);
    const chunkNames = chunk.slice(0, 3).map(f => f.name).join(', ') + (chunk.length > 3 ? '...' : '');

    if (onProgress) {
      onProgress({
        message: `Scanning package chunk ${i + 1}/${chunks.length}: ${chunkNames}`,
        percent,
      });
    }

    try {
      const prompt = buildChunkPrompt(chunk, allPaths);
      const rawResponse = await executeAIPrompt(prompt);
      const parsed = extractJsonFromResponse<{ files: VibeMasterFile[] }>(rawResponse);

      if (parsed.files && Array.isArray(parsed.files)) {
        for (const file of parsed.files) {
          analyzedFiles[file.path] = file;
        }
      }
    } catch (err: any) {
      console.warn(`[AI Analyzer] Chunk ${i + 1} failed:`, err?.message);
    }
  }

  if (onProgress) onProgress({ message: 'Synthesizing feature workspaces & user journeys...', percent: 80 });

  let stack = 'Polyglot Project';
  let summary = 'Full-stack application analyzed by AI.';
  let workspaces: VibeMasterWorkspace[] = [];
  let journeys: VibeMasterJourney[] = [];

  try {
    const synthPrompt = buildSynthesisPrompt(projectName, analyzedFiles);
    const synthRaw = await executeAIPrompt(synthPrompt);
    const synthData = extractJsonFromResponse<{
      stack?: string;
      summary?: string;
      workspaces?: VibeMasterWorkspace[];
      journeys?: VibeMasterJourney[];
    }>(synthRaw);

    if (synthData.stack) stack = synthData.stack;
    if (synthData.summary) summary = synthData.summary;
    if (synthData.workspaces) workspaces = synthData.workspaces;
    if (synthData.journeys) journeys = synthData.journeys;
  } catch (err: any) {
    console.warn('[AI Analyzer] Architecture synthesis fallback:', err?.message);
  }

  const master: VibeLensProjectMaster = {
    id: projectId,
    name: projectName,
    stack,
    summary,
    analyzedAt: new Date().toISOString(),
    analyzer: 'ai',
    files: analyzedFiles,
    journeys,
    workspaces,
  };

  await saveProjectMaster(master);
  if (onProgress) onProgress({ message: 'Analysis complete!', percent: 100 });

  return master;
}
