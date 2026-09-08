import { useState, useRef, useEffect } from 'react';
import type { LayerMode, ParsedCodeFile } from '../../types/ast';
import { LayerSelector } from './LayerSelector';
import { Compass, Key, Plus, Search, X, CheckCircle2, RefreshCw, Zap } from 'lucide-react';

interface StudioHeaderProps {
  currentMode: LayerMode;
  files?: ParsedCodeFile[];
  viewScope?: 'core' | 'all';
  projectSummary?: string;
  projectStack?: string;
  connectionCount?: number;
  onChangeMode: (mode: LayerMode) => void;
  onChangeScope?: (scope: 'core' | 'all') => void;
  onOpenIngest: () => void;
  onOpenApiKey: () => void;
  onRescanAI?: () => void;
  onSelectFile?: (fileId: string) => void;
}

export function StudioHeader({
  currentMode,
  files = [],
  viewScope = 'core',
  projectSummary,
  projectStack,
  connectionCount = 0,
  onChangeMode,
  onChangeScope,
  onOpenIngest,
  onOpenApiKey,
  onRescanAI,
  onSelectFile,
}: StudioHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAiStatusOpen, setIsAiStatusOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const activeTool = localStorage.getItem('vibe_cli_tool') || 'opencode';

  // Global hotkey: CMD+K or '/' focuses search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsAiStatusOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredFiles = searchQuery.trim()
    ? files.filter(
        (f) =>
          f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.states.some((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          f.components.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  return (
    <header className="h-14 border-b border-[#23252a] bg-[#08090a] px-4 flex items-center justify-between shrink-0 z-30 relative select-none">
      {/* Brand Identity & AI Verified Badge */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-[#5e6ad2] flex items-center justify-center text-white shadow-[0_0_12px_rgba(94,106,210,0.5)]">
          <Compass className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#f7f8f8] tracking-tight font-sans">
              VibeLens
            </span>

            {/* AI Analysis Status Badge — honest: only green when edges exist */}
            <div className="relative">
              <button
                onClick={() => setIsAiStatusOpen(!isAiStatusOpen)}
                className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer border ${
                  connectionCount > 0
                    ? 'bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#34d399] border-[#10b981]/30'
                    : 'bg-[#f59e0b]/10 hover:bg-[#f59e0b]/20 text-[#fbbf24] border-[#f59e0b]/30'
                }`}
                title="Click to view AI analysis summary"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${connectionCount > 0 ? 'bg-[#34d399] animate-pulse' : 'bg-[#fbbf24]'}`} />
                <span className="capitalize">{connectionCount > 0 ? `${activeTool} Verified` : 'Not analyzed'}</span>
              </button>

              {/* AI Verification Dropdown Card */}
              {isAiStatusOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsAiStatusOpen(false)}
                  />
                  <div className="absolute left-0 top-7 z-50 w-80 bg-[#0a0b0e] border border-[#23252a] rounded-xl shadow-2xl p-4 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-[#1c1d22] pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#f7f8f8]">
                        <CheckCircle2 className={`w-4 h-4 ${connectionCount > 0 ? 'text-[#34d399]' : 'text-[#fbbf24]'}`} />
                        <span>{connectionCount > 0 ? 'AI Architecture Verified' : 'AI Analysis Pending'}</span>
                      </div>
                      <span className="text-[10px] font-mono uppercase text-[#828fff] bg-[#5e6ad2]/15 px-1.5 py-0.2 rounded">
                        {activeTool}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-[#8a8f98] uppercase">Detected Stack</span>
                      <p className="text-xs font-mono text-[#f7f8f8]">
                        {projectStack || 'Polyglot Application'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-[#8a8f98] uppercase">Flow Summary</span>
                      <p className="text-xs text-[#d0d6e0] leading-relaxed">
                        {projectSummary || 'Architecture and execution topology verified by local CLI agent.'}
                      </p>
                    </div>

                    {connectionCount > 0 ? (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#34d399] bg-[#121318] p-2 rounded border border-[#23252a]">
                        <Zap className="w-3.5 h-3.5" />
                        <span>{connectionCount} AI-verified connections active</span>
                      </div>
                    ) : (
                      <div className="text-[11px] font-mono text-[#fbbf24] bg-[#121318] p-2 rounded border border-[#f59e0b]/30">
                        No connections yet — run Re-Analyze below so OpenCode maps this project.
                      </div>
                    )}

                    {onRescanAI && (
                      <button
                        onClick={() => {
                          setIsAiStatusOpen(false);
                          onRescanAI();
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Re-Analyze with {activeTool}</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Center: Layer Selector with Core Flow / All Files Filter */}
      <LayerSelector
        currentMode={currentMode}
        viewScope={viewScope}
        onChangeMode={onChangeMode}
        onChangeScope={onChangeScope}
      />

      {/* Right Controls: Quick Search, Ingest, and Settings */}
      <div className="flex items-center gap-2">
        {/* Quick Search Trigger */}
        <div className="relative">
          <button
            onClick={() => {
              setIsSearchOpen(true);
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-[#121316] hover:bg-[#1c1d22] border border-[#23252a] rounded-lg text-xs text-[#8a8f98] hover:text-white transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-[#5e6ad2]" />
            <span className="text-[11px] hidden sm:inline">Search nodes...</span>
            <kbd className="text-[9px] font-mono bg-[#08090a] px-1.5 py-0.5 rounded border border-[#23252a] text-[#62666d]">
              ⌘K
            </kbd>
          </button>

          {/* Quick Search Dropdown */}
          {isSearchOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
                onClick={() => setIsSearchOpen(false)}
              />
              <div className="absolute right-0 top-11 z-50 w-80 bg-[#08090a] border border-[#23252a] rounded-xl shadow-2xl p-2 flex flex-col gap-2">
                <div className="flex items-center gap-2 bg-[#121316] border border-[#343842] rounded-lg px-2.5 py-1.5">
                  <Search className="w-3.5 h-3.5 text-[#5e6ad2]" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type file or function name..."
                    className="flex-1 bg-transparent text-xs text-white outline-none font-mono"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-[#8a8f98] hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1">
                  {filteredFiles.length > 0 ? (
                    filteredFiles.map((file) => (
                      <button
                        key={file.id}
                        onClick={() => {
                          if (onSelectFile) onSelectFile(file.id);
                          setIsSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-[#121316] transition-colors flex items-center justify-between text-xs text-[#d0d6e0] hover:text-white cursor-pointer"
                      >
                        <div className="truncate">
                          <span className="font-semibold font-mono text-[#f7f8f8]">{file.name}</span>
                          <span className="text-[10px] text-[#8a8f98] ml-2 font-mono">{file.path}</span>
                        </div>
                        <span className="text-[9px] font-mono uppercase text-[#5e6ad2] bg-[#5e6ad2]/15 px-1.5 py-0.2 rounded">
                          {file.type}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-[#8a8f98] p-3 text-center">No matching files found</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <button
          onClick={onOpenIngest}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#121316] hover:bg-[#1c1d22] border border-[#23252a] text-[#f7f8f8] text-xs font-medium rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-[#5e6ad2]" />
          <span>Ingest</span>
        </button>

        <button
          onClick={onOpenApiKey}
          className="p-2 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#121316] rounded-lg border border-transparent hover:border-[#23252a] transition-colors cursor-pointer"
          title="AI Agent Settings"
        >
          <Key className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
