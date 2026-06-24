import { describe, expect, it } from 'vitest';
import {
  draftFromStrategy,
  draftToOnboardingRequest,
  isPendingSiteHostname,
} from './discovery-book-onboarding.draft';

describe('discovery-book-onboarding.draft', () => {
  it('does not prefill pending.local placeholder sites', () => {
    const draft = draftFromStrategy(null, {
      id: 's1',
      displayName: 'My site',
      url: 'https://pending.local',
      hostname: 'pending.local',
    });
    expect(draft.websiteUrl).toBe('');
  });

  it('prefills a real site hostname', () => {
    const draft = draftFromStrategy(null, {
      id: 's1',
      displayName: 'Maui Electric',
      url: 'https://mauielectric.com',
      hostname: 'mauielectric.com',
    });
    expect(draft.websiteUrl).toBe('mauielectric.com');
  });

  it('detects pending placeholder hostnames', () => {
    expect(isPendingSiteHostname('pending.local')).toBe(true);
    expect(isPendingSiteHostname('https://pending.local')).toBe(true);
    expect(isPendingSiteHostname('mauielectric.com')).toBe(false);
  });

  it('builds onboarding request with multiple customer avatars', () => {
    const body = draftToOnboardingRequest({
      onboardingMode: 'existing_site',
      websiteUrl: 'mauielectric.com',
      businessName: 'Maui Electric',
      services: ['EV charger installation'],
      customerAvatars: ['A', 'B', 'C', 'D'],
      targetCustomerSites: [],
      competitors: [],
      marketScope: 'local',
      serpLocationCode: 1234,
      serpLocationName: 'Maui, Hawaii, United States',
      city: 'Maui',
      state: 'Hawaii',
      countryIso: 'US',
    });

    expect(body.profile?.customerAvatars).toHaveLength(4);
    expect(body.websiteUrl).toBe('https://mauielectric.com');
  });
});
