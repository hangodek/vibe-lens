import { useState } from 'react';
import type { ParsedCodeFile } from '../../types/ast';
import { ShieldAlert, ShieldCheck, AlertTriangle, Copy, Check, Sparkles, FileCode, Terminal } from 'lucide-react';

interface BlastRadiusCardProps {
  file: ParsedCodeFile;
}

type CliTool = 'standard' | 'claude' | 'antigravity' | 'cursor';

export function BlastRadiusCard({ file }: BlastRadiusCardProps) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [cliTarget, setCliTarget] = useState<CliTool>('claude');

  const radius = file.blastRadius || {
    score: 'low' as const,
    riskLabel: 'Low Impact (Isolated Unit)',
    description: 'This file does not supply shared state to downstream components. Safe to edit styling or logic.',
    impactedFiles: [],
    safeInvariants: ['Keep existing exported function and route signatures intact']
  };

  const isLow = radius.score === 'low';
  const isModerate = radius.score === 'moderate';

  // Build tool-specific CLI prompts
  let promptText = '';
  if (cliTarget === 'claude') {
    promptText = `claude -p "Refactor and improve \`${file.path}\` without breaking architecture. Critical Invariants: ${radius.safeInvariants.join('; ')}. Keep existing exports and types."`;
  } else if (cliTarget === 'antigravity') {
    promptText = `# AGENT DIRECTIVE: ${file.name}
TARGET FILE: ${file.path}
PIPELINE ROLE: ${file.pipelineRole || 'module'}
CRITICAL INVARIANTS:
${radius.safeInvariants.map(inv => `- ${inv}`).join('\n')}
TASK: Apply user modifications while strictly preserving these invariants.`;
  } else if (cliTarget === 'cursor') {
    promptText = `@${file.path}
I want to update this file.
Invariants to protect:
${radius.safeInvariants.map(inv => `- ${inv}`).join('\n')}
Preserve function signatures and imports.`;
  } else {
    promptText = `I want to update \`${file.path}\`.
CRITICAL ARCHITECTURAL INVARIANTS (DO NOT BREAK):
${radius.safeInvariants.map(inv => `- ${inv}`).join('\n')}
Modify only presentation and implementation details without altering data flow contracts.`;
  }

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
            isLow ? 'bg-[#34d399]/20 text-[#34d399]' : isModerate ? 'bg-[#fbbf24]/20 text-[#fbbf24]' : 'bg-[#f87171]/20 text-[#f87171]'
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

      {/* Local AI CLI Agent Exporter (Claude Code, Antigravity, OpenCode, Cursor) */}
      <div className="bg-[#121316] border border-[#343842] rounded-xl p-3.5 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[#828fff]">
            <Terminal className="w-4 h-4" />
            <span className="text-xs font-mono font-semibold uppercase">
              CLI Agent Exporter
            </span>
          </div>
          <button
            onClick={copyPrompt}
            className="flex items-center gap-1.5 text-xs text-white bg-[#5e6ad2] hover:bg-[#828fff] px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer shadow-xs"
          >
            {copiedPrompt ? <Check className="w-3.5 h-3.5 text-[#34d399]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPrompt ? 'Copied!' : 'Copy Directive'}</span>
          </button>
        </div>

        {/* CLI Tool Selector */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[#08090a] border border-[#23252a] rounded-lg text-[10px] font-mono">
          {[
            { id: 'claude', label: 'Claude Code' },
            { id: 'antigravity', label: 'Antigravity' },
            { id: 'cursor', label: 'Cursor' },
            { id: 'standard', label: 'Prompt' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setCliTarget(t.id as CliTool)}
              className={`py-1 rounded text-center transition-colors cursor-pointer ${
                cliTarget === t.id ? 'bg-[#1c1d22] text-[#828fff] font-bold shadow-xs' : 'text-[#8a8f98] hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <pre className="text-[11px] font-mono text-[#d0d6e0] bg-[#08090a] p-2.5 rounded-lg border border-[#23252a] overflow-x-auto whitespace-pre-wrap select-all">
          {promptText}
        </pre>
      </div>
    </div>
  );
}
