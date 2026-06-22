import type { ProtopipeOnboardingProfile } from '@hive/contracts';
import type { ProtopipeSite } from '../../protopipe.models';
import {
  MARKET_SCOPE_OPTIONS,
  ONBOARDING_MODE_OPTIONS,
} from '../../onboarding/onboarding-market.constants';
import type { DiscoveryBookOnboardingStepId } from './discovery-book-onboarding.steps';

export interface DiscoveryBookOnboardingField {
  label: string;
  value: string;
  isEmpty?: boolean;
}

export interface DiscoveryBookOnboardingReadout {
  fields: DiscoveryBookOnboardingField[];
  chips?: readonly string[];
}

function modeLabel(mode: ProtopipeOnboardingProfile['onboardingMode'] | undefined): string {
  const id = mode ?? 'existing_site';
  return ONBOARDING_MODE_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

function scopeLabel(scope: ProtopipeOnboardingProfile['marketScope'] | undefined): string {
  if (!scope) return '—';
  return MARKET_SCOPE_OPTIONS.find((o) => o.id === scope)?.label ?? scope;
}

function marketDetail(profile: ProtopipeOnboardingProfile): string {
  const scope = profile.marketScope;
  if (scope === 'worldwide') return 'Worldwide';
  if (profile.serpLocationName?.trim()) return profile.serpLocationName.trim();
  if (scope === 'local') {
    const parts = [profile.city, profile.state].filter((p) => p?.trim());
    if (parts.length > 0) return parts.join(', ');
  }
  if (profile.countryIso?.trim()) return profile.countryIso.trim();
  return '—';
}

function websiteValue(site: ProtopipeSite | null): string {
  const url = site?.url?.trim();
  if (url) return url;
  const hostname = site?.hostname?.trim();
  if (hostname) return hostname;
  return '—';
}

function field(label: string, value: string): DiscoveryBookOnboardingField {
  const trimmed = value.trim();
  return {
    label,
    value: trimmed || '—',
    isEmpty: trimmed.length === 0,
  };
}

function chips(values: readonly string[] | undefined): readonly string[] {
  return (values ?? []).map((v) => v.trim()).filter(Boolean);
}

export function buildDiscoveryBookOnboardingReadout(
  stepId: DiscoveryBookOnboardingStepId,
  profile: ProtopipeOnboardingProfile | null,
  site: ProtopipeSite | null,
): DiscoveryBookOnboardingReadout {
  const p = profile;

  switch (stepId) {
    case 'onboarding:getting-started': {
      const mode = p?.onboardingMode ?? 'existing_site';
      const fields: DiscoveryBookOnboardingField[] = [
        field('Starting path', modeLabel(mode)),
      ];
      if (mode === 'existing_site') {
        fields.push(field('Website', websiteValue(site)));
      }
      return { fields };
    }
    case 'onboarding:offer': {
      const serviceChips = chips(p?.services);
      return serviceChips.length > 0
        ? { fields: [], chips: serviceChips }
        : { fields: [field('Services', '')] };
    }
    case 'onboarding:customers': {
      const avatarChips = chips(p?.customerAvatars);
      return avatarChips.length > 0
        ? { fields: [], chips: avatarChips }
        : { fields: [field('Customer profiles', '')] };
    }
    case 'onboarding:ideal-customers': {
      const targetChips = chips(p?.targetCustomerSites);
      return targetChips.length > 0
        ? { fields: [], chips: targetChips }
        : { fields: [field('Target examples', '')] };
    }
    case 'onboarding:competition': {
      const competitorChips = chips(p?.competitors);
      return competitorChips.length > 0
        ? { fields: [], chips: competitorChips }
        : { fields: [field('Competitors', '')] };
    }
    case 'onboarding:market':
      return {
        fields: [
          field('Market scope', scopeLabel(p?.marketScope)),
          field('Location', p ? marketDetail(p) : '—'),
        ],
      };
    case 'onboarding:business-name':
      return {
        fields: [field('Business name', site?.displayName?.trim() || '—')],
      };
  }
}
