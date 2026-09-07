import { useState, useEffect, useCallback } from 'react';
import type { ExecutionTrace, TraceStep } from '../types/ast';

export function useExecutionTrace(traces: ExecutionTrace[]) {
  const [selectedTraceId, setSelectedTraceId] = useState<string>(traces[0]?.id || '');
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Sync if traces change
  useEffect(() => {
    if (traces.length > 0 && !traces.find(t => t.id === selectedTraceId)) {
      setSelectedTraceId(traces[0].id);
      setActiveStepIndex(0);
      setIsPlaying(false);
    }
  }, [traces, selectedTraceId]);

  const activeTrace = traces.find((t) => t.id === selectedTraceId) || traces[0];
  const currentStep: TraceStep | undefined = activeTrace?.steps[activeStepIndex];

  const handleNext = useCallback(() => {
    if (!activeTrace) return;
    setActiveStepIndex((prev) => {
      if (prev < activeTrace.steps.length - 1) return prev + 1;
      setIsPlaying(false);
      return prev;
    });
  }, [activeTrace]);

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
    if (!isPlaying || !activeTrace) return;

    const timer = setInterval(() => {
      setActiveStepIndex((prev) => {
        if (prev < activeTrace.steps.length - 1) {
          return prev + 1;
        } else {
          setIsPlaying(false);
          return prev;
        }
      });
    }, 2400);

    return () => clearInterval(timer);
  }, [isPlaying, activeTrace]);

  return {
    selectedTraceId,
    activeTrace,
    activeStepIndex,
    currentStep,
    isPlaying,
    handleNext,
    handlePrev,
    handleTogglePlay,
    selectTrace,
    setActiveStepIndex,
  };
}
