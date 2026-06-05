import type { ProtopipeSiteContentPlan } from '@hive/contracts';
import type {
  ContentSpokeAccount,
  SpokeCluster,
  SpokeNode,
  SpokeNodeStatus,
} from '../../lab/void-dashboard/void-content-spoke.mock';
import { formatPublishDate, strategyStats } from './strategy.helpers';

const KEYWORD_CLUSTER: Pick<SpokeCluster, 'color' | 'colorSoft'> = {
  color: '#ee9b00',
  colorSoft: 'rgba(238, 155, 0, 0.12)',
};

const PILLAR_CLUSTER: Pick<SpokeCluster, 'color' | 'colorSoft'> = {
  color: '#0a9396',
  colorSoft: 'rgba(10, 147, 150, 0.12)',
};

const ARTICLE_CLUSTER: Pick<SpokeCluster, 'color' | 'colorSoft'> = {
  color: '#2a9d8f',
  colorSoft: 'rgba(42, 157, 143, 0.12)',
};

function slugId(prefix: string, label: string, index: number): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 32);
  return `${prefix}-${base || index}`;
}

function keywordStatus(
  phrase: string,
  rankingPhrases: Set<string>,
  scheduledPhrases: Set<string>,
): SpokeNodeStatus {
  if (rankingPhrases.has(phrase.toLowerCase())) {
    return 'ranking';
  }
  if (scheduledPhrases.has(phrase.toLowerCase())) {
    return 'scheduled';
  }
  return 'gap';
}

function articleStatus(
  kind: string,
  publishAt: string,
  now = Date.now(),
): SpokeNodeStatus {
  if (kind === 'refresh-existing') {
    return 'published';
  }
  const when = new Date(publishAt).getTime();
  return when <= now ? 'published' : 'scheduled';
}

function capNodes<T>(items: T[], max: number): T[] {
  return items.length <= max ? items : items.slice(0, max);
}

/** Plan → hub/spoke clusters: keywords, pillars, scheduled articles (reading order). */
export function planToContentSpoke(
  plan: ProtopipeSiteContentPlan,
  options?: { host?: string; seed?: string },
): { account: ContentSpokeAccount; clusters: SpokeCluster[] } {
  const stats = strategyStats(plan);
  const hostname = plan.existingContent?.hostname ?? options?.host ?? 'your site';
  const seed =
    options?.seed ??
    plan.keywordTiers.immediateFocus[0]?.phrase ??
    plan.pillars[0]?.pillarKeyword ??
    'seed keyword';

  const rankingPhrases = new Set(
    (plan.existingContent?.alreadyRanking ?? []).map((r) => r.phrase.toLowerCase()),
  );
  const scheduledPhrases = new Set(
    plan.calendar.map((c) => c.suggestedKeyword.toLowerCase()),
  );

  const keywordNodes: SpokeNode[] = [];
  const seen = new Set<string>();

  for (const kw of [
    ...plan.keywordTiers.immediateFocus,
    ...plan.keywordTiers.longTerm,
    ...plan.keywordTiers.longTail,
  ]) {
    const key = kw.phrase.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    keywordNodes.push({
      id: slugId('kw', kw.phrase, keywordNodes.length),
      label: kw.phrase,
      kind: 'keyword',
      status: keywordStatus(kw.phrase, rankingPhrases, scheduledPhrases),
      meta: kw.searchVolume != null ? `${kw.searchVolume} vol` : undefined,
    });
  }

  const pillarNodes: SpokeNode[] = plan.pillars.map((pillar, i) => ({
    id: slugId('pillar', pillar.pillarKeyword, i),
    label: pillar.pillarKeyword,
    kind: 'pillar' as const,
    status: keywordStatus(pillar.pillarKeyword, rankingPhrases, scheduledPhrases),
    meta: pillar.clusterName,
  }));

  const articleNodes: SpokeNode[] = plan.calendar.map((item, i) => ({
    id: slugId('art', item.workingTitle, i),
    label: item.workingTitle,
    kind: 'article' as const,
    status: articleStatus(item.kind, item.proposedPublishAt),
    meta: formatPublishDate(item.proposedPublishAt),
  }));

  const clusters: SpokeCluster[] = [
    {
      id: 'keywords',
      label: 'Your keywords',
      sublabel: 'Scored search phrases',
      ...KEYWORD_CLUSTER,
      startAngle: 210,
      endAngle: 330,
      nodes: capNodes(keywordNodes, 10),
    },
    {
      id: 'pillars',
      label: 'Topic pillars',
      sublabel: 'Themes we grouped them into',
      ...PILLAR_CLUSTER,
      startAngle: 330,
      endAngle: 90,
      nodes: pillarNodes,
    },
    {
      id: 'articles',
      label: 'Scheduled plan',
      sublabel: 'Publish dates on your calendar',
      ...ARTICLE_CLUSTER,
      startAngle: 90,
      endAngle: 210,
      nodes: capNodes(articleNodes, 8),
    },
  ];

  const account: ContentSpokeAccount = {
    id: plan.siteId,
    host: hostname,
    seed,
    planLabel: 'Content strategy',
    metrics: [
      { label: 'Keywords', value: String(stats.keywordCount) },
      { label: 'Pillars', value: String(stats.pillarCount) },
      { label: 'Scheduled', value: String(stats.calendarCount) },
      { label: 'Ranking', value: String(stats.rankingCount) },
    ],
  };

  return { account, clusters };
}
