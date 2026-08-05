import { describe, expect, it } from 'vitest';
import { buildRelevanceContext } from './keyword-picker.relevance';
import { mergeKeywordOption, scoreKeywordOptions } from './keyword-picker.scoring';
import type { KeywordPickerOption } from './keyword-picker.types';

describe('scoreKeywordOptions', () => {
  it('keeps discovery candidates without metrics', () => {
    const ctx = buildRelevanceContext({
      onboardingProfile: {
        services: ['EV charger installation'],
        customerAvatars: ['Homeowner buying an EV'],
        competitors: [],
        marketScope: 'local',
      },
    });

    const options: KeywordPickerOption[] = [
      {
        phraseKey: 'ev charger installation cost',
        phrase: 'ev charger installation cost',
        source: 'ads',
        discoverySource: 'ads_ideas',
        intent: 'transactional',
        funnelStage: 'decision',
      },
    ];

    expect(scoreKeywordOptions(options, ctx)).toHaveLength(1);
  });

  it('still filters generic low-volume rows without discovery context', () => {
    const ctx = buildRelevanceContext({
      onboardingProfile: {
        services: ['EV charger installation'],
        customerAvatars: [],
        competitors: [],
        marketScope: 'local',
      },
    });

    const options: KeywordPickerOption[] = [
      {
        phraseKey: 'ev charger installation cost',
        phrase: 'ev charger installation cost',
        source: 'ads',
      },
    ];

    expect(scoreKeywordOptions(options, ctx)).toHaveLength(0);
  });

  it('keeps the same phrase separate across market tiers', () => {
    const map = new Map<string, KeywordPickerOption>();

    mergeKeywordOption(map, {
      phraseKey: 'ev charger installation::local',
      phrase: 'ev charger installation',
      source: 'ads',
      marketTier: 'local',
      marketLocationName: 'Maui County',
      searchVolume: 90,
    });
    mergeKeywordOption(map, {
      phraseKey: 'ev charger installation::national',
      phrase: 'ev charger installation',
      source: 'ads',
      marketTier: 'national',
      marketLocationName: 'United States',
      searchVolume: 1200,
    });

    expect([...map.values()].map((row) => row.marketTier)).toEqual(['local', 'national']);
  });
});
