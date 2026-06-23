import type {
  Thought,
  ThoughtArtifact,
  ThoughtEvent,
  ThoughtStep,
  ThoughtStepStatus,
} from '../thinker/thought.model';
import { sumCosts } from '../thinker/thinker-cost';
import type {
  ProspectorRunDto,
  ProspectorStep,
  ProspectorStepEvent,
} from '../../prospector/prospector-run.model';

export const PROSPECTOR_RESULT_STEP_ID = 'prospector_result' as const;
export type ProspectorResultStepId = typeof PROSPECTOR_RESULT_STEP_ID;

export const PROSPECTOR_STEP_ORDER: ProspectorStep[] = ['places_search', 'score_leads', 'check_ads'];

const STEP_META: Record<ProspectorStep, { label: string; summary: string }> = {
  places_search: {
    label: 'Places Search',
    summary: 'Search Google Places for businesses matching the category and location.',
  },
  score_leads: {
    label: 'Score Leads',
    summary: 'Score each business by review gap, website presence, and Google rank.',
  },
  check_ads: {
    label: 'Check Paid Ads',
    summary: 'Run a DataForSEO SERP for the category keyword and detect which businesses are running Google Ads.',
  },
};

function mapEvents(events: ProspectorStepEvent[]): ThoughtEvent[] {
  return events.map((e) => ({
    at: e.finishedAt ?? e.startedAt,
    level: e.status === 'failed' ? ('error' as const) : ('info' as const),
    message: [e.status, e.note, e.error].filter(Boolean).join(' — '),
    data: e.costUsd != null ? { costUsd: e.costUsd } : undefined,
  }));
}

function stepOutput(step: ProspectorStep, run: ProspectorRunDto): ThoughtArtifact[] {
  const a = run.artifacts;
  switch (step) {
    case 'places_search':
      return a.placesSearch?.length
        ? [
            {
              id: 'places',
              label: 'Business candidates',
              kind: 'metric',
              summary: `${a.placesSearch.length} result(s) from Google Places`,
              data: { value: a.placesSearch.length, unit: 'businesses' },
            },
          ]
        : [];
    case 'score_leads': {
      if (!a.scoredLeads?.length) return [];
      const critical = a.scoredLeads.filter((l) => l.priority === 'critical').length;
      const high = a.scoredLeads.filter((l) => l.priority === 'high').length;
      return [
        {
          id: 'scored',
          label: 'Scored leads',
          kind: 'metric',
          summary: `${a.scoredLeads.length} scored · ${critical} critical · ${high} high`,
          data: { value: a.scoredLeads.length, unit: 'leads', delta: `${critical} critical` },
        },
      ];
    }
    case 'check_ads': {
      if (!a.serpResult) return [];
      const spending = a.scoredLeads?.filter((l) => l.runsAds).length ?? 0;
      const gap = (a.scoredLeads?.length ?? 0) - spending;
      return [
        {
          id: 'ads',
          label: 'Ads detected',
          kind: 'metric',
          summary: a.serpResult.totalAdsCount === 0
            ? `No ads for "${a.serpResult.query}"`
            : `${a.serpResult.totalAdsCount} ads · ${spending} lead${spending === 1 ? '' : 's'} spending · ${gap} in the gap`,
          data: { value: a.serpResult.totalAdsCount, unit: 'ads' },
        },
      ];
    }
    default:
      return [];
  }
}

export function prospectorRunToThought(run: ProspectorRunDto): Thought {
  const eventsByStep = new Map<ProspectorStep, ProspectorStepEvent[]>();
  for (const e of run.events) {
    const list = eventsByStep.get(e.step) ?? [];
    list.push(e);
    eventsByStep.set(e.step, list);
  }

  const currentIdx = PROSPECTOR_STEP_ORDER.indexOf(run.currentStep as ProspectorStep);
  const allDone = run.status === 'complete' || run.currentStep === 'done';

  const steps: ThoughtStep[] = PROSPECTOR_STEP_ORDER.map((step, idx) => {
    const evs = eventsByStep.get(step) ?? [];
    const started = evs.find((e) => e.status === 'started');
    const finished = [...evs].reverse().find((e) => e.status === 'completed' || e.status === 'failed');

    let status: ThoughtStepStatus;
    if (run.error?.step === step) {
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
      status = run.status === 'running' ? 'running' : 'pending';
    } else {
      status = 'pending';
    }

    const meta = STEP_META[step];
    const stepCostUsd = sumCosts(evs.map((e) => e.costUsd));

    return {
      id: step,
      label: meta.label,
      summary: meta.summary,
      status,
      costUsd: stepCostUsd,
      startedAt: started?.startedAt,
      finishedAt: finished?.finishedAt,
      durationMs: finished?.durationMs,
      attempt: Math.max(1, evs.filter((e) => e.status === 'started').length),
      output: status === 'complete' || status === 'failed' ? stepOutput(step, run) : undefined,
      events: mapEvents(evs),
      error: run.error?.step === step ? { message: run.error.message } : undefined,
    } satisfies ThoughtStep;
  });

  for (let i = 1; i < steps.length; i++) {
    steps[i].input = steps[i - 1].output;
  }

  const currentStepId = allDone
    ? PROSPECTOR_RESULT_STEP_ID
    : run.status === 'failed'
      ? (run.error?.step ?? run.currentStep)
      : (run.currentStep as string);

  const leads = run.artifacts.scoredLeads?.length ?? 0;

  return {
    id: run.id,
    thinkerKind: 'prospector',
    title: `${run.input.category} · ${run.input.location}`,
    summary: leads > 0 ? `${leads} lead(s) scored` : `Searching ${run.input.location}…`,
    totalCostUsd: sumCosts(steps.map((s) => s.costUsd)),
    status:
      run.status === 'complete'
        ? 'complete'
        : run.status === 'failed'
          ? 'failed'
          : run.status === 'running'
            ? 'running'
            : 'pending',
    currentStepId,
    steps,
    inputs: [],
    outputs: [],
    startedAt: run.createdAt,
    finishedAt: allDone || run.status === 'failed' ? run.updatedAt : undefined,
  } satisfies Thought;
}

export function formatProspectorMastheadDeck(run: ProspectorRunDto): string {
  const leads = run.artifacts.scoredLeads?.length ?? 0;
  const critical = run.artifacts.scoredLeads?.filter((l) => l.priority === 'critical').length ?? 0;
  const started = run.createdAt
    ? new Date(run.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null;
  const base = `Prospector · ${run.input.category} · ${run.input.location}`;
  const time = started ? ` · started ${started}` : '';

  if (run.status === 'complete') {
    return `${base} · ${leads} lead(s)${critical > 0 ? ` · ${critical} critical` : ''}`;
  }
  return `${base}${time}`;
}
