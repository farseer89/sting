import type {
  MarketLocationRef,
  ProtopipeOnboardingProfile,
  ProtopipeOnboardingRequest,
  ProtopipeSerpLocationOption,
  SaveOnboardingProgressRequest,
} from '@hive/contracts';
import {
  defaultNationalMarket,
  inferMarketReach,
  legacyMarketScopeForReach,
  marketTiersForReach,
  primarySerpLocation,
  resolveLocalMarket,
  resolveNationalMarket,
} from './discovery-book-market.utils';
import type { ProtopipeSite } from '../../protopipe.models';
import {
  MARKET_COUNTRIES,
  marketReachNeedsCountry,
  marketReachNeedsLocal,
  type CustomerMarketScope,
  type MarketCountryOption,
  type MarketReachMode,
  type OnboardingModeId,
} from '../../onboarding/onboarding-market.constants';
import type { DiscoveryBookOnboardingStepId } from './discovery-book-onboarding.steps';

const PENDING_SITE_HOSTNAME = 'pending.local';

export interface DiscoveryBookOnboardingDraft {
  onboardingMode: OnboardingModeId;
  websiteUrl: string;
  businessName: string;
  services: string[];
  customerAvatars: string[];
  targetCustomerSites: string[];
  competitors: string[];
  marketReach: MarketReachMode | null;
  localMarket: MarketLocationRef | null;
  nationalMarket: MarketLocationRef | null;
  marketScope: CustomerMarketScope | null;
  serpLocationCode?: number;
  serpLocationName?: string;
  city?: string;
  state?: string;
  countryIso?: string;
}

export function defaultMarketDraft(): Pick<
  DiscoveryBookOnboardingDraft,
  | 'marketReach'
  | 'localMarket'
  | 'nationalMarket'
  | 'marketScope'
  | 'serpLocationCode'
  | 'serpLocationName'
  | 'countryIso'
> {
  const nationalMarket = defaultNationalMarket();
  return {
    marketReach: 'national',
    localMarket: null,
    nationalMarket,
    marketScope: 'national',
    serpLocationCode: nationalMarket.serpLocationCode,
    serpLocationName: nationalMarket.serpLocationName,
    countryIso: nationalMarket.countryIso,
  };
}

export function syncLegacyMarketFields(
  draft: DiscoveryBookOnboardingDraft,
): DiscoveryBookOnboardingDraft {
  if (!draft.marketReach) return draft;
  const localMarket = marketReachNeedsLocal(draft.marketReach) ? draft.localMarket : null;
  const nationalMarket = marketReachNeedsCountry(draft.marketReach)
    ? (draft.nationalMarket ?? defaultNationalMarket())
    : null;
  const primary = primarySerpLocation({ localMarket, nationalMarket });
  return {
    ...draft,
    localMarket,
    nationalMarket,
    marketScope: legacyMarketScopeForReach(draft.marketReach),
    serpLocationCode: primary?.serpLocationCode,
    serpLocationName: primary?.serpLocationName,
    city: localMarket?.city,
    state: localMarket?.state,
    countryIso: nationalMarket?.countryIso ?? localMarket?.countryIso,
  };
}

export function draftFromStrategy(
  profile: ProtopipeOnboardingProfile | null,
  site: ProtopipeSite | null,
): DiscoveryBookOnboardingDraft {
  const mode = profile?.onboardingMode ?? 'existing_site';
  const rawWebsite = site?.url?.trim() || site?.hostname?.trim() || '';
  const websiteUrl = isPendingSiteHostname(rawWebsite) ? '' : stripUrlProtocol(rawWebsite);

  const reach = profile ? inferMarketReach(profile) : null;
  const localMarket = profile ? resolveLocalMarket(profile) ?? null : null;
  const nationalMarket = profile
    ? resolveNationalMarket(profile) ?? (reach === 'national' ? defaultNationalMarket() : null)
    : null;

  const base: DiscoveryBookOnboardingDraft = {
    onboardingMode: mode,
    websiteUrl,
    businessName: site?.displayName?.trim() ?? '',
    services: [...(profile?.services ?? [])],
    customerAvatars: profile?.customerAvatars?.length
      ? [...profile.customerAvatars]
      : [''],
    targetCustomerSites: [...(profile?.targetCustomerSites ?? [])],
    competitors: [...(profile?.competitors ?? [])],
    marketReach: reach,
    localMarket,
    nationalMarket,
    marketScope: profile?.marketScope ?? null,
    serpLocationCode: profile?.serpLocationCode,
    serpLocationName: profile?.serpLocationName,
    city: profile?.city,
    state: profile?.state,
    countryIso: profile?.countryIso,
  };

  if (!base.marketReach) {
    return { ...base, ...defaultMarketDraft() };
  }

  return syncLegacyMarketFields(base);
}

export function draftFingerprint(draft: DiscoveryBookOnboardingDraft): string {
  return JSON.stringify({
    ...draft,
    services: [...draft.services].sort(),
    competitors: [...draft.competitors].sort(),
    targetCustomerSites: [...draft.targetCustomerSites].sort(),
    customerAvatars: draft.customerAvatars.map((a) => a.trim()).filter(Boolean),
    localMarket: draft.localMarket,
    nationalMarket: draft.nationalMarket,
  });
}

export function draftToOnboardingRequest(
  draft: DiscoveryBookOnboardingDraft,
): ProtopipeOnboardingRequest {
  const synced = syncLegacyMarketFields(draft);
  const reach = synced.marketReach;
  if (!reach) {
    throw new Error('Market reach is required');
  }

  const profile: ProtopipeOnboardingProfile = {
    onboardingMode: synced.onboardingMode,
    services: synced.services.map((s) => s.trim()).filter(Boolean),
    customerAvatars: synced.customerAvatars.map((a) => a.trim()).filter(Boolean),
    targetCustomerSites: synced.targetCustomerSites.map((s) => s.trim()).filter(Boolean),
    competitors: synced.competitors.map((c) => c.trim()).filter(Boolean),
    marketReach: reach,
    marketTiers: marketTiersForReach(reach),
    localMarket: synced.localMarket ?? undefined,
    nationalMarket: synced.nationalMarket ?? undefined,
    marketScope: synced.marketScope!,
    serpLocationCode: synced.serpLocationCode,
    serpLocationName: synced.serpLocationName?.trim() || undefined,
    city: synced.city?.trim() || undefined,
    state: synced.state?.trim() || undefined,
    countryIso: synced.countryIso?.trim().toUpperCase() || undefined,
  };

  return {
    businessName: synced.businessName.trim(),
    websiteUrl: synced.onboardingMode === 'strategy_only' ? '' : normalizeUrl(synced.websiteUrl),
    profile,
  };
}

export function draftToProgressRequest(
  draft: DiscoveryBookOnboardingDraft,
  completedStepId: DiscoveryBookOnboardingStepId,
  resumeStepId: DiscoveryBookOnboardingStepId,
): SaveOnboardingProgressRequest {
  const synced = syncLegacyMarketFields(draft);
  const reach = synced.marketReach;

  const profile: Partial<ProtopipeOnboardingProfile> = {
    onboardingMode: synced.onboardingMode,
    services: synced.services.map((s) => s.trim()).filter(Boolean),
    customerAvatars: synced.customerAvatars.map((a) => a.trim()).filter(Boolean),
    targetCustomerSites: synced.targetCustomerSites.map((s) => s.trim()).filter(Boolean),
    competitors: synced.competitors.map((c) => c.trim()).filter(Boolean),
  };

  if (reach) {
    profile.marketReach = reach;
    profile.marketTiers = marketTiersForReach(reach);
    profile.localMarket = synced.localMarket ?? undefined;
    profile.nationalMarket = synced.nationalMarket ?? undefined;
    profile.marketScope = synced.marketScope ?? undefined;
    profile.serpLocationCode = synced.serpLocationCode;
    profile.serpLocationName = synced.serpLocationName?.trim() || undefined;
    profile.city = synced.city?.trim() || undefined;
    profile.state = synced.state?.trim() || undefined;
    profile.countryIso = synced.countryIso?.trim().toUpperCase() || undefined;
  }

  return {
    completedStepId,
    resumeStepId,
    businessName: synced.businessName.trim() || undefined,
    websiteUrl: synced.onboardingMode === 'strategy_only' ? '' : normalizeUrl(synced.websiteUrl),
    profile,
  };
}

export function countryFromDraft(draft: DiscoveryBookOnboardingDraft): MarketCountryOption | null {
  const iso = draft.nationalMarket?.countryIso ?? draft.countryIso;
  if (!iso) return null;
  return MARKET_COUNTRIES.find((c) => c.iso === iso) ?? null;
}

export function locationFromDraft(
  draft: DiscoveryBookOnboardingDraft,
): ProtopipeSerpLocationOption | null {
  const local = draft.localMarket;
  if (!local?.serpLocationName || local.serpLocationCode == null) return null;
  return {
    code: local.serpLocationCode,
    name: local.serpLocationName,
    country: local.countryIso ?? '',
  };
}

export function stripUrlProtocol(raw: string): string {
  return raw.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
}

export function isPendingSiteHostname(raw: string): boolean {
  const host = stripUrlProtocol(raw.trim()).replace(/^www\./i, '').toLowerCase();
  return host === PENDING_SITE_HOSTNAME;
}

export function normalizeUrl(raw: string): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function normalizeDomain(raw: string): string {
  return stripUrlProtocol(raw.trim()).toLowerCase();
}
