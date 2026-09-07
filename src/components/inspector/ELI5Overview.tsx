import { useState } from 'react';
import type { ParsedCodeFile } from '../../types/ast';
import { generateEli5Summary } from '../../utils/humanizer';
import { Sparkles, HelpCircle, Variable, Copy, Check, MessageSquare } from 'lucide-react';

interface ELI5OverviewProps {
  file: ParsedCodeFile;
  onAskAi: (question: string) => void;
}

export function ELI5Overview({ file, onAskAi }: ELI5OverviewProps) {
  const summary = generateEli5Summary(file);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const copyPrompt = () => {
    navigator.clipboard.writeText(summary.vibePromptAdvice);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="space-y-4 p-4">
      {/* 2-Sentence Plain English Overview */}
      <div className="bg-[#121316] border border-[#23252a] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2 text-[#5e6ad2]">
          <Sparkles className="w-4 h-4" />
          <h4 className="text-xs font-semibold uppercase tracking-wider font-mono">
            Plain English Overview
          </h4>
        </div>
        <p className="text-sm text-[#f7f8f8] leading-relaxed">
          {summary.overview}
        </p>
      </div>

      {/* Why your AI created this separate file */}
      <div className="bg-[#08090a] border border-[#23252a] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2 text-[#60a5fa]">
          <HelpCircle className="w-4 h-4" />
          <h4 className="text-xs font-semibold uppercase tracking-wider font-mono">
            Why Cursor / Lovable Made This File
          </h4>
        </div>
        <p className="text-xs text-[#d0d6e0] leading-relaxed">
          {summary.whyAiMadeThis}
        </p>
      </div>

      {/* Magic Variables & State */}
      <div className="bg-[#08090a] border border-[#23252a] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2.5 text-[#34d399]">
          <Variable className="w-4 h-4" />
          <h4 className="text-xs font-semibold uppercase tracking-wider font-mono">
            Magic Variables & State
          </h4>
        </div>
        <div className="space-y-2">
          {summary.magicVariables.map((v, idx) => (
            <p key={idx} className="text-xs text-[#d0d6e0] leading-relaxed bg-[#121316] p-2 rounded-lg border border-[#23252a]">
              {v}
            </p>
          ))}
        </div>
      </div>

      {/* Copy-Paste AI Prompt Formula */}
      <div className="bg-[#121316] border border-[#343842] rounded-xl p-4 relative group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono text-[#8a8f98] uppercase">
            Prompt For Your AI Agent
          </span>
          <button
            onClick={copyPrompt}
            className="flex items-center gap-1 text-xs text-[#828fff] hover:text-white px-2 py-1 rounded bg-[#1c1d22] border border-[#23252a]"
          >
            {copiedPrompt ? <Check className="w-3 h-3 text-[#34d399]" /> : <Copy className="w-3 h-3" />}
            {copiedPrompt ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="text-xs font-mono text-[#f7f8f8] bg-[#08090a] p-2.5 rounded border border-[#23252a] select-all">
          {summary.vibePromptAdvice}
        </p>
      </div>

      {/* Quick AI Questions */}
      <div className="pt-2 border-t border-[#23252a]">
        <h5 className="text-xs font-mono text-[#8a8f98] mb-2 uppercase">
          Instant Deep Dives
        </h5>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => onAskAi(`Explain line-by-line how ${file.name} interacts with other components.`)}
            className="text-left text-xs text-[#d0d6e0] hover:text-white hover:bg-[#121316] p-2 rounded-lg border border-[#23252a] flex items-center justify-between"
          >
            <span>How does this interact with other files?</span>
            <MessageSquare className="w-3.5 h-3.5 text-[#5e6ad2]" />
          </button>
          <button
            onClick={() => onAskAi(`What could break in ${file.name} if I change state variables?`)}
            className="text-left text-xs text-[#d0d6e0] hover:text-white hover:bg-[#121316] p-2 rounded-lg border border-[#23252a] flex items-center justify-between"
          >
            <span>What could break if I edit state here?</span>
            <MessageSquare className="w-3.5 h-3.5 text-[#5e6ad2]" />
          </button>
        </div>
      </div>
    </div>
  );
}
