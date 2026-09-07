import JSZip from 'jszip';
import type { ParsedCodeFile, VibeProject } from '../types/ast';
import { parseSourceCode } from './astParser';
import { detectStack } from './stackDetector';

const IGNORED = ['node_modules/', '.git/', '.next/', 'dist/', 'build/', '__pycache__/', '.venv/', 'vendor/'];
const ALLOWED_EXT = ['.tsx', '.ts', '.jsx', '.js', '.vue', '.svelte', '.py', '.go', '.html'];

export async function importFromZip(file: File): Promise<VibeProject> {
  const zip = await JSZip.loadAsync(file);
  const parsedFiles: ParsedCodeFile[] = [];
  const projectName = file.name.replace(/\.zip$/i, '') || 'Zip Project';

  const entries = Object.keys(zip.files);

  for (const entryPath of entries) {
    const entry = zip.files[entryPath];
    if (entry.dir) continue;

    // Skip ignored paths
    if (IGNORED.some((ign) => entryPath.includes(ign))) continue;

    // Check extension
    if (ALLOWED_EXT.some((ext) => entryPath.endsWith(ext))) {
      try {
        const text = await entry.async('text');
        // Clean leading folder name if zipped as folder
        const cleanPath = entryPath.replace(/^[^/]+\//, '');
        const parsed = parseSourceCode(cleanPath || entryPath, text);
        parsedFiles.push(parsed);
      } catch (e) {
        console.warn(`Could not unzip ${entryPath}`, e);
      }
    }
  }

  if (parsedFiles.length === 0) {
    throw new Error('No supported code files found in zip archive.');
  }

  const detected = detectStack(parsedFiles[0].path, parsedFiles[0].code);

  return {
    id: 'zip-' + Math.random().toString(36).substring(2, 9),
    name: projectName,
    framework: `${detected.frameworkName} (Zip Archive)`,
    tagline: `Extracted ${parsedFiles.length} files client-side`,
    description: `Project extracted from ${file.name}.`,
    files: parsedFiles,
    traces: [
      {
        id: 'trace-zip-entry',
        title: 'Extracted Project Flow',
        triggerLabel: 'Archive Root',
        description: 'Auto-generated sequence from zip files.',
        steps: parsedFiles.slice(0, 4).map((f, idx) => ({
          id: `step-${idx + 1}`,
          stepNumber: idx + 1,
          title: `Executes ${f.name}`,
          description: f.description,
          activeNodeId: f.id,
          storybook: {
            chapterNumber: idx + 1,
            chapterTitle: `Stage ${idx + 1}`,
            story: `App triggers ${f.name}.`,
            humanCausality: f.whyAiMadeThis || 'Dependencies loaded.',
          },
        })),
      },
    ],
  };
}
