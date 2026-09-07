import type { RefObject } from 'react';
import { FolderOpen, GitBranch, UploadCloud, Loader2 } from 'lucide-react';

interface IngestTabPanelsProps {
  activeTab: 'folder' | 'github' | 'zip' | 'paste';
  isLoading: boolean;
  githubUrl: string;
  pastePath: string;
  pasteCode: string;
  folderInputRef: RefObject<HTMLInputElement | null>;
  zipInputRef: RefObject<HTMLInputElement | null>;
  setGithubUrl: (url: string) => void;
  setPastePath: (path: string) => void;
  setPasteCode: (code: string) => void;
  onScanFolder: () => void;
  onFolderInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImportGitHub: () => void;
  onZipFile: (file: File) => void;
  onPasteSubmit: () => void;
}

export function IngestTabPanels({
  activeTab,
  isLoading,
  githubUrl,
  pastePath,
  pasteCode,
  folderInputRef,
  zipInputRef,
  setGithubUrl,
  setPastePath,
  setPasteCode,
  onScanFolder,
  onFolderInputChange,
  onImportGitHub,
  onZipFile,
  onPasteSubmit,
}: IngestTabPanelsProps) {
  if (activeTab === 'folder') {
    return (
      <div className="space-y-4 py-2">
        <div
          onClick={onScanFolder}
          className="border-2 border-dashed border-[#343842] hover:border-[#5e6ad2] bg-[#050608] hover:bg-[#121316]/50 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group"
        >
          <div className="p-4 rounded-full bg-[#121316] border border-[#23252a] mb-3 group-hover:scale-110 transition-transform">
            <FolderOpen className="w-8 h-8 text-[#5e6ad2]" />
          </div>
          <h4 className="text-xs font-semibold text-white">Select Local Project Directory</h4>
          <p className="text-[11px] text-[#8a8f98] mt-1 max-w-xs leading-relaxed">
            Reads files 100% in-browser. Automatically ignores <code className="text-[#d0d6e0]">node_modules</code> and <code className="text-[#d0d6e0]">.git</code>.
          </p>
          <span className="mt-4 px-3 py-1 bg-[#5e6ad2] text-white text-xs font-medium rounded-lg shadow-sm">
            Open Directory Picker
          </span>
        </div>
        <input
          type="file"
          {...({ webkitdirectory: '', directory: '' } as any)}
          ref={folderInputRef}
          onChange={onFolderInputChange}
          className="hidden"
        />
      </div>
    );
  }

  if (activeTab === 'github') {
    return (
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-[#8a8f98]">GitHub Repository URL</label>
          <input
            type="text"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/owner/repository"
            className="w-full bg-[#121316] border border-[#23252a] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono focus:border-[#5e6ad2]"
          />
        </div>
        <p className="text-[11px] text-[#62666d] leading-relaxed">
          Downloads and maps the public repository structure via raw CDN without token requirements.
        </p>
        <button
          onClick={onImportGitHub}
          disabled={isLoading || !githubUrl.trim()}
          className="w-full py-2 bg-[#5e6ad2] hover:bg-[#828fff] disabled:opacity-40 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitBranch className="w-3.5 h-3.5" />}
          <span>Import & Visualize Repository</span>
        </button>
      </div>
    );
  }

  if (activeTab === 'zip') {
    return (
      <div className="space-y-3 py-2">
        <div
          onClick={() => zipInputRef.current?.click()}
          className="border-2 border-dashed border-[#343842] hover:border-[#5e6ad2] bg-[#050608] hover:bg-[#121316]/50 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
        >
          <UploadCloud className="w-8 h-8 text-[#828fff] mb-2" />
          <h4 className="text-xs font-semibold text-white">Drop Project .zip Archive</h4>
          <p className="text-[11px] text-[#8a8f98] mt-1">Unpacks and parses all code files in memory</p>
        </div>
        <input
          type="file"
          accept=".zip"
          ref={zipInputRef}
          onChange={(e) => e.target.files?.[0] && onZipFile(e.target.files[0])}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 flex-1 flex flex-col">
      <div>
        <label className="text-[11px] font-mono text-[#8a8f98]">Virtual Path</label>
        <input
          type="text"
          value={pastePath}
          onChange={(e) => setPastePath(e.target.value)}
          className="w-full bg-[#121316] border border-[#23252a] rounded-lg px-2.5 py-1 text-xs text-white font-mono outline-none"
        />
      </div>
      <textarea
        value={pasteCode}
        onChange={(e) => setPasteCode(e.target.value)}
        className="flex-1 w-full bg-[#121316] border border-[#23252a] rounded-lg p-2.5 text-xs text-white font-mono resize-none outline-none h-36"
      />
      <button
        onClick={onPasteSubmit}
        className="w-full py-2 bg-[#5e6ad2] text-white text-xs font-medium rounded-lg"
      >
        Add Component
      </button>
    </div>
  );
}
