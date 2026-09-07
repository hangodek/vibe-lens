import type { ParsedCodeFile } from '../../types/ast';
import { Activity, AlertCircle, CheckCircle2 } from 'lucide-react';

interface StateMatrixProps {
  file: ParsedCodeFile;
}

export function StateMatrix({ file }: StateMatrixProps) {
  if (file.states.length === 0) {
    return (
      <div className="p-6 text-center text-[#8a8f98]">
        <CheckCircle2 className="w-8 h-8 mx-auto text-[#34d399] mb-2 opacity-80" />
        <h4 className="text-sm font-semibold text-[#f7f8f8]">Stateless Functional Unit</h4>
        <p className="text-xs text-[#8a8f98] mt-1 max-w-xs mx-auto">
          This file does not hold internal mutable state or struct declarations. It operates purely on parameters passed into its methods or templates.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-mono uppercase text-[#8a8f98] flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#34d399]" />
          Data Shape & State ({file.states.length})
        </h4>
        <span className="text-[10px] font-mono text-[#34d399] bg-[#34d399]/10 px-2 py-0.5 rounded-full border border-[#34d399]/20">
          Active
        </span>
      </div>

      <div className="space-y-3">
        {file.states.map((st) => (
          <div
            key={st.name}
            className="bg-[#08090a] border border-[#23252a] rounded-xl p-3.5 space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-[#f7f8f8] bg-[#121316] px-2 py-0.5 rounded border border-[#23252a]">
                {st.name}
              </span>
              <span className="text-[10px] font-mono text-[#8a8f98]">
                Type / Init: <code className="text-[#e2e8f0]">{st.initialValue}</code>
              </span>
            </div>

            <p className="text-xs text-[#d0d6e0] leading-relaxed">
              {st.purpose}
            </p>

            <div className="pt-2 border-t border-[#1c1d22] flex items-center justify-between text-[11px] font-mono text-[#8a8f98]">
              <span>Setter / Type:</span>
              <span className="text-[#828fff] font-mono">{st.setter}</span>
            </div>

            {st.modifiedBy.length > 0 && (
              <div className="flex items-center justify-between text-[11px] font-mono text-[#8a8f98]">
                <span>Accessed By:</span>
                <span className="text-[#d0d6e0] truncate max-w-[160px]">
                  {st.modifiedBy.join(', ')}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 bg-[#121316] border border-[#23252a] rounded-xl flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-[#828fff] shrink-0 mt-0.5" />
        <div className="text-xs text-[#8a8f98] leading-relaxed">
          <strong className="text-[#d0d6e0]">Architecture Notice:</strong> Keep mutable data shapes consolidated within dedicated service entities or models to prevent state fragmentation.
        </div>
      </div>
    </div>
  );
}
