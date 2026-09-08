import type { ParsedCodeFile, VibeProject } from '../types/ast';
import { parseSourceCode } from './astParser';
import { detectStack } from './stackDetector';
import { synthesizeUserJourneys } from './storySynthesizer';

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'out',
  '.venv',
  'venv',
  'env',
  '__pycache__',
  'vendor',
  '.turbo',
  'target',
  '.vscode',
  '.idea',
  'coverage',
  'public',
  'assets',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.tsx',
  '.ts',
  '.jsx',
  '.js',
  '.vue',
  '.svelte',
  '.py',
  '.go',
  '.html',
]);

function shouldSkipPath(path: string): boolean {
  const segments = path.split('/');
  return segments.some((seg) => IGNORED_DIRS.has(seg.toLowerCase()));
}

function hasValidExtension(path: string): boolean {
  const ext = '.' + (path.split('.').pop() || '').toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

// 1. Native Modern Browser Directory Scanner (window.showDirectoryPicker)
export async function scanLocalDirectoryWithPicker(): Promise<VibeProject> {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('Native directory picker not supported in this browser. Please use folder upload.');
  }

  // @ts-expect-error - File System Access API
  const dirHandle = await window.showDirectoryPicker();
  const projectName = dirHandle.name || 'Local Project';
  const parsedFiles: ParsedCodeFile[] = [];

  async function recurse(currentDirHandle: any, currentPath: string) {
    for await (const [name, handle] of currentDirHandle.entries()) {
      const entryPath = currentPath ? `${currentPath}/${name}` : name;

      if (handle.kind === 'directory') {
        if (!IGNORED_DIRS.has(name.toLowerCase())) {
          await recurse(handle, entryPath);
        }
      } else if (handle.kind === 'file') {
        if (hasValidExtension(name) && !shouldSkipPath(entryPath)) {
          try {
            const file = await handle.getFile();
            // Guard against large binary/data files > 2MB
            if (file.size < 2 * 1024 * 1024) {
              const content = await file.text();
              const parsed = parseSourceCode(entryPath, content);
              parsedFiles.push(parsed);
            }
          } catch (e) {
            console.warn(`Could not read ${entryPath}`, e);
          }
        }
      }
    }
  }

  await recurse(dirHandle, '');
  return packageProject(projectName, parsedFiles);
}

// 2. Fallback Directory Scanner using <input webkitdirectory />
export async function scanDirectoryFromInput(fileList: FileList): Promise<VibeProject> {
  const parsedFiles: ParsedCodeFile[] = [];
  let rootDirName = 'Local Project';

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const path = file.webkitRelativePath || file.name;
    const parts = path.split('/');
    if (parts.length > 1 && rootDirName === 'Local Project') {
      rootDirName = parts[0];
    }

    // Strip top root directory name if webkitRelativePath
    const relativePath = parts.length > 1 ? parts.slice(1).join('/') : path;

    if (!shouldSkipPath(relativePath) && hasValidExtension(relativePath)) {
      if (file.size < 2 * 1024 * 1024) {
        try {
          const content = await file.text();
          const parsed = parseSourceCode(relativePath, content);
          parsedFiles.push(parsed);
        } catch (e) {
          console.warn(`Could not read ${path}`, e);
        }
      }
    }
  }

  return packageProject(rootDirName, parsedFiles);
}

// Helper to package parsed files into VibeProject
function packageProject(name: string, files: ParsedCodeFile[]): VibeProject {
  const detectedStack = files.length > 0 ? detectStack(files[0].path, files[0].code) : null;
  const framework = detectedStack?.frameworkName || 'Fullstack Application';

  const slug = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');

  return {
    id: `local-${slug}`,
    name: name,
    framework: `${framework} (${files.length} source files)`,
    tagline: 'Scanned directly from local disk with zero cloud upload',
    description: `Local project with ${files.length} active files, detected as ${framework}.`,
    files: files,
    traces: synthesizeUserJourneys(files),
  };
}
