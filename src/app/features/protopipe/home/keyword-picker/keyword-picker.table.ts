import type { KeywordPickerOption } from './keyword-picker.types';
import { ASSUMED_DIFFICULTY } from './keyword-picker.types';

export type KeywordPlanSortColumn =
  | 'phrase'
  | 'market'
  | 'volume'
  | 'competition'
  | 'fit'
  | 'opportunity'
  | 'source';

export type KeywordPlanSortDirection = 'asc' | 'desc';

export const COLUMN_TOOLTIPS: Record<KeywordPlanSortColumn, string> = {
  phrase: 'The search phrase you would target in content and SEO.',
  market:
    'The market that produced this row. Local, nationwide, and worldwide metrics stay separate when the provider returns different rows.',
  volume:
    'Average monthly searches from DataForSEO organic data or Google Ads Keyword Planner, scoped to the shown market when available.',
  competition:
    'Difficulty on a 0–100 scale. Organic rows use DataForSEO keyword difficulty (KD). Ads rows use Google competition index when available, otherwise LOW≈25, MEDIUM≈50, HIGH≈75. Lower is easier to win.',
  fit:
    'How closely the phrase matches your onboarding profile — business description, trade, site name, and goal keyword. Scored 0–100 from shared distinctive terms.',
  opportunity:
    'volume × (1 − difficulty ÷ 100), weighted by fit and source (ranking/GSC data ranks above broad ads ideas). Higher = better starting bet. Default sort.',
  source:
    'Where we found this phrase: current rankings, Search Console traffic, Google Ads ideas, or related research.',
};

export function marketScopeLabel(option: KeywordPickerOption): string {
  switch (option.marketTier) {
    case 'local':
      return 'Local';
    case 'national':
      return 'Nationwide';
    case 'worldwide':
      return 'Worldwide';
    default:
      return '—';
  }
}

export function marketScopeDetail(option: KeywordPickerOption): string {
  return option.marketLocationName ?? '';
}

export function marketBadgeLabel(option: KeywordPickerOption): string {
  const label = marketScopeLabel(option);
  const detail = compactMarketLocation(marketScopeDetail(option));
  if (!detail || label === '—') return label;
  return `${label} · ${detail}`;
}

function compactMarketLocation(detail: string): string {
  const trimmed = detail.trim();
  if (!trimmed) return '';
  if (/^united states$/i.test(trimmed)) return 'US';
  if (/^worldwide$/i.test(trimmed)) return '';
  return trimmed;
}

/** Unified 0–100 competition difficulty for sorting and display. */
export function competitionNumericScore(option: KeywordPickerOption): number | null {
  if (option.keywordDifficulty != null) {
    return Math.round(option.keywordDifficulty);
  }
  if (option.competitionIndex != null) {
    return Math.round(option.competitionIndex);
  }
  if (option.competition) {
    const c = option.competition.toUpperCase();
    if (c === 'LOW') return 25;
    if (c === 'MEDIUM') return 50;
    if (c === 'HIGH') return 75;
  }
  return null;
}

export function competitionBand(option: KeywordPickerOption): string {
  if (option.keywordDifficulty != null) {
    const kd = option.keywordDifficulty;
    if (kd <= 40) return 'Easier organic win';
    if (kd <= 60) return 'Moderate effort';
    return 'Hard to rank';
  }
  if (option.competition) {
    const c = option.competition.toUpperCase();
    if (c === 'LOW') return 'Less ad crowding';
    if (c === 'MEDIUM') return 'Moderate crowding';
    return 'High crowding';
  }
  return 'Unknown difficulty';
}

export function formatCompetitionCell(option: KeywordPickerOption): {
  score: number | null;
  label: string;
  band: string;
} {
  const score = competitionNumericScore(option);
  if (option.keywordDifficulty != null) {
    return { score, label: 'KD', band: competitionBand(option) };
  }
  if (option.competition) {
    return { score, label: option.competition.toUpperCase(), band: competitionBand(option) };
  }
  if (option.competitionIndex != null) {
    return { score, label: 'Comp', band: competitionBand(option) };
  }
  return { score: null, label: '—', band: competitionBand(option) };
}

export function fitLabel(score: number | undefined): string {
  if (score == null) return '—';
  if (score >= 70) return 'Strong';
  if (score >= 40) return 'Good';
  return 'Fair';
}

export type MetricTier = 'strong' | 'moderate' | 'weak' | 'unknown';

export function volumeTier(volume: number | undefined): MetricTier {
  if (volume == null || volume <= 0) return 'unknown';
  if (volume >= 1000) return 'strong';
  if (volume >= 100) return 'moderate';
  return 'weak';
}

/** Lower competition score = easier to rank = strong. */
export function competitionTier(option: KeywordPickerOption): MetricTier {
  const score = competitionNumericScore(option);
  if (score == null) return 'unknown';
  if (score <= 30) return 'strong';
  if (score <= 55) return 'moderate';
  return 'weak';
}

export function fitTier(score: number | undefined): MetricTier {
  if (score == null) return 'unknown';
  if (score >= 70) return 'strong';
  if (score >= 40) return 'moderate';
  return 'weak';
}

export function opportunityTier(score: number | undefined): MetricTier {
  if (score == null || score <= 0) return 'unknown';
  if (score >= 200) return 'strong';
  if (score >= 75) return 'moderate';
  return 'weak';
}

export function competitionHint(option: KeywordPickerOption): string {
  if (option.keywordDifficulty != null) {
    const kd = option.keywordDifficulty;
    if (kd <= 30) return 'Easier win';
    if (kd <= 55) return 'Moderate';
    return 'Competitive';
  }
  if (option.competition) {
    const c = option.competition.toUpperCase();
    if (c === 'LOW') return 'Light';
    if (c === 'MEDIUM') return 'Moderate';
    return 'Heavy';
  }
  return '—';
}

export function volumeHint(volume: number | undefined, lowVolume: boolean): string {
  if (volume == null || volume <= 0) return 'No data';
  if (lowVolume) return 'Low volume';
  return 'searches/mo';
}

function volumeValue(option: KeywordPickerOption): number {
  return option.searchVolume ?? 0;
}

function sourceRank(source: KeywordPickerOption['source']): number {
  switch (source) {
    case 'gsc':
      return 5;
    case 'ranked':
      return 4;
    case 'ads':
      return 3;
    case 'research':
      return 2;
    case 'ads_related':
      return 1;
    default:
      return 0;
  }
}

function marketRank(option: KeywordPickerOption): number {
  switch (option.marketTier) {
    case 'local':
      return 0;
    case 'national':
      return 1;
    case 'worldwide':
      return 2;
    default:
      return 3;
  }
}

export function comparePlanRows(
  a: KeywordPickerOption,
  b: KeywordPickerOption,
  column: KeywordPlanSortColumn,
): number {
  switch (column) {
    case 'phrase':
      return a.phrase.localeCompare(b.phrase);
    case 'market': {
      const rank = marketRank(a) - marketRank(b);
      if (rank !== 0) return rank;
      return (a.marketLocationName ?? '').localeCompare(b.marketLocationName ?? '');
    }
    case 'volume':
      return volumeValue(a) - volumeValue(b);
    case 'competition': {
      const av = competitionNumericScore(a) ?? ASSUMED_DIFFICULTY;
      const bv = competitionNumericScore(b) ?? ASSUMED_DIFFICULTY;
      return av - bv;
    }
    case 'fit':
      return (a.relevanceScore ?? 0) - (b.relevanceScore ?? 0);
    case 'opportunity':
      return (a.opportunityScore ?? 0) - (b.opportunityScore ?? 0);
    case 'source':
      return sourceRank(a.source) - sourceRank(b.source);
    default:
      return 0;
  }
}

export function sortPlanRows(
  rows: KeywordPickerOption[],
  column: KeywordPlanSortColumn,
  direction: KeywordPlanSortDirection,
): KeywordPickerOption[] {
  const deduped = dedupeByPhraseKey(rows);
  const factor = direction === 'asc' ? 1 : -1;
  return [...deduped].sort((a, b) => comparePlanRows(a, b, column) * factor);
}

function dedupeByPhraseKey(rows: KeywordPickerOption[]): KeywordPickerOption[] {
  const seen = new Set<string>();
  const out: KeywordPickerOption[] = [];
  for (const row of rows) {
    if (seen.has(row.phraseKey)) continue;
    seen.add(row.phraseKey);
    out.push(row);
  }
  return out;
}
