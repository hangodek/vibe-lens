import React, { useState } from 'react';
import { useCodebase } from './hooks/useCodebase';
import { useExecutionTrace } from './hooks/useExecutionTrace';
import { StudioHeader } from './components/header/StudioHeader';
import { PresetDrawer } from './components/sidebar/PresetDrawer';
import { FileExplorer } from './components/sidebar/FileExplorer';
import { GraphCanvas } from './components/canvas/GraphCanvas';
import { TracePlaybackBar } from './components/canvas/TracePlaybackBar';
import { InspectorPanel } from './components/inspector/InspectorPanel';
import { IngestModal } from './components/sidebar/IngestModal';
import { ApiKeyModal } from './components/common/ApiKeyModal';
import { ScreenLocatorModal } from './components/inspector/ScreenLocatorModal';

export function App() {
  const {
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
    setActiveTraceIndex: syncTraceIndex,
  } = useCodebase();

  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isScreenLocatorOpen, setIsScreenLocatorOpen] = useState(false);

  // Execution Trace stepper controls
  const trace = useExecutionTrace(activeProject.traces);

  // Synchronize trace step index with layout engine
  React.useEffect(() => {
    syncTraceIndex(trace.activeStepIndex);
  }, [trace.activeStepIndex, syncTraceIndex]);

  // When trace step changes, automatically focus the active file in inspector
  React.useEffect(() => {
    if (layerMode === 'trace' && trace.currentStep?.activeNodeId) {
      setSelectedFileId(trace.currentStep.activeNodeId);
    }
  }, [layerMode, trace.currentStep, setSelectedFileId]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#010102] text-[#f7f8f8]">
      {/* Studio Header Bar */}
      <StudioHeader
        currentMode={layerMode}
        onChangeMode={setLayerMode}
        onOpenIngest={() => setIsIngestOpen(true)}
        onOpenApiKey={() => setIsApiKeyOpen(true)}
        totalFiles={allFiles.length}
      />

      {/* Main Studio Body Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Presets & File Explorer */}
        <aside className="w-64 border-r border-[#23252a] bg-[#08090a] flex flex-col shrink-0 z-20">
          <PresetDrawer
            currentProjectId={activeProject.id}
            onSelectProject={switchProject}
          />
          <FileExplorer
            files={allFiles}
            selectedFileId={selectedFileId}
            onSelectFile={(id) => {
              setSelectedFileId(id);
              setIsInspectorOpen(true);
            }}
          />
        </aside>

        {/* Center: Interactive Graph Canvas */}
        <main className="flex-1 h-full relative overflow-hidden">
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
            activeTraceStepNodeId={layerMode === 'trace' ? trace.currentStep?.activeNodeId : undefined}
            onSelectNode={(fileId) => {
              setSelectedFileId(fileId);
              setIsInspectorOpen(true);
            }}
          />
        </main>

        {/* Right Sidebar: Inspector & Mental Model Drawer */}
        {isInspectorOpen && (
          <InspectorPanel
            file={selectedFile}
            highlightLine={layerMode === 'trace' ? trace.currentStep?.lineHighlight : undefined}
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

      {/* Ingestion & Settings Modals */}
      <IngestModal
        isOpen={isIngestOpen}
        onClose={() => setIsIngestOpen(false)}
        onAddFile={addCustomFile}
      />

      <ApiKeyModal
        isOpen={isApiKeyOpen}
        onClose={() => setIsApiKeyOpen(false)}
      />
    </div>
  );
}

export default App;
