import type { LayerMode } from '../../types/ast';
import { LayoutGrid, Database, Zap } from 'lucide-react';

interface LayerSelectorProps {
  currentMode: LayerMode;
  onChangeMode: (mode: LayerMode) => void;
}

export function LayerSelector({ currentMode, onChangeMode }: LayerSelectorProps) {
  const layers: { id: LayerMode; label: string; icon: React.ComponentType<{ className?: string }>; hotkey: string }[] = [
    { id: 'screen', label: 'Screen Flow', icon: LayoutGrid, hotkey: '1' },
    { id: 'data', label: 'Data & State', icon: Database, hotkey: '2' },
    { id: 'trace', label: 'Execution Trace', icon: Zap, hotkey: '3' },
  ];

  return (
    <div className="flex items-center bg-[#08090a] border border-[#23252a] rounded-lg p-1 gap-1">
      {layers.map((layer) => {
        const Icon = layer.icon;
        const isActive = currentMode === layer.id;

        return (
          <button
            key={layer.id}
            onClick={() => onChangeMode(layer.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              isActive
                ? 'bg-[#1c1d22] text-[#f7f8f8] border border-[#343842] shadow-sm'
                : 'text-[#8a8f98] hover:text-[#d0d6e0] hover:bg-[#121316]'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#5e6ad2]' : 'text-[#8a8f98]'}`} />
            <span>{layer.label}</span>
            <span className="text-[10px] font-mono text-[#62666d] bg-[#121316] px-1.5 py-0.5 rounded border border-[#23252a]">
              {layer.hotkey}
            </span>
          </button>
        );
      })}
    </div>
  );
}
