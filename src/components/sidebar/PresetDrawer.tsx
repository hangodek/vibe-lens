import { useState } from 'react';
import type { VibeProject } from '../../types/ast';
import { PRESET_PROJECTS } from '../../constants/presets';
import { Sparkles, Check, ChevronDown, FolderGit2 } from 'lucide-react';

interface PresetDrawerProps {
  currentProjectId: string;
  allProjects?: VibeProject[];
  onSelectProject: (project: VibeProject) => void;
}

export function PresetDrawer({
  currentProjectId,
  allProjects = PRESET_PROJECTS,
  onSelectProject,
}: PresetDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentProject = allProjects.find((p) => p.id === currentProjectId) || allProjects[0] || PRESET_PROJECTS[0];

  return (
    <div className="relative p-3 border-b border-[#23252a]">
      <label className="text-[10px] font-mono uppercase tracking-wider text-[#62666d] block mb-1.5">
        Target Codebase
      </label>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#121316] hover:bg-[#1c1d22] border border-[#23252a] rounded-lg p-2 flex items-center justify-between text-left transition-colors cursor-pointer"
      >
        <div className="min-w-0">
          <div className="text-xs font-semibold text-[#f7f8f8] truncate flex items-center gap-1.5">
            {currentProject.id.startsWith('local-') || currentProject.id.startsWith('gh-') || currentProject.id.startsWith('zip-') ? (
              <FolderGit2 className="w-3.5 h-3.5 text-[#34d399]" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#5e6ad2]" />
            )}
            {currentProject.name}
          </div>
          <p className="text-[10px] font-mono text-[#8a8f98] truncate mt-0.5">
            {currentProject.framework}
          </p>
        </div>
        <ChevronDown className="w-4 h-4 text-[#8a8f98] shrink-0" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-3 right-3 top-[72px] z-40 bg-[#08090a] border border-[#23252a] rounded-xl shadow-2xl p-1.5 space-y-1 max-h-80 overflow-y-auto">
            {allProjects.map((project) => {
              const isSelected = project.id === currentProjectId;
              const isCustom = project.id.startsWith('local-') || project.id.startsWith('gh-') || project.id.startsWith('zip-');

              return (
                <button
                  key={project.id}
                  onClick={() => {
                    onSelectProject(project);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#121316] text-white border border-[#23252a]'
                      : 'hover:bg-[#121316] text-[#8a8f98] hover:text-white'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-[#f7f8f8] truncate flex items-center gap-1.5">
                      {isCustom ? (
                        <FolderGit2 className="w-3 h-3 text-[#34d399]" />
                      ) : null}
                      {project.name}
                    </p>
                    <p className="text-[10px] text-[#62666d] font-mono truncate">
                      {project.files.length} files · {project.framework}
                    </p>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#5e6ad2] shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
