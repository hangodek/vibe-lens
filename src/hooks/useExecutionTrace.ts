import { useState, useEffect, useCallback } from 'react';
import type { ExecutionTrace, TraceStep } from '../types/ast';

export function useExecutionTrace(traces: ExecutionTrace[]) {
  const [selectedTraceId, setSelectedTraceId] = useState<string>(traces?.[0]?.id || '');
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Sync if traces change
  useEffect(() => {
    const list = traces ?? [];
    if (list.length > 0 && !list.find(t => t.id === selectedTraceId)) {
      setSelectedTraceId(list[0].id);
      setActiveStepIndex(0);
      setIsPlaying(false);
    }
  }, [traces, selectedTraceId]);

  const safeTraces = traces ?? [];
  const activeTrace = safeTraces.find((t) => t.id === selectedTraceId) || safeTraces[0];
  const stepCount = activeTrace?.steps?.length ?? 0;
  const clampedIndex = Math.min(activeStepIndex, Math.max(0, stepCount - 1));
  const currentStep: TraceStep | undefined = stepCount > 0 ? activeTrace?.steps[clampedIndex] : undefined;

  const handleNext = useCallback(() => {
    if (!activeTrace || (activeTrace.steps?.length ?? 0) === 0) return;
    const lastIndex = (activeTrace.steps?.length ?? 1) - 1;
    if (activeStepIndex < lastIndex) {
      setActiveStepIndex(activeStepIndex + 1);
    } else {
      setIsPlaying(false);
    }
  }, [activeTrace, activeStepIndex]);

  const handlePrev = useCallback(() => {
    setActiveStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (!activeTrace) return;
    if (!isPlaying && activeStepIndex >= activeTrace.steps.length - 1) {
      // Loop back from start if at end
      setActiveStepIndex(0);
    }
    setIsPlaying((p) => !p);
  }, [isPlaying, activeStepIndex, activeTrace]);

  const selectTrace = useCallback((traceId: string) => {
    setSelectedTraceId(traceId);
    setActiveStepIndex(0);
    setIsPlaying(false);
  }, []);

  // Timer loop for auto-play
  useEffect(() => {
    const lastIndex = (activeTrace?.steps?.length ?? 1) - 1;
    if (!isPlaying || !activeTrace || lastIndex < 0) return;

    const timer = setInterval(() => {
      setActiveStepIndex((prev) => {
        if (prev < lastIndex) return prev + 1;
        return prev;
      });
    }, 2400);

    return () => clearInterval(timer);
  }, [isPlaying, activeTrace]);

  // Stop playback when reaching the last step
  useEffect(() => {
    const lastIndex = (activeTrace?.steps?.length ?? 1) - 1;
    if (isPlaying && activeStepIndex >= lastIndex) {
      setIsPlaying(false);
    }
  }, [isPlaying, activeStepIndex, activeTrace]);

  return {
    selectedTraceId,
    activeTrace,
    activeStepIndex: clampedIndex,
    currentStep,
    isPlaying,
    handleNext,
    handlePrev,
    handleTogglePlay,
    selectTrace,
    setActiveStepIndex,
  };
}
