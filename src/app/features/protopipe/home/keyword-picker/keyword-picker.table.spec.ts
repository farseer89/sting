import { describe, expect, it } from 'vitest';
import {
  marketScopeDetail,
  marketScopeLabel,
  sortPlanRows,
} from './keyword-picker.table';
import type { KeywordPickerOption } from './keyword-picker.types';

describe('keyword-picker.table market scope', () => {
  it('labels market tiers for display', () => {
    const local: KeywordPickerOption = {
      phraseKey: 'ev charger installation::local',
      phrase: 'ev charger installation',
      source: 'ads',
      marketTier: 'local',
      marketLocationName: 'Maui County',
    };

    expect(marketScopeLabel(local)).toBe('Local');
    expect(marketScopeDetail(local)).toBe('Maui County');
    expect(marketScopeLabel({ ...local, marketTier: 'national' })).toBe('Nationwide');
    expect(marketScopeLabel({ ...local, marketTier: 'worldwide' })).toBe('Worldwide');
  });

  it('sorts local, nationwide, worldwide in ascending market order', () => {
    const rows: KeywordPickerOption[] = [
      {
        phraseKey: 'ev charger installation::worldwide',
        phrase: 'ev charger installation',
        source: 'ads',
        marketTier: 'worldwide',
      },
      {
        phraseKey: 'ev charger installation::national',
        phrase: 'ev charger installation',
        source: 'ads',
        marketTier: 'national',
      },
      {
        phraseKey: 'ev charger installation::local',
        phrase: 'ev charger installation',
        source: 'ads',
        marketTier: 'local',
      },
    ];

    expect(sortPlanRows(rows, 'market', 'asc').map((row) => row.marketTier)).toEqual([
      'local',
      'national',
      'worldwide',
    ]);
  });
});
