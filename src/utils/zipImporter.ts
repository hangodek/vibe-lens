import JSZip from 'jszip';
import type { ParsedCodeFile, VibeProject } from '../types/ast';
import { parseSourceCode } from './astParser';
import { detectStack } from './stackDetector';
import { synthesizeUserJourneys } from './storySynthesizer';
import { hasAllowedCodeExtension } from '../constants/files';

const IGNORED = ['node_modules/', '.git/', '.next/', 'dist/', 'build/', '__pycache__/', '.venv/', 'vendor/'];

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
    if (hasAllowedCodeExtension(entryPath)) {
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

  const slug = projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');

  return {
    id: `zip-${slug}`,
    name: projectName,
    framework: `${detected.frameworkName} (Zip Archive)`,
    tagline: `Extracted ${parsedFiles.length} files client-side`,
    description: `Project extracted from ${file.name}.`,
    files: parsedFiles,
    traces: synthesizeUserJourneys(parsedFiles),
  };
}
