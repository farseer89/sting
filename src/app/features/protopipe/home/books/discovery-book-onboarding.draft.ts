import type {
  ProtopipeOnboardingProfile,
  ProtopipeOnboardingRequest,
  ProtopipeSerpLocationOption,
} from '@hive/contracts';
import type { ProtopipeSite } from '../../protopipe.models';
import {
  MARKET_COUNTRIES,
  type CustomerMarketScope,
  type MarketCountryOption,
  type OnboardingModeId,
} from '../../onboarding/onboarding-market.constants';

const PENDING_SITE_HOSTNAME = 'pending.local';

export interface DiscoveryBookOnboardingDraft {
  onboardingMode: OnboardingModeId;
  websiteUrl: string;
  businessName: string;
  services: string[];
  customerAvatars: string[];
  targetCustomerSites: string[];
  competitors: string[];
  marketScope: CustomerMarketScope | null;
  serpLocationCode?: number;
  serpLocationName?: string;
  city?: string;
  state?: string;
  countryIso?: string;
}

export function draftFromStrategy(
  profile: ProtopipeOnboardingProfile | null,
  site: ProtopipeSite | null,
): DiscoveryBookOnboardingDraft {
  const mode = profile?.onboardingMode ?? 'existing_site';
  const rawWebsite = site?.url?.trim() || site?.hostname?.trim() || '';
  const websiteUrl = isPendingSiteHostname(rawWebsite) ? '' : stripUrlProtocol(rawWebsite);
  return {
    onboardingMode: mode,
    websiteUrl,
    businessName: site?.displayName?.trim() ?? '',
    services: [...(profile?.services ?? [])],
    customerAvatars: profile?.customerAvatars?.length
      ? [...profile.customerAvatars]
      : ['', '', ''],
    targetCustomerSites: [...(profile?.targetCustomerSites ?? [])],
    competitors: [...(profile?.competitors ?? [])],
    marketScope: profile?.marketScope ?? null,
    serpLocationCode: profile?.serpLocationCode,
    serpLocationName: profile?.serpLocationName,
    city: profile?.city,
    state: profile?.state,
    countryIso: profile?.countryIso,
  };
}

export function draftFingerprint(draft: DiscoveryBookOnboardingDraft): string {
  return JSON.stringify({
    ...draft,
    services: [...draft.services].sort(),
    competitors: [...draft.competitors].sort(),
    targetCustomerSites: [...draft.targetCustomerSites].sort(),
    customerAvatars: draft.customerAvatars.map((a) => a.trim()).filter(Boolean),
  });
}

export function draftToOnboardingRequest(
  draft: DiscoveryBookOnboardingDraft,
): ProtopipeOnboardingRequest {
  const scope = draft.marketScope;
  if (!scope) {
    throw new Error('Market scope is required');
  }

  const profile: ProtopipeOnboardingProfile = {
    onboardingMode: draft.onboardingMode,
    services: draft.services.map((s) => s.trim()).filter(Boolean),
    customerAvatars: draft.customerAvatars.map((a) => a.trim()).filter(Boolean),
    targetCustomerSites: draft.targetCustomerSites.map((s) => s.trim()).filter(Boolean),
    competitors: draft.competitors.map((c) => c.trim()).filter(Boolean),
    marketScope: scope,
    serpLocationCode: draft.serpLocationCode,
    serpLocationName: draft.serpLocationName?.trim() || undefined,
    city: draft.city?.trim() || undefined,
    state: draft.state?.trim() || undefined,
    countryIso: draft.countryIso?.trim().toUpperCase() || undefined,
  };

  return {
    businessName: draft.businessName.trim(),
    websiteUrl: draft.onboardingMode === 'strategy_only' ? '' : normalizeUrl(draft.websiteUrl),
    profile,
  };
}

export function countryFromDraft(draft: DiscoveryBookOnboardingDraft): MarketCountryOption | null {
  if (!draft.countryIso) return null;
  return MARKET_COUNTRIES.find((c) => c.iso === draft.countryIso) ?? null;
}

export function locationFromDraft(
  draft: DiscoveryBookOnboardingDraft,
): ProtopipeSerpLocationOption | null {
  if (!draft.serpLocationName || draft.serpLocationCode == null) return null;
  return {
    code: draft.serpLocationCode,
    name: draft.serpLocationName,
    country: draft.countryIso ?? '',
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
