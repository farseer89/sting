import type { ProtopipeSiteContentPlan } from '@hive/contracts';
import type { ThoughtStep } from '../../lab/thinker/thought.model';
import {
  CONTENT_PLAN_FOUNDATION_STEPS,
  STRATEGY_INTEL_NAV_PHASES,
  STRATEGY_RESULT_STEP_ID,
  type StrategyIntelNavStepId,
  type StrategyResultStepId,
  resolveStrategyIntelNavStepId,
} from '../../lab/content-plan/content-plan-run-to-thought';
import { strategyStats } from '../strategy/strategy.helpers';
import type { StrategyResultTabId } from './content-plan-visualizer.util';
import type { BinderStepStatus, BinderStepView } from './thinker-binder.mapper';

export { STRATEGY_RESULT_STEP_ID };

export type ContentPlanNavStepId =
  | (typeof CONTENT_PLAN_FOUNDATION_STEPS)[number]
  | StrategyIntelNavStepId
  | StrategyResultStepId;

const STRATEGY_RESULT_TAB_META: { id: StrategyResultTabId; label: string; hasContent: (plan: ProtopipeSiteContentPlan) => boolean }[] = [
  {
    id: 'plan',
    label: 'Plan',
    hasContent: (plan) =>
      Boolean(plan.narrative || plan.pillars.length || plan.focusStrategies.length),
  },
  {
    id: 'calendar',
    label: 'Calendar',
    hasContent: (plan) => plan.calendar.length > 0,
  },
  {
    id: 'keyword-intel',
    label: 'Keyword intel',
    hasContent: (plan) => (plan.strategyIntel?.keywordIntel?.length ?? 0) > 0,
  },
  {
    id: 'clusters',
    label: 'Clusters',
    hasContent: (plan) => (plan.strategyIntel?.clusterIntel?.length ?? 0) > 0,
  },
  {
    id: 'audience',
    label: 'Audience',
    hasContent: (plan) => (plan.strategyIntel?.avatarIntel?.length ?? 0) > 0,
  },
  {
    id: 'thesis',
    label: 'Thesis',
    hasContent: (plan) => (plan.strategyIntel?.thesisSeeds?.length ?? 0) > 0,
  },
  {
    id: 'backlog',
    label: 'Backlog',
    hasContent: (plan) => (plan.backlog?.length ?? 0) > 0,
  },
];

export function isStrategyIntelNavStepId(id: string): id is StrategyIntelNavStepId {
  return STRATEGY_INTEL_NAV_PHASES.some((phase) => phase.id === id);
}

export function isStrategyResultStepId(id: string): id is StrategyResultStepId {
  return id === STRATEGY_RESULT_STEP_ID;
}

export function resolveContentPlanNavStepId(
  plan: ProtopipeSiteContentPlan,
  thoughtCurrentStepId?: string,
): ContentPlanNavStepId {
  if (plan.status === 'complete' || plan.currentStep === 'done') {
    return STRATEGY_RESULT_STEP_ID;
  }
  if (plan.currentStep === 'strategy_intel') {
    return resolveStrategyIntelNavStepId(plan);
  }
  if (thoughtCurrentStepId && CONTENT_PLAN_FOUNDATION_STEPS.includes(thoughtCurrentStepId as never)) {
    return thoughtCurrentStepId as ContentPlanNavStepId;
  }
  if (plan.currentStep && CONTENT_PLAN_FOUNDATION_STEPS.includes(plan.currentStep)) {
    return plan.currentStep;
  }
  return (thoughtCurrentStepId as ContentPlanNavStepId) ?? 'audit';
}

export function mapFoundationSteps(steps: BinderStepView[]): BinderStepView[] {
  return steps.filter((step) =>
    CONTENT_PLAN_FOUNDATION_STEPS.includes(step.id as (typeof CONTENT_PLAN_FOUNDATION_STEPS)[number]),
  );
}

function strategyResultStatus(plan: ProtopipeSiteContentPlan): BinderStepStatus {
  if (plan.status === 'failed') return 'failed';
  if (plan.status === 'complete' || plan.currentStep === 'done') return 'done';
  const hasPartialOutput = STRATEGY_RESULT_TAB_META.some((tab) => tab.hasContent(plan));
  if (plan.status === 'running' && hasPartialOutput) return 'running';
  if (hasPartialOutput) return 'running';
  return 'pending';
}

function strategyResultSubSteps(plan: ProtopipeSiteContentPlan): BinderStepView['subSteps'] {
  const parentStatus = strategyResultStatus(plan);
  return STRATEGY_RESULT_TAB_META.map((tab, index) => {
    const ready = tab.hasContent(plan);
    let status: BinderStepStatus = 'pending';
    if (ready) {
      status = 'done';
    } else if (parentStatus === 'running') {
      status = 'pending';
    }
    return {
      id: tab.id,
      num: String(index + 1).padStart(2, '0'),
      label: tab.label,
      detail: ready ? 'Ready' : undefined,
      status,
    };
  });
}

export function mapStrategyResultNavStep(
  plan: ProtopipeSiteContentPlan,
  mappedSteps: BinderStepView[],
): BinderStepView {
  const stats = strategyStats(plan);
  const status = strategyResultStatus(plan);
  const unify = mappedSteps.find((s) => s.id === 'unify');
  const intel = mappedSteps.find((s) => s.id === 'strategy_intel');

  const summary =
    status === 'done'
      ? `${stats.calendarCount} scheduled · ${stats.pillarCount} pillar(s)`
      : status === 'running'
        ? 'Tabs fill in as the build progresses'
        : 'Full strategy output when the build completes';

  return {
    id: STRATEGY_RESULT_STEP_ID,
    num: String(CONTENT_PLAN_FOUNDATION_STEPS.length + STRATEGY_INTEL_NAV_PHASES.length + 1).padStart(
      2,
      '0',
    ),
    label: 'Strategy Result',
    description:
      'Your generated content strategy — plan, calendar, competitive intel, and topic backlog in one place.',
    summary,
    status,
    isLlmStep: false,
    costUsd: intel?.costUsd,
    durationMs: plan.status === 'complete' ? intel?.durationMs : undefined,
    inputArtifact: unify?.outputArtifact,
    outputArtifact: intel?.outputArtifact ?? unify?.outputArtifact,
    subSteps: strategyResultSubSteps(plan),
    events: plan.status === 'complete' ? (intel?.events ?? []) : [],
    rawJson: JSON.stringify(
      {
        narrative: plan.narrative,
        calendarCount: stats.calendarCount,
        backlogCount: plan.backlog?.length ?? 0,
        keywordIntelCount: plan.strategyIntel?.keywordIntel?.length ?? 0,
      },
      null,
      2,
    ),
    llmCalls: [],
  };
}

function keywordIntelKeywordSubSteps(
  plan: ProtopipeSiteContentPlan,
  parentStatus: BinderStepStatus,
): BinderStepView['subSteps'] {
  const rows = plan.strategyIntel?.keywordIntel ?? [];
  if (rows.length > 0) {
    return rows.map((kw, index) => ({
      id: `intel:kw:${kw.phrase}`,
      num: String(index + 1).padStart(2, '0'),
      label: kw.phrase,
      detail: kw.highestLeverageQuestion || `${kw.unansweredQuestions.length} UQ(s)`,
      status: 'done' as BinderStepStatus,
    }));
  }

  if (parentStatus === 'running' && plan.calendar.length > 0) {
    return plan.calendar.slice(0, 12).map((item, index) => ({
      id: `intel:kw:${item.suggestedKeyword}`,
      num: String(index + 1).padStart(2, '0'),
      label: item.suggestedKeyword,
      detail: item.workingTitle,
      status: 'running' as BinderStepStatus,
    }));
  }

  return [];
}

function clusterIntelSubSteps(plan: ProtopipeSiteContentPlan): BinderStepView['subSteps'] {
  const rows = plan.strategyIntel?.clusterIntel ?? [];
  return rows.map((cluster, index) => ({
    id: `intel:cluster:${cluster.clusterName}`,
    num: String(index + 1).padStart(2, '0'),
    label: cluster.clusterName,
    detail: cluster.novelMechanism.slice(0, 72),
    status: 'done' as BinderStepStatus,
  }));
}

function journeyIntelSubSteps(
  plan: ProtopipeSiteContentPlan,
): BinderStepView['subSteps'] {
  const rows = plan.strategyIntel?.avatarIntel ?? [];
  return rows.map((avatar, index) => {
    const label =
      plan.keywordStrategySnapshot?.confirmedAvatars?.find((a) => a.id === avatar.avatarId)
        ?.intentCluster ?? avatar.avatarId;
    return {
      id: `intel:avatar:${avatar.avatarId}`,
      num: String(index + 1).padStart(2, '0'),
      label,
      detail: `${avatar.journeyStages.length} stage(s)`,
      status: 'done' as BinderStepStatus,
    };
  });
}

function thesisIntelSubSteps(plan: ProtopipeSiteContentPlan): BinderStepView['subSteps'] {
  const rows = plan.strategyIntel?.thesisSeeds ?? [];
  return rows.map((seed, index) => ({
    id: `intel:thesis:${seed.phrase}`,
    num: String(index + 1).padStart(2, '0'),
    label: seed.workingTitle,
    detail: seed.phrase,
    status: 'done' as BinderStepStatus,
  }));
}

function backlogIntelSubSteps(plan: ProtopipeSiteContentPlan): BinderStepView['subSteps'] {
  const rows = plan.backlog ?? [];
  return rows.slice(0, 12).map((item, index) => ({
    id: `intel:backlog:${item.suggestedKeyword}`,
    num: String(index + 1).padStart(2, '0'),
    label: item.workingTitle,
    detail: item.suggestedKeyword,
    status: 'done' as BinderStepStatus,
  }));
}

function phaseSubSteps(
  phaseId: StrategyIntelNavStepId,
  plan: ProtopipeSiteContentPlan,
  parentStatus: BinderStepStatus,
): BinderStepView['subSteps'] {
  switch (phaseId) {
    case 'intel:keyword':
      return keywordIntelKeywordSubSteps(plan, parentStatus);
    case 'intel:cluster':
      return clusterIntelSubSteps(plan);
    case 'intel:journey':
      return journeyIntelSubSteps(plan);
    case 'intel:thesis':
      return thesisIntelSubSteps(plan);
    case 'intel:backlog':
      return backlogIntelSubSteps(plan);
  }
}

export function mapStrategyIntelNavSteps(
  plan: ProtopipeSiteContentPlan,
  intelThoughtStep: ThoughtStep | undefined,
  mappedIntelStep: BinderStepView | undefined,
): BinderStepView[] {
  const phaseSubs = mappedIntelStep?.subSteps ?? [];
  const intelEvents = intelThoughtStep?.events ?? [];
  const intelLlmCalls = mappedIntelStep?.llmCalls ?? [];

  return STRATEGY_INTEL_NAV_PHASES.map((phase, index) => {
    const sub = phaseSubs.find((row) => row.id === phase.id);
    const status: BinderStepStatus = sub?.status ?? 'pending';

    return {
      id: phase.id,
      num: String(CONTENT_PLAN_FOUNDATION_STEPS.length + index + 1).padStart(2, '0'),
      label: phase.navLabel,
      description: phase.detail,
      summary: sub?.detail ?? phase.detail,
      status,
      isLlmStep: true,
      costUsd: index === 0 ? mappedIntelStep?.costUsd : undefined,
      durationMs: undefined,
      llmCalls: index === 0 ? intelLlmCalls : [],
      inputArtifact: index === 0 ? mappedIntelStep?.inputArtifact : undefined,
      outputArtifact: undefined,
      subSteps: phaseSubSteps(phase.id, plan, status),
      events:
        index === 0
          ? (mappedIntelStep?.events ??
            intelEvents.map((e) => ({
              at: e.at,
              level: e.level,
              msg: e.message,
            })))
          : [],
      rawJson: mappedIntelStep?.rawJson ?? '{}',
    };
  });
}
