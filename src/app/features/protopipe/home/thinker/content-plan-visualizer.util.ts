import type {
  ProtopipeContentPlanStep,
  ProtopipeSiteContentPlan,
} from '@hive/contracts';
import {
  STRATEGY_RESULT_STEP_ID,
  type StrategyIntelNavStepId,
} from '../../lab/content-plan/content-plan-run-to-thought';
import { formatPublishDate, strategyStats } from '../strategy/strategy.helpers';
import type { BinderStepStatus } from './thinker-binder.mapper';
import type { StepVisualizerView, VisualizerBlock } from './article-run-visualizer.util';

export type ContentPlanVisualizerStep =
  | ProtopipeContentPlanStep
  | StrategyIntelNavStepId
  | typeof STRATEGY_RESULT_STEP_ID;

export type StrategyResultTabId =
  | 'plan'
  | 'calendar'
  | 'keyword-intel'
  | 'clusters'
  | 'audience'
  | 'thesis'
  | 'backlog'
  | 'raw';

function avatarLabel(plan: ProtopipeSiteContentPlan, avatarId: string): string {
  const avatar = plan.keywordStrategySnapshot?.confirmedAvatars?.find((a) => a.id === avatarId);
  if (!avatar) return avatarId;
  return avatar.intentCluster || avatar.description?.slice(0, 48) || avatarId;
}

function tierLabel(tier: string): string {
  switch (tier) {
    case 'immediate_focus':
      return 'Immediate focus';
    case 'long_term':
      return 'Long-term';
    case 'long_tail':
      return 'Long-tail';
    default:
      return tier.replace(/_/g, ' ');
  }
}

function pendingView(title: string): StepVisualizerView {
  return {
    title,
    emptyMessage: 'This step has not run yet. Output will appear here as the build progresses.',
    blocks: [],
  };
}

function buildKeywordIntelDetailBlocks(plan: ProtopipeSiteContentPlan): VisualizerBlock[] {
  const intel = plan.strategyIntel?.keywordIntel ?? [];
  const blocks: VisualizerBlock[] = [];

  if (plan.progress?.stage && plan.currentStep === 'strategy_intel') {
    blocks.push({
      kind: 'notice',
      text: `Live progress: ${plan.progress.stage}${plan.progress.total ? ` · ${plan.progress.scanned + 1} of ${plan.progress.total}` : ''}`,
    });
  }

  for (const kw of intel) {
    const gapItems = (kw.gapClusters ?? []).flatMap((gap) => [
      `${gap.theme}: ${(gap.gaps ?? []).join(' · ') || 'gap identified'}`,
      ...(gap.competitorBlindSpots ?? []).map((spot) => `Blind spot: ${spot}`),
    ]);
    blocks.push({
      kind: 'context-panel',
      tone: 'strategy',
      label: kw.phrase,
      text: kw.highestLeverageQuestion
        ? `Highest-leverage question: ${kw.highestLeverageQuestion}`
        : undefined,
      items: [
        ...gapItems,
        ...((kw.unansweredQuestions?.length ?? 0)
          ? ['Unanswered questions:', ...(kw.unansweredQuestions ?? [])]
          : []),
      ],
    });
  }

  return blocks;
}

function buildClustersDetailBlocks(plan: ProtopipeSiteContentPlan): VisualizerBlock[] {
  const intel = plan.strategyIntel?.clusterIntel ?? [];
  const blocks: VisualizerBlock[] = [];

  for (const cluster of intel) {
    const items: string[] = [];
    if (cluster.zeitgeistFrame) items.push(`SERP angle: ${cluster.zeitgeistFrame}`);
    if (cluster.transferredFrame) items.push(`Transferred frame: ${cluster.transferredFrame}`);
    if (cluster.adjacentDomains?.length) {
      items.push(
        ...cluster.adjacentDomains.slice(0, 2).map((d) => `${d.domain}: ${d.pattern}`),
      );
    }

    blocks.push({
      kind: 'context-panel',
      tone: 'strategy',
      label: cluster.clusterName,
      text: cluster.novelMechanism ?? undefined,
      items: items.length ? items : undefined,
    });
  }

  return blocks;
}

function buildAudienceDetailBlocks(plan: ProtopipeSiteContentPlan): VisualizerBlock[] {
  const intel = plan.strategyIntel?.avatarIntel ?? [];
  const blocks: VisualizerBlock[] = [];

  for (const avatar of intel) {
    const stageLines = (avatar.journeyStages ?? []).map(
      (stage) =>
        `${stage.stageName} (${stage.emotionalState}): ${stage.keyQuestion} → serves ${(stage.contentThatServes ?? []).join(', ')}`,
    );
    blocks.push({
      kind: 'context-panel',
      tone: 'neutral',
      label: avatarLabel(plan, avatar.avatarId),
      text: avatar.emotionalArc,
      items: [
        ...(avatar.voiceTheyRespondTo ? [`Voice: ${avatar.voiceTheyRespondTo}`] : []),
        ...stageLines,
      ],
    });
  }

  return blocks;
}

function buildThesisDetailBlocks(plan: ProtopipeSiteContentPlan): VisualizerBlock[] {
  const seeds = plan.strategyIntel?.thesisSeeds ?? [];
  const blocks: VisualizerBlock[] = [];

  for (const seed of seeds) {
    blocks.push({
      kind: 'article-section',
      text: seed.workingTitle,
      value: seed.thesisSeed,
      hint: seed.phrase,
      items: [
        ...(seed.coreCompetitorError
          ? [`Competitor blind spot: ${seed.coreCompetitorError}`]
          : []),
        ...(seed.mechanismApplication
          ? [`Mechanism: ${seed.mechanismApplication}`]
          : []),
        ...(seed.keyValidationQuestion
          ? [`Validation: ${seed.keyValidationQuestion}`]
          : []),
      ],
    });
  }

  return blocks;
}

function buildBacklogDetailBlocks(plan: ProtopipeSiteContentPlan): VisualizerBlock[] {
  const backlog = plan.backlog ?? [];
  const blocks: VisualizerBlock[] = [];

  for (const item of backlog) {
    blocks.push({
      kind: 'article-section',
      text: item.workingTitle,
      value: item.suggestedKeyword,
      hint: [item.intent, item.priority].filter(Boolean).join(' · '),
      items: item.rationale ? [item.rationale] : undefined,
    });
  }

  return blocks;
}

function buildPlanTabBlocks(plan: ProtopipeSiteContentPlan): VisualizerBlock[] {
  const blocks: VisualizerBlock[] = [];
  const stats = strategyStats(plan);

  if (plan.narrative) {
    blocks.push({ kind: 'heading', level: 2, text: plan.narrative.headline });
    blocks.push({ kind: 'paragraph', text: plan.narrative.why });
  }

  blocks.push({
    kind: 'meta-row',
    label: 'Plan version',
    value: `v${plan.version}`,
  });
  blocks.push({
    kind: 'meta-row',
    label: 'Keywords scored',
    value: `${stats.keywordCount}`,
    hint: `${stats.immediateCount} immediate · ${stats.longTermCount} long-term · ${stats.longTailCount} long-tail`,
  });
  blocks.push({
    kind: 'meta-row',
    label: 'Clusters',
    value: `${stats.clusterCount}`,
  });

  if (plan.pillars.length) {
    blocks.push({ kind: 'heading', level: 3, text: 'Content pillars' });
    for (const pillar of plan.pillars) {
      blocks.push({
        kind: 'article-section',
        text: pillar.clusterName,
        value: pillar.pillarKeyword,
        hint: pillar.angle,
        items: [`${pillar.supportingCount} supporting article(s)`],
      });
    }
  }

  if (plan.focusStrategies.length) {
    blocks.push({ kind: 'heading', level: 3, text: 'Deep-scan positioning' });
    for (const focus of plan.focusStrategies.slice(0, 6)) {
      blocks.push({
        kind: 'context-panel',
        tone: 'strategy',
        label: focus.keyword.phrase,
        text: focus.positioningSummary,
        items: [
          `${focus.scannedCount} competitor page(s) scanned`,
          ...(focus.topicGaps?.length ? [`${focus.topicGaps.length} topic gap(s)`] : []),
        ],
      });
    }
    if (plan.focusStrategies.length > 6) {
      blocks.push({
        kind: 'notice',
        text: `${plan.focusStrategies.length - 6} more deep-scan keyword(s) — see output tab for full JSON.`,
      });
    }
  }

  return blocks;
}

function buildCalendarTabBlocks(plan: ProtopipeSiteContentPlan): VisualizerBlock[] {
  const blocks: VisualizerBlock[] = [];
  const scheduled = plan.calendar.filter((item) => item.proposedPublishAt);
  const backlogCount = plan.backlog?.length ?? 0;

  blocks.push({
    kind: 'meta-row',
    label: 'Scheduled articles',
    value: `${scheduled.length}`,
    hint: backlogCount ? `${backlogCount} backlog candidate(s) in Backlog tab` : undefined,
  });

  for (const item of plan.calendar.slice(0, 12)) {
    blocks.push({
      kind: 'article-section',
      text: item.workingTitle,
      value: item.suggestedKeyword,
      hint: [formatPublishDate(item.proposedPublishAt), item.priority, item.clusterName]
        .filter(Boolean)
        .join(' · '),
      items: item.rationale ? [item.rationale] : undefined,
    });
  }

  if (plan.calendar.length > 12) {
    blocks.push({
      kind: 'notice',
      text: `${plan.calendar.length - 12} more calendar item(s) — see output tab for the full list.`,
    });
  }

  return blocks;
}

function buildKeywordIntelTabBlocks(plan: ProtopipeSiteContentPlan): VisualizerBlock[] {
  const intel = plan.strategyIntel?.keywordIntel ?? [];
  const blocks: VisualizerBlock[] = [];

  for (const kw of intel) {
    const gapLines = (kw.gapClusters ?? []).slice(0, 3).map((gap) => {
      const gaps = (gap.gaps ?? []).slice(0, 2).join(' · ');
      return gaps ? `${gap.theme}: ${gaps}` : gap.theme;
    });
    blocks.push({
      kind: 'context-panel',
      tone: 'strategy',
      label: kw.phrase,
      text: kw.highestLeverageQuestion
        ? `Key question: ${kw.highestLeverageQuestion}`
        : undefined,
      items: [
        ...gapLines,
        ...((kw.unansweredQuestions?.length ?? 0)
          ? [`${kw.unansweredQuestions!.length} unanswered question(s) harvested`]
          : []),
      ],
    });
  }

  return blocks;
}

function buildClustersTabBlocks(plan: ProtopipeSiteContentPlan): VisualizerBlock[] {
  return buildClustersDetailBlocks(plan);
}

function buildAudienceTabBlocks(plan: ProtopipeSiteContentPlan): VisualizerBlock[] {
  const intel = plan.strategyIntel?.avatarIntel ?? [];
  const blocks: VisualizerBlock[] = [];

  for (const avatar of intel) {
    const stageLines = (avatar.journeyStages ?? []).slice(0, 5).map(
      (stage) => `${stage.stageName}: ${stage.keyQuestion}`,
    );
    blocks.push({
      kind: 'context-panel',
      tone: 'neutral',
      label: avatarLabel(plan, avatar.avatarId),
      text: avatar.emotionalArc,
      items: [
        ...(avatar.voiceTheyRespondTo ? [`Voice: ${avatar.voiceTheyRespondTo}`] : []),
        ...stageLines,
      ],
    });
  }

  return blocks;
}

function buildThesisTabBlocks(plan: ProtopipeSiteContentPlan): VisualizerBlock[] {
  const seeds = plan.strategyIntel?.thesisSeeds ?? [];
  const blocks: VisualizerBlock[] = [];

  for (const seed of seeds.slice(0, 10)) {
    blocks.push({
      kind: 'article-section',
      text: seed.workingTitle,
      value: seed.thesisSeed,
      hint: seed.phrase,
      items: [
        ...(seed.coreCompetitorError
          ? [`Competitor blind spot: ${seed.coreCompetitorError}`]
          : []),
        ...(seed.mechanismApplication
          ? [`Mechanism: ${seed.mechanismApplication}`]
          : []),
        ...(seed.keyValidationQuestion
          ? [`Validation: ${seed.keyValidationQuestion}`]
          : []),
      ],
    });
  }

  if (seeds.length > 10) {
    blocks.push({
      kind: 'notice',
      text: `${seeds.length - 10} more thesis seed(s) — see output tab for full JSON.`,
    });
  }

  return blocks;
}

function buildBacklogTabBlocks(plan: ProtopipeSiteContentPlan): VisualizerBlock[] {
  const backlog = plan.backlog ?? [];
  const blocks: VisualizerBlock[] = [];

  for (const item of backlog.slice(0, 12)) {
    blocks.push({
      kind: 'article-section',
      text: item.workingTitle,
      value: item.suggestedKeyword,
      hint: [item.intent, item.priority].filter(Boolean).join(' · '),
      items: item.rationale ? [item.rationale] : undefined,
    });
  }

  if (backlog.length > 12) {
    blocks.push({
      kind: 'notice',
      text: `${backlog.length - 12} more backlog candidate(s) — see output tab for full JSON.`,
    });
  }

  return blocks;
}

function pickDefaultStrategyTab(plan: ProtopipeSiteContentPlan): StrategyResultTabId {
  if (plan.narrative || plan.pillars.length || plan.focusStrategies.length) return 'plan';
  if (plan.calendar.length) return 'calendar';
  const intel = plan.strategyIntel;
  if (intel?.thesisSeeds?.length) return 'thesis';
  if (intel?.keywordIntel?.length) return 'keyword-intel';
  if (intel?.clusterIntel?.length) return 'clusters';
  if (intel?.avatarIntel?.length) return 'audience';
  if (plan.backlog?.length) return 'backlog';
  return 'plan';
}

function buildRawResultTabBlocks(plan: ProtopipeSiteContentPlan): VisualizerBlock[] {
  const payload = {
    narrative: plan.narrative ?? null,
    pillars: plan.pillars,
    calendar: plan.calendar,
    backlog: plan.backlog ?? [],
    focusStrategies: plan.focusStrategies,
    strategyIntel: plan.strategyIntel ?? null,
    keywordTiers: plan.keywordTiers,
    clusters: plan.clusters,
    existingContent: plan.existingContent ?? null,
  };
  let code: string;
  try {
    code = JSON.stringify(payload, null, 2);
  } catch {
    code = '{}';
  }
  return [
    {
      kind: 'code',
      label: 'Full strategy output',
      code,
    },
  ];
}

/** Bottom-of-runner strategy result — one tab per warmed aspect of the build. */
export function buildStrategyRunResultView(
  plan: ProtopipeSiteContentPlan,
): StepVisualizerView {
  const stats = strategyStats(plan);
  const intel = plan.strategyIntel;

  const tabs = [
    {
      id: 'plan' as const,
      label: 'Plan',
      emptyMessage: 'Plan narrative and pillars appear after the Unify step.',
      blocks: buildPlanTabBlocks(plan),
    },
    {
      id: 'calendar' as const,
      label: 'Calendar',
      emptyMessage: 'Publishing calendar appears after the Unify step.',
      blocks: buildCalendarTabBlocks(plan),
    },
    {
      id: 'keyword-intel' as const,
      label: 'Keyword intel',
      emptyMessage:
        'Per-keyword gap synthesis and unanswered questions appear during Strategy intel.',
      blocks: buildKeywordIntelTabBlocks(plan),
    },
    {
      id: 'clusters' as const,
      label: 'Clusters',
      emptyMessage: 'Cluster mechanisms and SERP angles appear during Strategy intel.',
      blocks: buildClustersTabBlocks(plan),
    },
    {
      id: 'audience' as const,
      label: 'Audience',
      emptyMessage: 'Audience journey maps appear during Strategy intel.',
      blocks: buildAudienceTabBlocks(plan),
    },
    {
      id: 'thesis' as const,
      label: 'Thesis',
      emptyMessage: 'Thesis seeds appear during Strategy intel.',
      blocks: buildThesisTabBlocks(plan),
    },
    {
      id: 'backlog' as const,
      label: 'Backlog',
      emptyMessage: 'Harvested topic backlog appears at the end of Strategy intel.',
      blocks: buildBacklogTabBlocks(plan),
    },
    {
      id: 'raw' as const,
      label: 'Raw',
      emptyMessage: 'Raw strategy JSON appears when the plan has output.',
      blocks: buildRawResultTabBlocks(plan),
    },
  ];

  const headline = plan.narrative?.headline ?? `Content plan v${plan.version}`;
  const subtitleParts = [
    `${stats.calendarCount} scheduled`,
    intel?.keywordIntel?.length ? `${intel.keywordIntel.length} keyword intel` : null,
    intel?.thesisSeeds?.length ? `${intel.thesisSeeds.length} thesis seed(s)` : null,
  ].filter(Boolean);

  return {
    title: 'Strategy Result',
    subtitle: subtitleParts.length ? subtitleParts.join(' · ') : headline,
    blocks: [{ kind: 'kicker', text: headline }],
    tabs,
    defaultTabId: pickDefaultStrategyTab(plan),
  };
}

const STRATEGY_INTEL_VISUAL_META: Record<
  StrategyIntelNavStepId,
  { title: string; emptyMessage: string; build: (plan: ProtopipeSiteContentPlan) => VisualizerBlock[] }
> = {
  'intel:keyword': {
    title: 'Keyword intel',
    emptyMessage: 'Gap synthesis and unanswered questions appear here as each calendar keyword is processed.',
    build: buildKeywordIntelDetailBlocks,
  },
  'intel:cluster': {
    title: 'Cluster themes',
    emptyMessage: 'Cluster mechanisms and SERP angles appear after keyword intel completes.',
    build: buildClustersDetailBlocks,
  },
  'intel:journey': {
    title: 'Audience journeys',
    emptyMessage: 'Avatar journey maps appear after cluster themes are warmed.',
    build: buildAudienceDetailBlocks,
  },
  'intel:thesis': {
    title: 'Thesis seeds',
    emptyMessage: 'Article thesis seeds are generated after audience journeys.',
    build: buildThesisDetailBlocks,
  },
  'intel:backlog': {
    title: 'Topic backlog',
    emptyMessage: 'Harvested backlog candidates appear at the end of strategy intel.',
    build: buildBacklogDetailBlocks,
  },
};

function buildStrategyIntelPhaseVisualizer(
  plan: ProtopipeSiteContentPlan,
  phase: StrategyIntelNavStepId,
  stepStatus: BinderStepStatus,
): StepVisualizerView {
  const meta = STRATEGY_INTEL_VISUAL_META[phase];
  const blocks = meta.build(plan);
  if (stepStatus === 'pending' && blocks.length === 0) {
    return pendingView(meta.title);
  }

  return {
    title: meta.title,
    subtitle: blocks.length ? `${blocks.length} item(s)` : undefined,
    emptyMessage: blocks.length ? undefined : meta.emptyMessage,
    blocks,
  };
}

export function buildContentPlanStepVisualizer(
  plan: ProtopipeSiteContentPlan,
  step: ContentPlanVisualizerStep,
  stepStatus: BinderStepStatus,
): StepVisualizerView {
  if (step === STRATEGY_RESULT_STEP_ID) {
    return buildStrategyRunResultView(plan);
  }

  if (step.startsWith('intel:')) {
    return buildStrategyIntelPhaseVisualizer(
      plan,
      step as StrategyIntelNavStepId,
      stepStatus,
    );
  }

  if (stepStatus === 'pending') {
    return pendingView('Waiting for this step');
  }

  switch (step) {
    case 'audit': {
      const audit = plan.existingContent;
      if (!audit) {
        return {
          title: 'Site audit',
          emptyMessage: 'Audit results will appear once pages are scanned.',
          blocks: [],
        };
      }
      const blocks: VisualizerBlock[] = [
        {
          kind: 'meta-row',
          label: 'Pages scanned',
          value: `${audit.scannedCount}`,
          hint: `Source: ${audit.source.replace(/_/g, ' ')}`,
        },
        {
          kind: 'meta-row',
          label: 'Already ranking',
          value: `${audit.alreadyRanking.length}`,
        },
        {
          kind: 'meta-row',
          label: 'Refresh candidates',
          value: `${audit.refreshCandidates.length}`,
        },
      ];
      if (audit.note) blocks.push({ kind: 'notice', text: audit.note });
      if (audit.alreadyRanking.length) {
        blocks.push({
          kind: 'chips',
          items: audit.alreadyRanking.slice(0, 8).map((row) => `#${row.position} ${row.phrase}`),
        });
      }
      return { title: 'Site audit', subtitle: audit.hostname, blocks };
    }

    case 'score_tier': {
      const tiers = plan.keywordTiers;
      const all = [...tiers.immediateFocus, ...tiers.longTerm, ...tiers.longTail];
      if (!all.length) {
        return {
          title: 'Score & tier',
          emptyMessage: 'Scored keywords will appear here.',
          blocks: [],
        };
      }
      const blocks: VisualizerBlock[] = [
        {
          kind: 'meta-row',
          label: 'Immediate focus',
          value: `${tiers.immediateFocus.length}`,
        },
        {
          kind: 'meta-row',
          label: 'Long-term',
          value: `${tiers.longTerm.length}`,
        },
        {
          kind: 'meta-row',
          label: 'Long-tail',
          value: `${tiers.longTail.length}`,
        },
      ];
      for (const kw of all.slice(0, 10)) {
        blocks.push({
          kind: 'meta-row',
          label: kw.phrase,
          value: `Score ${kw.opportunityScore}`,
          hint: tierLabel(kw.tier),
        });
      }
      return { title: 'Score & tier', subtitle: `${all.length} keyword(s)`, blocks };
    }

    case 'cluster': {
      if (!plan.clusters.length) {
        return {
          title: 'Keyword clusters',
          emptyMessage: 'Clusters will appear after grouping.',
          blocks: [],
        };
      }
      return {
        title: 'Keyword clusters',
        subtitle: `${plan.clusters.length} cluster(s)`,
        blocks: plan.clusters.map((cluster) => ({
          kind: 'article-section' as const,
          text: cluster.name,
          value: cluster.pillarKeyword,
          hint: cluster.audienceLabel,
          items: (cluster.members ?? []).slice(0, 6).map((m) => m.phrase),
        })),
      };
    }

    case 'unify': {
      const blocks: VisualizerBlock[] = [];
      if (plan.narrative) {
        blocks.push({ kind: 'heading', level: 2, text: plan.narrative.headline });
        blocks.push({ kind: 'paragraph', text: plan.narrative.why });
      }
      if (plan.pillars.length) {
        blocks.push({ kind: 'heading', level: 3, text: 'Content pillars' });
        for (const pillar of plan.pillars) {
          blocks.push({
            kind: 'article-section',
            text: pillar.clusterName,
            value: pillar.pillarKeyword,
            hint: pillar.angle,
            items: [`${pillar.supportingCount} supporting article(s)`],
          });
        }
      }
      if (plan.calendar.length) {
        blocks.push({ kind: 'heading', level: 3, text: 'Calendar preview' });
        for (const item of plan.calendar.slice(0, 6)) {
          blocks.push({
            kind: 'article-section',
            text: item.workingTitle,
            value: item.suggestedKeyword,
            hint: [formatPublishDate(item.proposedPublishAt), item.priority]
              .filter(Boolean)
              .join(' · '),
          });
        }
        if (plan.calendar.length > 6) {
          blocks.push({
            kind: 'notice',
            text: `${plan.calendar.length - 6} more item(s) — see output tab for the full calendar.`,
          });
        }
      }
      if (!blocks.length) {
        return {
          title: 'Unify plan',
          emptyMessage: 'Pillars, calendar, and narrative will appear here.',
          blocks: [],
        };
      }
      return {
        title: 'Unify plan',
        subtitle: `${plan.pillars.length} pillar(s) · ${plan.calendar.length} calendar item(s)`,
        blocks,
      };
    }

    case 'deep_scan': {
      if (!plan.focusStrategies.length) {
        return {
          title: 'Deep scan',
          emptyMessage: 'Competitor strategies will appear as each calendar keyword is scanned.',
          blocks: [],
        };
      }
      return {
        title: 'Deep scan',
        subtitle: `${plan.focusStrategies.length} focus keyword(s)`,
        blocks: plan.focusStrategies.map((focus) => ({
          kind: 'context-panel' as const,
          tone: 'strategy' as const,
          label: focus.keyword.phrase,
          text: focus.positioningSummary,
          items: [
            `${focus.scannedCount} page(s) scanned`,
            ...(focus.recommendedPillarAngle ? [focus.recommendedPillarAngle] : []),
          ],
        })),
      };
    }

    default: {
      const stepLabel = String(step).replace(/_/g, ' ');
      return {
        title: stepLabel,
        emptyMessage: 'Use the output tab for raw artifacts.',
        blocks: [],
      };
    }
  }
}
