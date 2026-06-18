import { describe, expect, it } from 'vitest';
import {
  buildRelevanceContext,
  computeRelevanceScore,
  isRelevantForPicker,
  isRelevantForSeedExpansion,
  relevanceScoreForDisplay,
} from './keyword-picker.relevance';

const evCtx = buildRelevanceContext({
  onboardingProfile: {
    services: ['ev charger installation'],
    customerAvatars: ['homeowner with a garage'],
    competitors: ['https://competitor.example'],
    marketScope: 'local',
    city: 'Austin',
    state: 'TX',
  },
});

describe('keyword-picker.relevance', () => {
  it('relevanceScoreForDisplay matches computeRelevanceScore', () => {
    expect(relevanceScoreForDisplay('ev charger installation cost', evCtx)).toBe(
      computeRelevanceScore('ev charger installation cost', evCtx),
    );
  });

  it('manual search sources always pass isRelevantForPicker', () => {
    expect(isRelevantForPicker('random unrelated phrase', evCtx, 'research')).toBe(true);
    expect(isRelevantForPicker('random unrelated phrase', evCtx, 'custom')).toBe(true);
  });

  it('ads_related uses strict threshold for auto-discovery', () => {
    expect(isRelevantForPicker('electric vehicle', evCtx, 'ads_related')).toBe(false);
    expect(isRelevantForPicker('ev charger installation cost', evCtx, 'ads_related')).toBe(true);
  });

  it('strategy-only relaxes auto-discovery thresholds', () => {
    expect(
      isRelevantForPicker('electric vehicle', evCtx, 'ads_related', { strategyOnly: true }),
    ).toBe(false);
    expect(
      isRelevantForPicker('ev charger cost', evCtx, 'ads_related', { strategyOnly: true }),
    ).toBe(true);
  });

  it('isRelevantForSeedExpansion allows ads_related at fit >= 15', () => {
    const phrase = 'ev charger installation';
    expect(computeRelevanceScore(phrase, evCtx)).toBeGreaterThanOrEqual(15);
    expect(isRelevantForSeedExpansion(phrase, evCtx, 'ads_related')).toBe(true);
  });

  it('tokenizes target customer example domains into relevance context', () => {
    const ctx = buildRelevanceContext({
      onboardingProfile: {
        services: ['consulting'],
        customerAvatars: ['engineering firms'],
        competitors: [],
        targetCustomerSites: ['acme-engineering.com'],
        marketScope: 'national',
      },
    });
    expect(ctx.distinctiveTokens).toContain('engineering');
    expect(ctx.distinctiveTokens).toContain('acme');
  });
});
