import { useState, useMemo, useEffect } from 'react';
import type { VibeProject, ParsedCodeFile, LayerMode } from '../types/ast';
import { PRESET_PROJECTS } from '../constants/presets';
import { calculateLayout } from '../utils/traceEngine';
import { detectWorkspaces, type FeatureWorkspace } from '../utils/workspaceDetector';

export function useCodebase() {
  const [customProjects, setCustomProjects] = useState<VibeProject[]>([]);
  const [activeProject, setActiveProject] = useState<VibeProject>(PRESET_PROJECTS[0]);
  const [customFiles, setCustomFiles] = useState<ParsedCodeFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(
    PRESET_PROJECTS[0].files[0]?.id || null
  );
  const [layerMode, setLayerMode] = useState<LayerMode>('trace');
  const [viewScope, setViewScope] = useState<'core' | 'all'>('core');
  const [activeTraceIndex, setActiveTraceIndex] = useState(0);
  const [activeTraceId, setActiveTraceId] = useState<string>('');
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('all');

  // Hotkeys: '1' -> screen, '2' -> data, '3' -> trace
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

  // Dynamically extract universal workspaces based on directory structure (zero hardcoding)
  const workspaces: FeatureWorkspace[] = useMemo(() => {
    return detectWorkspaces(allFiles);
  }, [allFiles]);

  // When project changes (or workspaces appear/disappear), ensure the active
  // workspace still exists; fall back to the first feature domain otherwise
  useEffect(() => {
    if (workspaces.find((w) => w.id === activeWorkspaceId)) return;
    if (workspaces.length > 1) {
      // Pick first feature domain (e.g. Auth or Product, skipping 'all' as default)
      const firstFeature = workspaces.find((w) => w.id !== 'all' && w.id !== 'root') || workspaces[0];
      setActiveWorkspaceId(firstFeature.id);
    } else {
      setActiveWorkspaceId('all');
    }
  }, [activeProject.id, workspaces, activeWorkspaceId]);

  // Workspace-Isolated Files: Canvas ONLY loads nodes belonging to active workspace
  const displayedFiles = useMemo(() => {
    if (activeWorkspaceId === 'all' || !activeWorkspaceId || workspaces.length <= 1) {
      if (viewScope === 'all' || allFiles.length <= 8) return allFiles;
      const core = allFiles.filter((f) => {
        if (f.type === 'page' || f.type === 'layout' || f.type === 'store' || f.type === 'api') return true;
        if ((f.states?.length ?? 0) > 0 || (f.apiCalls?.length ?? 0) > 0 || (f.renderedChildren?.length ?? 0) > 0) return true;
        return false;
      });
      return core.length >= 3 ? core : allFiles;
    }

    const ws = workspaces.find((w) => w.id === activeWorkspaceId);
    return ws ? ws.files : allFiles;
  }, [allFiles, activeWorkspaceId, workspaces, viewScope]);

  // Retarget inspector selection when the workspace changes: if the selected
  // file isn't in the displayed set, focus the first displayed file so the
  // sidebar never describes a node from another workspace.
  useEffect(() => {
    if (!selectedFileId) return;
    const visible = new Set(displayedFiles.map((f) => f.id));
    if (!visible.has(selectedFileId) && displayedFiles.length > 0) {
      setSelectedFileId(displayedFiles[0].id);
    }
  }, [displayedFiles, selectedFileId]);

  const selectedFile = useMemo(() => {
    return allFiles.find((f) => f.id === selectedFileId) || allFiles[0] || null;
  }, [allFiles, selectedFileId]);

  const switchProject = (project: VibeProject) => {
    setActiveProject(project);
    setCustomFiles([]);
    setSelectedFileId(project.files[0]?.id || null);
    setActiveTraceIndex(0);
    setActiveTraceId(project.traces?.[0]?.id || '');
  };

  const loadCustomProject = (project: VibeProject) => {
    setCustomProjects((prev) => [project, ...prev]);
    setActiveProject(project);
    setCustomFiles([]);
    setSelectedFileId(project.files[0]?.id || null);
    setActiveTraceIndex(0);
    setActiveTraceId(project.traces?.[0]?.id || '');
  };

  const addCustomFile = (newFile: ParsedCodeFile) => {
    setCustomFiles((prev) => [newFile, ...prev]);
    setSelectedFileId(newFile.id);
  };

  const projectTraces = activeProject.traces ?? [];
  const currentTrace = projectTraces.find((t) => t.id === activeTraceId) || projectTraces[0];
  const clampedTraceIndex = currentTrace
    ? Math.min(activeTraceIndex, Math.max(0, currentTrace.steps.length - 1))
    : 0;

  const { nodes, edges } = useMemo(() => {
    return calculateLayout(
      displayedFiles,
      layerMode,
      currentTrace,
      clampedTraceIndex,
      activeProject.connections
    );
  }, [displayedFiles, layerMode, currentTrace, clampedTraceIndex, activeProject.connections]);

  const allProjects = useMemo(() => {
    return [...customProjects, ...PRESET_PROJECTS];
  }, [customProjects]);

  return {
    activeProject,
    allProjects,
    allFiles,
    displayedFiles,
    workspaces,
    activeWorkspaceId,
    selectedFile,
    selectedFileId,
    layerMode,
    viewScope,
    nodes,
    edges,
    setActiveWorkspaceId,
    setSelectedFileId,
    setLayerMode,
    setViewScope,
    switchProject,
    loadCustomProject,
    addCustomFile,
    setActiveTraceIndex,
    setActiveTraceId,
  };
}
