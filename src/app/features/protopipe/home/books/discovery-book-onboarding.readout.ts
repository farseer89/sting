import type { ProtopipeOnboardingProfile } from '@hive/contracts';
import type { ProtopipeSite } from '../../protopipe.models';
import {
  ONBOARDING_MODE_OPTIONS,
  marketReachLabel,
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

function marketDetail(profile: ProtopipeOnboardingProfile): string {
  const parts: string[] = [];
  if (profile.localMarket?.serpLocationName) {
    parts.push(profile.localMarket.serpLocationName);
  } else if (profile.marketScope === 'local' && profile.serpLocationName) {
    parts.push(profile.serpLocationName);
  }
  if (profile.nationalMarket?.serpLocationName) {
    parts.push(profile.nationalMarket.serpLocationName);
  } else if (profile.marketScope === 'national' && profile.serpLocationName) {
    parts.push(profile.serpLocationName);
  }
  if (profile.marketReach === 'local_and_worldwide' && parts.length === 1) {
    parts.push('Worldwide');
  }
  if (parts.length > 0) return parts.join(' · ');
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
    case 'onboarding:competition': {
      const competitorChips = chips(p?.competitors);
      return competitorChips.length > 0
        ? { fields: [], chips: competitorChips }
        : { fields: [field('Competitors', '')] };
    }
    case 'onboarding:market':
      return {
        fields: [
          field(
            'Market reach',
            p?.marketReach ? marketReachLabel(p.marketReach) : '—',
          ),
          field('Locations', p ? marketDetail(p) : '—'),
        ],
      };
    case 'onboarding:business-name':
      return {
        fields: [field('Business name', site?.displayName?.trim() || '—')],
      };
  }
}
