import { useState } from 'react';
import type { ParsedCodeFile } from '../../types/ast';
import { Copy, Check, FileCode, Code2, ChevronDown, ChevronUp } from 'lucide-react';

interface CodeSnippetViewProps {
  file: ParsedCodeFile;
  highlightLine?: number;
}

export function CodeSnippetView({ file, highlightLine }: CodeSnippetViewProps) {
  const [copied, setCopied] = useState(false);
  const [showFullCode, setShowFullCode] = useState(false);

  const lines = (file.code ?? '').split('\n');

  // Compute focal lines (either from AI focalLine, highlightLine prop, or first function line)
  const targetLine = highlightLine || file.focalLine || 1;
  const startIdx = Math.max(0, targetLine - 5);
  const endIdx = Math.min(lines.length, targetLine + 12);
  const focalLines = lines.slice(startIdx, endIdx);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3 font-mono text-xs">
      {/* Focal Code Snippet Card */}
      <div className="bg-[#090a0e] border border-[#23252a] rounded-xl overflow-hidden shadow-lg">
        <div className="px-3 py-2 bg-[#0e1015] border-b border-[#23252a] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[#34d399]">
            <Code2 className="w-3.5 h-3.5" />
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              Key Code Execution (Line {targetLine})
            </span>
          </div>

          <button
            onClick={() => handleCopy(file.focalCode || focalLines.join('\n'))}
            className="flex items-center gap-1 text-[10px] text-[#8a8f98] hover:text-white px-2 py-0.5 rounded bg-[#16171d] border border-[#23252a] transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-[#34d399]" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <div className="p-2 overflow-x-auto bg-[#050608]">
          <table className="w-full border-collapse">
            <tbody>
              {focalLines.map((lineText, idx) => {
                const lineNum = startIdx + idx + 1;
                const isTarget = lineNum === targetLine;

                return (
                  <tr
                    key={lineNum}
                    className={`transition-colors ${
                      isTarget
                        ? 'bg-[#5e6ad2]/20 text-[#f7f8f8] font-semibold'
                        : 'hover:bg-[#111217]'
                    }`}
                  >
                    <td className={`w-8 pr-2.5 text-right select-none text-[10px] align-top ${isTarget ? 'text-[#828fff]' : 'text-[#62666d]'}`}>
                      {lineNum}
                    </td>
                    <td className={`whitespace-pre font-mono ${isTarget ? 'text-[#34d399]' : 'text-[#d0d6e0]'}`}>
                      {lineText || ' '}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accordion Toggle for Full Source File */}
      <div className="pt-1">
        <button
          onClick={() => setShowFullCode(!showFullCode)}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-[#0e1015] hover:bg-[#16171d] border border-[#23252a] text-[#8a8f98] hover:text-white transition-colors cursor-pointer text-[11px]"
        >
          <div className="flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-[#5e6ad2]" />
            <span>Full Source Code ({lines.length} lines)</span>
          </div>
          {showFullCode ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showFullCode && (
          <div className="mt-2 max-h-80 overflow-auto p-2 bg-[#050608] border border-[#23252a] rounded-xl">
            <table className="w-full border-collapse">
              <tbody>
                {lines.map((lineText, idx) => {
                  const lineNum = idx + 1;
                  const isTarget = lineNum === targetLine;
                  return (
                    <tr key={lineNum} className={isTarget ? 'bg-[#5e6ad2]/20 font-bold' : ''}>
                      <td className="w-8 pr-2 text-right text-[#62666d] select-none text-[10px] align-top">
                        {lineNum}
                      </td>
                      <td className={`whitespace-pre font-mono ${isTarget ? 'text-[#34d399]' : 'text-[#8a8f98]'}`}>
                        {lineText || ' '}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
