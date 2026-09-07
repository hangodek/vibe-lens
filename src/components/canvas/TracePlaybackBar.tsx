import { useState } from 'react';
import type { ExecutionTrace, TraceStep } from '../../types/ast';
import { 
  Play, 
  Pause, 
  ChevronRight, 
  ChevronLeft, 
  Workflow, 
  BookOpen, 
  Terminal, 
  ArrowRight,
  Code2
} from 'lucide-react';

interface TracePlaybackBarProps {
  traces: ExecutionTrace[];
  selectedTraceId: string;
  activeTrace?: ExecutionTrace;
  activeStepIndex: number;
  currentStep?: TraceStep;
  isPlaying: boolean;
  onSelectTrace: (traceId: string) => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onJumpToStep: (index: number) => void;
}

export function TracePlaybackBar({
  traces,
  selectedTraceId,
  activeTrace,
  activeStepIndex,
  currentStep,
  isPlaying,
  onSelectTrace,
  onTogglePlay,
  onNext,
  onPrev,
  onJumpToStep,
}: TracePlaybackBarProps) {
  const [viewMode, setViewMode] = useState<'storybook' | 'technical'>('storybook');

  if (!activeTrace) return null;

  const totalSteps = activeTrace.steps.length;
  const story = currentStep?.storybook;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-2xl bg-[#08090a]/95 backdrop-blur-md border border-[#23252a] rounded-xl shadow-2xl p-3 flex flex-col gap-2.5">
      {/* Top Header: Trace Selector, Mode Toggle & Playback Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Workflow className="w-4 h-4 text-[#5e6ad2]" />
          <select
            value={selectedTraceId}
            onChange={(e) => onSelectTrace(e.target.value)}
            className="bg-[#121316] text-[#f7f8f8] text-xs border border-[#23252a] rounded-md px-2.5 py-1 outline-none font-medium"
          >
            {traces.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>

        {/* Storybook vs Technical Event Toggle */}
        <div className="flex items-center bg-[#121316] border border-[#23252a] rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('storybook')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer ${
              viewMode === 'storybook' ? 'bg-[#1c1d22] text-[#828fff] font-medium' : 'text-[#8a8f98] hover:text-white'
            }`}
          >
            <BookOpen className="w-3 h-3" /> Story
          </button>
          <button
            onClick={() => setViewMode('technical')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer ${
              viewMode === 'technical' ? 'bg-[#1c1d22] text-[#828fff] font-medium' : 'text-[#8a8f98] hover:text-white'
            }`}
          >
            <Terminal className="w-3 h-3" /> Code
          </button>
        </div>

        {/* Playback Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onPrev}
            disabled={activeStepIndex === 0}
            className="p-1.5 text-[#8a8f98] hover:text-white disabled:opacity-30 rounded hover:bg-[#121316] transition-colors cursor-pointer"
            title="Previous Step"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            className="px-3 py-1 bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Play Story
              </>
            )}
          </button>

          <button
            onClick={onNext}
            disabled={activeStepIndex === totalSteps - 1}
            className="p-1.5 text-[#8a8f98] hover:text-white disabled:opacity-30 rounded hover:bg-[#121316] transition-colors cursor-pointer"
            title="Next Step"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Step Stepper Progress Bar */}
      <div className="grid grid-cols-5 gap-1.5 w-full pt-1">
        {activeTrace.steps.map((step, idx) => {
          const isDone = idx < activeStepIndex;
          const isCurrent = idx === activeStepIndex;

          return (
            <button
              key={step.id}
              onClick={() => onJumpToStep(idx)}
              className="group flex flex-col gap-1 text-left cursor-pointer"
            >
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isCurrent
                    ? 'bg-[#5e6ad2] shadow-[0_0_8px_rgba(94,106,210,0.8)]'
                    : isDone
                    ? 'bg-[#34d399]'
                    : 'bg-[#23252a]'
                }`}
              />
              <span
                className={`text-[9px] font-mono truncate transition-colors ${
                  isCurrent ? 'text-[#f7f8f8] font-bold' : 'text-[#62666d]'
                }`}
              >
                {step.storybook ? `Ch. ${step.stepNumber}: ${step.storybook.chapterTitle}` : `Step ${step.stepNumber}`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Narrative Story Display */}
      {currentStep && (
        <div className="bg-[#121316] border border-[#23252a] rounded-lg p-3 flex flex-col gap-2 shadow-inner">
          {viewMode === 'storybook' && story ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full bg-[#5e6ad2]/20 text-[#828fff] text-[10px] font-mono font-bold">
                  CHAPTER {story.chapterNumber}: {story.chapterTitle.toUpperCase()}
                </span>
                {currentStep.dataPassed && (
                  <span className="text-[10px] font-mono text-[#34d399] bg-[#34d399]/10 px-2 py-0.5 rounded border border-[#34d399]/20 truncate max-w-[280px]">
                    Passed: {currentStep.dataPassed}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#f7f8f8] leading-relaxed font-medium">
                "{story.story}"
              </p>

              {currentStep.codeLine && (
                <div className="bg-[#08090d] border border-[#23252a] rounded-md px-2.5 py-1.5 flex items-center justify-between text-xs font-mono text-[#34d399]">
                  <div className="flex items-center gap-1.5 truncate">
                    <Code2 className="w-3.5 h-3.5 text-[#828fff] shrink-0" />
                    <code className="truncate">{currentStep.codeLine}</code>
                  </div>
                  {currentStep.lineHighlight ? (
                    <span className="text-[10px] text-[#8a8f98] shrink-0 ml-2">Line {currentStep.lineHighlight}</span>
                  ) : null}
                </div>
              )}

              <div className="pt-1.5 border-t border-[#1c1d22] flex items-center gap-1.5 text-[11px] text-[#8a8f98]">
                <ArrowRight className="w-3 h-3 text-[#5e6ad2] shrink-0" />
                <span><strong className="text-[#d0d6e0]">Why this happens:</strong> {currentStep.codeExplanation || story.humanCausality}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-start gap-2.5">
                <div className="px-2 py-0.5 rounded bg-[#5e6ad2]/20 text-[#828fff] text-[10px] font-mono shrink-0 mt-0.5">
                  STEP {currentStep.stepNumber}
                </div>
                <div className="min-w-0 flex-1">
                  <h5 className="text-xs font-semibold text-[#f7f8f8]">
                    {currentStep.title}
                  </h5>
                  <p className="text-[11px] text-[#d0d6e0] mt-0.5 leading-relaxed">
                    {currentStep.description}
                  </p>
                </div>
              </div>

              {currentStep.codeLine && (
                <div className="bg-[#08090d] border border-[#23252a] rounded-md px-2.5 py-1.5 flex items-center justify-between text-xs font-mono text-[#34d399]">
                  <div className="flex items-center gap-1.5 truncate">
                    <Code2 className="w-3.5 h-3.5 text-[#828fff] shrink-0" />
                    <code className="truncate">{currentStep.codeLine}</code>
                  </div>
                  {currentStep.lineHighlight ? (
                    <span className="text-[10px] text-[#8a8f98] shrink-0 ml-2">Line {currentStep.lineHighlight}</span>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
