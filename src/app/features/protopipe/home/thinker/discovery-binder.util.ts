import type { ProtopipeKeywordDiscoveryRunDto } from '@hive/contracts';
import {
  DISCOVERY_NAV_PHASES,
  DISCOVERY_RESULT_STEP_ID,
  DISCOVERY_STEP_ORDER,
  STEP_META,
  type DiscoveryNavPhaseId,
  type DiscoveryResultStepId,
  resolveDiscoveryNavStepId,
} from '../../lab/keyword-discovery/discovery-run-to-thought';
import type { DiscoveryResultTabId } from './discovery-run-visualizer.util';
import type { BinderStepStatus, BinderStepView } from './thinker-binder.mapper';

export { DISCOVERY_RESULT_STEP_ID };

export type DiscoveryNavStepId = DiscoveryNavPhaseId | DiscoveryResultStepId;

const DISCOVERY_RESULT_TAB_META: {
  id: DiscoveryResultTabId;
  label: string;
  hasContent: (run: ProtopipeKeywordDiscoveryRunDto) => boolean;
}[] = [
  {
    id: 'keywords',
    label: 'Keywords',
    hasContent: (run) => (run.artifacts.scoredCandidates?.length ?? 0) > 0,
  },
  {
    id: 'audiences',
    label: 'Audiences',
    hasContent: (run) => (run.artifacts.suggestedAvatars?.length ?? 0) > 0,
  },
  {
    id: 'sources',
    label: 'Sources',
    hasContent: (run) =>
      Boolean(
        run.artifacts.profile ||
          run.events.some(
            (e) =>
              ['load_profile', 'fetch_gsc', 'fetch_ranked', 'spyfu_gaps'].includes(e.step) &&
              e.status === 'completed',
          ),
      ),
  },
];

export function isDiscoveryNavPhaseId(id: string): id is DiscoveryNavPhaseId {
  return DISCOVERY_NAV_PHASES.some((phase) => phase.id === id);
}

export function isDiscoveryResultStepId(id: string): id is DiscoveryResultStepId {
  return id === DISCOVERY_RESULT_STEP_ID;
}

export function resolveDiscoveryBinderNavStepId(
  run: ProtopipeKeywordDiscoveryRunDto,
  thoughtCurrentStepId?: string,
): DiscoveryNavStepId {
  if (run.status === 'ready' || run.status === 'confirmed' || run.currentStep === 'done') {
    return DISCOVERY_RESULT_STEP_ID;
  }
  if (thoughtCurrentStepId && isDiscoveryNavPhaseId(thoughtCurrentStepId)) {
    return thoughtCurrentStepId;
  }
  if (thoughtCurrentStepId === DISCOVERY_RESULT_STEP_ID) {
    return DISCOVERY_RESULT_STEP_ID;
  }
  return resolveDiscoveryNavStepId(run as never);
}

function mapStepStatus(
  stepId: string,
  mappedSteps: BinderStepView[],
): BinderStepStatus {
  const step = mappedSteps.find((row) => row.id === stepId);
  return step?.status ?? 'pending';
}

function phaseStatus(
  phaseSteps: readonly string[],
  mappedSteps: BinderStepView[],
  run: ProtopipeKeywordDiscoveryRunDto,
): BinderStepStatus {
  if (run.status === 'failed' && run.error?.step && phaseSteps.includes(run.error.step)) {
    return 'failed';
  }
  const statuses = phaseSteps.map((id) => mapStepStatus(id, mappedSteps));
  if (statuses.every((s) => s === 'done')) return 'done';
  if (statuses.some((s) => s === 'failed')) return 'failed';
  if (statuses.some((s) => s === 'running')) return 'running';
  if (statuses.some((s) => s === 'done')) return 'running';
  return 'pending';
}

function phaseSubSteps(
  phaseSteps: readonly string[],
  mappedSteps: BinderStepView[],
): BinderStepView['subSteps'] {
  return phaseSteps.map((stepId, index) => {
    const mapped = mappedSteps.find((row) => row.id === stepId);
    const meta = STEP_META[stepId as keyof typeof STEP_META];
    return {
      id: stepId,
      num: String(index + 1).padStart(2, '0'),
      label: mapped?.label ?? meta?.label ?? stepId,
      detail: mapped?.summary,
      status: mapped?.status ?? 'pending',
      isLlm: mapped?.isLlmStep,
      costUsd: mapped?.costUsd,
    };
  });
}

export function mapDiscoveryNavPhases(
  run: ProtopipeKeywordDiscoveryRunDto,
  mappedSteps: BinderStepView[],
): BinderStepView[] {
  return DISCOVERY_NAV_PHASES.map((phase, index) => {
    const status = phaseStatus(phase.steps, mappedSteps, run);
    const doneCount = phase.steps.filter((id) => mapStepStatus(id, mappedSteps) === 'done').length;

    return {
      id: phase.id,
      num: String(index + 1).padStart(2, '0'),
      label: phase.navLabel,
      description: phase.detail,
      summary:
        status === 'done'
          ? `${doneCount}/${phase.steps.length} step(s) complete`
          : status === 'running'
            ? `${doneCount}/${phase.steps.length} in progress`
            : phase.detail,
      status,
      isLlmStep: phase.steps.some((id) =>
        ['infer_avatars', 'resolve_discovery_seeds'].includes(id),
      ),
      subSteps: phaseSubSteps(phase.steps, mappedSteps),
      events: index === 0 ? mappedSteps.find((s) => s.id === phase.steps[0])?.events ?? [] : [],
      rawJson: mappedSteps.find((s) => s.id === phase.steps[0])?.rawJson ?? '{}',
      llmCalls: [],
    };
  });
}

function discoveryResultStatus(run: ProtopipeKeywordDiscoveryRunDto): BinderStepStatus {
  if (run.status === 'failed') return 'failed';
  if (run.status === 'ready' || run.status === 'confirmed') return 'done';
  const hasPartial = DISCOVERY_RESULT_TAB_META.some((tab) => tab.hasContent(run));
  if ((run.status === 'discovering' || run.status === 'pending') && hasPartial) return 'running';
  return 'pending';
}

function discoveryResultSubSteps(run: ProtopipeKeywordDiscoveryRunDto): BinderStepView['subSteps'] {
  const parentStatus = discoveryResultStatus(run);
  return DISCOVERY_RESULT_TAB_META.map((tab, index) => ({
    id: tab.id,
    num: String(index + 1).padStart(2, '0'),
    label: tab.label,
    detail: tab.hasContent(run) ? 'Ready' : undefined,
    status: tab.hasContent(run) ? ('done' as BinderStepStatus) : parentStatus === 'running' ? 'pending' : 'pending',
  }));
}

export function mapDiscoveryResultNavStep(
  run: ProtopipeKeywordDiscoveryRunDto,
  mappedSteps: BinderStepView[],
): BinderStepView {
  const status = discoveryResultStatus(run);
  const candidates = run.artifacts.scoredCandidates?.length ?? 0;
  const avatars = run.artifacts.suggestedAvatars?.length ?? 0;

  const summary =
    status === 'done'
      ? `${candidates} keyword(s) · ${avatars} audience(s)`
      : status === 'running'
        ? 'Tabs fill in as discovery progresses'
        : 'Full discovery output when the run completes';

  const lastStep = mappedSteps.find((s) => s.id === DISCOVERY_STEP_ORDER[DISCOVERY_STEP_ORDER.length - 2]);

  return {
    id: DISCOVERY_RESULT_STEP_ID,
    num: String(DISCOVERY_NAV_PHASES.length + 1).padStart(2, '0'),
    label: 'Discovery Result',
    description: 'Scored keywords and matched onboarding audiences.',
    summary,
    status,
    isLlmStep: false,
    costUsd: run.costSummary?.totalUsd,
    inputArtifact: mappedSteps.find((s) => s.id === 'merge_score')?.outputArtifact,
    outputArtifact: lastStep?.outputArtifact,
    subSteps: discoveryResultSubSteps(run),
    events: status === 'done' ? (lastStep?.events ?? []) : [],
    rawJson: JSON.stringify(
      {
        status: run.status,
        candidateCount: candidates,
        avatarCount: avatars,
      },
      null,
      2,
    ),
    llmCalls: [],
  };
}
