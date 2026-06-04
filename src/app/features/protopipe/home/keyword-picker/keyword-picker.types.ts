export type KeywordPickerSource = 'ranked' | 'ads' | 'ads_related' | 'research' | 'custom' | 'gsc';

export interface KeywordPickerOption {
  phraseKey: string;
  phrase: string;
  searchVolume?: number;
  keywordDifficulty?: number;
  competition?: string;
  competitionIndex?: number;
  position?: number;
  source: KeywordPickerSource;
  opportunityScore?: number;
  relevanceScore?: number;
}

export const SUGGESTED_PANEL_COUNT = 16;
export const PRESELECT_COUNT = 8;
export const MIN_KEYWORD_VOLUME = 50;
export const ASSUMED_DIFFICULTY = 50;

export function normalizePhraseKey(phrase: string): string {
  return phrase.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function formatKeywordVolume(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

export function formatCompetitionLabel(option: KeywordPickerOption): string {
  if (option.keywordDifficulty != null) {
    return `KD ${Math.round(option.keywordDifficulty)}`;
  }
  if (option.competition) {
    return option.competition.toUpperCase();
  }
  if (option.competitionIndex != null) {
    return `Comp ${Math.round(option.competitionIndex)}`;
  }
  return '—';
}

export function sourceLabel(source: KeywordPickerSource): string {
  switch (source) {
    case 'ranked':
      return 'Ranking';
    case 'ads':
      return 'Idea';
    case 'ads_related':
      return 'Related';
    case 'research':
      return 'Search';
    case 'gsc':
      return 'Search traffic';
    default:
      return 'Custom';
  }
}
