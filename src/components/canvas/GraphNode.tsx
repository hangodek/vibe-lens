import { memo, type MouseEvent } from 'react';
import type { CanvasNode } from '../../types/graph';
import { NODE_TYPE_STYLES } from '../../constants/theme';
import { 
  FileCode, 
  Layers, 
  Cpu, 
  Database, 
  Globe, 
  Boxes, 
  GripVertical,
  Route,
  Code2
} from 'lucide-react';

interface GraphNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  isTraceActive?: boolean;
  onSelect: (nodeId: string) => void;
  onStartDrag: (nodeId: string, e: MouseEvent, x: number, y: number) => void;
}

const TYPE_ICONS = {
  page: Globe,
  layout: Layers,
  component: Boxes,
  hook: Cpu,
  context: Database,
  store: Database,
  api: Globe,
};

function GraphNodeComponent({
  node,
  isSelected,
  isTraceActive,
  onSelect,
  onStartDrag,
}: GraphNodeProps) {
  const style = NODE_TYPE_STYLES[node.type] || NODE_TYPE_STYLES.component;
  const IconComponent = TYPE_ICONS[node.type] || FileCode;

  const riskBadge = node.riskScore === 'low' ? (
    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-[#10b981]/15 text-[#34d399] border border-[#10b981]/30 flex items-center gap-1 font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" /> Safe
    </span>
  ) : node.riskScore === 'moderate' ? (
    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-[#f59e0b]/15 text-[#fbbf24] border border-[#f59e0b]/30 flex items-center gap-1 font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" /> Caution
    </span>
  ) : node.riskScore === 'high' ? (
    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-[#ef4444]/15 text-[#f87171] border border-[#ef4444]/30 flex items-center gap-1 font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-[#f87171]" /> Core
    </span>
  ) : null;

  return (
    <div
      className={`canvas-node absolute rounded-xl border transition-colors duration-150 cursor-pointer ${
        isSelected
          ? 'border-[#5e6ad2] shadow-[0_0_24px_rgba(94,106,210,0.4)] ring-1 ring-[#5e6ad2]'
          : isTraceActive
          ? 'border-[#828fff] shadow-[0_0_20px_rgba(130,143,255,0.4)] animate-node-ping'
          : 'border-[#23252a] hover:border-[#343842]'
      }`}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        backgroundColor: style.bg,
      }}
      onClick={() => onSelect(node.fileId)}
    >
      {/* Header: Drag Handle, Package Badge & Risk Indicator */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#23252a]/70 bg-[#08090a]/60 rounded-t-xl">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className="cursor-grab active:cursor-grabbing text-[#62666d] hover:text-[#8a8f98] p-0.5 -ml-1"
            onMouseDown={(e) => onStartDrag(node.id, e, node.x, node.y)}
            title="Drag to reposition node"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <span
            className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.2 rounded-full font-medium truncate"
            style={{
              backgroundColor: style.badgeBg,
              color: style.badgeText,
            }}
          >
            {node.badge || node.type}
          </span>
        </div>

        {riskBadge}
      </div>

      {/* Body: High-Contrast Fast Linear Card */}
      <div className="p-3 flex flex-col justify-between h-[calc(100%-32px)] gap-2">
        <div className="flex items-start gap-2.5">
          <div
            className="p-1.5 rounded-md border border-[#23252a] mt-0.5 shrink-0"
            style={{ backgroundColor: '#08090a' }}
          >
            <IconComponent className="w-4 h-4" style={{ color: style.iconColor }} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold text-[#f7f8f8] truncate tracking-tight font-mono">
              {node.name}
            </h4>
            <p className="text-[10px] text-[#8a8f98] truncate mt-0.5">
              {style.title}
            </p>
          </div>
        </div>

        {/* Lightweight Architecture Badge / Route Indicator */}
        <div className="bg-[#050608] border border-[#23252a] rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[10px] font-mono">
          <span className="text-[#8a8f98] truncate max-w-[170px] flex items-center gap-1.5">
            {node.type === 'api' ? (
              <Route className="w-3 h-3 text-[#fb7185] shrink-0" />
            ) : (
              <Code2 className="w-3 h-3 text-[#5e6ad2] shrink-0" />
            )}
            <span className="truncate">{node.label}</span>
          </span>
          <span className="text-[#5e6ad2] text-[9px] shrink-0 ml-1">Inspect →</span>
        </div>

        {/* Telemetry pill row */}
        <div className="flex items-center justify-between pt-1 border-t border-[#1c1d22] text-[10px] font-mono text-[#8a8f98]">
          <div className="flex items-center gap-2">
            {node.stateCount !== undefined && node.stateCount > 0 && (
              <span className="text-[#34d399] font-medium">{node.stateCount} states</span>
            )}
            {node.hookCount !== undefined && node.hookCount > 0 && (
              <span className="text-[#828fff]">{node.hookCount} calls</span>
            )}
            {node.apiCount !== undefined && node.apiCount > 0 && (
              <span className="text-[#fb7185]">{node.apiCount} routes</span>
            )}
            {node.stateCount === 0 && !node.hookCount && !node.apiCount && (
              <span className="text-[#62666d]">Module Unit</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const GraphNode = memo(GraphNodeComponent);
