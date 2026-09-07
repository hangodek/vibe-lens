import { useState } from 'react';
import type { ParsedCodeFile } from '../../types/ast';
import { Copy, Check, FileCode } from 'lucide-react';

interface CodeSnippetViewProps {
  file: ParsedCodeFile;
  highlightLine?: number;
}

export function CodeSnippetView({ file, highlightLine }: CodeSnippetViewProps) {
  const [copied, setCopied] = useState(false);
  const lines = file.code.split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(file.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#010102]">
      {/* Code Bar Header */}
      <div className="h-10 px-4 border-b border-[#23252a] bg-[#08090a] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <FileCode className="w-3.5 h-3.5 text-[#5e6ad2]" />
          <span className="text-xs font-mono text-[#f7f8f8]">{file.path}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-[#8a8f98] hover:text-white px-2 py-0.5 rounded bg-[#121316] border border-[#23252a] transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-[#34d399]" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Code Text Area with Line Numbers */}
      <div className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed select-text">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((lineText, idx) => {
              const lineNum = idx + 1;
              const isHighlighted = highlightLine === lineNum;

              return (
                <tr
                  key={idx}
                  className={`transition-colors ${
                    isHighlighted ? 'bg-[#5e6ad2]/20 text-white font-medium' : 'hover:bg-[#08090a]'
                  }`}
                >
                  <td className="w-8 pr-3 text-right text-[#62666d] select-none text-[11px] align-top">
                    {lineNum}
                  </td>
                  <td className="text-[#d0d6e0] whitespace-pre font-mono">
                    {lineText || ' '}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
