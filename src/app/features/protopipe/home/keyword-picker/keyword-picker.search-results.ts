import type {
  ProtopipeResearchAdsMetrics,
  ProtopipeResearchGscSimilarQuery,
  ProtopipeResearchRelatedKeyword,
} from '@hive/contracts';
import { computeRelevanceScore, type KeywordRelevanceContext } from './keyword-picker.relevance';
import type { KeywordPickerOption } from './keyword-picker.types';
import { normalizePhraseKey } from './keyword-picker.types';

export function buildSearchResultsFromResearch(input: {
  phrase: string;
  metrics?: ProtopipeResearchAdsMetrics;
  adsRelated?: ProtopipeResearchRelatedKeyword[];
  gscSimilar?: ProtopipeResearchGscSimilarQuery[];
  ctx: KeywordRelevanceContext;
}): { primary: KeywordPickerOption | null; related: KeywordPickerOption[] } {
  const phrase = input.phrase.trim();
  const seedKey = normalizePhraseKey(phrase);
  if (!seedKey) {
    return { primary: null, related: [] };
  }

  let primary: KeywordPickerOption | null = null;
  const metrics = input.metrics;
  if (metrics) {
    primary = {
      phraseKey: seedKey,
      phrase,
      searchVolume: metrics.avgMonthlySearches,
      competition: metrics.competition,
      competitionIndex: metrics.competitionIndex,
      source: 'research',
      relevanceScore: computeRelevanceScore(phrase, input.ctx),
    };
  } else {
    primary = {
      phraseKey: seedKey,
      phrase,
      source: 'research',
      relevanceScore: computeRelevanceScore(phrase, input.ctx),
    };
  }

  const byKey = new Map<string, KeywordPickerOption>();

  for (const row of input.adsRelated ?? []) {
    const p = (row.phrase ?? '').trim();
    if (!p) continue;
    const key = normalizePhraseKey(p);
    if (key === seedKey) continue;
    byKey.set(key, {
      phraseKey: key,
      phrase: p,
      searchVolume: row.avgMonthlySearches,
      competition: row.competition,
      source: 'ads_related',
      relevanceScore: computeRelevanceScore(p, input.ctx),
    });
  }

  for (const row of input.gscSimilar ?? []) {
    const p = (row.query ?? '').trim();
    if (!p) continue;
    const key = normalizePhraseKey(p);
    if (key === seedKey) continue;
    const existing = byKey.get(key);
    byKey.set(key, {
      phraseKey: key,
      phrase: p,
      searchVolume: existing?.searchVolume,
      competition: existing?.competition,
      position: row.position,
      source: existing ? existing.source : 'gsc',
      relevanceScore: computeRelevanceScore(p, input.ctx),
    });
  }

  const related = [...byKey.values()].sort((a, b) => {
    const relDiff = (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
    if (relDiff !== 0) return relDiff;
    return (b.searchVolume ?? 0) - (a.searchVolume ?? 0);
  });

  return { primary, related };
}
