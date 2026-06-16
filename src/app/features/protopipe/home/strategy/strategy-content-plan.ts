import type {
  ProtopipeContentPlanCalendarItem,
  ProtopipeSiteContentPlan,
} from '@hive/contracts';
import { compareCalendarPublishAt } from './strategy.helpers';

export interface StrategyClusterPlan {
  name: string;
  pillarKeyword: string;
  subtopic?: string;
  keywordCount: number;
  articles: ProtopipeContentPlanCalendarItem[];
  audienceLabel?: string;
}

export interface StrategyAudienceSection {
  id: string;
  label: string;
  description: string;
  keywordCount: number;
  articleCount: number;
}

/** Clusters from the plan with their scheduled articles, in pillar order. */
export function planClustersWithArticles(plan: ProtopipeSiteContentPlan): StrategyClusterPlan[] {
  const clusterMeta = new Map(plan.clusters.map((c) => [c.name, c]));
  const seen = new Set<string>();
  const groups: StrategyClusterPlan[] = [];

  const articlesFor = (name: string): ProtopipeContentPlanCalendarItem[] =>
    plan.calendar
      .filter((item) => (item.clusterName ?? 'Unassigned') === name)
      .sort(compareCalendarPublishAt);

  for (const pillar of plan.pillars) {
    const meta = clusterMeta.get(pillar.clusterName);
    groups.push({
      name: pillar.clusterName,
      pillarKeyword: meta?.pillarKeyword ?? pillar.pillarKeyword,
      subtopic: meta?.subtopic ?? pillar.angle,
      keywordCount: meta?.members.length ?? pillar.supportingCount + 1,
      articles: articlesFor(pillar.clusterName),
      audienceLabel: meta?.audienceLabel,
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
      audienceLabel: cluster.audienceLabel,
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

/** Audience summary from snapshot + scored keywords (additive to cluster view). */
export function planAudienceSections(plan: ProtopipeSiteContentPlan): StrategyAudienceSection[] {
  const avatars = plan.keywordStrategySnapshot?.confirmedAvatars ?? [];
  if (!avatars.length) return [];

  const allKeywords = [
    ...plan.keywordTiers.immediateFocus,
    ...plan.keywordTiers.longTerm,
    ...plan.keywordTiers.longTail,
  ];

  return avatars.map((avatar) => {
    const kwCount = allKeywords.filter((k) => k.avatarId === avatar.id).length;
    const articleCount = plan.calendar.filter((c) => c.avatarId === avatar.id).length;
    const short =
      avatar.description.length > 72
        ? `${avatar.description.slice(0, 69)}…`
        : avatar.description;
    return {
      id: avatar.id,
      label: avatar.intentCluster || avatar.id,
      description: short,
      keywordCount: kwCount,
      articleCount,
    };
  });
}
