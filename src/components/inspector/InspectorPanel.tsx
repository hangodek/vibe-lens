import { useState } from 'react';
import type { ParsedCodeFile } from '../../types/ast';
import type { CanvasEdge } from '../../types/graph';
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
  HelpCircle,
  Zap,
  CornerDownRight,
  ExternalLink
} from 'lucide-react';

interface InspectorPanelProps {
  file: ParsedCodeFile | null;
  allFiles?: ParsedCodeFile[];
  connections?: CanvasEdge[];
  highlightLine?: number;
  onSelectFile?: (fileId: string) => void;
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
  allFiles = [],
  connections = [],
  highlightLine,
  onSelectFile,
  onClose,
  onOpenScreenLocator,
}: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [quickQuestion, setQuickQuestion] = useState('');
  const [queuedAiQuestion, setQueuedAiQuestion] = useState<string | undefined>(undefined);

  if (!file) {
    return (
      <aside className="w-[450px] border-l border-[#23252a] bg-[#08090a] flex flex-col items-center justify-center p-6 text-center text-[#8a8f98]">
        <FileCode className="w-10 h-10 text-[#23252a] mb-3" />
        <h4 className="text-sm font-medium text-[#f7f8f8]">No Node Selected</h4>
        <p className="text-xs text-[#62666d] mt-1 max-w-[240px]">
          Click any node on the canvas to inspect its node-to-node execution chain, code, and parameters.
        </p>
      </aside>
    );
  }

  const role = file.pipelineRole || 'utility';
  const roleStyle = ROLE_LABELS[role] || ROLE_LABELS.utility;

  // Resolve incoming and outgoing execution chain edges
  const incoming = connections.filter(
    (e) => e.to === file.id || (file.path && e.to.includes(file.path))
  );
  const outgoing = connections.filter(
    (e) => e.from === file.id || (file.path && e.from.includes(file.path))
  );

  const handleAskQuickAi = (q: string) => {
    if (!q.trim()) return;
    setQueuedAiQuestion(q);
    setActiveTab('ai');
    setQuickQuestion('');
  };

  return (
    <aside className="w-[460px] border-l border-[#23252a] bg-[#08090a] flex flex-col h-full shrink-0 z-20 shadow-2xl select-none">
      {/* 1. Header: File Title & Role */}
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

      {/* 2. Tab Navigation */}
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
          <span>Execution Causality & Code</span>
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

      {/* 3. Tab Body */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'details' ? (
          <div className="p-4 space-y-4">
            {/* Overview Box */}
            <div className="bg-[#101217] border border-[#23252a] rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono text-[#828fff] uppercase font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Node Role & Responsibility</span>
              </div>
              <p className="text-xs text-[#f7f8f8] leading-relaxed font-sans">
                {file.description || `${file.name} coordinates active pipeline operations in this architecture.`}
              </p>
            </div>

            {/* NODE-TO-NODE CAUSALITY CHAIN (Answers what happens from node to node!) */}
            <div className="bg-[#090a0e] border border-[#23252a] rounded-xl p-3.5 space-y-3 shadow-inner">
              <div className="flex items-center justify-between border-b border-[#1c1d22] pb-2">
                <div className="flex items-center gap-1.5 text-xs font-mono text-[#34d399] uppercase font-bold">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Node-to-Node Execution Chain</span>
                </div>
                <span className="text-[10px] font-mono text-[#8a8f98]">
                  {incoming.length} In ➔ {outgoing.length} Out
                </span>
              </div>

              {/* 1. UPSTREAM (Who calls this node?) */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-[#38bdf8] uppercase tracking-wider font-semibold block">
                  1. Upstream Callers (Triggers)
                </span>
                {incoming.length > 0 ? (
                  incoming.map((e) => {
                    const srcFile = allFiles.find((f) => f.id === e.from || f.path.includes(e.from));
                    return (
                      <div
                        key={e.id}
                        onClick={() => onSelectFile && onSelectFile(srcFile?.id || e.from)}
                        className="p-2.5 rounded-lg bg-[#111218] border border-[#23252a] hover:border-[#38bdf8]/50 transition-colors cursor-pointer space-y-1 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-semibold text-[#f7f8f8] group-hover:text-[#38bdf8] transition-colors flex items-center gap-1">
                            <span>⬅️ {e.fromName || srcFile?.name || e.from}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                          <span className="text-[9px] font-mono text-[#38bdf8] bg-[#0284c7]/15 px-1.5 py-0.2 rounded">
                            {e.dataPassed || 'Calls endpoint'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#c3c8d4] leading-snug">
                          {e.whatHappens || `Dispatches request parameters to this node.`}
                        </p>
                        {e.codeSnippet && (
                          <div className="text-[10px] font-mono text-[#8a8f98] bg-[#050608] px-2 py-0.5 rounded border border-[#1a1c22] truncate">
                            <code>{e.codeSnippet}</code>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-2 rounded bg-[#111218] border border-[#23252a] text-[11px] text-[#8a8f98] font-mono">
                    Initial Entrypoint — Client browser navigates to this route or executes entry gateway.
                  </div>
                )}
              </div>

              {/* 2. THIS NODE'S EXECUTION */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono text-[#828fff] uppercase tracking-wider font-semibold block">
                  2. This Node Executes
                </span>
                <div className="p-2.5 rounded-lg bg-[#13141c] border border-[#5e6ad2]/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-[#f7f8f8]">
                      ⚡ {file.name}
                    </span>
                    <span className="text-[10px] font-mono text-[#828fff]">
                      Line {highlightLine || file.focalLine || 1}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#c3c8d4] leading-snug">
                    {file.flowExplanation?.processing || file.description}
                  </p>
                </div>
              </div>

              {/* 3. DOWNSTREAM (Where data goes next & WHY) */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono text-[#34d399] uppercase tracking-wider font-semibold block">
                  3. Downstream Handoffs (Next Targets & Why)
                </span>
                {outgoing.length > 0 ? (
                  outgoing.map((e) => {
                    const tgtFile = allFiles.find((f) => f.id === e.to || f.path.includes(e.to));
                    return (
                      <div
                        key={e.id}
                        onClick={() => onSelectFile && onSelectFile(tgtFile?.id || e.to)}
                        className="p-2.5 rounded-lg bg-[#111218] border border-[#23252a] hover:border-[#34d399]/50 transition-colors cursor-pointer space-y-1 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-semibold text-[#f7f8f8] group-hover:text-[#34d399] transition-colors flex items-center gap-1">
                            <span>➡️ {e.toName || tgtFile?.name || e.to}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                          <span className="text-[9px] font-mono text-[#34d399] bg-[#059669]/15 px-1.5 py-0.2 rounded">
                            {e.dataPassed || 'Handoff'}
                          </span>
                        </div>

                        {e.parametersPassed && (
                          <div className="flex items-center gap-1 text-[10px] font-mono text-[#828fff]">
                            <CornerDownRight className="w-3 h-3 shrink-0" />
                            <span><strong>Passed:</strong> {e.parametersPassed}</span>
                          </div>
                        )}

                        <p className="text-[11px] text-[#c3c8d4] leading-snug">
                          {e.whatHappens || `Delegates processed data to ${e.toName || 'next layer'}.`}
                        </p>

                        {e.whyCalled && (
                          <div className="flex items-start gap-1 text-[10px] font-mono text-[#fbbf24]">
                            <HelpCircle className="w-3 h-3 shrink-0 mt-0.5" />
                            <span><strong>Why:</strong> {e.whyCalled}</span>
                          </div>
                        )}

                        {e.codeSnippet && (
                          <div className="text-[10px] font-mono text-[#8a8f98] bg-[#050608] px-2 py-0.5 rounded border border-[#1a1c22] truncate">
                            <code>{e.codeSnippet}</code>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-2 rounded bg-[#111218] border border-[#23252a] text-[11px] text-[#8a8f98] font-mono">
                    Terminal Node — Completes processing pipeline, renders final HTML view, or commits SQL transaction.
                  </div>
                )}
              </div>
            </div>

            {/* Focal Code Snippet View */}
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

            {/* Data Shape & State Variables */}
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

            {/* Critical Invariants */}
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

            {/* Quick OpenCode Prompt Box */}
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
