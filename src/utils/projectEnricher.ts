import type { ParsedCodeFile, VibeProject, ExecutionTrace, TraceStep, StateVariable } from '../types/ast';
import type { VibeLensProjectMaster } from '../types/vibeproject';

export function enrichProjectWithMaster(
  project: VibeProject,
  master: VibeLensProjectMaster
): VibeProject {
  const normalizePath = (p: string) =>
    (p || '').replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();

  const pathToIdMap = new Map<string, string>();
  project.files.forEach((f) => {
    pathToIdMap.set(f.path, f.id);
    pathToIdMap.set(normalizePath(f.path), f.id);
  });

  const resolveFileId = (p: string): string | undefined =>
    pathToIdMap.get(p) ?? pathToIdMap.get(normalizePath(p));

  const proseBySymbol = master.symbolProse ?? {};

  const enrichedFiles: ParsedCodeFile[] = project.files.map((file) => {
    const masterFile = master.files[file.path];
    // Attach AI prose ONLY to deterministic symbols that actually exist.
    // AI-invented names are dropped with a warning — topology stays parsed, not guessed.
    const functions = (file.functions ?? []).map((sym) => {
      const prose = proseBySymbol[`${file.path}::${sym.name}`];
      if (!prose) return sym;
      return {
        ...sym,
        plainEnglish: prose.plainEnglish || sym.plainEnglish,
        whyCalled: prose.whyCalled || sym.whyCalled,
      };
    });
    for (const key of Object.keys(proseBySymbol)) {
      const sep = key.lastIndexOf('::');
      if (sep > 0 && key.slice(0, sep) === file.path) {
        const name = key.slice(sep + 2);
        if (!(file.functions ?? []).some((s) => s.name === name)) {
          console.warn(`[projectEnricher] AI described unknown symbol "${name}" in ${file.path} — dropped`);
        }
      }
    }
    if (!masterFile) {
      return functions === file.functions ? file : { ...file, functions };
    }

    // Convert dataShape (structs, classes, states) into StateVariables for Universal Data Shape panel
    const states: StateVariable[] = [];
    if (masterFile.dataShape && Array.isArray(masterFile.dataShape)) {
      for (const shape of masterFile.dataShape) {
        if (shape.fields && Array.isArray(shape.fields)) {
          for (const f of shape.fields) {
            states.push({
              name: `${shape.name}.${f.name}`,
              setter: `${shape.name} (${shape.kind || 'struct'})`,
              initialValue: f.type || 'field',
              purpose: f.purpose || `Domain entity attribute in ${shape.name}`,
              modifiedBy: masterFile.calls?.slice(0, 3) ?? [],
            });
          }
        }
      }
    }

    return {
      ...file,
      functions,
      pipelineRole: masterFile.role || file.pipelineRole,
      description: masterFile.plainEnglish || file.description,
      whyAiMadeThis: masterFile.outbound || file.whyAiMadeThis,
      flowExplanation: {
        inbound: masterFile.inbound || file.flowExplanation?.inbound || 'Receives input parameters from caller.',
        processing: masterFile.plainEnglish || file.description,
        outbound: masterFile.outbound || file.flowExplanation?.outbound || 'Dispatches output data to downstream layer.',
      },
      blastRadius: {
        score: masterFile.blastRadius?.score || 'low',
        riskLabel: masterFile.blastRadius?.riskLabel || `${file.name} Unit`,
        description: `Directly coordinates with ${masterFile.calls?.length || 0} outbound and ${masterFile.calledBy?.length || 0} inbound callers.`,
        impactedFiles: masterFile.blastRadius?.impactedFiles || [],
        safeInvariants: masterFile.blastRadius?.safeInvariants || [
          'Preserve public function and method signatures intact',
          'Maintain transaction and error handling contracts',
        ],
      },
      states: states.length > 0 ? states : file.states,
      routes: masterFile.routes && masterFile.routes.length > 0 ? masterFile.routes : file.routes,
      dataEntities: masterFile.dataShape && masterFile.dataShape.length > 0
        ? masterFile.dataShape.map((s) => s.name)
        : file.dataEntities,
      focalCode: masterFile.focalCode || file.focalCode,
      focalLine: masterFile.focalLine || file.focalLine,
    };
  });

  // Convert AI Journeys into ExecutionTraces
  let traces: ExecutionTrace[] = project.traces ?? [];
  if (Array.isArray(master.journeys) && master.journeys.length > 0) {
    const seenIds = new Set<string>();
    traces = master.journeys
      .map((journey, jIdx) => {
        const rawSteps = Array.isArray(journey.steps) ? journey.steps : [];
        const steps: TraceStep[] = [];
        rawSteps.forEach((step, sIdx) => {
          const fileId = resolveFileId(step.file);
          if (!fileId) {
            console.warn(`[projectEnricher] journey "${journey.title ?? jIdx}" step path not found in project: ${step.file} — step skipped`);
            return;
          }
          const nextStep = rawSteps
            .slice(sIdx + 1)
            .find((s) => resolveFileId(s.file) !== undefined);
          steps.push({
            id: `ai-step-${jIdx}-${steps.length}`,
            stepNumber: steps.length + 1,
            title: step.action || `Step ${steps.length + 1}`,
            description: step.action || `Step ${steps.length + 1}`,
            activeNodeId: fileId,
            targetNodeId: nextStep ? resolveFileId(nextStep.file) : undefined,
            lineHighlight: step.lineHighlight,
            codeLine: step.codeLine,
            dataPassed: step.dataPassed || step.dataTransformed,
            codeExplanation: step.codeExplanation,
            storybook: {
              chapterNumber: steps.length + 1,
              chapterTitle: `Step ${steps.length + 1}: ${step.action || step.file}`,
              story: `[${step.file}] ${step.action || 'executes'}`,
              humanCausality: step.codeExplanation || step.dataPassed || step.dataTransformed || 'Data flows cleanly through domain boundaries.',
            },
          });
        });

        let id = journey.id || `ai-journey-${jIdx}`;
        if (seenIds.has(id)) id = `${id}-dup-${jIdx}`;
        seenIds.add(id);

        return {
          id,
          title: journey.title || `Journey ${jIdx + 1}`,
          triggerLabel: `Journey ${jIdx + 1}`,
          description: journey.description || journey.title || `Journey ${jIdx + 1}`,
          steps,
        };
      })
      .filter((t) => t.steps.length > 0);
  }

  return {
    ...project,
    framework: master.stack ? `${master.stack} (${enrichedFiles.length} source files)` : project.framework,
    description: master.summary || project.description,
    files: enrichedFiles,
    traces: traces.length > 0 ? traces : (project.traces ?? []),
    connections: Array.isArray(master.connections) && master.connections.length > 0
      ? master.connections
      : (project.connections ?? []),
  };
}
