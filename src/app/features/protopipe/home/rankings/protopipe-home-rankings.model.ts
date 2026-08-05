import type { KeywordRankingRow, KeywordRankingSnapshot } from '@hive/contracts';

export type RankingsSortColumn = 'keyword' | 'market' | 'rank' | 'competitors' | 'captured';
export type RankingsSortDirection = 'asc' | 'desc';

export interface RankingsSortState {
  column: RankingsSortColumn;
  direction: RankingsSortDirection;
}

export interface RankingsSummaryCard {
  id: string;
  label: string;
  value: string;
  hint: string;
}

export function marketScopeLabel(tier: KeywordRankingSnapshot['marketTier']): string {
  switch (tier) {
    case 'local':
      return 'Local';
    case 'national':
      return 'Nationwide';
    case 'worldwide':
      return 'Worldwide';
  }
}

export function rankLabel(position: number | null): string {
  return position == null ? 'Not ranking' : `#${position}`;
}

export function buildRankingsSummary(rows: KeywordRankingRow[]): RankingsSummaryCard[] {
  const tracked = new Set(rows.map((row) => row.keywordId)).size;
  const top3 = rows.filter((row) => row.latest.position != null && row.latest.position <= 3).length;
  const top10 = rows.filter(
    (row) => row.latest.position != null && row.latest.position <= 10,
  ).length;
  const notRanking = rows.filter((row) => row.latest.position == null).length;
  const competitors = new Set(
    rows.flatMap((row) => row.latest.competitorsAbove.map((competitor) => competitor.domain)),
  ).size;

  return [
    {
      id: 'tracked',
      label: 'Keywords tracked',
      value: String(tracked),
      hint: `${rows.length} market snapshots`,
    },
    { id: 'top3', label: 'Top 3', value: String(top3), hint: `${top10} in top 10` },
    { id: 'missing', label: 'Not ranking yet', value: String(notRanking), hint: 'Baseline gaps' },
    {
      id: 'competitors',
      label: 'Competitors beating us',
      value: String(competitors),
      hint: 'Unique domains above us',
    },
  ];
}

export function topCompetitorsByOverlap(
  rows: KeywordRankingRow[],
): { domain: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const competitor of row.latest.competitorsAbove) {
      counts.set(competitor.domain, (counts.get(competitor.domain) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain))
    .slice(0, 8);
}

export function biggestRankingGaps(rows: KeywordRankingRow[]): KeywordRankingRow[] {
  return [...rows]
    .sort((a, b) => {
      const aRank = a.latest.position ?? Number.POSITIVE_INFINITY;
      const bRank = b.latest.position ?? Number.POSITIVE_INFINITY;
      return b.latest.competitorsAbove.length - a.latest.competitorsAbove.length || bRank - aRank;
    })
    .slice(0, 5);
}

export function sortRankingRows(
  rows: KeywordRankingRow[],
  sort: RankingsSortState,
): KeywordRankingRow[] {
  return [...rows].sort((a, b) => compareRows(a, b, sort));
}

function compareRows(
  a: KeywordRankingRow,
  b: KeywordRankingRow,
  sort: RankingsSortState,
): number {
  const direction = sort.direction === 'asc' ? 1 : -1;
  let result = 0;
  if (sort.column === 'keyword') {
    result = a.phrase.localeCompare(b.phrase);
  } else if (sort.column === 'market') {
    result =
      marketRank(a.latest.marketTier) - marketRank(b.latest.marketTier) ||
      (a.latest.locationName ?? '').localeCompare(b.latest.locationName ?? '');
  } else if (sort.column === 'rank') {
    result = rankValue(a.latest.position) - rankValue(b.latest.position);
  } else if (sort.column === 'competitors') {
    result = a.latest.competitorsAbove.length - b.latest.competitorsAbove.length;
  } else {
    result = Date.parse(a.latest.capturedAt) - Date.parse(b.latest.capturedAt);
  }
  return result * direction || a.phrase.localeCompare(b.phrase);
}

function marketRank(tier: KeywordRankingSnapshot['marketTier']): number {
  if (tier === 'local') return 0;
  if (tier === 'national') return 1;
  return 2;
}

function rankValue(position: number | null): number {
  return position ?? Number.POSITIVE_INFINITY;
}
