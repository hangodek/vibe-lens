import { ArrowRight, X, Code2, Layers, ExternalLink, Zap, HelpCircle } from 'lucide-react';
import type { CanvasEdge, CanvasNode } from '../../types/graph';

interface EdgeDetailDrawerProps {
  edge: CanvasEdge | null;
  fromNode?: CanvasNode;
  toNode?: CanvasNode;
  onClose: () => void;
  onDeepDiveFile: (fileId: string) => void;
}

export function EdgeDetailDrawer({
  edge,
  fromNode,
  toNode,
  onClose,
  onDeepDiveFile,
}: EdgeDetailDrawerProps) {
  if (!edge || !fromNode || !toNode) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#090a0e]/95 backdrop-blur-md border-t border-[#23252a] p-4 shadow-2xl animate-in slide-in-from-bottom-6 duration-200 select-none">
      <div className="max-w-4xl mx-auto space-y-3">
        {/* Top Header Row: Flow Direction and Close */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#5e6ad2]/20 border border-[#5e6ad2]/40 flex items-center justify-center text-[#828fff]">
              <Zap className="w-3 h-3" />
            </div>
            <span className="text-xs font-mono uppercase tracking-wider text-[#8a8f98]">
              Node-to-Node Execution Handoff
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-[#8a8f98] hover:text-white hover:bg-[#1c1d22] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Node to Node Visual Breadcrumb */}
        <div className="flex items-center gap-3 bg-[#111217] border border-[#23252a] rounded-xl p-3">
          {/* Source Node */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-mono text-[#8a8f98] uppercase">Source Caller</span>
              <span className="text-[9px] font-mono text-[#38bdf8] bg-[#0284c7]/15 px-1.5 py-0.2 rounded border border-[#0284c7]/30">
                {fromNode.role || fromNode.type}
              </span>
            </div>
            <h4 className="text-xs font-mono font-semibold text-[#f7f8f8] truncate">
              {fromNode.name}
            </h4>
            <p className="text-[11px] text-[#8a8f98] truncate mt-0.5">
              {edge.callerFunction ? `Fires: ${edge.callerFunction}` : fromNode.plainEnglish || fromNode.label}
            </p>
          </div>

          {/* Flow Bridge Pill */}
          <div className="flex flex-col items-center shrink-0 px-3 min-w-0 max-w-[240px]">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1c1d24] border border-[#5e6ad2]/50 text-[#828fff] text-xs font-mono font-medium shadow-[0_0_12px_rgba(94,106,210,0.2)] max-w-full">
              <span className="truncate">{edge.dataPassed || edge.label || 'Passes Data'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#5e6ad2]" />
            </div>
            {edge.parametersPassed && (
              <span className="text-[9px] font-mono text-[#34d399] mt-1 max-w-[220px] truncate">
                {edge.parametersPassed}
              </span>
            )}
          </div>

          {/* Target Node */}
          <div className="flex-1 min-w-0 text-right">
            <div className="flex items-center justify-end gap-1.5 mb-0.5">
              <span className="text-[9px] font-mono text-[#34d399] bg-[#059669]/15 px-1.5 py-0.2 rounded border border-[#059669]/30">
                {toNode.role || toNode.type}
              </span>
              <span className="text-[10px] font-mono text-[#8a8f98] uppercase">Invoked Target</span>
            </div>
            <h4 className="text-xs font-mono font-semibold text-[#f7f8f8] truncate">
              {toNode.name}
            </h4>
            <p className="text-[11px] text-[#8a8f98] truncate mt-0.5">
              {edge.targetFunction ? `Invokes: ${edge.targetFunction}` : toNode.plainEnglish || toNode.label}
            </p>
          </div>
        </div>

        {/* Narrative & Code Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Plain English "What Happens & Why Called" */}
          <div className="bg-[#0e1015] border border-[#23252a] rounded-xl p-3 space-y-2">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#34d399]">
                <Layers className="w-3.5 h-3.5" />
                <span className="font-semibold uppercase">What Happens Between Them</span>
              </div>
              <p className="text-xs text-[#d0d6e0] leading-relaxed">
                {edge.whatHappens ||
                  `${fromNode.name} dispatches ${edge.dataPassed || 'data'} directly to ${toNode.name}, which executes downstream validation and processing.`}
              </p>
            </div>

            {edge.whyCalled && (
              <div className="pt-2 border-t border-[#1a1c22] flex items-start gap-1.5 text-[11px] font-mono text-[#fbbf24]">
                <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span><strong>Why Called:</strong> {edge.whyCalled}</span>
              </div>
            )}
          </div>

          {/* Code Operation & Execution Snippet */}
          <div className="bg-[#0e1015] border border-[#23252a] rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#828fff]">
              <div className="flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />
                <span className="font-semibold uppercase">Executing Code</span>
              </div>
              <button
                onClick={() => onDeepDiveFile(toNode.fileId)}
                className="text-[10px] text-[#5e6ad2] hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>Deep Dive</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <pre className="text-xs font-mono text-[#f7f8f8] bg-[#050608] p-2.5 rounded border border-[#1a1c22] overflow-x-auto select-all">
              <code>{edge.codeSnippet || `// Calls ${toNode.name}\n${toNode.name.replace(/\.[^.]+$/, '')}.${edge.label || 'Process'}(...)`}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
