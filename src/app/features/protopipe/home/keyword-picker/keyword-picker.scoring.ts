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

  return score;
}

export function scoreKeywordOptions(options: KeywordPickerOption[]): KeywordPickerOption[] {
  return options
    .filter((o) => {
      const vol = effectiveVolume(o);
      return vol >= MIN_KEYWORD_VOLUME || o.keywordDifficulty != null;
    })
    .map((o) => ({ ...o, opportunityScore: computeOpportunityScore(o) }))
    .sort((a, b) => (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0));
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
  return new Set(scored.slice(0, PRESELECT_COUNT).map((o) => o.phraseKey));
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
  map.set(key, {
    ...existing,
    phrase: existing.phrase.length >= incoming.phrase.length ? existing.phrase : incoming.phrase,
    searchVolume: Math.max(existing.searchVolume ?? 0, incoming.searchVolume ?? 0) || undefined,
    keywordDifficulty: existing.keywordDifficulty ?? incoming.keywordDifficulty,
    competition: existing.competition ?? incoming.competition,
    competitionIndex: existing.competitionIndex ?? incoming.competitionIndex,
    position: existing.position ?? incoming.position,
    source: existing.source === 'ranked' ? existing.source : incoming.source,
  });
}
