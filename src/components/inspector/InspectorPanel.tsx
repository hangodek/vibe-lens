import { useState } from 'react';
import type { ParsedCodeFile } from '../../types/ast';
import { CodeSnippetView } from './CodeSnippetView';
import { AIAssistantDrawer } from './AIAssistantDrawer';
import { 
  X, 
  Sparkles, 
  Code2, 
  MessageSquareCode, 
  FileCode,
  ArrowRight,
  ShieldCheck,
  Database,
  MapPin,
  ArrowDownRight
} from 'lucide-react';

interface InspectorPanelProps {
  file: ParsedCodeFile | null;
  highlightLine?: number;
  onClose: () => void;
  onOpenScreenLocator?: () => void;
}

type TabKey = 'details' | 'ai';

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  view: { label: 'CLIENT VIEW', color: '#38bdf8', bg: '#0284c718', border: '#0284c744' },
  controller: { label: 'HTTP CONTROLLER', color: '#c084fc', bg: '#9333ea18', border: '#9333ea44' },
  service: { label: 'DOMAIN SERVICE', color: '#818cf8', bg: '#4f46e518', border: '#4f46e544' },
  storage: { label: 'DATABASE REPOSITORY', color: '#34d399', bg: '#05966918', border: '#05966944' },
  guard: { label: 'SECURITY GUARD / MIDDLEWARE', color: '#fbbf24', bg: '#d9770618', border: '#d9770644' },
  gateway: { label: 'APPLICATION GATEWAY', color: '#fb7185', bg: '#e11d4818', border: '#e11d4844' },
  script: { label: 'CLIENT JAVASCRIPT', color: '#facc15', bg: '#ca8a0418', border: '#ca8a0444' },
  utility: { label: 'UTILITY MODULE', color: '#9ca3af', bg: '#4b556318', border: '#4b556344' },
};

export function InspectorPanel({
  file,
  highlightLine,
  onClose,
  onOpenScreenLocator,
}: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [quickQuestion, setQuickQuestion] = useState('');
  const [queuedAiQuestion, setQueuedAiQuestion] = useState<string | undefined>(undefined);

  if (!file) {
    return (
      <aside className="w-[420px] border-l border-[#23252a] bg-[#08090a] flex flex-col items-center justify-center p-6 text-center text-[#8a8f98]">
        <FileCode className="w-10 h-10 text-[#23252a] mb-3" />
        <h4 className="text-sm font-medium text-[#f7f8f8]">No File Selected</h4>
        <p className="text-xs text-[#62666d] mt-1 max-w-[240px]">
          Click any node on the canvas to inspect its purpose, code highlights, and data flow.
        </p>
      </aside>
    );
  }

  const role = file.pipelineRole || 'utility';
  const roleStyle = ROLE_LABELS[role] || ROLE_LABELS.utility;

  const handleAskQuickAi = (q: string) => {
    if (!q.trim()) return;
    setQueuedAiQuestion(q);
    setActiveTab('ai');
    setQuickQuestion('');
  };

  return (
    <aside className="w-[450px] border-l border-[#23252a] bg-[#08090a] flex flex-col h-full shrink-0 z-20 shadow-2xl">
      {/* Inspector Header */}
      <div className="h-14 px-4 border-b border-[#23252a] flex items-center justify-between shrink-0 bg-[#010102]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-[#121316] border border-[#23252a]">
            <FileCode className="w-4 h-4 text-[#828fff]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-[#f7f8f8] truncate font-mono">
                {file.name}
              </h3>
              <span
                className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold border"
                style={{
                  backgroundColor: roleStyle.bg,
                  color: roleStyle.color,
                  borderColor: roleStyle.border,
                }}
              >
                {roleStyle.label}
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#8a8f98] truncate block">
              {file.path} · {file.lineCount} lines
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenScreenLocator && (
            <button
              onClick={onOpenScreenLocator}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-[#828fff] hover:text-white bg-[#121316] hover:bg-[#1c1d22] border border-[#23252a] rounded-lg transition-colors cursor-pointer"
              title="Locate on Screen"
            >
              <MapPin className="w-3.5 h-3.5 text-[#5e6ad2]" />
              <span className="hidden sm:inline">Screen</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1.5 text-[#8a8f98] hover:text-white hover:bg-[#121316] rounded-lg transition-colors cursor-pointer"
            title="Close Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Streamlined Tab Switcher: Details vs AI Assistant */}
      <div className="flex border-b border-[#23252a] bg-[#0c0d12] px-3 pt-1 gap-2 shrink-0">
        <button
          onClick={() => setActiveTab('details')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
            activeTab === 'details'
              ? 'border-[#5e6ad2] text-[#f7f8f8] font-semibold'
              : 'border-transparent text-[#8a8f98] hover:text-[#d0d6e0]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#828fff]" />
          <span>Node Execution & Code</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
            activeTab === 'ai'
              ? 'border-[#5e6ad2] text-[#f7f8f8] font-semibold'
              : 'border-transparent text-[#8a8f98] hover:text-[#d0d6e0]'
          }`}
        >
          <MessageSquareCode className="w-3.5 h-3.5 text-[#34d399]" />
          <span>Ask OpenCode</span>
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'details' ? (
          <div className="p-4 space-y-4">
            {/* 1. What Happens Here (Plain English) */}
            <div className="bg-[#101217] border border-[#23252a] rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono text-[#828fff] uppercase font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>What Happens in This Node</span>
              </div>
              <p className="text-xs text-[#f7f8f8] leading-relaxed font-sans">
                {file.description || `${file.name} coordinates active pipeline operations in this architecture.`}
              </p>
            </div>

            {/* 2. Inbound / Outbound Data Flow */}
            <div className="grid grid-cols-2 gap-2 bg-[#0a0b0e] border border-[#23252a] rounded-xl p-3">
              <div className="space-y-1 pr-2 border-r border-[#1c1d24]">
                <div className="flex items-center gap-1 text-[10px] font-mono uppercase text-[#38bdf8] font-semibold">
                  <ArrowRight className="w-3 h-3" />
                  <span>Inbound (Enters)</span>
                </div>
                <p className="text-[11px] text-[#c3c8d4] leading-snug">
                  {file.flowExplanation?.inbound || 'HTTP requests or caller parameters.'}
                </p>
              </div>

              <div className="space-y-1 pl-2">
                <div className="flex items-center gap-1 text-[10px] font-mono uppercase text-[#34d399] font-semibold">
                  <ArrowDownRight className="w-3 h-3" />
                  <span>Outbound (Leaves)</span>
                </div>
                <p className="text-[11px] text-[#c3c8d4] leading-snug">
                  {file.flowExplanation?.outbound || 'Dispatches return values to downstream callers.'}
                </p>
              </div>
            </div>

            {/* 3. Key Code Highlight: The 5-15 Lines That Matter! */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-[#8a8f98]">
                <span className="flex items-center gap-1 text-[#d0d6e0] font-semibold">
                  <Code2 className="w-3.5 h-3.5 text-[#5e6ad2]" />
                  <span>Focal Code Execution</span>
                </span>
                <span className="text-[10px] text-[#62666d]">Line {highlightLine || file.focalLine || 1}</span>
              </div>
              <CodeSnippetView file={file} highlightLine={highlightLine} />
            </div>

            {/* 4. Data Shape / Structs (if mapped) */}
            {file.states.length > 0 && (
              <div className="bg-[#0e1015] border border-[#23252a] rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-mono text-[#34d399] uppercase font-semibold">
                  <Database className="w-3.5 h-3.5" />
                  <span>Domain Data Shape & State ({file.states.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {file.states.map((st) => (
                    <div
                      key={st.name}
                      className="px-2 py-1 rounded bg-[#16171d] border border-[#23252a] text-[10px] font-mono text-[#d0d6e0] flex items-center gap-1.5"
                    >
                      <span className="text-[#f7f8f8] font-semibold">{st.name}</span>
                      <span className="text-[#8a8f98]">({st.initialValue || 'type'})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Critical Invariants */}
            {file.blastRadius?.safeInvariants && file.blastRadius.safeInvariants.length > 0 && (
              <div className="bg-[#0e1015] border border-[#23252a] rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-mono text-[#fbbf24] uppercase font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Critical Rules to Protect</span>
                </div>
                <ul className="space-y-1 text-[11px] text-[#8a8f98] font-mono">
                  {file.blastRadius.safeInvariants.map((inv, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-[#fbbf24]">•</span>
                      <span>{inv}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 6. Quick OpenCode Question Bar */}
            <div className="pt-2 border-t border-[#1c1d22]">
              <div className="flex items-center gap-1.5 bg-[#121316] border border-[#23252a] focus-within:border-[#5e6ad2] rounded-xl p-1.5">
                <input
                  type="text"
                  value={quickQuestion}
                  onChange={(e) => setQuickQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskQuickAi(quickQuestion)}
                  placeholder={`Ask OpenCode about ${file.name}...`}
                  className="flex-1 bg-transparent px-2.5 py-1 text-xs text-white outline-none font-mono placeholder:text-[#62666d]"
                />
                <button
                  onClick={() => handleAskQuickAi(quickQuestion)}
                  className="px-3 py-1 bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Ask
                </button>
              </div>
            </div>
          </div>
        ) : (
          <AIAssistantDrawer
            file={file}
            initialQuestion={queuedAiQuestion}
            onClearInitialQuestion={() => setQueuedAiQuestion(undefined)}
          />
        )}
      </div>
    </aside>
  );
}
