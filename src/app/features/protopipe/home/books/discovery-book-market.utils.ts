import type {
  CustomerMarketScope,
  MarketLocationRef,
  MarketReachMode,
  MarketTier,
  ProtopipeOnboardingProfile,
} from '@hive/contracts';

export const DEFAULT_US_NATIONAL_MARKET: MarketLocationRef = {
  serpLocationCode: 2840,
  serpLocationName: 'United States',
  countryIso: 'US',
};

export function marketTiersForReach(reach: MarketReachMode): MarketTier[] {
  switch (reach) {
    case 'local':
      return ['local'];
    case 'national':
      return ['national'];
    case 'local_and_national':
      return ['local', 'national'];
    case 'local_and_worldwide':
      return ['local', 'worldwide'];
  }
}

export function legacyMarketScopeForReach(reach: MarketReachMode): CustomerMarketScope {
  switch (reach) {
    case 'local':
      return 'local';
    case 'national':
      return 'national';
    case 'local_and_national':
    case 'local_and_worldwide':
      return 'local';
  }
}

export function primarySerpLocation(input: {
  localMarket?: MarketLocationRef | null;
  nationalMarket?: MarketLocationRef | null;
}): MarketLocationRef | null {
  return input.localMarket ?? input.nationalMarket ?? null;
}

export function inferMarketReach(raw: {
  marketReach?: MarketReachMode;
  marketTiers?: MarketTier[];
  marketScope?: CustomerMarketScope;
}): MarketReachMode | null {
  if (
    raw.marketReach === 'local' ||
    raw.marketReach === 'national' ||
    raw.marketReach === 'local_and_national' ||
    raw.marketReach === 'local_and_worldwide'
  ) {
    return raw.marketReach;
  }
  const tiers = raw.marketTiers ?? [];
  if (tiers.length === 1 && tiers.includes('local')) return 'local';
  if (tiers.includes('local') && tiers.includes('national')) return 'local_and_national';
  if (tiers.includes('local') && tiers.includes('worldwide')) return 'local_and_worldwide';
  if (raw.marketScope === 'national') return 'national';
  if (raw.marketScope === 'local') return 'local';
  if (raw.marketScope === 'worldwide') return 'local_and_worldwide';
  return null;
}

export function resolveLocalMarket(raw: ProtopipeOnboardingProfile): MarketLocationRef | undefined {
  if (raw.localMarket?.serpLocationCode) return raw.localMarket;
  if (
    raw.marketScope === 'local' &&
    typeof raw.serpLocationCode === 'number' &&
    raw.serpLocationName
  ) {
    return {
      serpLocationCode: raw.serpLocationCode,
      serpLocationName: raw.serpLocationName,
      city: raw.city,
      state: raw.state,
      countryIso: raw.countryIso,
    };
  }
  return undefined;
}

export function resolveNationalMarket(
  raw: ProtopipeOnboardingProfile,
): MarketLocationRef | undefined {
  if (raw.nationalMarket?.serpLocationCode) return raw.nationalMarket;
  if (
    raw.marketScope === 'national' &&
    typeof raw.serpLocationCode === 'number' &&
    raw.serpLocationName
  ) {
    return {
      serpLocationCode: raw.serpLocationCode,
      serpLocationName: raw.serpLocationName,
      countryIso: raw.countryIso,
    };
  }
  return undefined;
}

export function defaultNationalMarket(): MarketLocationRef {
  return { ...DEFAULT_US_NATIONAL_MARKET };
}
