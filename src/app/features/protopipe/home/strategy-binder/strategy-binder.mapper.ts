import type {
  ProtopipeContentPlanCalendarItem,
  ProtopipeScoredKeyword,
  ProtopipeSiteContentPlan,
} from '@hive/contracts';
import {
  calendarDateRange,
  calendarDisplayTitle,
  calendarItemKey,
  compareCalendarPublishAt,
  formatPublishDate,
  planBacklogItems,
  scoredKeywordForPhrase,
  strategyStats,
} from '../strategy/strategy.helpers';

export interface StrategyBinderStats {
  pillars: number;
  scheduled: number;
  backlog: number;
  keywords: number;
  existingWins: number;
}

export interface StrategyBinderNarrative {
  headline: string;
  why: string;
}

export interface StrategyBinderPillar {
  id: string;
  name: string;
  keyword: string;
  angle: string;
  intent: string;
  supportingCount: number;
  articles: string[];
}

export interface StrategyBinderCalendarItem {
  key: string;
  source: ProtopipeContentPlanCalendarItem;
  title: string;
  keyword: string;
  type: 'pillar' | 'supporting';
  cluster: string;
  intent: string;
  publishAt: string;
  priority: 'high' | 'medium' | 'low';
  funnelStage: 'awareness' | 'consideration' | 'decision';
}

export interface StrategyBinderBacklogItem {
  key: string;
  source: ProtopipeContentPlanCalendarItem;
  title: string;
  keyword: string;
  cluster: string;
  volume: number;
  difficulty: number;
}

export interface StrategyBinderKeyword {
  phrase: string;
  volume: number;
  difficulty: number;
  tier: 'immediate' | 'long-term' | 'long-tail';
  intent: string;
  gap: boolean;
}

export interface StrategyBinderWin {
  phrase: string;
  position: number;
}

export interface StrategyBinderViewModel {
  stats: StrategyBinderStats;
  narrative: StrategyBinderNarrative;
  mastheadDeck: string;
  pillars: StrategyBinderPillar[];
  calendar: StrategyBinderCalendarItem[];
  calendarDeck: string;
  backlog: StrategyBinderBacklogItem[];
  keywords: StrategyBinderKeyword[];
  existingWins: StrategyBinderWin[];
}

function mapPriority(priority: string | undefined): 'high' | 'medium' | 'low' {
  if (priority === 'high') return 'high';
  if (priority === 'low') return 'low';
  return 'medium';
}

function mapFunnelStage(
  stage: string | undefined,
): 'awareness' | 'consideration' | 'decision' {
  if (stage === 'consideration' || stage === 'decision') return stage;
  return 'awareness';
}

function mapIntent(intent: string | undefined): string {
  if (!intent) return '—';
  return intent.charAt(0).toUpperCase() + intent.slice(1);
}

function keywordDifficulty(kw: ProtopipeScoredKeyword): number {
  return kw.difficulty ?? kw.opportunityScore ?? 0;
}

function keywordVolume(kw: ProtopipeScoredKeyword): number {
  return kw.searchVolume ?? 0;
}

function mapKeywordRow(
  kw: ProtopipeScoredKeyword,
  tier: StrategyBinderKeyword['tier'],
): StrategyBinderKeyword {
  return {
    phrase: kw.phrase,
    volume: keywordVolume(kw),
    difficulty: keywordDifficulty(kw),
    tier,
    intent: mapIntent(kw.intent),
    gap: Boolean(kw.isGap),
  };
}

function mapCalendarItem(
  plan: ProtopipeSiteContentPlan,
  item: ProtopipeContentPlanCalendarItem,
): StrategyBinderCalendarItem {
  return {
    key: calendarItemKey(item),
    source: item,
    title: calendarDisplayTitle(item),
    keyword: item.suggestedKeyword,
    type: item.clusterRole,
    cluster: item.clusterName ?? 'Unassigned',
    intent: mapIntent(item.intent),
    publishAt: formatPublishDate(item.proposedPublishAt),
    priority: mapPriority(item.priority),
    funnelStage: mapFunnelStage(item.funnelStage),
  };
}


export function mapStrategyBinderView(
  plan: ProtopipeSiteContentPlan,
  siteLabel: string,
  strategySummary: string,
): StrategyBinderViewModel {
  const statsRaw = strategyStats(plan);
  const tiers = plan.keywordTiers;

  const pillars: StrategyBinderPillar[] = plan.pillars.map((pillar) => {
    const clusterItems = plan.calendar
      .filter((item) => item.clusterName === pillar.clusterName)
      .sort(compareCalendarPublishAt);
    const cluster = plan.clusters.find((c) => c.name === pillar.clusterName);
    return {
      id: pillar.clusterName,
      name: pillar.clusterName,
      keyword: pillar.pillarKeyword,
      angle: pillar.angle ?? cluster?.subtopic ?? cluster?.audienceLabel ?? '—',
      intent: cluster?.audienceLabel ?? mapIntent(clusterItems[0]?.intent),
      supportingCount: pillar.supportingCount,
      articles: clusterItems.map((item) => calendarDisplayTitle(item)),
    };
  });

  const calendar = [...plan.calendar]
    .sort(compareCalendarPublishAt)
    .map((item) => mapCalendarItem(plan, item));

  const backlog = planBacklogItems(plan).map((item) => {
    const kw = scoredKeywordForPhrase(plan, item.suggestedKeyword);
    return {
      key: calendarItemKey(item),
      source: item,
      title: calendarDisplayTitle(item),
      keyword: item.suggestedKeyword,
      cluster: item.clusterName ?? 'Unassigned',
      volume: kw ? keywordVolume(kw) : 0,
      difficulty: kw ? keywordDifficulty(kw) : 0,
    };
  });

  const keywords: StrategyBinderKeyword[] = [
    ...tiers.immediateFocus.map((kw) => mapKeywordRow(kw, 'immediate')),
    ...tiers.longTerm.map((kw) => mapKeywordRow(kw, 'long-term')),
    ...tiers.longTail.map((kw) => mapKeywordRow(kw, 'long-tail')),
  ];

  const range = calendarDateRange(plan.calendar);
  const calendarDeck = range
    ? `${calendar.length} articles scheduled · ${range}`
    : `${calendar.length} articles scheduled`;

  const narrative = plan.narrative ?? {
    headline: 'Your content strategy',
    why: strategySummary || 'A prioritized plan of topics and keywords tailored to your business.',
  };

  const keywordCount = statsRaw.keywordCount;
  const mastheadDeck = siteLabel
    ? `${siteLabel} · ${keywordCount} keywords tracked`
    : `${keywordCount} keywords tracked`;

  const existingWins: StrategyBinderWin[] =
    plan.existingContent?.alreadyRanking.map((row) => ({
      phrase: row.phrase,
      position: row.position,
    })) ?? [];

  return {
    stats: {
      pillars: statsRaw.pillarCount,
      scheduled: statsRaw.calendarCount,
      backlog: backlog.length,
      keywords: statsRaw.keywordCount,
      existingWins: statsRaw.rankingCount,
    },
    narrative,
    mastheadDeck,
    pillars,
    calendar,
    calendarDeck,
    backlog,
    keywords,
    existingWins,
  };
}
