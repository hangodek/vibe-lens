import type { ParsedCodeFile } from '../types/ast';

export function generateEli5Summary(file: ParsedCodeFile): {
  overview: string;
  whyAiMadeThis: string;
  magicVariables: string[];
  vibePromptAdvice: string;
} {
  const compList = file.components.length > 0 ? file.components.join(', ') : file.name;
  
  let overview = file.description;
  if (file.type === 'page') {
    overview = `This is a primary screen in your app. It arranges visual components like ${file.renderedChildren.join(', ') || 'UI sections'} into a coherent layout and acts as the entry door for users visiting this route.`;
  } else if (file.type === 'hook') {
    overview = `This is a background helper hook. It manages live state, coordinates asynchronous network requests, and feeds clean data directly into your visual components so they don't get messy.`;
  } else if (file.type === 'store') {
    overview = `This is your global memory bank. Any component in the app can read from or write to this store without passing data through a dozen intermediate files.`;
  } else if (file.type === 'api') {
    overview = `This is a secure server endpoint. It runs on the server, safely accessing private secrets/keys, talking to external databases or AI models, and returning clean JSON to your browser.`;
  }

  const magicVariables: string[] = [];
  if (file.states.length > 0) {
    file.states.forEach((s) => {
      magicVariables.push(
        `• ${s.name}: Holds the current value (starts as ${s.initialValue}). When ${s.setter}() is called, React repaints the screen.`
      );
    });
  } else {
    magicVariables.push('• No local state variables defined. This component is stateless and displays whatever props its parent gives it.');
  }

  const vibePromptAdvice = `If you want your AI assistant to tweak this file, prompt it like this: "In ${file.path}, update ${compList} to..." — specifying the exact file path stops AI hallucination!`;

  return {
    overview,
    whyAiMadeThis: file.whyAiMadeThis,
    magicVariables,
    vibePromptAdvice
  };
}
