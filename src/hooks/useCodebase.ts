import { useState, useMemo, useEffect } from 'react';
import type { VibeProject, ParsedCodeFile, LayerMode } from '../types/ast';
import { PRESET_PROJECTS } from '../constants/presets';
import { calculateLayout } from '../utils/traceEngine';

export function useCodebase() {
  const [activeProject, setActiveProject] = useState<VibeProject>(PRESET_PROJECTS[0]);
  const [customFiles, setCustomFiles] = useState<ParsedCodeFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(
    PRESET_PROJECTS[0].files[0]?.id || null
  );
  const [layerMode, setLayerMode] = useState<LayerMode>('screen');
  const [activeTraceIndex, setActiveTraceIndex] = useState(0);

  // Listen to keyboard shortcuts for layers: '1' -> screen, '2' -> data, '3' -> trace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (e.key === '1') setLayerMode('screen');
      if (e.key === '2') setLayerMode('data');
      if (e.key === '3') setLayerMode('trace');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const allFiles = useMemo(() => {
    return [...activeProject.files, ...customFiles];
  }, [activeProject, customFiles]);

  const selectedFile = useMemo(() => {
    return allFiles.find((f) => f.id === selectedFileId) || allFiles[0] || null;
  }, [allFiles, selectedFileId]);

  const switchProject = (project: VibeProject) => {
    setActiveProject(project);
    setCustomFiles([]);
    setSelectedFileId(project.files[0]?.id || null);
  };

  const addCustomFile = (newFile: ParsedCodeFile) => {
    setCustomFiles((prev) => [newFile, ...prev]);
    setSelectedFileId(newFile.id);
  };

  const currentTrace = activeProject.traces[0];

  const { nodes, edges } = useMemo(() => {
    return calculateLayout(allFiles, layerMode, currentTrace, activeTraceIndex);
  }, [allFiles, layerMode, currentTrace, activeTraceIndex]);

  return {
    activeProject,
    allFiles,
    selectedFile,
    selectedFileId,
    layerMode,
    nodes,
    edges,
    setSelectedFileId,
    setLayerMode,
    switchProject,
    addCustomFile,
    setActiveTraceIndex,
  };
}
