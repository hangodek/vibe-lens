import { memo, type MouseEvent } from 'react';
import type { CanvasNode } from '../../types/graph';
import {
  Layers,
  Cpu,
  Database,
  Globe,
  Boxes,
  GripVertical,
  Route,
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
  script: { label: 'CLIENT SCRIPT', badgeBg: '#eab30822', badgeColor: '#facc15', border: '#eab30855', iconColor: '#facc15' },
  utility: { label: 'UTILITY', badgeBg: '#4b556322', badgeColor: '#9ca3af', border: '#4b556355', iconColor: '#9ca3af' },
};

function formatNodeAction(node: CanvasNode): { method: string; target: string; isPost: boolean; isSql: boolean; isGuard: boolean } {
  if (node.routes && node.routes.length > 0) {
    const raw = node.routes[0].trim();
    const parts = raw.split(' ');
    if (parts.length >= 2) {
      const method = parts[0].toUpperCase();
      const target = parts.slice(1).join(' ');
      return {
        method,
        target,
        isPost: method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH',
        isSql: false,
        isGuard: false,
      };
    }
    return { method: 'ROUTE', target: raw, isPost: true, isSql: false, isGuard: false };
  }

  const role = node.role || (node.type === 'page' ? 'view' : node.type === 'api' ? 'controller' : node.type === 'store' ? 'storage' : node.type === 'hook' ? 'service' : 'utility');
  if (role === 'storage') {
    const entity = node.dataEntities?.[0] || node.name.replace(/\.[^.]+$/, '');
    return { method: 'SQL', target: entity, isPost: false, isSql: true, isGuard: false };
  }
  if (role === 'guard') {
    return { method: 'GUARD', target: node.name.replace(/\.[^.]+$/, ''), isPost: false, isSql: false, isGuard: true };
  }
  if (role === 'service') {
    return { method: 'SERVICE', target: node.name.replace(/\.[^.]+$/, ''), isPost: false, isSql: false, isGuard: false };
  }
  if (role === 'view') {
    return { method: 'VIEW', target: node.name.replace(/\.[^.]+$/, ''), isPost: false, isSql: false, isGuard: false };
  }
  if (role === 'script') {
    return { method: 'SCRIPT', target: node.name.replace(/\.[^.]+$/, ''), isPost: false, isSql: false, isGuard: false };
  }
  return { method: 'UNIT', target: node.name, isPost: false, isSql: false, isGuard: false };
}

function formatFlowFootprint(text: string | undefined, fallback: string): string {
  if (!text) return fallback;
  const clean = text.replace(/^(receives|dispatches|calls|returns|passes)\s+/i, '').trim();
  if (clean.length <= 16) return clean;
  // If contains route e.g. POST /login
  const routeMatch = clean.match(/(POST|GET|PUT|DELETE|PATCH)\s+\/[a-zA-Z0-9_/-]+/i);
  if (routeMatch) return routeMatch[0];
  // If contains method call e.g. service.Authenticate
  const callMatch = clean.match(/([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)/);
  if (callMatch) return callMatch[1];
  return clean.slice(0, 15) + '…';
}

function GraphNodeComponent({
  node,
  isSelected,
  isTraceActive,
  onSelect,
  onStartDrag,
}: GraphNodeProps) {
  const roleKey = node.role || (node.type === 'page' ? 'view' : node.type === 'api' ? 'controller' : node.type === 'store' ? 'storage' : node.type === 'hook' ? 'service' : 'utility');
  const roleStyle = ROLE_STYLES[roleKey] || ROLE_STYLES.utility;
  const action = formatNodeAction(node);
  const inText = formatFlowFootprint(node.inbound, 'Caller');
  const outText = formatFlowFootprint(node.outbound, 'Return');

  const isFunctionNode = node.id.includes('::');
  const fnName = isFunctionNode ? node.name : null;

  const IconComponent = isFunctionNode ? Cpu : roleKey === 'view' ? Globe : roleKey === 'storage' ? Database : roleKey === 'guard' ? ShieldAlert : roleKey === 'controller' ? Route : roleKey === 'service' ? Cpu : Boxes;

  const riskBadge = node.riskScore === 'high' ? (
    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-[#ef4444]/15 text-[#f87171] border border-[#ef4444]/30 font-medium">
      Core
    </span>
  ) : node.riskScore === 'moderate' ? (
    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-[#f59e0b]/15 text-[#fbbf24] border border-[#f59e0b]/30 font-medium">
      Caution
    </span>
  ) : node.riskScore === 'low' ? (
    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-[#10b981]/15 text-[#34d399] border border-[#10b981]/30 font-medium">
      Safe
    </span>
  ) : (
    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-[#62666d]/15 text-[#8a8f98] border border-[#62666d]/30 font-medium">
      Unrated
    </span>
  );

  return (
    <div
      data-node-id={node.id}
      className={`canvas-node absolute rounded-xl border transition-all duration-150 cursor-pointer select-none bg-[#090a0d] shadow-lg overflow-hidden flex flex-col justify-between ${
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
        textRendering: 'geometricPrecision',
        WebkitFontSmoothing: 'antialiased',
      }}
      onClick={() => onSelect(node.id)}
    >
      {/* 1. Header: Drag Handle, Role Badge & Safety Risk */}
      <div className="h-[34px] px-3 py-1.5 border-b border-[#23252a]/70 bg-[#0e0f14] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className="cursor-grab active:cursor-grabbing text-[#62666d] hover:text-[#8a8f98] p-0.5 -ml-1"
            onMouseDown={(e) => onStartDrag(node.id, e, node.x, node.y)}
            title="Drag to reposition node"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          {isFunctionNode ? (
            <span
              className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md font-semibold truncate border"
              style={{
                backgroundColor: '#22d3ee22',
                color: '#22d3ee',
                borderColor: '#22d3ee55',
              }}
              title={node.signature || node.name}
            >
              FN · {(node.symbolKind || 'function').toUpperCase()}
            </span>
          ) : (
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
          )}
        </div>

        {riskBadge}
      </div>

      {/* 2. Body: File Name + Plain English Purpose + Method Pill */}
      <div className="flex-1 px-3.5 py-2.5 flex flex-col justify-between min-h-0 gap-1.5 bg-[#090a0d]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <IconComponent className="w-4 h-4 shrink-0" style={{ color: roleStyle.iconColor }} />
            <h4 className="text-xs font-semibold text-[#f7f8f8] truncate tracking-tight font-mono" title={isFunctionNode ? `${node.path} › ${node.name}` : node.path}>
              {node.name}
              {fnName && node.path ? (
                <span className="text-[10px] font-normal text-[#62666d]"> · {node.path.split('/').pop()}</span>
              ) : null}
            </h4>
          </div>

          {/* Plain English Explanation */}
          <p className="text-[11px] text-[#c3c8d4] leading-snug line-clamp-2 mt-0.5 font-sans">
            {node.plainEnglish || 'Executes domain actions and coordinates data pipeline.'}
          </p>
        </div>

        {/* Consistent Standardized Action / Method Pill (function signature for FN nodes) */}
        <div className="bg-[#101217] border border-[#23252a] rounded px-2 py-1 flex items-center gap-1.5 text-[10px] font-mono truncate shrink-0">
          {isFunctionNode ? (
            <>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wider uppercase border shrink-0 bg-cyan-500/15 text-cyan-400 border-cyan-500/30">
                FN
              </span>
              <span className="truncate text-[#f7f8f8] font-medium" title={node.signature}>
                {node.signature || node.name}
              </span>
            </>
          ) : (
            <>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wider uppercase border shrink-0 ${
                  action.isPost
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    : action.isSql
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : action.isGuard
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                }`}
              >
                {action.method}
              </span>
              <span className="truncate text-[#f7f8f8] font-medium">{action.target}</span>
            </>
          )}
        </div>
      </div>

      {/* 3. Dedicated Footer Bar: Active caller & target handoffs directly on card face */}
      <div className="h-[28px] px-3 bg-[#06070a] border-t border-[#1a1c22] flex items-center justify-between text-[9px] font-mono text-[#717682] shrink-0">
        <span className="truncate max-w-[115px]" title={node.inbound || 'Inbound trigger'}>
          In: <span className="text-[#a0a5b1] font-medium">{inText}</span>
        </span>
        <ArrowDownRight className="w-2.5 h-2.5 text-[#5e6ad2] shrink-0" />
        <span className="truncate max-w-[115px] text-right" title={node.outbound || 'Outbound calls'}>
          Out: <span className="text-[#a0a5b1] font-medium">{outText}</span>
        </span>
      </div>
    </div>
  );
}

export const GraphNode = memo(GraphNodeComponent);
