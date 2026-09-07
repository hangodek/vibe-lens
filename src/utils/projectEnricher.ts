import type { ParsedCodeFile, VibeProject, ExecutionTrace, TraceStep, StateVariable } from '../types/ast';
import type { VibeLensProjectMaster } from '../types/vibeproject';

export function enrichProjectWithMaster(
  project: VibeProject,
  master: VibeLensProjectMaster
): VibeProject {
  const pathToIdMap = new Map<string, string>();
  project.files.forEach((f) => pathToIdMap.set(f.path, f.id));

  const enrichedFiles: ParsedCodeFile[] = project.files.map((file) => {
    const masterFile = master.files[file.path];
    if (!masterFile) return file;

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
              modifiedBy: masterFile.calls.slice(0, 3),
            });
          }
        }
      }
    }

    return {
      ...file,
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
    };
  });

  // Convert AI Journeys into ExecutionTraces
  let traces: ExecutionTrace[] = project.traces;
  if (master.journeys && master.journeys.length > 0) {
    traces = master.journeys.map((journey, jIdx) => {
      const steps: TraceStep[] = journey.steps.map((step, sIdx) => {
        const fileId = pathToIdMap.get(step.file) || enrichedFiles[0]?.id || 'step-file';
        const nextStep = journey.steps[sIdx + 1];
        const nextFileId = nextStep ? pathToIdMap.get(nextStep.file) : undefined;

        return {
          id: `ai-step-${jIdx}-${sIdx}`,
          stepNumber: sIdx + 1,
          title: step.action,
          description: `${step.action}${step.dataTransformed ? ` (Data: ${step.dataTransformed})` : ''}`,
          activeNodeId: fileId,
          targetNodeId: nextFileId,
          lineHighlight: step.lineHighlight,
          storybook: {
            chapterNumber: sIdx + 1,
            chapterTitle: `Step ${sIdx + 1}: ${step.action}`,
            story: `[${step.file}] ${step.action}`,
            humanCausality: step.dataTransformed || 'Data flows cleanly through domain boundaries.',
          },
        };
      });

      return {
        id: journey.id || `ai-journey-${jIdx}`,
        title: journey.title,
        triggerLabel: `Journey ${jIdx + 1}`,
        description: journey.description,
        steps,
      };
    });
  }

  return {
    ...project,
    framework: master.stack ? `${master.stack} (${enrichedFiles.length} source files)` : project.framework,
    description: master.summary || project.description,
    files: enrichedFiles,
    traces: traces.length > 0 ? traces : project.traces,
  };
}
