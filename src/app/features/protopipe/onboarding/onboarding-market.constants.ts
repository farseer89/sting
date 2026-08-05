/** Where the business's customers are — drives onboarding market step. */
export type CustomerMarketScope = 'local' | 'national' | 'worldwide';

/** Primary market reach preset (replaces exclusive local/national/worldwide pick). */
export type MarketReachMode = 'local' | 'national' | 'local_and_national' | 'local_and_worldwide';

/** How the user started onboarding — step 1 fork. */
export type OnboardingModeId = 'existing_site' | 'strategy_only';

export interface OnboardingModeOption {
  id: OnboardingModeId;
  label: string;
  description: string;
  icon: string;
}

export const ONBOARDING_MODE_OPTIONS: readonly OnboardingModeOption[] = [
  {
    id: 'existing_site',
    label: 'Use my website',
    description: 'Scan my site and start with what Google already understands',
    icon: 'pi pi-globe',
  },
  {
    id: 'strategy_only',
    label: 'No website yet',
    description: 'Build a keyword strategy from what I sell and who I want',
    icon: 'pi pi-lightbulb',
  },
];

export interface MarketReachOption {
  id: MarketReachMode;
  label: string;
  description: string;
  icon: string;
}

/** @deprecated Use {@link MARKET_REACH_OPTIONS} */
export interface MarketScopeOption {
  id: CustomerMarketScope;
  label: string;
  description: string;
  icon: string;
}

export interface MarketCountryOption {
  code: number;
  name: string;
  iso: string;
}

export const DEFAULT_US_COUNTRY: MarketCountryOption = {
  code: 2840,
  name: 'United States',
  iso: 'US',
};

export const MARKET_REACH_OPTIONS: readonly MarketReachOption[] = [
  {
    id: 'local',
    label: 'Local only',
    description: 'Search demand in your town, city, or service area',
    icon: 'pi pi-map-marker',
  },
  {
    id: 'national',
    label: 'Nationwide',
    description: 'Search demand across a country (United States by default)',
    icon: 'pi pi-flag',
  },
  {
    id: 'local_and_national',
    label: 'Local + nationwide',
    description: 'Your town or city and national volume side by side',
    icon: 'pi pi-map-marker',
  },
  {
    id: 'local_and_worldwide',
    label: 'Local + worldwide',
    description: 'Your area plus global search interest',
    icon: 'pi pi-globe',
  },
];

/** @deprecated Legacy single-scope options — kept for readouts/migration labels. */
export const MARKET_SCOPE_OPTIONS: readonly MarketScopeOption[] = [
  {
    id: 'local',
    label: 'Local',
    description: 'Town or city',
    icon: 'pi pi-map-marker',
  },
  {
    id: 'national',
    label: 'National',
    description: 'One country',
    icon: 'pi pi-flag',
  },
  {
    id: 'worldwide',
    label: 'Worldwide',
    description: 'No borders',
    icon: 'pi pi-globe',
  },
];

/** DataForSEO country-level SERP location codes (common markets). */
export const MARKET_COUNTRIES: readonly MarketCountryOption[] = [
  DEFAULT_US_COUNTRY,
  { code: 2124, name: 'Canada', iso: 'CA' },
  { code: 2826, name: 'United Kingdom', iso: 'GB' },
  { code: 2036, name: 'Australia', iso: 'AU' },
  { code: 2276, name: 'Germany', iso: 'DE' },
  { code: 2250, name: 'France', iso: 'FR' },
  { code: 2724, name: 'Spain', iso: 'ES' },
  { code: 2380, name: 'Italy', iso: 'IT' },
  { code: 2528, name: 'Netherlands', iso: 'NL' },
  { code: 2756, name: 'Switzerland', iso: 'CH' },
  { code: 2356, name: 'India', iso: 'IN' },
  { code: 2392, name: 'Japan', iso: 'JP' },
  { code: 2410, name: 'South Korea', iso: 'KR' },
  { code: 2076, name: 'Brazil', iso: 'BR' },
  { code: 2484, name: 'Mexico', iso: 'MX' },
  { code: 2710, name: 'South Africa', iso: 'ZA' },
  { code: 2554, name: 'New Zealand', iso: 'NZ' },
  { code: 2372, name: 'Ireland', iso: 'IE' },
  { code: 2056, name: 'Belgium', iso: 'BE' },
  { code: 2616, name: 'Poland', iso: 'PL' },
];

export function marketReachNeedsLocal(reach: MarketReachMode): boolean {
  return reach === 'local' || reach === 'local_and_national' || reach === 'local_and_worldwide';
}

export function marketReachNeedsCountry(reach: MarketReachMode): boolean {
  return reach === 'national' || reach === 'local_and_national';
}

export function marketReachLabel(reach: MarketReachMode | null | undefined): string {
  if (!reach) return '—';
  return MARKET_REACH_OPTIONS.find((o) => o.id === reach)?.label ?? reach;
}
