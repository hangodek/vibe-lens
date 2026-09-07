import type { ParsedCodeFile } from '../../types/ast';
import { NODE_TYPE_STYLES } from '../../constants/theme';
import { 
  Folder, 
  FileCode, 
  Globe, 
  Layers, 
  Boxes, 
  Cpu, 
  Database 
} from 'lucide-react';

interface FileExplorerProps {
  files: ParsedCodeFile[];
  selectedFileId: string | null;
  onSelectFile: (fileId: string) => void;
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

export function FileExplorer({
  files,
  selectedFileId,
  onSelectFile,
}: FileExplorerProps) {
  // Group files by top-level directory
  const groups: Record<string, ParsedCodeFile[]> = {};

  files.forEach((f) => {
    const parts = f.path.split('/');
    const folder = parts.length > 1 ? parts[0] : 'root';
    if (!groups[folder]) groups[folder] = [];
    groups[folder].push(f);
  });

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      {Object.entries(groups).map(([folder, folderFiles]) => (
        <div key={folder} className="space-y-1">
          <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono uppercase text-[#62666d]">
            <Folder className="w-3.5 h-3.5" />
            <span>{folder}/</span>
          </div>

          <div className="space-y-0.5">
            {folderFiles.map((file) => {
              const isSelected = file.id === selectedFileId;
              const Icon = TYPE_ICONS[file.type] || FileCode;
              const style = NODE_TYPE_STYLES[file.type];

              return (
                <button
                  key={file.id}
                  onClick={() => onSelectFile(file.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#121316] text-[#f7f8f8] border border-[#23252a]'
                      : 'text-[#8a8f98] hover:text-[#d0d6e0] hover:bg-[#08090a]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: style.iconColor }}
                    />
                    <span className="text-xs font-mono truncate">{file.name}</span>
                  </div>

                  <span className="text-[10px] font-mono text-[#62666d]">
                    {file.lineCount}L
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
