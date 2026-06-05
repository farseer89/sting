import type {
  ProtopipeContentPlanCalendarItem,
  ProtopipeSiteContentPlan,
} from '@hive/contracts';

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
  return `${item.proposedPublishAt}|${item.workingTitle}`;
}

export function formatPublishDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function calendarDateRange(items: ProtopipeContentPlanCalendarItem[]): string | null {
  if (items.length === 0) return null;
  const sorted = [...items].sort(
    (a, b) => new Date(a.proposedPublishAt).getTime() - new Date(b.proposedPublishAt).getTime(),
  );
  const first = formatPublishDate(sorted[0].proposedPublishAt);
  const last = formatPublishDate(sorted[sorted.length - 1].proposedPublishAt);
  return `${first} – ${last}`;
}

export function parseStrategyLayout(value: string | null | undefined): StrategyLayoutId {
  if (value === 'b' || value === 'c') return value;
  return 'a';
}
