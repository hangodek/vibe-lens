import { Cpu, ShieldCheck } from 'lucide-react';
import type { AnalysisProgress } from '../../utils/aiAnalyzer';

interface AnalysisScreenProps {
  projectName: string;
  progress: AnalysisProgress;
  activeTool?: string;
  onCancel?: () => void;
}

export function AnalysisScreen({
  projectName,
  progress,
  activeTool = 'agy',
  onCancel,
}: AnalysisScreenProps) {
  return (
    <div className="fixed inset-0 z-50 bg-[#08090a] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-md w-full border border-[#23252a] bg-[#0c0d10] p-8 rounded-2xl shadow-2xl space-y-6">
        {/* Animated Scanner Radar */}
        <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-[#5e6ad2]/30 animate-ping" />
          <div className="w-14 h-14 rounded-full bg-[#16171d] border border-[#5e6ad2] flex items-center justify-center text-[#828fff] shadow-[0_0_20px_rgba(94,106,210,0.3)]">
            <Cpu className="w-7 h-7" />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[#f7f8f8] tracking-tight mb-1">
            Analyzing Codebase Architecture
          </h2>
          <p className="text-xs font-mono text-[#8a8f98] truncate max-w-sm mx-auto">
            {projectName}
          </p>
        </div>

        {/* Progress Bar & Percentage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#8a8f98]">
            <span className="truncate max-w-[260px] text-left text-[#d0d6e0]">
              {progress.message || 'Scanning project packages...'}
            </span>
            <span className="tabular-nums font-semibold text-[#828fff]">
              {progress.percent}%
            </span>
          </div>

          <div className="w-full h-1.5 bg-[#1a1c23] rounded-full overflow-hidden border border-[#2e323b]">
            <div
              className="h-full bg-gradient-to-r from-[#5e6ad2] to-[#828fff] transition-all duration-300 rounded-full"
              style={{ width: `${Math.max(5, progress.percent)}%` }}
            />
          </div>
        </div>

        {/* Engine Tags */}
        <div className="flex items-center justify-center gap-2 pt-2 text-[11px] font-mono text-[#62666d]">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#121316] border border-[#23252a]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
            <span>Agent: {activeTool}</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#121316] border border-[#23252a]">
            <ShieldCheck className="w-3 h-3 text-[#828fff]" />
            <span>IndexedDB Cache</span>
          </div>
        </div>

        <p className="text-[11px] text-[#62666d] leading-relaxed">
          AI is reading actual function calls, structs, database routes, and data flows to synthesize genuine mental models and execution journeys.
        </p>

        {onCancel ? (
          <button
            onClick={onCancel}
            className="text-xs text-[#8a8f98] hover:text-white underline cursor-pointer"
          >
            Cancel and return
          </button>
        ) : null}
      </div>
    </div>
  );
}
