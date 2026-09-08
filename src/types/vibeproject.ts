import type { PipelineRole } from './ast';

export interface VibeDataField {
  name: string;
  type?: string;
  purpose?: string;
}

export interface VibeDataStructure {
  name: string;
  kind: 'struct' | 'class' | 'interface' | 'state' | 'table' | 'record';
  fields: VibeDataField[];
}

export interface VibeMasterConnection {
  from: string;         // source file path e.g. "web/templates/auth/login.html"
  to: string;           // target file path e.g. "internal/auth/handler.go"
  whatHappens: string;  // e.g. "Visitor submits email and password credentials"
  dataPassed: string;   // e.g. "POST /login (email, password form payload)"
  codeSnippet?: string; // Key code call e.g. "authService.Authenticate(email, password)"
}

export interface VibeMasterFile {
  path: string;
  name: string;
  role: PipelineRole;
  plainEnglish: string; // What this specific file does in 1-2 clear human sentences
  inbound: string;      // What enters: e.g. "HTTP POST /login with form credentials"
  outbound: string;     // What exits: e.g. "Calls authService.Login(), sets session cookie"
  routes?: string[];    // Handled or requested endpoints e.g. ["GET /profile", "POST /login"]
  focalCode?: string;   // The key 5-15 lines of code representing this file
  focalLine?: number;   // The focal line number in the source file
  calls: string[];
  calledBy: string[];
  dataShape: VibeDataStructure[];
  blastRadius: {
    score: 'low' | 'moderate' | 'high';
    riskLabel: string;
    safeInvariants: string[];
    impactedFiles: string[];
  };
  userJourneys: string[];
}

export interface VibeMasterStep {
  file: string;
  action: string;
  dataTransformed?: string;
  dataPassed?: string;
  codeLine?: string;
  codeExplanation?: string;
  lineHighlight?: number;
}

export interface VibeMasterJourney {
  id: string;
  title: string;
  description: string;
  steps: VibeMasterStep[];
}

export interface VibeMasterWorkspace {
  id: string;
  name: string;
  description: string;
  files: string[];
  icon?: string;
}

export interface VibeLensProjectMaster {
  id: string;
  name: string;
  stack: string;
  summary: string;
  analyzedAt: string;
  analyzer: string; // 'agy' | 'opencode' | 'claude' | 'ollama' | 'openai' | 'groq' | 'gemini'
  files: Record<string, VibeMasterFile>;
  connections: VibeMasterConnection[];
  journeys: VibeMasterJourney[];
  workspaces: VibeMasterWorkspace[];
}
