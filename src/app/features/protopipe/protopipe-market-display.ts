import type { ProtopipeKeywordMarket } from './protopipe.models';

export function formatMarketNumber(value: number | undefined | null): string {
  if (value == null) {
    return '—';
  }
  return value.toLocaleString();
}

export function formatRankDelta(market: ProtopipeKeywordMarket | null | undefined): string {
  if (market?.rank == null) {
    return '—';
  }
  if (market.rankDelta == null || market.rankDelta === 0) {
    return '—';
  }
  const sign = market.rankDelta > 0 ? '↑' : '↓';
  return `${sign}${Math.abs(market.rankDelta)}`;
}

export function rankDeltaSeverity(
  market: ProtopipeKeywordMarket | null | undefined,
): 'success' | 'danger' | 'secondary' {
  if (market?.rankDelta == null || market.rankDelta === 0) {
    return 'secondary';
  }
  return market.rankDelta > 0 ? 'success' : 'danger';
}
