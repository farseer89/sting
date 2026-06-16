import { describe, expect, it } from 'vitest';
import { buildRelevanceContext } from './keyword-picker.relevance';
import { buildSearchResultsFromResearch } from './keyword-picker.search-results';

describe('buildSearchResultsFromResearch', () => {
  const ctx = buildRelevanceContext({
    onboardingProfile: {
      services: ['ev charger installation'],
      customerAvatars: [],
      competitors: [],
      marketScope: 'local',
    },
  });

  it('includes all ads related rows without relevance filtering', () => {
    const related = Array.from({ length: 20 }, (_, i) => ({
      phrase: `ev keyword idea ${i}`,
      avgMonthlySearches: 100 + i,
      competition: 'low',
    }));

    const { primary, related: mapped } = buildSearchResultsFromResearch({
      phrase: 'ev charger installation',
      metrics: { avgMonthlySearches: 500, competition: 'medium' },
      adsRelated: related,
      ctx,
    });

    expect(primary?.phrase).toBe('ev charger installation');
    expect(mapped).toHaveLength(20);
  });

  it('dedupes the seed phrase from related results', () => {
    const { related } = buildSearchResultsFromResearch({
      phrase: 'ev charger installation',
      adsRelated: [
        { phrase: 'EV Charger Installation', avgMonthlySearches: 500 },
        { phrase: 'home ev charger', avgMonthlySearches: 200 },
      ],
      ctx,
    });

    expect(related.map((r) => r.phrase)).toEqual(['home ev charger']);
  });

  it('merges gsc similar queries', () => {
    const { related } = buildSearchResultsFromResearch({
      phrase: 'ev charger installation',
      adsRelated: [{ phrase: 'level 2 charger install', avgMonthlySearches: 90 }],
      gscSimilar: [
        { query: 'ev charger installer near me', clicks: 3, impressions: 40, position: 8 },
      ],
      ctx,
    });

    expect(related.some((r) => r.phrase === 'ev charger installer near me')).toBe(true);
    expect(related.some((r) => r.phrase === 'level 2 charger install')).toBe(true);
  });
});
