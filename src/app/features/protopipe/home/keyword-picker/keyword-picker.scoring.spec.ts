import { describe, expect, it } from 'vitest';
import { buildRelevanceContext } from './keyword-picker.relevance';
import {
  buildInitialSelection,
  dedupeConfirmKeywords,
  isPhraseSelected,
  mergeKeywordOption,
  refreshSelectedFromPool,
  scoreKeywordOptions,
} from './keyword-picker.scoring';
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

describe('keyword selection helpers', () => {
  const pool: KeywordPickerOption[] = [
    {
      phraseKey: 'live wedding painting::local',
      phrase: 'live wedding painting',
      source: 'ads',
      marketTier: 'local',
      searchVolume: 3600,
    },
    {
      phraseKey: 'wedding painter maui::local',
      phrase: 'wedding painter maui',
      source: 'ads',
      marketTier: 'local',
      searchVolume: 800,
    },
  ];

  it('matches saved phrase keys to market-specific pool rows', () => {
    const selected = buildInitialSelection(pool, new Set(['live wedding painting']));
    expect(selected.size).toBe(1);
    expect(selected.get('live wedding painting::local')?.phrase).toBe('live wedding painting');
  });

  it('selects every market row for a saved phrase', () => {
    const expandedPool: KeywordPickerOption[] = [
      ...pool,
      {
        phraseKey: 'live wedding painting::national',
        phrase: 'live wedding painting',
        source: 'ads',
        marketTier: 'national',
        searchVolume: 3600,
      },
    ];
    const selected = buildInitialSelection(expandedPool, new Set(['live wedding painting']));
    expect(selected.size).toBe(2);
    expect(isPhraseSelected(selected, 'live wedding painting::national')).toBe(true);
    expect(isPhraseSelected(selected, 'live wedding painting::local')).toBe(true);
  });

  it('preserves user selections when the pool refreshes', () => {
    const current = new Map<string, KeywordPickerOption>([
      ['wedding painter maui::local', pool[1]],
    ]);
    const next = refreshSelectedFromPool(current, pool);
    expect(next.size).toBe(1);
    expect(next.get('wedding painter maui::local')?.searchVolume).toBe(800);
  });

  it('dedupes local and national picks to one confirm row per phrase', () => {
    const deduped = dedupeConfirmKeywords([
      pool[0],
      {
        ...pool[0],
        phraseKey: 'live wedding painting::national',
        marketTier: 'national',
      },
    ]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.marketTier).toBe('local');
  });
});
