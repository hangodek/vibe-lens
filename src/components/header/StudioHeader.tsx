import type { LayerMode } from '../../types/ast';
import { LayerSelector } from './LayerSelector';
import { Compass, Key, Plus } from 'lucide-react';

interface StudioHeaderProps {
  currentMode: LayerMode;
  onChangeMode: (mode: LayerMode) => void;
  onOpenIngest: () => void;
  onOpenApiKey: () => void;
  totalFiles?: number;
}

export function StudioHeader({
  currentMode,
  onChangeMode,
  onOpenIngest,
  onOpenApiKey,
  totalFiles,
}: StudioHeaderProps) {
  return (
    <header className="h-14 border-b border-[#23252a] bg-[#08090a] px-4 flex items-center justify-between shrink-0 z-30">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-[#5e6ad2] flex items-center justify-center text-white shadow-[0_0_12px_rgba(94,106,210,0.5)]">
          <Compass className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#f7f8f8] tracking-tight">
              VibeLens
            </span>
            <span className="text-[10px] font-mono text-[#5e6ad2] bg-[#5e6ad2]/15 border border-[#5e6ad2]/30 px-1.5 py-0.2 rounded">
              v1.0
            </span>
          </div>
        </div>
      </div>

      {/* Center Segmented Layer Selector */}
      <LayerSelector currentMode={currentMode} onChangeMode={onChangeMode} />

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenIngest}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#121316] hover:bg-[#1c1d22] border border-[#23252a] text-[#f7f8f8] text-xs font-medium rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-[#5e6ad2]" />
          <span>Ingest Code</span>
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
