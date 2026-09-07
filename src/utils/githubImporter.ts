import type { ParsedCodeFile, VibeProject } from '../types/ast';
import { parseSourceCode } from './astParser';
import { detectStack } from './stackDetector';
import { synthesizeUserJourneys } from './storySynthesizer';

const IGNORED_PATHS = [
  'node_modules/',
  '.git/',
  '.next/',
  'dist/',
  'build/',
  '__pycache__/',
  '.venv/',
  'vendor/',
  'public/',
  'assets/',
];

const ALLOWED_EXT = ['.tsx', '.ts', '.jsx', '.js', '.vue', '.svelte', '.py', '.go', '.html'];

export function parseGitHubUrl(input: string): { owner: string; repo: string; branch: string } | null {
  const clean = input.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
  const parts = clean.split('/');
  if (parts.length < 2) return null;

  const owner = parts[0];
  const repo = parts[1];
  let branch = 'main';

  // Handle https://github.com/owner/repo/tree/branch_name
  if (parts[2] === 'tree' && parts[3]) {
    branch = parts.slice(3).join('/');
  }

  return { owner, repo, branch };
}

export async function importFromGitHub(
  urlOrSlug: string,
  onProgress?: (status: string) => void
): Promise<VibeProject> {
  const parsed = parseGitHubUrl(urlOrSlug);
  if (!parsed) {
    throw new Error('Invalid GitHub repository format. Use "owner/repo" or "https://github.com/owner/repo"');
  }

  const { owner, repo } = parsed;
  let branch = parsed.branch;

  onProgress?.(`Contacting GitHub repository ${owner}/${repo}...`);

  // 1. Get repository tree via GitHub API
  let treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);

  // Fallback to 'master' branch if 'main' returns 404
  if (!treeRes.ok && branch === 'main') {
    branch = 'master';
    treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
  }

  if (!treeRes.ok) {
    if (treeRes.status === 403) {
      throw new Error('GitHub API rate limit reached. Please wait or use Local Folder import.');
    }
    if (treeRes.status === 404) {
      throw new Error(`Repository "${owner}/${repo}" not found or is private.`);
    }
    throw new Error(`GitHub API returned HTTP ${treeRes.status}`);
  }

  const treeData = await treeRes.json();
  const treeList: { path: string; type: string; size?: number }[] = treeData.tree || [];

  // 2. Filter for valid source code files
  const codeFiles = treeList.filter((item) => {
    if (item.type !== 'blob') return false;
    if (IGNORED_PATHS.some((ign) => item.path.includes(ign))) return false;
    return ALLOWED_EXT.some((ext) => item.path.endsWith(ext));
  });

  if (codeFiles.length === 0) {
    throw new Error('No supported frontend or backend source code files found in repository.');
  }

  onProgress?.(`Found ${codeFiles.length} code files. Downloading core architecture files...`);

  // Prioritize primary pages, routes, components, and controllers (limit to top 16 core files)
  const prioritized = codeFiles.sort((a, b) => {
    const isAPage = a.path.includes('page') || a.path.includes('index') || a.path.includes('main') || a.path.includes('App');
    const isBPage = b.path.includes('page') || b.path.includes('index') || b.path.includes('main') || b.path.includes('App');
    if (isAPage && !isBPage) return -1;
    if (!isAPage && isBPage) return 1;
    return (a.path.split('/').length) - (b.path.split('/').length);
  }).slice(0, 16);

  // 3. Fetch file contents via raw.githubusercontent.com CDN (unlimited requests)
  const parsedFiles: ParsedCodeFile[] = [];

  await Promise.all(
    prioritized.map(async (f) => {
      try {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${f.path}`;
        const res = await fetch(rawUrl);
        if (res.ok) {
          const text = await res.text();
          const parsedFile = parseSourceCode(f.path, text);
          parsedFiles.push(parsedFile);
        }
      } catch (e) {
        console.warn(`Could not fetch ${f.path}`, e);
      }
    })
  );

  if (parsedFiles.length === 0) {
    throw new Error('Failed to download source files from raw CDN.');
  }

  const detected = detectStack(parsedFiles[0].path, parsedFiles[0].code);

  return {
    id: `gh-${owner}-${repo}`,
    name: `${owner}/${repo}`,
    framework: `${detected.frameworkName} (GitHub ${branch})`,
    tagline: `Imported from github.com/${owner}/${repo}`,
    description: `Public repository with ${parsedFiles.length} analyzed components and routes.`,
    files: parsedFiles,
    traces: synthesizeUserJourneys(parsedFiles),
  };
}
