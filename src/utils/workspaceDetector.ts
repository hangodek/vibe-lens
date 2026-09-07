import type { ParsedCodeFile } from '../types/ast';

export type WorkspaceIconType = 'folder' | 'server' | 'box' | 'shield' | 'layers' | 'grid';

export interface FeatureWorkspace {
  id: string;
  name: string;
  iconType: WorkspaceIconType;
  fileCount: number;
  files: ParsedCodeFile[];
}

const GENERIC_CONTAINERS = new Set([
  'src',
  'internal',
  'app',
  'web',
  'templates',
  'pkg',
  'lib',
  'modules',
  'services',
  'packages',
]);

export function extractSubsystemKey(filePath: string): string {
  const clean = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = clean.split('/').filter((p) => !p.startsWith('.') && p.length > 0);

  if (parts.length <= 1) {
    return 'root';
  }

  // Root entrypoint files (e.g. cmd/server/main.go or manage.py)
  const fileName = parts[parts.length - 1].toLowerCase();
  if (parts.length === 2 && (fileName.startsWith('main.') || fileName.startsWith('app.') || fileName.startsWith('server.') || fileName.startsWith('index.'))) {
    return 'root';
  }

  // Filter out generic outer wrappers (src, internal, app, web, templates)
  const meaningful = parts.slice(0, -1).filter((seg) => !GENERIC_CONTAINERS.has(seg.toLowerCase()));

  if (meaningful.length === 0) {
    // If all parent folders were generic (e.g. "web/templates/login.html"), use the immediate parent
    const immediateParent = parts[parts.length - 2];
    return immediateParent.toLowerCase();
  }

  // Use the deepest domain segment (e.g. "internal/auth" -> "auth", "accounts/views.py" -> "accounts")
  const domain = meaningful[meaningful.length - 1].replace(/^[(_[]+|[)_\]]+$/g, '');
  return domain.toLowerCase();
}

function assignIcon(domainKey: string): WorkspaceIconType {
  const d = domainKey.toLowerCase();
  if (d.includes('auth') || d.includes('user') || d.includes('account') || d.includes('login') || d.includes('security')) {
    return 'shield';
  }
  if (d.includes('server') || d.includes('cmd') || d.includes('root') || d.includes('gateway') || d.includes('shared') || d.includes('core')) {
    return 'server';
  }
  if (d.includes('order') || d.includes('cart') || d.includes('checkout') || d.includes('billing') || d.includes('pay')) {
    return 'layers';
  }
  if (d.includes('product') || d.includes('item') || d.includes('catalog') || d.includes('shop') || d.includes('store')) {
    return 'box';
  }
  return 'folder';
}

function formatWorkspaceTitle(domainKey: string): string {
  if (domainKey === 'root') return 'Server & Gateway';
  if (domainKey === 'ui') return 'UI Primitives';
  return domainKey.charAt(0).toUpperCase() + domainKey.slice(1);
}

export function detectWorkspaces(files: ParsedCodeFile[]): FeatureWorkspace[] {
  // If small project (<= 8 files), keep single clean workspace
  if (files.length <= 8) {
    return [
      {
        id: 'all',
        name: 'Main Workspace',
        iconType: 'layers',
        fileCount: files.length,
        files: files,
      },
    ];
  }

  const groupMap = new Map<string, ParsedCodeFile[]>();

  files.forEach((f) => {
    const key = extractSubsystemKey(f.path);
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(f);
  });

  const workspaces: FeatureWorkspace[] = [];

  groupMap.forEach((domainFiles, key) => {
    workspaces.push({
      id: key,
      name: formatWorkspaceTitle(key),
      iconType: assignIcon(key),
      fileCount: domainFiles.length,
      files: domainFiles,
    });
  });

  // Sort: Server/Root first, then by file count descending
  workspaces.sort((a, b) => {
    if (a.id === 'root') return -1;
    if (b.id === 'root') return 1;
    return b.fileCount - a.fileCount;
  });

  // Append 'All Files' macro view at the end
  workspaces.push({
    id: 'all',
    name: 'All Files',
    iconType: 'grid',
    fileCount: files.length,
    files: files,
  });

  return workspaces;
}
