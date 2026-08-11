export type FunnelStage = 'awareness' | 'consideration' | 'decision' | 'retention' | 'unknown';
export type KeywordTier = 'immediate_focus' | 'long_term' | 'long_tail' | 'unscored';

export interface MarketMapSummaryCard {
  id: string;
  label: string;
  value: string;
  hint: string;
}

export interface MarketMapFunnelSlice {
  id: FunnelStage;
  label: string;
  count: number;
  percent: number;
}

export interface MarketMapTierSlice {
  id: KeywordTier;
  label: string;
  count: number;
}

export interface MarketMapClusterView {
  id: string;
  name: string;
  pillarKeyword: string;
  subtopic: string;
  dominantIntent: string;
  audienceLabel: string;
  memberCount: number;
  supportingCount: number;
  members: Array<{ phrase: string; role: string; funnelStage: string; intent: string }>;
}

export interface MarketMapKeywordRow {
  phrase: string;
  tier: string;
  funnelStage: string;
  intent: string;
  priority: string;
  clusterName: string;
  avatarId?: string;
  audienceLabel?: string;
  opportunityScore?: number;
}

export interface MarketMapAudienceView {
  id: string;
  label: string;
  description: string;
  intentCluster: string;
  keywords: MarketMapKeywordRow[];
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asRecordArray(value: unknown): Record<string, unknown>[] {
  return asArray(value)
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => Boolean(row));
}

export function recordValue(record: Record<string, unknown> | null, key: string): unknown {
  return record?.[key];
}

export function stringValue(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

export function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function labelize(value: string): string {
  if (!value.trim()) return 'Not set';
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function normalizeFunnelStage(value: unknown): FunnelStage {
  const raw = stringValue(value).toLowerCase();
  if (raw === 'awareness') return 'awareness';
  if (raw === 'consideration') return 'consideration';
  if (raw === 'decision') return 'decision';
  if (raw === 'retention') return 'retention';
  return 'unknown';
}

export function buildSummaryCards(input: {
  keywordCount: number;
  clusterCount: number;
  pillarCount: number;
  audienceCount: number;
}): MarketMapSummaryCard[] {
  return [
    {
      id: 'keywords',
      label: 'Keywords',
      value: String(input.keywordCount),
      hint: input.keywordCount > 0 ? 'Confirmed targets in the map' : 'Confirm keywords to begin',
    },
    {
      id: 'clusters',
      label: 'Clusters',
      value: String(input.clusterCount),
      hint: input.clusterCount > 0 ? 'Topical groupings with pillar roles' : 'Clustering runs after confirm',
    },
    {
      id: 'pillars',
      label: 'Pillars',
      value: String(input.pillarCount),
      hint: input.pillarCount > 0 ? 'Head terms anchoring each cluster' : 'Pillars appear once clustered',
    },
    {
      id: 'audiences',
      label: 'Audiences',
      value: String(input.audienceCount),
      hint: input.audienceCount > 0 ? 'Who each cluster is written for' : 'Add audiences on the keyword path',
    },
  ];
}

export function buildFunnelSlices(rows: MarketMapKeywordRow[]): MarketMapFunnelSlice[] {
  const total = Math.max(rows.length, 1);
  const counts: Record<FunnelStage, number> = {
    awareness: 0,
    consideration: 0,
    decision: 0,
    retention: 0,
    unknown: 0,
  };
  for (const row of rows) {
    counts[normalizeFunnelStage(row.funnelStage)] += 1;
  }
  return [
    { id: 'awareness' as const, label: 'Awareness', count: counts.awareness, percent: percent(counts.awareness, total) },
    { id: 'consideration' as const, label: 'Consideration', count: counts.consideration, percent: percent(counts.consideration, total) },
    { id: 'decision' as const, label: 'Decision', count: counts.decision, percent: percent(counts.decision, total) },
    { id: 'retention' as const, label: 'Retention', count: counts.retention, percent: percent(counts.retention, total) },
    { id: 'unknown' as const, label: 'Unassigned', count: counts.unknown, percent: percent(counts.unknown, total) },
  ].filter((slice) => slice.count > 0 || slice.id !== 'unknown');
}

export function buildTierSlices(rows: MarketMapKeywordRow[]): MarketMapTierSlice[] {
  const counts: Record<KeywordTier, number> = {
    immediate_focus: 0,
    long_term: 0,
    long_tail: 0,
    unscored: 0,
  };
  for (const row of rows) {
    const tier = (row.tier || 'unscored') as KeywordTier;
    counts[tier in counts ? tier : 'unscored'] += 1;
  }
  return [
    { id: 'immediate_focus' as const, label: 'Immediate focus', count: counts.immediate_focus },
    { id: 'long_term' as const, label: 'Long term', count: counts.long_term },
    { id: 'long_tail' as const, label: 'Long tail', count: counts.long_tail },
    { id: 'unscored' as const, label: 'Unscored', count: counts.unscored },
  ].filter((slice) => slice.count > 0);
}

export function buildClusterViews(clusters: Record<string, unknown>[]): MarketMapClusterView[] {
  return clusters.map((cluster, index) => {
    const members = asRecordArray(recordValue(cluster, 'members')).map((member) => ({
      phrase: stringValue(recordValue(member, 'phrase')) || 'Unknown phrase',
      role: stringValue(recordValue(member, 'role')) || 'supporting',
      funnelStage: labelize(stringValue(recordValue(member, 'funnelStage')) || 'unknown'),
      intent: labelize(stringValue(recordValue(member, 'intent')) || 'informational'),
    }));
    const supportingCount = members.filter((member) => member.role === 'supporting').length;
    return {
      id: stringValue(recordValue(cluster, 'name')) || `cluster-${index + 1}`,
      name: stringValue(recordValue(cluster, 'name')) || `Cluster ${index + 1}`,
      pillarKeyword: stringValue(recordValue(cluster, 'pillarKeyword')) || 'Not assigned',
      subtopic: stringValue(recordValue(cluster, 'subtopic')) || 'General topic',
      dominantIntent: labelize(stringValue(recordValue(cluster, 'dominantIntent')) || 'informational'),
      audienceLabel: stringValue(recordValue(cluster, 'audienceLabel')) || 'No audience label',
      memberCount: members.length,
      supportingCount,
      members,
    };
  });
}

export function buildKeywordRows(
  scored: Record<string, unknown>[],
  fallbackKeywords: Array<{ phrase: string; intent?: string; priority?: string; strategyMeta?: unknown }>,
): MarketMapKeywordRow[] {
  if (scored.length) {
    return scored.map((row) => ({
      phrase: stringValue(recordValue(row, 'phrase')) || 'Unknown phrase',
      tier: stringValue(recordValue(row, 'tier')) || 'unscored',
      funnelStage: stringValue(recordValue(row, 'funnelStage')) || 'unknown',
      intent: stringValue(recordValue(row, 'intent')) || 'informational',
      priority: stringValue(recordValue(row, 'priority')) || 'medium',
      clusterName: stringValue(recordValue(row, 'clusterName')) || 'Pending cluster',
      avatarId: stringValue(recordValue(row, 'avatarId')) || undefined,
      audienceLabel: stringValue(recordValue(row, 'audienceLabel')) || undefined,
      opportunityScore: numberValue(recordValue(row, 'opportunityScore')),
    }));
  }
  return fallbackKeywords.map((keyword) => {
    const strategyMeta = asRecord(keyword.strategyMeta);
    return {
      phrase: keyword.phrase,
      tier: 'unscored',
      funnelStage: stringValue(recordValue(strategyMeta, 'funnelStage')) || 'unknown',
      intent: keyword.intent ?? 'informational',
      priority: keyword.priority ?? 'medium',
      clusterName: 'Pending cluster',
      avatarId: stringValue(recordValue(strategyMeta, 'avatarId')) || undefined,
    };
  });
}

export function buildAudienceViews(
  confirmedAvatars: Record<string, unknown>[],
  keywordRows: MarketMapKeywordRow[],
): MarketMapAudienceView[] {
  if (confirmedAvatars.length === 0) {
    return keywordRows.length
      ? [
          {
            id: 'general',
            label: 'General audience',
            description: 'Confirmed keywords without a selected audience tag.',
            intentCluster: 'General',
            keywords: keywordRows,
          },
        ]
      : [];
  }

  return confirmedAvatars.map((avatar, index) => {
    const id = stringValue(recordValue(avatar, 'id')) || `audience-${index + 1}`;
    const label = stringValue(recordValue(avatar, 'intentCluster')) || `Audience ${index + 1}`;
    const description = stringValue(recordValue(avatar, 'description')) || 'No description';
    const keywords = keywordRows.filter(
      (row) => row.avatarId === id || row.audienceLabel === label || row.audienceLabel === description,
    );
    return {
      id,
      label,
      description,
      intentCluster: stringValue(recordValue(avatar, 'intentCluster')) || 'General',
      keywords,
    };
  });
}

function percent(count: number, total: number): number {
  return Math.round((count / total) * 100);
}
