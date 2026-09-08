import { useState, useRef } from 'react';
import type { ParsedCodeFile, VibeProject } from '../../types/ast';
import { parseSourceCode } from '../../utils/astParser';
import { scanLocalDirectoryWithPicker, scanDirectoryFromInput } from '../../utils/directoryScanner';
import { importFromGitHub } from '../../utils/githubImporter';
import { importFromZip } from '../../utils/zipImporter';
import { IngestTabPanels } from './IngestTabPanels';
import { 
  X, 
  FolderOpen, 
  GitBranch, 
  Archive, 
  FileCode, 
  Sparkles, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFile: (file: ParsedCodeFile) => void;
  onLoadProject: (project: VibeProject) => void;
}

export type IngestTab = 'folder' | 'github' | 'zip' | 'paste';

export function IngestModal({ isOpen, onClose, onAddFile, onLoadProject }: IngestModalProps) {
  const [activeTab, setActiveTab] = useState<IngestTab>('folder');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [githubUrl, setGithubUrl] = useState('');
  const [pastePath, setPastePath] = useState('components/QuickCard.tsx');
  const [pasteCode, setPasteCode] = useState(`export function QuickCard() {\n  return <div>Custom Vibe Component</div>;\n}`);

  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const zipInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // 1. Native Folder Scanner
  const handleScanFolder = async () => {
    if ('showDirectoryPicker' in window) {
      setIsLoading(true);
      setErrorMsg(null);
      setStatusMsg('Requesting local directory access...');
      try {
        const project = await scanLocalDirectoryWithPicker();
        onLoadProject(project);
        onClose();
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setErrorMsg(err.message || 'Could not scan local directory.');
        }
      } finally {
        setIsLoading(false);
        setStatusMsg(null);
      }
    } else {
      // No spinner here: the hidden folder input owns the loading state so a
      // cancelled OS dialog can't leave the modal stuck in "loading".
      setErrorMsg(null);
      setStatusMsg(null);
      folderInputRef.current?.click();
    }
  };

  const handleFolderInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const picked = e.target.files;
    // Reset so the same folder can be re-picked after closing the modal
    e.target.value = '';
    setIsLoading(true);
    setStatusMsg(`Reading ${picked.length} files...`);
    try {
      const project = await scanDirectoryFromInput(picked);
      onLoadProject(project);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing directory.');
    } finally {
      setIsLoading(false);
      setStatusMsg(null);
    }
  };

  // 2. GitHub Importer
  const handleImportGitHub = async () => {
    if (!githubUrl.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const project = await importFromGitHub(githubUrl, (msg) => setStatusMsg(msg));
      onLoadProject(project);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to import GitHub repository.');
    } finally {
      setIsLoading(false);
      setStatusMsg(null);
    }
  };

  // 3. Zip Upload
  const handleZipFile = async (file: File) => {
    setIsLoading(true);
    setErrorMsg(null);
    setStatusMsg(`Extracting ${file.name}...`);
    try {
      const project = await importFromZip(file);
      onLoadProject(project);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to unzip project archive.');
    } finally {
      setIsLoading(false);
      setStatusMsg(null);
    }
  };

  // 4. Quick Paste
  const handlePasteSubmit = () => {
    if (!pasteCode.trim()) return;
    const parsed = parseSourceCode(pastePath, pasteCode);
    onAddFile(parsed);
    onClose();
  };

  const tabList = [
    { id: 'folder', label: 'Folder', icon: FolderOpen },
    { id: 'github', label: 'GitHub', icon: GitBranch },
    { id: 'zip', label: 'Zip Drop', icon: Archive },
    { id: 'paste', label: 'Paste', icon: FileCode },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#08090a] border border-[#23252a] rounded-2xl max-w-xl w-full p-6 relative shadow-2xl flex flex-col gap-4 max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#8a8f98] hover:text-white cursor-pointer">
          <X className="w-4 h-4" />
        </button>

        <div>
          <h3 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#5e6ad2]" />
            Import Vibe Codebase
          </h3>
          <p className="text-xs text-[#8a8f98] mt-0.5">
            Visualize any React, Next.js, Vue, Svelte, or Python project in 1 click.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[#121316] border border-[#23252a] rounded-xl text-xs font-medium">
          {tabList.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setActiveTab(t.id); setErrorMsg(null); }}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  isActive ? 'bg-[#1c1d22] text-white shadow-xs font-semibold' : 'text-[#8a8f98] hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#5e6ad2]' : ''}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Error / Status Notices */}
        {errorMsg && (
          <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl flex items-center gap-2 text-xs text-[#f87171]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {statusMsg && (
          <div className="p-3 bg-[#5e6ad2]/10 border border-[#5e6ad2]/30 rounded-xl flex items-center gap-2 text-xs text-[#828fff]">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Tab Content Panels */}
        <IngestTabPanels
          activeTab={activeTab}
          isLoading={isLoading}
          githubUrl={githubUrl}
          pastePath={pastePath}
          pasteCode={pasteCode}
          folderInputRef={folderInputRef}
          zipInputRef={zipInputRef}
          setGithubUrl={setGithubUrl}
          setPastePath={setPastePath}
          setPasteCode={setPasteCode}
          onScanFolder={handleScanFolder}
          onFolderInputChange={handleFolderInputChange}
          onImportGitHub={handleImportGitHub}
          onZipFile={handleZipFile}
          onPasteSubmit={handlePasteSubmit}
        />
      </div>
    </div>
  );
}
