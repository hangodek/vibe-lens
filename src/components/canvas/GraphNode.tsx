import type { MouseEvent } from 'react';
import type { CanvasNode } from '../../types/graph';
import { NODE_TYPE_STYLES } from '../../constants/theme';
import { VirtualViewportLens } from './VirtualViewportLens';
import { 
  FileCode, 
  Layers, 
  Cpu, 
  Database, 
  Globe, 
  Boxes, 
  GripVertical
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

export function GraphNode({
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
      <span className="w-1.5 h-1.5 rounded-full bg-[#f87171]" /> High Risk
    </span>
  ) : null;

  return (
    <div
      className={`canvas-node absolute rounded-xl border transition-all duration-150 cursor-pointer ${
        isSelected
          ? 'border-[#5e6ad2] shadow-[0_0_24px_rgba(94,106,210,0.35)] ring-1 ring-[#5e6ad2]'
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
      {/* Top Header Strip with Drag Handle, Type & Risk Badges */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#23252a]/70 bg-[#08090a]/60 rounded-t-xl">
        <div className="flex items-center gap-1">
          <div
            className="cursor-grab active:cursor-grabbing text-[#62666d] hover:text-[#8a8f98] p-0.5 -ml-1"
            onMouseDown={(e) => onStartDrag(node.id, e, node.x, node.y)}
            title="Drag to reposition node"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <span
            className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.2 rounded-full font-medium"
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

      {/* Node Body with Real Camera Lens Preview */}
      <div className="p-2.5 flex flex-col justify-between h-[calc(100%-32px)] gap-1.5">
        <div className="flex items-start gap-2">
          <div
            className="p-1 rounded-md border border-[#23252a] mt-0.5 shrink-0"
            style={{ backgroundColor: '#08090a' }}
          >
            <IconComponent className="w-3.5 h-3.5" style={{ color: style.iconColor }} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold text-[#f7f8f8] truncate tracking-tight">
              {node.name}
            </h4>
            <p className="text-[10px] text-[#8a8f98] truncate">
              {style.title}
            </p>
          </div>
        </div>

        {/* Scaled Virtual Viewport Lens (Real Live UI) */}
        <VirtualViewportLens previewType={node.previewType} />

        {/* Telemetry pill row */}
        <div className="flex items-center justify-between pt-1 border-t border-[#1c1d22] text-[10px] font-mono text-[#8a8f98]">
          <div className="flex items-center gap-1.5">
            {node.stateCount !== undefined && node.stateCount > 0 && (
              <span className="text-[#34d399] font-medium">{node.stateCount} states</span>
            )}
            {node.hookCount !== undefined && node.hookCount > 0 && (
              <span className="text-[#828fff]">{node.hookCount} hooks</span>
            )}
            {node.apiCount !== undefined && node.apiCount > 0 && (
              <span className="text-[#fb7185]">{node.apiCount} APIs</span>
            )}
            {node.stateCount === 0 && !node.hookCount && (
              <span className="text-[#62666d]">Stateless</span>
            )}
          </div>
          <span className="text-[9px] text-[#62666d]">Inspect →</span>
        </div>
      </div>
    </div>
  );
}
