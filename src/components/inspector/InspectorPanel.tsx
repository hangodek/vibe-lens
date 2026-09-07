import { useState } from 'react';
import type { ParsedCodeFile } from '../../types/ast';
import { ELI5Overview } from './ELI5Overview';
import { LiveSandboxTab } from './LiveSandboxTab';
import { BlastRadiusCard } from './BlastRadiusCard';
import { StateMatrix } from './StateMatrix';
import { CodeSnippetView } from './CodeSnippetView';
import { AIAssistantDrawer } from './AIAssistantDrawer';
import { 
  X, 
  Sparkles, 
  Activity, 
  Code2, 
  MessageSquareCode, 
  FileCode,
  ShieldAlert,
  MapPin,
  Eye
} from 'lucide-react';

interface InspectorPanelProps {
  file: ParsedCodeFile | null;
  highlightLine?: number;
  onClose: () => void;
  onOpenScreenLocator?: () => void;
}

type TabKey = 'eli5' | 'live' | 'safety' | 'state' | 'code' | 'ai';

export function InspectorPanel({
  file,
  highlightLine,
  onClose,
  onOpenScreenLocator,
}: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('eli5');
  const [queuedAiQuestion, setQueuedAiQuestion] = useState<string | undefined>(undefined);

  if (!file) {
    return (
      <aside className="w-96 border-l border-[#23252a] bg-[#08090a] flex flex-col items-center justify-center p-6 text-center text-[#8a8f98]">
        <FileCode className="w-10 h-10 text-[#23252a] mb-3" />
        <h4 className="text-sm font-medium text-[#f7f8f8]">No File Selected</h4>
        <p className="text-xs text-[#62666d] mt-1 max-w-[240px]">
          Click any node on the canvas or file in the explorer to view plain-English mental models.
        </p>
      </aside>
    );
  }

  const handleAskAi = (question: string) => {
    setQueuedAiQuestion(question);
    setActiveTab('ai');
  };

  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'eli5', label: 'ELI5', icon: Sparkles },
    { key: 'live', label: 'Live UI', icon: Eye },
    { key: 'safety', label: 'Safety', icon: ShieldAlert },
    { key: 'state', label: `State (${file.states.length})`, icon: Activity },
    { key: 'code', label: 'Code', icon: Code2 },
    { key: 'ai', label: 'Ask AI', icon: MessageSquareCode },
  ];

  return (
    <aside className="w-[440px] border-l border-[#23252a] bg-[#08090a] flex flex-col h-full shrink-0 z-20">
      {/* Inspector Header */}
      <div className="h-14 px-4 border-b border-[#23252a] flex items-center justify-between shrink-0 bg-[#010102]/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1 rounded bg-[#121316] border border-[#23252a]">
            <FileCode className="w-4 h-4 text-[#5e6ad2]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-[#f7f8f8] truncate">
              {file.name}
            </h3>
            <span className="text-[10px] font-mono text-[#8a8f98]">
              {file.path} · {file.lineCount} lines
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenScreenLocator && (
            <button
              onClick={onOpenScreenLocator}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-[#828fff] hover:text-white bg-[#121316] hover:bg-[#1c1d22] border border-[#23252a] rounded-lg transition-colors cursor-pointer"
              title="Locate on App Screen"
            >
              <MapPin className="w-3.5 h-3.5 text-[#5e6ad2]" />
              <span>Find on Screen</span>
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

      {/* Tab Navigation */}
      <div className="flex border-b border-[#23252a] bg-[#08090a] px-2 pt-1 gap-1 shrink-0 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'border-[#5e6ad2] text-[#f7f8f8] bg-[#121316]/50'
                  : 'border-transparent text-[#8a8f98] hover:text-[#d0d6e0]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#5e6ad2]' : 'text-[#8a8f98]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Viewport */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'eli5' && (
          <ELI5Overview file={file} onAskAi={handleAskAi} />
        )}
        {activeTab === 'live' && <LiveSandboxTab file={file} />}
        {activeTab === 'safety' && <BlastRadiusCard file={file} />}
        {activeTab === 'state' && <StateMatrix file={file} />}
        {activeTab === 'code' && (
          <CodeSnippetView file={file} highlightLine={highlightLine} />
        )}
        {activeTab === 'ai' && (
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
