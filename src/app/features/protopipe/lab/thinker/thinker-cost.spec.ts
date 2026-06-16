import { formatThinkerCostUsd, sumCosts } from './thinker-cost';

describe('thinker-cost', () => {
  it('formats small and large USD amounts', () => {
    expect(formatThinkerCostUsd(0)).toBeNull();
    expect(formatThinkerCostUsd(0.0034)).toBe('$0.0034');
    expect(formatThinkerCostUsd(0.12)).toBe('$0.120');
    expect(formatThinkerCostUsd(1.25)).toBe('$1.25');
  });

  it('sums step costs', () => {
    expect(sumCosts([0.01, 0.02, undefined])).toBe(0.03);
    expect(sumCosts([undefined])).toBeUndefined();
  });
});
