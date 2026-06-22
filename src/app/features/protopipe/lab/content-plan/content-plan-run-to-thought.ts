import type {
  ProtopipeContentPlanStep,
  ProtopipeContentPlanStepEvent,
  ProtopipeKeywordTier,
  ProtopipeScoredKeyword,
  ProtopipeSiteContentPlan,
} from '@hive/contracts';
import type {
  Thought,
  ThoughtArtifact,
  ThoughtEvent,
  ThoughtStatus,
  ThoughtStep,
  ThoughtStepStatus,
  ThoughtSubStep,
  ThoughtLlmCall,
} from '../thinker/thought.model';
import { sumCosts } from '../thinker/thinker-cost';

/**
 * Adapter: project a SiteContentPlan run onto the generic Thought model so the
 * content-plan pipeline renders in the same Thinker view as article generation.
 */

export const CONTENT_PLAN_LLM_STEPS = new Set<ProtopipeContentPlanStep>([
  'cluster',
  'unify',
  'strategy_intel',
]);

function mapLlmTrace(trace: NonNullable<ProtopipeSiteContentPlan['llmTraces']>[number]): ThoughtLlmCall {
  return {
    id: trace.id,
    label: trace.label,
    callId: trace.callId,
    promptVersion: trace.promptVersion,
    model: trace.model,
    system: trace.system,
    user: trace.user,
    response: trace.response,
    inputTokens: trace.inputTokens,
    outputTokens: trace.outputTokens,
    costUsd: trace.costUsd,
    durationMs: trace.durationMs,
  };
}

function llmCallsForStep(
  plan: ProtopipeSiteContentPlan,
  step: ProtopipeContentPlanStep,
): ThoughtLlmCall[] {
  return (plan.llmTraces ?? [])
    .filter((trace) => trace.pipelineStep === step)
    .map(mapLlmTrace);
}

export const CONTENT_PLAN_STEP_ORDER: ProtopipeContentPlanStep[] = [
  'audit',
  'score_tier',
  'cluster',
  'unify',
  'deep_scan',
  'strategy_intel',
];

/** First five pipeline steps — unchanged in the strategy runner side nav. */
export const CONTENT_PLAN_FOUNDATION_STEPS = [
  'audit',
  'score_tier',
  'cluster',
  'unify',
  'deep_scan',
] as const satisfies readonly ProtopipeContentPlanStep[];

const STEP_META: Record<
  ProtopipeContentPlanStep,
  { label: string; summary: string; description: string }
> = {
  audit: {
    label: 'Site audit',
    summary: 'Scan existing site content for gaps and overlap.',
    description:
      'Crawls your site (sitemap or homepage links) and maps what you already publish. Flags pages that overlap your target keywords and spots gaps where new content can win.',
  },
  score_tier: {
    label: 'Score & tier',
    summary: 'Score keywords and assign immediate / long-term / long-tail tiers.',
    description:
      'Takes each keyword from your strategy and scores its opportunity — search volume weighed against organic ranking difficulty. Keywords are sorted into immediate focus (win now), long-term (build toward), and long-tail (quick wins and expansions).',
  },
  cluster: {
    label: 'Cluster',
    summary: 'Group keywords into thematic clusters with LLM categorization.',
    description:
      'Groups related keywords into content themes. Each cluster gets a pillar phrase and supporting members so articles reinforce each other instead of competing.',
  },
  unify: {
    label: 'Unify plan',
    summary: 'Build pillars, calendar, and narrative from clusters.',
    description:
      'Turns clusters into a concrete plan: content pillars, a prioritized publishing calendar, and a short narrative explaining why this sequence wins.',
  },
  deep_scan: {
    label: 'Deep scan',
    summary: 'Run competition analysis on calendar focus keywords.',
    description:
      'Runs a full competitor analysis on each calendar keyword — who ranks today, what angles they take, and what your articles need to beat them.',
  },
  strategy_intel: {
    label: 'Strategy intel',
    summary: 'Warm shared competitive strategy, journey maps, and thesis seeds.',
    description:
      'Builds shared strategy intelligence from the deep scans: per-keyword competitive angles, cluster-level themes, audience journey maps, and topic backlog seeds for later.',
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

function conductorArtifact(
  plan: ProtopipeSiteContentPlan,
  step: ProtopipeContentPlanStep,
): ThoughtArtifact | null {
  const assessment = plan.conductorAssessments?.find((row) => row.step === step);
  if (!assessment) return null;
  return json(
    `conductor-${step}`,
    'Conductor (shadow)',
    assessment,
    `${assessment.decision}: ${assessment.thought}`,
  );
}

function withConductorOutput(
  step: ProtopipeContentPlanStep,
  plan: ProtopipeSiteContentPlan,
  artifacts: ThoughtArtifact[],
): ThoughtArtifact[] {
  const conductor = conductorArtifact(plan, step);
  return conductor ? [...artifacts, conductor] : artifacts;
}

function stepOutput(step: ProtopipeContentPlanStep, plan: ProtopipeSiteContentPlan): ThoughtArtifact[] {
  switch (step) {
    case 'audit':
      return withConductorOutput(
        step,
        plan,
        plan.existingContent
          ? [
              json(
                'audit',
                'Existing content audit',
                plan.existingContent,
                `${plan.existingContent.scannedCount} page(s) via ${plan.existingContent.source}`,
              ),
            ]
          : [],
      );
    case 'score_tier': {
      const tiers = plan.keywordTiers;
      const total =
        tiers.immediateFocus.length + tiers.longTerm.length + tiers.longTail.length;
      return withConductorOutput(
        step,
        plan,
        total
          ? [
              json(
                'tiers',
                'Keyword tiers',
                tiers,
                `${tiers.immediateFocus.length} immediate · ${tiers.longTerm.length} long-term · ${tiers.longTail.length} long-tail`,
              ),
            ]
          : [],
      );
    }
    case 'cluster':
      return withConductorOutput(
        step,
        plan,
        plan.clusters.length
          ? [
              json(
                'clusters',
                'Keyword clusters',
                plan.clusters,
                `${plan.clusters.length} cluster(s)`,
              ),
            ]
          : [],
      );
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
      return withConductorOutput(step, plan, outputs);
    }
    case 'deep_scan':
      return withConductorOutput(
        step,
        plan,
        plan.focusStrategies.length
          ? [
              json(
                'focus-strategies',
                'Focus keyword strategies',
                plan.focusStrategies,
                `${plan.focusStrategies.length} deep-scan strategy(ies)`,
              ),
            ]
          : [],
      );
    case 'strategy_intel': {
      const outputs: ThoughtArtifact[] = [];
      if (plan.strategyIntel) {
        outputs.push(
          json(
            'strategy-intel',
            'Strategy graph',
            plan.strategyIntel,
            `${plan.strategyIntel.keywordIntel?.length ?? 0} keyword(s) · ${plan.strategyIntel.clusterIntel?.length ?? 0} cluster(s)`,
          ),
        );
      }
      if (plan.backlog?.length) {
        outputs.push(
          json(
            'backlog',
            'Topic backlog (UQ harvest)',
            plan.backlog,
            `${plan.backlog.length} unscheduled candidate(s)`,
          ),
        );
      }
      return withConductorOutput(step, plan, outputs);
    }
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

function tierLabel(tier: ProtopipeKeywordTier): string {
  switch (tier) {
    case 'immediate_focus':
      return 'immediate focus';
    case 'long_term':
      return 'long-term';
    case 'long_tail':
      return 'long-tail';
  }
}

function formatVolume(volume: number | undefined): string | undefined {
  if (volume == null) return undefined;
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}k/mo`;
  return `${volume}/mo`;
}

function flattenScoredKeywords(plan: ProtopipeSiteContentPlan): ProtopipeScoredKeyword[] {
  const { immediateFocus, longTerm, longTail } = plan.keywordTiers;
  return [...immediateFocus, ...longTerm, ...longTail];
}

function keywordInputCount(plan: ProtopipeSiteContentPlan): number {
  const tiered = flattenScoredKeywords(plan);
  if (tiered.length > 0) return tiered.length;
  return plan.keywordStrategySnapshot?.confirmedKeywords?.length ?? 0;
}

function phaseStatus(
  phaseIndex: number,
  phaseCount: number,
  stepStatus: ThoughtStepStatus,
): ThoughtStepStatus {
  if (stepStatus === 'pending') return 'pending';
  if (stepStatus === 'failed') return phaseIndex === phaseCount - 1 ? 'failed' : 'complete';
  if (stepStatus === 'running') {
    if (phaseIndex < phaseCount - 1) return 'complete';
    return 'running';
  }
  return 'complete';
}

const STRATEGY_INTEL_STAGE_LABELS: Record<string, string> = {
  strategy_intel: 'Starting',
  keyword_intel: 'Gap synthesis',
  keyword_uq: 'Unanswered questions',
  cluster_intel: 'Cluster mechanism',
  avatar_intel: 'Avatar journey',
  thesis_seeds: 'Thesis seeds',
};

const STRATEGY_INTEL_NAV_PHASES = [
  {
    id: 'intel:keyword',
    navLabel: 'Keyword intel',
    label: 'Keyword-level competitive intel',
    detail: 'Gap synthesis & unanswered questions per calendar keyword',
    stages: ['strategy_intel', 'keyword_intel', 'keyword_uq'],
  },
  {
    id: 'intel:cluster',
    navLabel: 'Cluster themes',
    label: 'Cluster strategy themes',
    detail: 'One LLM call per cluster theme (~1–3 min each)',
    stages: ['cluster_intel'],
  },
  {
    id: 'intel:journey',
    navLabel: 'Audience journeys',
    label: 'Audience journey maps',
    detail: 'Voice and intent per avatar',
    stages: ['avatar_intel'],
  },
  {
    id: 'intel:thesis',
    navLabel: 'Thesis seeds',
    label: 'Thesis seeds',
    detail: 'Article angle per calendar keyword',
    stages: ['thesis_seeds'],
  },
  {
    id: 'intel:backlog',
    navLabel: 'Topic backlog',
    label: 'Harvest topic backlog',
    detail: 'Unscheduled candidates for later',
    stages: [] as string[],
  },
] as const;

export { STRATEGY_INTEL_NAV_PHASES };

export type StrategyIntelNavStepId = (typeof STRATEGY_INTEL_NAV_PHASES)[number]['id'];

export const STRATEGY_RESULT_STEP_ID = 'strategy_result' as const;

export type StrategyResultStepId = typeof STRATEGY_RESULT_STEP_ID;

/** Side-nav focus while strategy intel runs. */
export function resolveStrategyIntelNavStepId(
  plan: ProtopipeSiteContentPlan,
): StrategyIntelNavStepId {
  if (plan.currentStep === 'strategy_intel') {
    const idx = activeStrategyIntelPhaseIndex(plan.progress?.stage);
    return STRATEGY_INTEL_NAV_PHASES[idx]?.id ?? 'intel:keyword';
  }
  return 'intel:keyword';
}

const STRATEGY_INTEL_PHASES = STRATEGY_INTEL_NAV_PHASES;

function activeStrategyIntelPhaseIndex(stage: string | undefined): number {
  if (
    !stage ||
    stage === 'strategy_intel' ||
    stage === 'keyword_intel' ||
    stage === 'keyword_uq'
  ) {
    return 0;
  }
  if (stage === 'cluster_intel') return 1;
  if (stage === 'avatar_intel') return 2;
  if (stage === 'thesis_seeds') return 3;
  return 4;
}

function strategyIntelProgressDetail(
  progress: ProtopipeSiteContentPlan['progress'],
): string | undefined {
  if (!progress) return undefined;
  const stageLabel = STRATEGY_INTEL_STAGE_LABELS[progress.stage] ?? progress.stage;
  if (progress.total > 0) {
    const current = Math.min(progress.scanned + 1, progress.total);
    return `${stageLabel} · ${current} of ${progress.total}`;
  }
  return stageLabel;
}

function strategyIntelRunningSummary(
  progress: ProtopipeSiteContentPlan['progress'],
): string {
  return strategyIntelProgressDetail(progress) ?? 'Running strategy intel…';
}

/** Live backend progress line for running content-plan builds (Thinker masthead). */
export function formatContentPlanLiveProgress(plan: ProtopipeSiteContentPlan): string | null {
  if (plan.status !== 'running' && plan.status !== 'pending') return null;
  if (plan.currentStep === 'strategy_intel') {
    return strategyIntelRunningSummary(plan.progress);
  }
  const progress = plan.progress;
  if (!progress?.stage) return null;
  if (progress.total > 0) {
    const current = Math.min(progress.scanned + 1, progress.total);
    return `${progress.stage} · ${current} of ${progress.total}`;
  }
  return progress.stage;
}

function formatRelativeUpdatedAt(iso?: string): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  return `${Math.round(ms / 3_600_000)}h ago`;
}

export function formatContentPlanMastheadDeck(
  plan: ProtopipeSiteContentPlan,
  siteLabel: string,
): string {
  const started = plan.createdAt;
  const startLine = started
    ? `Strategy build · ${siteLabel} · started ${new Date(started).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })}`
    : `Strategy build · ${siteLabel}`;

  const live = formatContentPlanLiveProgress(plan);
  const updated = formatRelativeUpdatedAt(plan.updatedAt);
  const parts = [startLine];
  if (live) parts.push(live);
  if (updated && plan.status === 'running') parts.push(`updated ${updated}`);
  return parts.join(' · ');
}

function resolveStrategyIntelSubStep(
  phaseIndex: number,
  plan: ProtopipeSiteContentPlan,
  stepStatus: ThoughtStepStatus,
): ThoughtSubStep {
  const phase = STRATEGY_INTEL_PHASES[phaseIndex];
  const base: ThoughtSubStep = {
    id: phase.id,
    label: phase.label,
    detail: phase.detail,
    status: phaseStatus(phaseIndex, STRATEGY_INTEL_PHASES.length, stepStatus),
  };

  if (stepStatus !== 'running') return base;

  const activeIdx = activeStrategyIntelPhaseIndex(plan.progress?.stage);
  const progressDetail = strategyIntelProgressDetail(plan.progress);

  if (phaseIndex < activeIdx) {
    return { ...base, status: 'complete' };
  }
  if (phaseIndex > activeIdx) {
    return { ...base, status: 'pending' };
  }
  return {
    ...base,
    status: 'running',
    detail: progressDetail ?? phase.detail,
  };
}

function buildStrategyIntelSubSteps(
  plan: ProtopipeSiteContentPlan,
  stepStatus: ThoughtStepStatus,
): ThoughtSubStep[] {
  if (plan.strategyIntel && stepStatus === 'complete') {
    return STRATEGY_INTEL_PHASES.map((phase) => ({
      id: phase.id,
      label: phase.label,
      detail:
        phase.id === 'intel:keyword'
          ? `${plan.strategyIntel!.keywordIntel?.length ?? 0} keyword intel row(s)`
          : phase.id === 'intel:cluster'
            ? `${plan.strategyIntel!.clusterIntel?.length ?? 0} cluster theme(s)`
            : phase.id === 'intel:journey'
              ? `${plan.strategyIntel!.avatarIntel?.length ?? 0} audience journey(s)`
              : phase.id === 'intel:thesis'
                ? `${plan.strategyIntel!.thesisSeeds?.length ?? 0} thesis seed(s)`
                : `${plan.backlog?.length ?? 0} backlog candidate(s)`,
      status: 'complete' as ThoughtStepStatus,
    }));
  }

  return STRATEGY_INTEL_PHASES.map((_, index) =>
    resolveStrategyIntelSubStep(index, plan, stepStatus),
  );
}

function keywordDetail(kw: ProtopipeScoredKeyword): string {
  const parts = [tierLabel(kw.tier), `score ${kw.opportunityScore}`];
  const vol = formatVolume(kw.searchVolume);
  if (vol) parts.push(vol);
  if (kw.difficulty != null) parts.push(`KD ${kw.difficulty}`);
  return parts.join(' · ');
}

function buildContentPlanSubSteps(
  step: ProtopipeContentPlanStep,
  plan: ProtopipeSiteContentPlan,
  evs: ProtopipeContentPlanStepEvent[],
  stepStatus: ThoughtStepStatus,
): ThoughtSubStep[] {
  const keywordCount = keywordInputCount(plan);

  switch (step) {
    case 'audit': {
      const phases: ThoughtSubStep[] = [
        {
          id: 'audit:crawl',
          label: 'Crawl site pages',
          detail: 'Sitemap or homepage link discovery',
          status: phaseStatus(0, 3, stepStatus),
        },
        {
          id: 'audit:match',
          label: 'Match keywords to existing content',
          detail: keywordCount ? `${keywordCount} target phrase(s)` : 'Target phrases from strategy',
          status: phaseStatus(1, 3, stepStatus),
        },
        {
          id: 'audit:gaps',
          label: 'Flag gaps and overlap',
          detail: 'Pages to refresh vs net-new topics',
          status: phaseStatus(2, 3, stepStatus),
        },
      ];
      if (plan.existingContent?.scannedCount) {
        phases[2] = {
          ...phases[2],
          detail: `${plan.existingContent.scannedCount} page(s) scanned · gaps and overlap flagged`,
          status: 'complete',
        };
      }
      return phases;
    }

    case 'score_tier': {
      const hasSnapshot = Boolean(plan.keywordStrategySnapshot?.confirmedKeywords?.length);
      const phases: ThoughtSubStep[] = [
        {
          id: 'score:load',
          label: 'Load saved keywords',
          detail: keywordCount ? `${keywordCount} phrase(s) from your strategy` : 'From site keyword list',
          status: phaseStatus(0, 4, stepStatus),
        },
        {
          id: 'score:metrics',
          label: 'Fetch volume & difficulty',
          detail: hasSnapshot
            ? 'Reuse discovery metrics where still fresh'
            : 'DataForSEO difficulty + Google Ads volume',
          status: phaseStatus(1, 4, stepStatus),
        },
        {
          id: 'score:opportunity',
          label: 'Score opportunity',
          detail: 'Volume × (1 − difficulty) for each phrase',
          status: phaseStatus(2, 4, stepStatus),
        },
        {
          id: 'score:tier',
          label: 'Assign tiers',
          detail: 'Immediate focus · long-term · long-tail',
          status: phaseStatus(3, 4, stepStatus),
        },
      ];

      const scored = flattenScoredKeywords(plan);
      if (scored.length > 0 && (stepStatus === 'complete' || stepStatus === 'failed')) {
        const keywordRows: ThoughtSubStep[] = scored.map((kw) => ({
          id: `score:kw:${kw.phrase}`,
          label: kw.phrase,
          detail: keywordDetail(kw),
          status: 'complete',
        }));
        return [...phases.map((p) => ({ ...p, status: 'complete' as ThoughtStepStatus })), ...keywordRows];
      }

      return phases;
    }

    case 'cluster': {
      const phases: ThoughtSubStep[] = [
        {
          id: 'cluster:group',
          label: 'Group related keywords',
          detail: keywordCount ? `${keywordCount} scored phrase(s)` : 'Scored keywords from prior step',
          status: phaseStatus(0, 2, stepStatus),
        },
        {
          id: 'cluster:label',
          label: 'Name clusters and assign pillars',
          detail: 'LLM categorization with business context',
          status: phaseStatus(1, 2, stepStatus),
        },
      ];
      if (plan.clusters.length > 0 && stepStatus !== 'pending') {
        return [
          ...phases.map((p) => ({ ...p, status: 'complete' as ThoughtStepStatus })),
          ...plan.clusters.map((c) => ({
            id: `cluster:${c.name}`,
            label: c.name,
            detail: `${c.members.length} member(s) · pillar “${c.pillarKeyword}”`,
            status: 'complete' as ThoughtStepStatus,
          })),
        ];
      }
      return phases;
    }

    case 'unify': {
      const phases: ThoughtSubStep[] = [
        {
          id: 'unify:pillars',
          label: 'Define content pillars',
          detail: 'One pillar per cluster theme',
          status: phaseStatus(0, 3, stepStatus),
        },
        {
          id: 'unify:calendar',
          label: 'Build publishing calendar',
          detail: 'Prioritized articles with publish dates',
          status: phaseStatus(1, 3, stepStatus),
        },
        {
          id: 'unify:narrative',
          label: 'Write plan narrative',
          detail: 'Headline and why this sequence wins',
          status: phaseStatus(2, 3, stepStatus),
        },
      ];
      if (stepStatus === 'complete' && plan.calendar.length > 0) {
        return [
          ...phases.map((p) => ({ ...p, status: 'complete' as ThoughtStepStatus })),
          ...plan.calendar.slice(0, 8).map((item, i) => ({
            id: `unify:cal:${i}`,
            label: item.workingTitle,
            detail: `${item.suggestedKeyword} · ${item.priority} priority`,
            status: 'complete' as ThoughtStepStatus,
          })),
          ...(plan.calendar.length > 8
            ? [
                {
                  id: 'unify:cal:more',
                  label: `${plan.calendar.length - 8} more calendar item(s)`,
                  detail: 'See output tab for full calendar',
                  status: 'complete' as ThoughtStepStatus,
                },
              ]
            : []),
        ];
      }
      return phases;
    }

    case 'deep_scan': {
      const scanNotes = evs
        .map((e) => e.note)
        .filter((note): note is string => Boolean(note?.includes('scanning "')));
      if (scanNotes.length > 0) {
        return scanNotes.map((note, i) => {
          const phraseMatch = note.match(/scanning "([^"]+)"/);
          const progressMatch = note.match(/(\d+)\/(\d+)/);
          return {
            id: `deep:${i}:${phraseMatch?.[1] ?? i}`,
            label: phraseMatch?.[1] ?? `Keyword ${i + 1}`,
            detail: progressMatch ? `${progressMatch[1]} of ${progressMatch[2]} calendar keywords` : 'Competitor analysis',
            status: 'complete' as ThoughtStepStatus,
          };
        });
      }

      const calendarCount = plan.calendar.length;
      return [
        {
          id: 'deep:prepare',
          label: 'Prepare calendar keywords',
          detail: calendarCount ? `${calendarCount} focus phrase(s)` : 'From unified calendar',
          status: phaseStatus(0, 2, stepStatus),
        },
        {
          id: 'deep:analyze',
          label: 'Analyze top-ranking competitors',
          detail: 'SERP scan per calendar keyword',
          status: phaseStatus(1, 2, stepStatus),
        },
      ];
    }

    case 'strategy_intel':
      return buildStrategyIntelSubSteps(plan, stepStatus);

    default:
      return [];
  }
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

    const stepCostUsd = sumCosts(evs.map((e) => e.costUsd));

    return {
      id: step,
      label: meta.label,
      description: meta.description,
      summary:
        status === 'running' && step === 'strategy_intel'
          ? strategyIntelRunningSummary(plan.progress)
          : finished?.note ?? meta.summary,
      status,
      costUsd: stepCostUsd,
      startedAt: started?.startedAt,
      finishedAt: finished?.finishedAt,
      durationMs: finished?.durationMs,
      attempt: Math.max(1, evs.filter((e) => e.status === 'started').length),
      output: status === 'complete' || status === 'failed' ? stepOutput(step, plan) : undefined,
      events: mapEvents(evs),
      subSteps: buildContentPlanSubSteps(step, plan, evs, status),
      llmCalls: llmCallsForStep(plan, step),
      error,
    } satisfies ThoughtStep;
  });

  for (let i = 1; i < steps.length; i++) {
    steps[i].input = steps[i - 1].output;
  }

  const currentStepId = (() => {
    if (plan.currentStep === 'strategy_intel') {
      return resolveStrategyIntelNavStepId(plan);
    }
    if (allDone || plan.currentStep === 'done') {
      return STRATEGY_RESULT_STEP_ID;
    }
    if (plan.currentStep) return plan.currentStep;
    return (
      steps.find((s) => s.status === 'running')?.id ??
      steps.filter((s) => s.status === 'complete').at(-1)?.id
    );
  })();

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
    totalCostUsd: plan.costUsd ?? sumCosts(steps.map((s) => s.costUsd)),
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
