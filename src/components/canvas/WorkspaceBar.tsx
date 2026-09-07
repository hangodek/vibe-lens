import type { FeatureWorkspace, WorkspaceIconType } from '../../utils/workspaceDetector';
import { 
  ShieldCheck, 
  Server, 
  Boxes, 
  Layers, 
  LayoutGrid, 
  Folder 
} from 'lucide-react';

interface WorkspaceBarProps {
  workspaces: FeatureWorkspace[];
  activeWorkspaceId: string;
  onSelectWorkspace: (workspaceId: string) => void;
}

const ICONS: Record<WorkspaceIconType, React.ComponentType<{ className?: string }>> = {
  shield: ShieldCheck,
  server: Server,
  box: Boxes,
  layers: Layers,
  grid: LayoutGrid,
  folder: Folder,
};

export function WorkspaceBar({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
}: WorkspaceBarProps) {
  // If only 1 workspace (small projects), hide the bar to preserve screen real estate
  if (workspaces.length <= 1) return null;

  return (
    <div className="h-10 px-4 bg-[#08090a] border-b border-[#23252a] flex items-center justify-between shrink-0 z-20 overflow-x-auto select-none">
      <div className="flex items-center gap-1.5 min-w-max">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#62666d] mr-1">
          Feature Workspace:
        </span>

        {workspaces.map((ws) => {
          const Icon = ICONS[ws.iconType] || Folder;
          const isActive = ws.id === activeWorkspaceId;

          return (
            <button
              key={ws.id}
              onClick={() => onSelectWorkspace(ws.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#1c1d22] text-[#f7f8f8] border border-[#343842] font-semibold shadow-xs'
                  : 'text-[#8a8f98] hover:text-[#d0d6e0] hover:bg-[#121316] border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#5e6ad2]' : 'text-[#8a8f98]'}`} />
              <span>{ws.name}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  isActive ? 'bg-[#5e6ad2]/20 text-[#828fff]' : 'bg-[#121316] text-[#62666d]'
                }`}
              >
                {ws.fileCount}
              </span>
            </button>
          );
        })}
      </div>

      <div className="text-[10px] font-mono text-[#62666d] hidden md:block">
        Showing isolated feature nodes & pipelines
      </div>
    </div>
  );
}
