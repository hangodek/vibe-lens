import { AlertTriangle, Zap, ArrowUpRight } from 'lucide-react';

interface RealUsageMeterProps {
  isInteractive?: boolean;
}

export function RealUsageMeter({ isInteractive = false }: RealUsageMeterProps) {
  const usage = 84200;
  const limit = 100000;
  const percent = 84;

  return (
    <div className="w-full bg-[#08090a] border border-[#23252a] rounded-xl p-5 flex flex-col gap-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#5e6ad2]" />
          <span className="text-xs font-mono uppercase tracking-wider text-[#8a8f98]">
            Monthly Ingested Events
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#fbbf24] bg-[#f59e0b]/15 border border-[#f59e0b]/30 px-2 py-0.5 rounded-full font-bold">
          <AlertTriangle className="w-3 h-3 text-[#fbbf24]" /> 84% Quota
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold font-mono text-[#f7f8f8]">
          {usage.toLocaleString()}
        </span>
        <span className="text-xs text-[#8a8f98] font-mono">
          / {limit.toLocaleString()} events
        </span>
      </div>

      {/* Real Gradient Progress Bar */}
      <div className="w-full bg-[#1c1d22] h-2.5 rounded-full overflow-hidden p-0.5 border border-[#23252a]">
        <div
          className="h-full bg-gradient-to-r from-[#5e6ad2] to-[#828fff] rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(94,106,210,0.8)]"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#1c1d22]">
        <span className="text-[11px] text-[#8a8f98]">Resets in 6 days</span>
        <button className="flex items-center gap-1 px-3 py-1.5 bg-[#121316] hover:bg-[#1c1d22] border border-[#23252a] text-[#f7f8f8] text-xs font-medium rounded-lg transition-colors cursor-pointer">
          <span>Upgrade Tier</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-[#5e6ad2]" />
        </button>
      </div>
    </div>
  );
}
