import type { KeywordRelevanceContext } from './keyword-picker.relevance';
import { computeRelevanceScore } from './keyword-picker.relevance';
import type { KeywordPickerOption } from './keyword-picker.types';
import { comparePlanRows } from './keyword-picker.table';
import {
  ASSUMED_DIFFICULTY,
  MIN_KEYWORD_VOLUME,
  PRESELECT_COUNT,
  SUGGESTED_PANEL_COUNT,
  keywordPickerKey,
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

export interface ScoreKeywordOptionsConfig {
  /** Include long-tail keywords (volume below MIN_KEYWORD_VOLUME) in the pool. */
  strategyOnly?: boolean;
}

function hasDiscoverySignal(option: KeywordPickerOption): boolean {
  return (
    option.discoverySource != null ||
    option.intent != null ||
    option.funnelStage != null ||
    option.avatarId != null ||
    option.serpFeatures != null
  );
}

export function scoreKeywordOptions(
  options: KeywordPickerOption[],
  ctx?: KeywordRelevanceContext,
  config?: ScoreKeywordOptionsConfig,
): KeywordPickerOption[] {
  const minVolume = config?.strategyOnly ? 0 : MIN_KEYWORD_VOLUME;
  return options
    .map((o) => ({
      ...o,
      relevanceScore: ctx ? computeRelevanceScore(o.phrase, ctx) : o.relevanceScore,
    }))
    .filter((o) => {
      const vol = effectiveVolume(o);
      return (
        vol >= minVolume ||
        o.keywordDifficulty != null ||
        o.source === 'gsc' ||
        o.source === 'custom' ||
        (hasDiscoverySignal(o) && (o.relevanceScore ?? 0) >= 15)
      );
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

/** Match pool row by phraseKey or normalized phrase (saved keys omit market suffix). */
export function normalizePhraseFromKey(key: string): string {
  return normalizePhraseKey(key.split('::')[0] ?? key);
}

export function poolOptionsForPhrase(
  scored: KeywordPickerOption[],
  phraseOrKey: string,
): KeywordPickerOption[] {
  const normalized = normalizePhraseFromKey(phraseOrKey);
  return scored.filter((option) => normalizePhraseKey(option.phrase) === normalized);
}

export function findPoolOption(
  scored: KeywordPickerOption[],
  key: string,
): KeywordPickerOption | undefined {
  const direct = scored.find((o) => o.phraseKey === key);
  if (direct) return direct;
  const normalized = normalizePhraseKey(key);
  return scored.find((o) => normalizePhraseKey(o.phrase) === normalized);
}

export function buildInitialSelection(
  scored: KeywordPickerOption[],
  savedPhraseKeys: Set<string>,
): Map<string, KeywordPickerOption> {
  const selected = new Map<string, KeywordPickerOption>();

  if (savedPhraseKeys.size > 0) {
    for (const key of savedPhraseKeys) {
      const matches = poolOptionsForPhrase(scored, key);
      if (matches.length > 0) {
        for (const option of matches) {
          selected.set(option.phraseKey, option);
        }
        continue;
      }
      selected.set(key, {
        phraseKey: key,
        phrase: key,
        source: 'custom',
      });
    }
    return selected;
  }

  const preselected = pickPreselectedKeys(scored, savedPhraseKeys);
  for (const key of preselected) {
    const fromPool = findPoolOption(scored, key);
    if (fromPool) {
      selected.set(fromPool.phraseKey, fromPool);
    }
  }

  return selected;
}

export function isPhraseSelected(
  selected: Map<string, KeywordPickerOption>,
  phraseOrKey: string,
): boolean {
  const normalized = normalizePhraseFromKey(phraseOrKey);
  for (const option of selected.values()) {
    if (normalizePhraseKey(option.phrase) === normalized) return true;
  }
  return false;
}

/** Preserve user picks when discovery finishes; refresh metadata from the scored pool. */
export function refreshSelectedFromPool(
  current: Map<string, KeywordPickerOption>,
  scored: KeywordPickerOption[],
): Map<string, KeywordPickerOption> {
  const next = new Map<string, KeywordPickerOption>();
  for (const [key, option] of current) {
    const fromPool = findPoolOption(scored, key) ?? findPoolOption(scored, option.phrase);
    next.set(fromPool?.phraseKey ?? key, fromPool ?? option);
  }
  return next;
}

/** Collapse local/national row picks to one phrase before confirm (API rejects duplicate phrases). */
export function dedupeConfirmKeywords(options: KeywordPickerOption[]): KeywordPickerOption[] {
  const byPhrase = new Map<string, KeywordPickerOption>();
  for (const option of options) {
    const key = normalizePhraseKey(option.phrase);
    if (!key) continue;
    const existing = byPhrase.get(key);
    if (!existing) {
      byPhrase.set(key, option);
      continue;
    }
    byPhrase.set(key, {
      ...existing,
      ...option,
      phrase: existing.phrase.length >= option.phrase.length ? existing.phrase : option.phrase,
      searchVolume: Math.max(existing.searchVolume ?? 0, option.searchVolume ?? 0) || undefined,
      keywordDifficulty: existing.keywordDifficulty ?? option.keywordDifficulty,
      marketTier: existing.marketTier ?? option.marketTier,
      marketLocationName: existing.marketLocationName ?? option.marketLocationName,
    });
  }
  return [...byPhrase.values()];
}

export function sortSelectedPanelList(options: KeywordPickerOption[]): KeywordPickerOption[] {
  return [...dedupeConfirmKeywords(options)].sort(
    (a, b) => comparePlanRows(a, b, 'opportunity') * -1,
  );
}

export function mergeKeywordOption(
  map: Map<string, KeywordPickerOption>,
  incoming: KeywordPickerOption,
): void {
  const key = incoming.phraseKey || keywordPickerKey(incoming.phrase, incoming.marketTier);
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
    marketTier: existing.marketTier ?? incoming.marketTier,
    marketLocationName: existing.marketLocationName ?? incoming.marketLocationName,
    source: sourceRank(existing.source) >= sourceRank(incoming.source) ? existing.source : incoming.source,
  });
}
