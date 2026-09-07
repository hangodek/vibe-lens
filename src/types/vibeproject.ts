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

export interface VibeMasterFile {
  path: string;
  name: string;
  role: PipelineRole;
  plainEnglish: string;
  inbound: string;
  outbound: string;
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
  journeys: VibeMasterJourney[];
  workspaces: VibeMasterWorkspace[];
}
