import type { ParsedCodeFile } from '../types/ast';

export function generateEli5Summary(file: ParsedCodeFile): {
  overview: string;
  whyAiMadeThis: string;
  magicVariables: string[];
  vibePromptAdvice: string;
} {
  const compList = file.components.length > 0 ? file.components.join(', ') : file.name;
  
  // Use the actual file description (AI plainEnglish or semantic processing description)
  // Never clobber backend Go/Python/etc. files with React-specific hook/store text!
  const overview = file.description || `${file.name} operates as a ${file.pipelineRole || 'module'} in this architecture.`;

  const magicVariables: string[] = [];
  if (file.states.length > 0) {
    file.states.forEach((s) => {
      const modifier = s.modifiedBy.length > 0 ? ` — Used by: ${s.modifiedBy.join(', ')}` : '';
      magicVariables.push(
        `• ${s.name}: ${s.purpose || `Type: ${s.initialValue}`}${modifier}`
      );
    });
  } else {
    magicVariables.push('• No internal mutable state or struct data mapped for this file. Operates functionally.');
  }

  const vibePromptAdvice = `If you want your AI assistant to tweak this file, prompt it like this: "In ${file.path}, update ${compList} to..." — specifying the exact file path stops AI hallucination!`;

  return {
    overview,
    whyAiMadeThis: file.whyAiMadeThis,
    magicVariables,
    vibePromptAdvice
  };
}
