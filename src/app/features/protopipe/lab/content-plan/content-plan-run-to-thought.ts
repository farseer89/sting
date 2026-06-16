import type {
  ProtopipeContentPlanStep,
  ProtopipeContentPlanStepEvent,
  ProtopipeSiteContentPlan,
} from '@hive/contracts';
import type {
  Thought,
  ThoughtArtifact,
  ThoughtEvent,
  ThoughtStatus,
  ThoughtStep,
  ThoughtStepStatus,
} from '../thinker/thought.model';

/**
 * Adapter: project a SiteContentPlan run onto the generic Thought model so the
 * content-plan pipeline renders in the same Thinker view as article generation.
 */

export const CONTENT_PLAN_STEP_ORDER: ProtopipeContentPlanStep[] = [
  'audit',
  'score_tier',
  'cluster',
  'unify',
  'deep_scan',
];

const STEP_META: Record<
  ProtopipeContentPlanStep,
  { label: string; summary: string }
> = {
  audit: {
    label: 'Site audit',
    summary: 'Scan existing site content for gaps and overlap.',
  },
  score_tier: {
    label: 'Score & tier',
    summary: 'Score keywords and assign immediate / long-term / long-tail tiers.',
  },
  cluster: {
    label: 'Cluster',
    summary: 'Group keywords into thematic clusters with LLM categorization.',
  },
  unify: {
    label: 'Unify plan',
    summary: 'Build pillars, calendar, and narrative from clusters.',
  },
  deep_scan: {
    label: 'Deep scan',
    summary: 'Run competition analysis on calendar focus keywords.',
  },
};

function runStatus(plan: ProtopipeSiteContentPlan): ThoughtStatus {
  switch (plan.status) {
    case 'pending':
      return 'pending';
    case 'running':
      return 'running';
    case 'complete':
      return 'complete';
    case 'failed':
      return 'failed';
    default:
      return 'idle';
  }
}

function json(id: string, label: string, data: unknown, summary?: string): ThoughtArtifact {
  return { id, label, kind: 'json', data, summary };
}

function stepOutput(step: ProtopipeContentPlanStep, plan: ProtopipeSiteContentPlan): ThoughtArtifact[] {
  switch (step) {
    case 'audit':
      return plan.existingContent
        ? [
            json(
              'audit',
              'Existing content audit',
              plan.existingContent,
              `${plan.existingContent.scannedCount} page(s) via ${plan.existingContent.source}`,
            ),
          ]
        : [];
    case 'score_tier': {
      const tiers = plan.keywordTiers;
      const total =
        tiers.immediateFocus.length + tiers.longTerm.length + tiers.longTail.length;
      return total
        ? [
            json(
              'tiers',
              'Keyword tiers',
              tiers,
              `${tiers.immediateFocus.length} immediate · ${tiers.longTerm.length} long-term · ${tiers.longTail.length} long-tail`,
            ),
          ]
        : [];
    }
    case 'cluster':
      return plan.clusters.length
        ? [
            json(
              'clusters',
              'Keyword clusters',
              plan.clusters,
              `${plan.clusters.length} cluster(s)`,
            ),
          ]
        : [];
    case 'unify': {
      const outputs: ThoughtArtifact[] = [];
      if (plan.pillars.length) {
        outputs.push(
          json('pillars', 'Content pillars', plan.pillars, `${plan.pillars.length} pillar(s)`),
        );
      }
      if (plan.calendar.length) {
        outputs.push(
          json(
            'calendar',
            'Content calendar',
            plan.calendar,
            `${plan.calendar.length} calendar item(s)`,
          ),
        );
      }
      if (plan.narrative) {
        outputs.push(
          json('narrative', 'Plan narrative', plan.narrative, plan.narrative.headline),
        );
      }
      return outputs;
    }
    case 'deep_scan':
      return plan.focusStrategies.length
        ? [
            json(
              'focus-strategies',
              'Focus keyword strategies',
              plan.focusStrategies,
              `${plan.focusStrategies.length} deep-scan strategy(ies)`,
            ),
          ]
        : [];
    default:
      return [];
  }
}

function mapEvents(evs: ProtopipeContentPlanStepEvent[]): ThoughtEvent[] {
  return evs.map((e) => {
    const parts: string[] = [e.status];
    if (e.note) parts.push(e.note);
    if (e.costUsd != null) parts.push(`$${e.costUsd.toFixed(4)}`);
    return {
      at: e.finishedAt ?? e.startedAt,
      level: e.status === 'failed' ? 'error' : 'info',
      message: parts.join(' — '),
      data: e.error ? { error: e.error } : undefined,
    } satisfies ThoughtEvent;
  });
}

export function contentPlanRunToThought(plan: ProtopipeSiteContentPlan): Thought {
  const events = plan.events ?? [];
  const eventsByStep = new Map<ProtopipeContentPlanStep, ProtopipeContentPlanStepEvent[]>();
  for (const e of events) {
    const list = eventsByStep.get(e.step) ?? [];
    list.push(e);
    eventsByStep.set(e.step, list);
  }

  const currentIdx = CONTENT_PLAN_STEP_ORDER.indexOf(
    plan.currentStep as ProtopipeContentPlanStep,
  );
  const allDone = plan.status === 'complete' || plan.currentStep === 'done';

  const steps: ThoughtStep[] = CONTENT_PLAN_STEP_ORDER.map((step, idx) => {
    const evs = eventsByStep.get(step) ?? [];
    const started = evs.find((e) => e.status === 'started');
    const finished = [...evs]
      .reverse()
      .find((e) => e.status === 'completed' || e.status === 'failed');

    let status: ThoughtStepStatus;
    if (plan.error && plan.currentStep === step && plan.status === 'failed') {
      status = 'failed';
    } else if (evs.some((e) => e.status === 'completed')) {
      status = 'complete';
    } else if (evs.some((e) => e.status === 'failed')) {
      status = 'failed';
    } else if (allDone) {
      status = 'complete';
    } else if (currentIdx < 0) {
      status = 'pending';
    } else if (idx < currentIdx) {
      status = 'complete';
    } else if (idx === currentIdx) {
      status = plan.status === 'running' ? 'running' : 'pending';
    } else {
      status = 'pending';
    }

    const meta = STEP_META[step];
    const error =
      status === 'failed' && (finished?.error || (plan.error && plan.currentStep === step))
        ? { message: finished?.error ?? plan.error ?? 'Step failed.' }
        : undefined;

    return {
      id: step,
      label: meta.label,
      summary: finished?.note ?? meta.summary,
      status,
      startedAt: started?.startedAt,
      finishedAt: finished?.finishedAt,
      durationMs: finished?.durationMs,
      attempt: Math.max(1, evs.filter((e) => e.status === 'started').length),
      output: status === 'complete' || status === 'failed' ? stepOutput(step, plan) : undefined,
      events: mapEvents(evs),
      error,
    } satisfies ThoughtStep;
  });

  for (let i = 1; i < steps.length; i++) {
    steps[i].input = steps[i - 1].output;
  }

  const currentStepId =
    plan.currentStep && plan.currentStep !== 'done'
      ? plan.currentStep
      : steps.find((s) => s.status === 'running')?.id ??
        steps.filter((s) => s.status === 'complete').at(-1)?.id;

  const outputArtifact =
    plan.calendar.length > 0
      ? json(
          'plan-calendar',
          'Content calendar',
          plan.calendar,
          `${plan.calendar.length} item(s)`,
        )
      : plan.narrative
        ? json('plan-narrative', 'Plan narrative', plan.narrative, plan.narrative.headline)
        : undefined;

  return {
    id: plan.id,
    thinkerKind: 'content-plan',
    title: `Content plan · v${plan.version}`,
    summary: plan.narrative?.headline ?? 'Site content plan generation',
    status: runStatus(plan),
    currentStepId,
    steps,
    inputs: plan.keywordStrategySnapshot
      ? [
          {
            portId: 'strategy',
            label: 'Keyword strategy',
            artifact: json(
              'keyword-strategy',
              'Confirmed keywords & avatars',
              plan.keywordStrategySnapshot,
            ),
          },
        ]
      : [],
    outputs: [
      {
        portId: 'plan',
        label: 'Content plan',
        artifact: outputArtifact,
      },
    ],
    startedAt: events[0]?.startedAt ?? plan.createdAt,
    finishedAt: allDone || plan.status === 'failed' ? plan.updatedAt : undefined,
  };
}
