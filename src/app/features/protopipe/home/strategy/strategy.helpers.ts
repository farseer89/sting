import type {
  ArticleGenerationContentPlanIdea,
  ArticleGenerationContentStrategy,
  ProtopipeContentPlanCalendarItem,
  ProtopipeContentPlanPillar,
  ProtopipeProposedCluster,
  ProtopipeScoredKeyword,
  ProtopipeSiteContentPlan,
} from '@hive/contracts';
import type { SpokeNode } from '../../lab/void-dashboard/void-content-spoke.mock';

export type StrategyLayoutId = 'a' | 'b' | 'c';

export interface StrategyStats {
  pillarCount: number;
  calendarCount: number;
  rankingCount: number;
  refreshCount: number;
  keywordCount: number;
  immediateCount: number;
  longTermCount: number;
  longTailCount: number;
  clusterCount: number;
}

export function strategyStats(plan: ProtopipeSiteContentPlan): StrategyStats {
  const tiers = plan.keywordTiers;
  const audit = plan.existingContent;
  return {
    pillarCount: plan.pillars.length,
    calendarCount: plan.calendar.length,
    rankingCount: audit?.alreadyRanking.length ?? 0,
    refreshCount: audit?.refreshCandidates.length ?? 0,
    keywordCount:
      tiers.immediateFocus.length + tiers.longTerm.length + tiers.longTail.length,
    immediateCount: tiers.immediateFocus.length,
    longTermCount: tiers.longTerm.length,
    longTailCount: tiers.longTail.length,
    clusterCount: plan.clusters.length,
  };
}

export function calendarByCluster(
  items: ProtopipeContentPlanCalendarItem[],
): { cluster: string; items: ProtopipeContentPlanCalendarItem[] }[] {
  const groups = new Map<string, ProtopipeContentPlanCalendarItem[]>();
  for (const item of items) {
    const key = item.clusterName ?? 'Unassigned';
    const arr = groups.get(key) ?? [];
    arr.push(item);
    groups.set(key, arr);
  }
  return [...groups.entries()].map(([cluster, groupItems]) => ({
    cluster,
    items: groupItems,
  }));
}

export function calendarItemKey(item: ProtopipeContentPlanCalendarItem): string {
  return `${item.proposedPublishAt ?? 'backlog'}|${item.workingTitle}`;
}

export function formatPublishDate(iso: string | null | undefined): string {
  if (!iso) return 'Backlog';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Backlog';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function calendarDateRange(items: ProtopipeContentPlanCalendarItem[]): string | null {
  const scheduled = items.filter((i) => i.proposedPublishAt);
  if (scheduled.length === 0) return null;
  const sorted = [...scheduled].sort(
    (a, b) =>
      new Date(a.proposedPublishAt!).getTime() - new Date(b.proposedPublishAt!).getTime(),
  );
  const first = formatPublishDate(sorted[0].proposedPublishAt);
  const last = formatPublishDate(sorted[sorted.length - 1].proposedPublishAt);
  return `${first} – ${last}`;
}

export function parseStrategyLayout(value: string | null | undefined): StrategyLayoutId {
  if (value === 'b' || value === 'c') return value;
  return 'a';
}

export interface StrategyArticlePanelContext {
  scoredKeyword: ProtopipeScoredKeyword | null;
  cluster: ProtopipeProposedCluster | null;
  pillar: ProtopipeContentPlanPillar | null;
  audienceLabel: string | null;
  focusStrategy: ArticleGenerationContentStrategy | null;
  focusIdea: ArticleGenerationContentPlanIdea | null;
}

export function allScoredKeywords(plan: ProtopipeSiteContentPlan): ProtopipeScoredKeyword[] {
  const tiers = plan.keywordTiers;
  return [...tiers.immediateFocus, ...tiers.longTerm, ...tiers.longTail];
}

export function scoredKeywordForPhrase(
  plan: ProtopipeSiteContentPlan,
  phrase: string,
): ProtopipeScoredKeyword | null {
  const key = phrase.toLowerCase();
  return allScoredKeywords(plan).find((kw) => kw.phrase.toLowerCase() === key) ?? null;
}

export function calendarItemForPhrase(
  plan: ProtopipeSiteContentPlan,
  phrase: string,
): ProtopipeContentPlanCalendarItem | null {
  const key = phrase.toLowerCase();
  const matches = plan.calendar.filter(
    (item) =>
      item.suggestedKeyword.toLowerCase() === key || item.workingTitle.toLowerCase() === key,
  );
  if (matches.length === 0) {
    return null;
  }
  return matches.find((item) => item.clusterRole === 'pillar') ?? matches[0];
}

export function planBacklogItems(
  plan: ProtopipeSiteContentPlan,
): ProtopipeContentPlanCalendarItem[] {
  return plan.backlog ?? [];
}

export function allPlanCalendarItems(
  plan: ProtopipeSiteContentPlan,
): ProtopipeContentPlanCalendarItem[] {
  return [...plan.calendar, ...planBacklogItems(plan)];
}

export function calendarItemByKey(
  plan: ProtopipeSiteContentPlan,
  key: string,
): ProtopipeContentPlanCalendarItem | null {
  const pool = allPlanCalendarItems(plan);
  const exact = pool.find((item) => calendarItemKey(item) === key);
  if (exact) {
    return exact;
  }
  const title = key.includes('|') ? key.slice(key.indexOf('|') + 1) : key;
  return pool.find((item) => item.workingTitle === title) ?? null;
}

export function compareCalendarPublishAt(
  a: ProtopipeContentPlanCalendarItem,
  b: ProtopipeContentPlanCalendarItem,
): number {
  const aTime = a.proposedPublishAt ? new Date(a.proposedPublishAt).getTime() : Number.MAX_SAFE_INTEGER;
  const bTime = b.proposedPublishAt ? new Date(b.proposedPublishAt).getTime() : Number.MAX_SAFE_INTEGER;
  return aTime - bTime;
}

function calendarItemByTitle(
  plan: ProtopipeSiteContentPlan,
  title: string,
): ProtopipeContentPlanCalendarItem | null {
  const normalized = title.trim().toLowerCase();
  const exact = plan.calendar.find((item) => item.workingTitle.trim().toLowerCase() === normalized);
  if (exact) {
    return exact;
  }
  return (
    plan.calendar.find((item) => {
      const itemTitle = item.workingTitle.trim().toLowerCase();
      return itemTitle.startsWith(normalized) || normalized.startsWith(itemTitle);
    }) ?? null
  );
}

export function calendarItemFromSpokeNode(
  plan: ProtopipeSiteContentPlan,
  node: SpokeNode,
): ProtopipeContentPlanCalendarItem | null {
  if (node.kind === 'article') {
    if (node.calendarItemKey) {
      const byKey = calendarItemByKey(plan, node.calendarItemKey);
      if (byKey) {
        return byKey;
      }
    }
    const byTitle = calendarItemByTitle(plan, node.label);
    if (byTitle) {
      return byTitle;
    }
  }
  return calendarItemForPhrase(plan, node.label);
}

export function buildArticlePanelContext(
  plan: ProtopipeSiteContentPlan,
  article: ProtopipeContentPlanCalendarItem,
): StrategyArticlePanelContext {
  const scoredKeyword = scoredKeywordForPhrase(plan, article.suggestedKeyword);
  const cluster = article.clusterName
    ? (plan.clusters.find((entry) => entry.name === article.clusterName) ?? null)
    : null;
  const pillar = article.clusterName
    ? (plan.pillars.find((entry) => entry.clusterName === article.clusterName) ?? null)
    : null;

  const avatars = plan.keywordStrategySnapshot?.confirmedAvatars ?? [];
  const avatarId = article.avatarId ?? scoredKeyword?.avatarId ?? cluster?.avatarId ?? null;
  const audienceLabel = avatarId
    ? (avatars.find((avatar) => avatar.id === avatarId)?.description ??
      cluster?.audienceLabel ??
      null)
    : (cluster?.audienceLabel ?? null);

  const focusStrategy =
    plan.focusStrategies.find(
      (strategy) => strategy.keyword.phrase.toLowerCase() === article.suggestedKeyword.toLowerCase(),
    ) ?? null;

  const focusIdea =
    focusStrategy?.articleIdeas.find(
      (idea) =>
        idea.workingTitle === article.workingTitle ||
        idea.suggestedKeyword.toLowerCase() === article.suggestedKeyword.toLowerCase(),
    ) ??
    focusStrategy?.articleIdeas[0] ??
    null;

  return { scoredKeyword, cluster, pillar, audienceLabel, focusStrategy, focusIdea };
}
