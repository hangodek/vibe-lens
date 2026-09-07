import { useState, useRef, useEffect } from 'react';
import type { LayerMode, ParsedCodeFile } from '../../types/ast';
import { LayerSelector } from './LayerSelector';
import { Compass, Key, Plus, Search, X } from 'lucide-react';

interface StudioHeaderProps {
  currentMode: LayerMode;
  files?: ParsedCodeFile[];
  onChangeMode: (mode: LayerMode) => void;
  onOpenIngest: () => void;
  onOpenApiKey: () => void;
  onSelectFile?: (fileId: string) => void;
}

export function StudioHeader({
  currentMode,
  files = [],
  onChangeMode,
  onOpenIngest,
  onOpenApiKey,
  onSelectFile,
}: StudioHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Global hotkey: CMD+K or '/' focuses search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
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
    <header className="h-14 border-b border-[#23252a] bg-[#08090a] px-4 flex items-center justify-between shrink-0 z-30 relative">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-[#5e6ad2] flex items-center justify-center text-white shadow-[0_0_12px_rgba(94,106,210,0.5)]">
          <Compass className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#f7f8f8] tracking-tight font-sans">
              VibeLens
            </span>
            <span className="text-[10px] font-mono text-[#5e6ad2] bg-[#5e6ad2]/15 border border-[#5e6ad2]/30 px-1.5 py-0.2 rounded font-medium">
              v1.2
            </span>
          </div>
        </div>
      </div>

      {/* Center: Layer Selector */}
      <LayerSelector currentMode={currentMode} onChangeMode={onChangeMode} />

      {/* Right Controls: Quick Search, Ingest, and API Key */}
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

          {/* Quick Search Spotlight Overlay Dropdown */}
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
                    placeholder="Type file, component, or state name..."
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
                  ) : searchQuery ? (
                    <p className="text-xs text-[#8a8f98] p-3 text-center">No matching files found</p>
                  ) : (
                    <p className="text-[11px] text-[#62666d] p-2 text-center font-mono">
                      Type to filter by name, state, or hook...
                    </p>
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
          title="API Key Configuration"
        >
          <Key className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
