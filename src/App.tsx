import React, { useState, useEffect, useRef } from 'react';
import { useCodebase } from './hooks/useCodebase';
import { useExecutionTrace } from './hooks/useExecutionTrace';
import { StudioHeader } from './components/header/StudioHeader';
import { PresetDrawer } from './components/sidebar/PresetDrawer';
import { FileExplorer } from './components/sidebar/FileExplorer';
import { GraphCanvas } from './components/canvas/GraphCanvas';
import { WorkspaceBar } from './components/canvas/WorkspaceBar';
import { TracePlaybackBar } from './components/canvas/TracePlaybackBar';
import { InspectorPanel } from './components/inspector/InspectorPanel';
import { IngestModal } from './components/sidebar/IngestModal';
import { AISetupModal } from './components/setup/AISetupModal';
import { ScreenLocatorModal } from './components/inspector/ScreenLocatorModal';
import { analyzeProjectWithAI } from './utils/aiAnalyzer';
import type { AnalysisProgress } from './utils/aiAnalyzer';
import { enrichProjectWithMaster } from './utils/projectEnricher';
import type { VibeProject } from './types/ast';
import { Loader2 } from 'lucide-react';

export function App() {
  const {
    activeProject,
    allProjects,
    allFiles,
    displayedFiles,
    workspaces,
    activeWorkspaceId,
    selectedFile,
    selectedFileId,
    selectedNodeId,
    selectedSymbol,
    layerMode,
    viewScope,
    nodes,
    edges,
    setActiveWorkspaceId,
    setSelectedFileId,
    selectNode,
    setLayerMode,
    setViewScope,
    switchProject,
    loadCustomProject,
    addCustomFile,
    setActiveTraceIndex: syncTraceIndex,
    setActiveTraceId,
  } = useCodebase();

  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [isAISetupOpen, setIsAISetupOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isScreenLocatorOpen, setIsScreenLocatorOpen] = useState(false);

  // AI Project Analysis States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({
    message: '',
    percent: 0,
  });
  const [pendingProject, setPendingProject] = useState<VibeProject | null>(null);

  // Execution Trace stepper controls
  const trace = useExecutionTrace(activeProject.traces ?? []);

  // Synchronize trace step index with layout engine
  useEffect(() => {
    syncTraceIndex(trace.activeStepIndex);
  }, [trace.activeStepIndex, syncTraceIndex]);

  // Synchronize selected trace ID with layout engine
  useEffect(() => {
    setActiveTraceId(trace.selectedTraceId);
  }, [trace.selectedTraceId, setActiveTraceId]);

  // When trace step changes, automatically focus the active file in inspector
  useEffect(() => {
    if (layerMode === 'trace' && trace.currentStep?.activeNodeId) {
      selectNode(trace.currentStep.activeNodeId);
    }
  }, [layerMode, trace.currentStep, selectNode]);

  // AI Pipeline Runner — guarded against stale completions from earlier ingests
  const analysisRunId = useRef(0);
  const runAIAnalysis = async (project: VibeProject, force = false) => {
    const runId = ++analysisRunId.current;
    setIsAnalyzing(true);
    setAnalysisProgress({ message: 'Initiating AI codebase analysis...', percent: 5 });

    try {
      const rawFiles = project.files.map((f) => ({
        path: f.path,
        name: f.name,
        code: f.code,
        lineCount: f.lineCount,
      }));

      // Deterministic symbol IR travels with the files so the AI describes
      // real parsed functions (never invented ones).
      const symbolHints: Record<string, Array<{
        name: string; signature: string; params: string[];
        startLine: number; endLine: number;
        calls: Array<{ name: string; args: string; line: number }>;
        calledBy: string[];
      }>> = {};
      for (const f of project.files) {
        if (f.functions && f.functions.length > 0) {
          symbolHints[f.path] = f.functions.map((s) => ({
            name: s.name,
            signature: s.signature,
            params: s.params,
            startLine: s.startLine,
            endLine: s.endLine,
            calls: s.calls.map((c) => ({ name: c.baseName, args: c.args, line: c.line })),
            calledBy: s.calledBy,
          }));
        }
      }

      const master = await analyzeProjectWithAI(
        project.id,
        project.name,
        rawFiles,
        (p) => {
          if (analysisRunId.current === runId) setAnalysisProgress(p);
        },
        force,
        symbolHints
      );

      if (analysisRunId.current !== runId) return;
      const enriched = enrichProjectWithMaster(project, master);
      loadCustomProject(enriched);
    } catch (err: any) {
      if (analysisRunId.current !== runId) return;
      console.warn('AI analysis error, loading base project:', err?.message);
      loadCustomProject(project);
    } finally {
      if (analysisRunId.current === runId) {
        setIsAnalyzing(false);
        setPendingProject(null);
      }
    }
  };

  const handleProjectIngested = (project: VibeProject) => {
    // 1. Instantly render project on canvas in Trace Story mode (0.05s) - zero waiting!
    loadCustomProject(project);
    setLayerMode('trace');

    // 2. Trigger opencode AI analysis in background
    runAIAnalysis(project);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#010102] text-[#f7f8f8]">
      {/* Studio Header Bar with Anti-Spaghetti Filter & Quick Search */}
      <StudioHeader
        currentMode={layerMode}
        files={allFiles}
        viewScope={viewScope}
        projectSummary={activeProject.description}
        projectStack={activeProject.framework}
        connectionCount={activeProject.connections?.length || 0}
        onChangeMode={setLayerMode}
        onChangeScope={setViewScope}
        onOpenIngest={() => setIsIngestOpen(true)}
        onOpenApiKey={() => setIsAISetupOpen(true)}
        onRescanAI={() => runAIAnalysis(activeProject, true)}
        onSelectFile={(id) => {
          selectNode(id);
          setIsInspectorOpen(true);
        }}
      />

      {/* Main Studio Body Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Presets & File Explorer */}
        <aside className="w-64 border-r border-[#23252a] bg-[#08090a] flex flex-col shrink-0 z-20">
          <PresetDrawer
            currentProjectId={activeProject.id}
            allProjects={allProjects}
            onSelectProject={switchProject}
          />
          <FileExplorer
            files={displayedFiles}
            selectedFileId={selectedFileId}
            onSelectFile={(id) => {
              selectNode(id);
              setIsInspectorOpen(true);
            }}
          />
        </aside>

        {/* Center: Interactive Graph Canvas with Dedicated Feature Workspaces */}
        <main className="flex-1 h-full relative overflow-hidden flex flex-col">
          {/* Feature Workspace Switcher Bar (Strictly SVG icons, NO emojis) */}
          <WorkspaceBar
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onSelectWorkspace={setActiveWorkspaceId}
          />

          <div className="flex-1 relative overflow-hidden">
            {layerMode === 'trace' && (
              <TracePlaybackBar
                traces={activeProject.traces}
                selectedTraceId={trace.selectedTraceId}
                activeTrace={trace.activeTrace}
                activeStepIndex={trace.activeStepIndex}
                currentStep={trace.currentStep}
                isPlaying={trace.isPlaying}
                onSelectTrace={trace.selectTrace}
                onTogglePlay={trace.handleTogglePlay}
                onNext={trace.handleNext}
                onPrev={trace.handlePrev}
                onJumpToStep={trace.setActiveStepIndex}
              />
            )}

            <GraphCanvas
              nodes={nodes}
              edges={edges}
              selectedFileId={selectedFileId}
              selectedNodeId={selectedNodeId}
              focusNodeId={selectedNodeId}
              activeTraceStepNodeId={layerMode === 'trace' ? trace.currentStep?.activeNodeId : undefined}
              scopeKey={`${activeProject.id}-${layerMode}-${activeWorkspaceId}-${viewScope}`}
              onSelectNode={(nodeId) => {
                selectNode(nodeId);
                setIsInspectorOpen(true);
              }}
            />
          </div>
        </main>

        {/* Right Sidebar: Inspector & Mental Model Drawer */}
        {isInspectorOpen && (
          <InspectorPanel
            file={selectedFile}
            allFiles={allFiles}
            connections={edges}
            highlightLine={layerMode === 'trace' ? trace.currentStep?.lineHighlight : undefined}
            selectedNodeId={selectedNodeId}
            symbol={selectedSymbol?.symbol ?? null}
            onSelectFile={(id) => {
              selectNode(id);
              setIsInspectorOpen(true);
            }}
            onSelectNode={(id) => {
              selectNode(id);
              setIsInspectorOpen(true);
            }}
            onClose={() => setIsInspectorOpen(false)}
            onOpenScreenLocator={() => setIsScreenLocatorOpen(true)}
          />
        )}
      </div>

      {/* Screen Locator Modal */}
      <ScreenLocatorModal
        isOpen={isScreenLocatorOpen}
        file={selectedFile}
        project={activeProject}
        onClose={() => setIsScreenLocatorOpen(false)}
      />

      {/* 4-Tier Ingestion Modal Hub */}
      <IngestModal
        isOpen={isIngestOpen}
        onClose={() => setIsIngestOpen(false)}
        onAddFile={addCustomFile}
        onLoadProject={handleProjectIngested}
      />

      {/* AI Configuration Modal (CLI tools like agy/opencode/claude & cloud APIs) */}
      <AISetupModal
        isOpen={isAISetupOpen}
        onClose={() => setIsAISetupOpen(false)}
        onSaved={() => {
          if (pendingProject) {
            runAIAnalysis(pendingProject);
          }
        }}
      />

      {/* Floating Non-Blocking AI Execution Flow Status */}
      {isAnalyzing && (
        <div className="absolute top-16 right-6 z-40 bg-[#0e0f14]/95 border border-[#5e6ad2] p-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in">
          <Loader2 className="w-4 h-4 text-[#828fff] animate-spin shrink-0" />
          <div className="text-left">
            <div className="text-xs font-semibold text-[#f7f8f8]">
              {localStorage.getItem('vibe_cli_tool') || 'OpenCode'} Analyzing Flow...
            </div>
            <div className="text-[10px] font-mono text-[#8a8f98]">
              {analysisProgress.message || 'Extracting step causality...'} ({analysisProgress.percent}%)
            </div>
          </div>
          <button
            onClick={() => setIsAnalyzing(false)}
            className="text-xs text-[#8a8f98] hover:text-white p-1 rounded hover:bg-[#1c1d22] cursor-pointer ml-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
