import { describe, expect, it } from 'vitest';
import { buildRelevanceContext } from './keyword-picker.relevance';
import { scoreKeywordOptions } from './keyword-picker.scoring';
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
});
