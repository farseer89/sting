import type {
  ProtopipeContentPlanCalendarItem,
  ProtopipeSiteContentPlan,
} from '@hive/contracts';

export interface StrategyClusterPlan {
  name: string;
  pillarKeyword: string;
  subtopic?: string;
  keywordCount: number;
  articles: ProtopipeContentPlanCalendarItem[];
}

/** Clusters from the plan with their scheduled articles, in pillar order. */
export function planClustersWithArticles(plan: ProtopipeSiteContentPlan): StrategyClusterPlan[] {
  const clusterMeta = new Map(plan.clusters.map((c) => [c.name, c]));
  const seen = new Set<string>();
  const groups: StrategyClusterPlan[] = [];

  const articlesFor = (name: string): ProtopipeContentPlanCalendarItem[] =>
    plan.calendar
      .filter((item) => (item.clusterName ?? 'Unassigned') === name)
      .sort(
        (a, b) =>
          new Date(a.proposedPublishAt).getTime() - new Date(b.proposedPublishAt).getTime(),
      );

  for (const pillar of plan.pillars) {
    const meta = clusterMeta.get(pillar.clusterName);
    groups.push({
      name: pillar.clusterName,
      pillarKeyword: meta?.pillarKeyword ?? pillar.pillarKeyword,
      subtopic: meta?.subtopic ?? pillar.angle,
      keywordCount: meta?.members.length ?? pillar.supportingCount + 1,
      articles: articlesFor(pillar.clusterName),
    });
    seen.add(pillar.clusterName);
  }

  for (const cluster of plan.clusters) {
    if (seen.has(cluster.name)) {
      continue;
    }
    groups.push({
      name: cluster.name,
      pillarKeyword: cluster.pillarKeyword,
      subtopic: cluster.subtopic,
      keywordCount: cluster.members.length,
      articles: articlesFor(cluster.name),
    });
    seen.add(cluster.name);
  }

  const unassigned = articlesFor('Unassigned');
  if (unassigned.length) {
    groups.push({
      name: 'Unassigned',
      pillarKeyword: '—',
      keywordCount: 0,
      articles: unassigned,
    });
  }

  return groups;
}
