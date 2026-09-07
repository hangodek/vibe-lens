import { memo, type MouseEvent } from 'react';
import type { CanvasNode } from '../../types/graph';
import { 
  FileCode, 
  Layers, 
  Cpu, 
  Database, 
  Globe, 
  Boxes, 
  GripVertical,
  Route,
  ArrowRight,
  ShieldAlert,
  ArrowDownRight
} from 'lucide-react';

interface GraphNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  isTraceActive?: boolean;
  onSelect: (nodeId: string) => void;
  onStartDrag: (nodeId: string, e: MouseEvent, x: number, y: number) => void;
}

const ROLE_STYLES: Record<string, { label: string; badgeBg: string; badgeColor: string; border: string; iconColor: string }> = {
  view: { label: 'CLIENT VIEW', badgeBg: '#0284c722', badgeColor: '#38bdf8', border: '#0284c755', iconColor: '#38bdf8' },
  controller: { label: 'CONTROLLER', badgeBg: '#9333ea22', badgeColor: '#c084fc', border: '#9333ea55', iconColor: '#c084fc' },
  service: { label: 'SERVICE LOGIC', badgeBg: '#4f46e522', badgeColor: '#818cf8', border: '#4f46e555', iconColor: '#818cf8' },
  storage: { label: 'DATABASE REPO', badgeBg: '#05966922', badgeColor: '#34d399', border: '#05966955', iconColor: '#34d399' },
  guard: { label: 'SECURITY GUARD', badgeBg: '#d9770622', badgeColor: '#fbbf24', border: '#d9770655', iconColor: '#fbbf24' },
  gateway: { label: 'APP GATEWAY', badgeBg: '#e11d4822', badgeColor: '#fb7185', border: '#e11d4855', iconColor: '#fb7185' },
  utility: { label: 'UTILITY', badgeBg: '#4b556322', badgeColor: '#9ca3af', border: '#4b556355', iconColor: '#9ca3af' },
};

function GraphNodeComponent({
  node,
  isSelected,
  isTraceActive,
  onSelect,
  onStartDrag,
}: GraphNodeProps) {
  const roleKey = node.role || (node.type === 'page' ? 'view' : node.type === 'api' ? 'controller' : node.type === 'store' ? 'storage' : node.type === 'hook' ? 'service' : 'utility');
  const roleStyle = ROLE_STYLES[roleKey] || ROLE_STYLES.utility;

  const IconComponent = roleKey === 'view' ? Globe : roleKey === 'storage' ? Database : roleKey === 'guard' ? ShieldAlert : roleKey === 'controller' ? Route : roleKey === 'service' ? Cpu : Boxes;

  const riskBadge = node.riskScore === 'high' ? (
    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-[#ef4444]/15 text-[#f87171] border border-[#ef4444]/30 font-medium">
      Core
    </span>
  ) : node.riskScore === 'moderate' ? (
    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-[#f59e0b]/15 text-[#fbbf24] border border-[#f59e0b]/30 font-medium">
      Caution
    </span>
  ) : (
    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-[#10b981]/15 text-[#34d399] border border-[#10b981]/30 font-medium">
      Safe
    </span>
  );

  return (
    <div
      className={`canvas-node absolute rounded-xl border transition-all duration-150 cursor-pointer select-none bg-[#090a0d] shadow-lg ${
        isSelected
          ? 'border-[#5e6ad2] shadow-[0_0_24px_rgba(94,106,210,0.4)] ring-1 ring-[#5e6ad2]'
          : isTraceActive
          ? 'border-[#828fff] node-active-step'
          : 'border-[#23252a] hover:border-[#383a42]'
      }`}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
      }}
      onClick={() => onSelect(node.fileId)}
    >
      {/* Header: Drag, Role Badge & Risk */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#23252a]/70 bg-[#0e0f14] rounded-t-xl">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className="cursor-grab active:cursor-grabbing text-[#62666d] hover:text-[#8a8f98] p-0.5 -ml-1"
            onMouseDown={(e) => onStartDrag(node.id, e, node.x, node.y)}
            title="Drag to reposition node"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <span
            className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md font-semibold truncate border"
            style={{
              backgroundColor: roleStyle.badgeBg,
              color: roleStyle.badgeColor,
              borderColor: roleStyle.border,
            }}
          >
            {roleStyle.label}
          </span>
        </div>

        {riskBadge}
      </div>

      {/* Body: File Name + Plain English Purpose (What this does!) */}
      <div className="p-3 flex flex-col justify-between h-[calc(100%-32px)] gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <IconComponent className="w-4 h-4 shrink-0" style={{ color: roleStyle.iconColor }} />
            <h4 className="text-xs font-semibold text-[#f7f8f8] truncate tracking-tight font-mono">
              {node.name}
            </h4>
          </div>

          {/* Plain English Explanation (The user can immediately read what this is!) */}
          <p className="text-[11px] text-[#c3c8d4] leading-snug line-clamp-2 mt-1">
            {node.plainEnglish || 'Executes domain actions and coordinates data pipeline.'}
          </p>
        </div>

        {/* Action / Route / Data Entity Pill */}
        {node.routes && node.routes.length > 0 ? (
          <div className="bg-[#121318] border border-[#23252a] rounded px-2 py-1 flex items-center gap-1.5 text-[10px] font-mono text-[#fb7185] truncate">
            <Route className="w-3 h-3 shrink-0 text-[#fb7185]" />
            <span className="truncate">{node.routes[0]}</span>
          </div>
        ) : node.dataEntities && node.dataEntities.length > 0 ? (
          <div className="bg-[#121318] border border-[#23252a] rounded px-2 py-1 flex items-center gap-1.5 text-[10px] font-mono text-[#34d399] truncate">
            <Database className="w-3 h-3 shrink-0 text-[#34d399]" />
            <span className="truncate">{node.dataEntities[0]}</span>
          </div>
        ) : (
          <div className="bg-[#121318] border border-[#23252a] rounded px-2 py-1 flex items-center justify-between text-[10px] font-mono text-[#8a8f98]">
            <span className="truncate">{node.path || node.name}</span>
            <ArrowRight className="w-3 h-3 text-[#5e6ad2] shrink-0" />
          </div>
        )}

        {/* Inbound -> Outbound micro footprint */}
        <div className="flex items-center justify-between pt-1 border-t border-[#1a1c22] text-[9px] font-mono text-[#62666d]">
          <span className="truncate max-w-[110px]" title={node.inbound || 'Inbound trigger'}>
            In: {node.inbound ? node.inbound.slice(0, 16) + '...' : 'Parent'}
          </span>
          <ArrowDownRight className="w-2.5 h-2.5 text-[#5e6ad2] shrink-0" />
          <span className="truncate max-w-[110px] text-right" title={node.outbound || 'Outbound calls'}>
            Out: {node.outbound ? node.outbound.slice(0, 16) + '...' : 'Downstream'}
          </span>
        </div>
      </div>
    </div>
  );
}

export const GraphNode = memo(GraphNodeComponent);
