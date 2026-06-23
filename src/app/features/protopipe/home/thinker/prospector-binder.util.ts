import {
  PROSPECTOR_RESULT_STEP_ID,
  PROSPECTOR_STEP_ORDER,
  type ProspectorResultStepId,
} from '../../lab/prospector/prospector-run-to-thought';
import type { ProspectorRunDto } from '../../prospector/prospector-run.model';
import type { BinderStepStatus, BinderStepView } from './thinker-binder.mapper';

export { PROSPECTOR_RESULT_STEP_ID };

export type ProspectorBinderNavStepId = ProspectorResultStepId;

export function isProspectorResultStepId(id: string): id is ProspectorResultStepId {
  return id === PROSPECTOR_RESULT_STEP_ID;
}

export function resolveProspectorBinderNavStepId(run: ProspectorRunDto): string {
  if (run.status === 'complete' || run.currentStep === 'done') {
    return PROSPECTOR_RESULT_STEP_ID;
  }
  return run.currentStep as string;
}

function resultStatus(run: ProspectorRunDto): BinderStepStatus {
  if (run.status === 'failed') return 'failed';
  if (run.status === 'complete') return 'done';
  const hasLeads = (run.artifacts.scoredLeads?.length ?? 0) > 0;
  if (hasLeads) return 'running';
  return 'pending';
}

export function mapProspectorResultNavStep(
  run: ProspectorRunDto,
  mappedSteps: BinderStepView[],
): BinderStepView {
  const status = resultStatus(run);
  const leads = run.artifacts.scoredLeads?.length ?? 0;
  const critical = run.artifacts.scoredLeads?.filter((l) => l.priority === 'critical').length ?? 0;
  const high = run.artifacts.scoredLeads?.filter((l) => l.priority === 'high').length ?? 0;

  const summary =
    status === 'done'
      ? `${leads} lead(s) · ${critical} critical · ${high} high`
      : status === 'running'
        ? 'Scoring in progress…'
        : 'Results appear after scoring completes';

  const lastStep = mappedSteps.find(
    (s) => s.id === PROSPECTOR_STEP_ORDER[PROSPECTOR_STEP_ORDER.length - 1],
  );

  return {
    id: PROSPECTOR_RESULT_STEP_ID,
    num: String(PROSPECTOR_STEP_ORDER.length + 1).padStart(2, '0'),
    label: 'Leads',
    description: 'Scored and ranked business leads.',
    summary,
    status,
    isLlmStep: false,
    costUsd: run.totalCostUsd,
    inputArtifact: lastStep?.outputArtifact,
    outputArtifact: lastStep?.outputArtifact,
    subSteps: [],
    events: status === 'done' ? (lastStep?.events ?? []) : [],
    rawJson: JSON.stringify(
      { status: run.status, leadCount: leads, critical, high },
      null,
      2,
    ),
    llmCalls: [],
  };
}
