import type { KeywordRelevanceContext } from './keyword-picker.relevance';
import { computeRelevanceScore } from './keyword-picker.relevance';
import type { KeywordPickerOption } from './keyword-picker.types';
import {
  ASSUMED_DIFFICULTY,
  MIN_KEYWORD_VOLUME,
  PRESELECT_COUNT,
  SUGGESTED_PANEL_COUNT,
  normalizePhraseKey,
} from './keyword-picker.types';

function effectiveVolume(option: KeywordPickerOption): number {
  return option.searchVolume ?? 0;
}

function effectiveDifficulty(option: KeywordPickerOption): number {
  if (option.keywordDifficulty != null) {
    return option.keywordDifficulty;
  }
  if (option.competitionIndex != null) {
    return option.competitionIndex;
  }
  return ASSUMED_DIFFICULTY;
}

function sourcePriority(option: KeywordPickerOption): number {
  switch (option.source) {
    case 'gsc':
      return 1.35;
    case 'ranked':
      return 1.25;
    case 'ads':
      return 1.05;
    case 'research':
      return 1;
    case 'custom':
      return 1;
    default:
      return 0.75;
  }
}

function relevanceMultiplier(relevanceScore: number): number {
  return 0.12 + 0.88 * (relevanceScore / 100);
}

export function computeOpportunityScore(option: KeywordPickerOption): number {
  const volume = effectiveVolume(option);
  const difficulty = effectiveDifficulty(option);
  let score = Math.round(volume * (1 - difficulty / 100));

  if (option.position != null && option.position >= 4 && option.position <= 20) {
    score = Math.round(score * 1.15);
  }
  if (option.position != null && option.position <= 3) {
    score = Math.round(score * 0.85);
  }
  if (option.competitionIndex != null && option.competitionIndex <= 40) {
    score = Math.round(score * 1.08);
  }

  const relevance = option.relevanceScore ?? 50;
  score = Math.round(score * relevanceMultiplier(relevance) * sourcePriority(option));

  return score;
}

export function scoreKeywordOptions(
  options: KeywordPickerOption[],
  ctx?: KeywordRelevanceContext,
): KeywordPickerOption[] {
  return options
    .map((o) => ({
      ...o,
      relevanceScore: ctx ? computeRelevanceScore(o.phrase, ctx) : o.relevanceScore,
    }))
    .filter((o) => {
      const vol = effectiveVolume(o);
      return vol >= MIN_KEYWORD_VOLUME || o.keywordDifficulty != null || o.source === 'gsc';
    })
    .map((o) => ({ ...o, opportunityScore: computeOpportunityScore(o) }))
    .sort((a, b) => {
      const relDiff = (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
      if (Math.abs(relDiff) >= 18) return relDiff;
      return (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0);
    });
}

export function pickSuggestedPanel(scored: KeywordPickerOption[]): KeywordPickerOption[] {
  return scored.slice(0, SUGGESTED_PANEL_COUNT);
}

export function pickPreselectedKeys(
  scored: KeywordPickerOption[],
  savedPhraseKeys: Set<string>,
): Set<string> {
  if (savedPhraseKeys.size > 0) {
    return new Set(savedPhraseKeys);
  }
  const eligible = scored.filter((o) => (o.relevanceScore ?? 0) >= 35);
  const pool = eligible.length >= PRESELECT_COUNT ? eligible : scored;
  return new Set(pool.slice(0, PRESELECT_COUNT).map((o) => o.phraseKey));
}

export function mergeKeywordOption(
  map: Map<string, KeywordPickerOption>,
  incoming: KeywordPickerOption,
): void {
  const key = normalizePhraseKey(incoming.phrase);
  if (!key) return;
  const existing = map.get(key);
  if (!existing) {
    map.set(key, { ...incoming, phraseKey: key });
    return;
  }
  const sourceRank = (s: KeywordPickerOption['source']): number => {
    switch (s) {
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
  };
  map.set(key, {
    ...existing,
    phrase: existing.phrase.length >= incoming.phrase.length ? existing.phrase : incoming.phrase,
    searchVolume: Math.max(existing.searchVolume ?? 0, incoming.searchVolume ?? 0) || undefined,
    keywordDifficulty: existing.keywordDifficulty ?? incoming.keywordDifficulty,
    competition: existing.competition ?? incoming.competition,
    competitionIndex: existing.competitionIndex ?? incoming.competitionIndex,
    position: existing.position ?? incoming.position,
    source: sourceRank(existing.source) >= sourceRank(incoming.source) ? existing.source : incoming.source,
  });
}
