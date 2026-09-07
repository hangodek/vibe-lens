import { useState } from 'react';
import type { ParsedCodeFile } from '../../types/ast';
import { ShieldAlert, ShieldCheck, AlertTriangle, Copy, Check, Sparkles, FileCode } from 'lucide-react';

interface BlastRadiusCardProps {
  file: ParsedCodeFile;
}

export function BlastRadiusCard({ file }: BlastRadiusCardProps) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const radius = file.blastRadius || {
    score: 'low' as const,
    riskLabel: 'Low Impact (Isolated UI)',
    description: 'This file does not supply shared state to other components. Safe to edit visual presentation and styling.',
    impactedFiles: [],
    safeInvariants: ['Keep existing exported component signature intact']
  };

  const isLow = radius.score === 'low';
  const isModerate = radius.score === 'moderate';
  const isHigh = radius.score === 'high';

  const promptText = `I want to customize the visual design of \`${file.name}\` located at \`${file.path}\`.

CRITICAL ARCHITECTURAL INVARIANTS (DO NOT BREAK):
${radius.safeInvariants.map(inv => `- ${inv}`).join('\n')}
- Preserve all existing function exports and event signatures.
- Modify ONLY visual presentation, layout, and styling without breaking data flow.`;

  const copyPrompt = () => {
    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="space-y-4 p-4">
      {/* Risk Gauge Header */}
      <div className={`p-4 rounded-xl border ${
        isLow
          ? 'bg-[#10b981]/10 border-[#10b981]/30'
          : isModerate
          ? 'bg-[#f59e0b]/10 border-[#f59e0b]/30'
          : 'bg-[#ef4444]/10 border-[#ef4444]/30'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isLow ? (
              <ShieldCheck className="w-5 h-5 text-[#34d399]" />
            ) : isModerate ? (
              <AlertTriangle className="w-5 h-5 text-[#fbbf24]" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-[#f87171]" />
            )}
            <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-[#f7f8f8]">
              {radius.riskLabel}
            </h4>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
            isLow
              ? 'bg-[#34d399]/20 text-[#34d399]'
              : isModerate
              ? 'bg-[#fbbf24]/20 text-[#fbbf24]'
              : 'bg-[#f87171]/20 text-[#f87171]'
          }`}>
            Risk: {radius.score}
          </span>
        </div>
        <p className="text-xs text-[#d0d6e0] leading-relaxed">
          {radius.description}
        </p>
      </div>

      {/* Downstream Impact List */}
      <div className="bg-[#08090a] border border-[#23252a] rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono text-[#8a8f98]">
          <span>FILES AFFECTED IF BROKEN</span>
          <span>{radius.impactedFiles.length} files</span>
        </div>
        {radius.impactedFiles.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {radius.impactedFiles.map((fname) => (
              <span
                key={fname}
                className="text-[11px] font-mono px-2 py-1 rounded bg-[#121316] border border-[#23252a] text-[#f7f8f8] flex items-center gap-1.5"
              >
                <FileCode className="w-3 h-3 text-[#5e6ad2]" />
                {fname}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#34d399] font-mono flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> No downstream files rely on this file's internal state!
          </p>
        )}
      </div>

      {/* Critical Invariants to Protect */}
      <div className="bg-[#08090a] border border-[#23252a] rounded-xl p-3.5 space-y-2">
        <h5 className="text-xs font-mono uppercase text-[#8a8f98]">
          Critical Rules to Protect
        </h5>
        <div className="space-y-1.5">
          {radius.safeInvariants.map((rule, idx) => (
            <div
              key={idx}
              className="text-xs text-[#d0d6e0] bg-[#121316] p-2 rounded-lg border border-[#23252a] flex items-start gap-2"
            >
              <span className="text-[#5e6ad2] font-mono font-bold">•</span>
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Safe AI Prompter (Copy into Cursor / Claude) */}
      <div className="bg-[#121316] border border-[#343842] rounded-xl p-3.5 space-y-2.5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[#828fff]">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-mono font-semibold uppercase">
              Safe AI Prompt Builder
            </span>
          </div>
          <button
            onClick={copyPrompt}
            className="flex items-center gap-1.5 text-xs text-white bg-[#5e6ad2] hover:bg-[#828fff] px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer shadow-xs"
          >
            {copiedPrompt ? <Check className="w-3.5 h-3.5 text-[#34d399]" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedPrompt ? 'Copied to Clipboard!' : 'Copy Safe Prompt'}
          </button>
        </div>
        <p className="text-[11px] text-[#8a8f98]">
          Paste this directly into Cursor Composer or Claude Code. It instructs the AI to preserve wiring while safely changing your UI:
        </p>
        <pre className="text-[11px] font-mono text-[#d0d6e0] bg-[#08090a] p-2.5 rounded-lg border border-[#23252a] overflow-x-auto whitespace-pre-wrap select-all">
          {promptText}
        </pre>
      </div>
    </div>
  );
}
