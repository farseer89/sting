import { describe, expect, it } from 'vitest';
import type { ProtopipeOnboardingProfile } from '@hive/contracts';
import { buildDiscoveryBookOnboardingReadout } from './discovery-book-onboarding.readout';

describe('buildDiscoveryBookOnboardingReadout', () => {
  const profile: ProtopipeOnboardingProfile = {
    onboardingMode: 'existing_site',
    services: ['EV charger installation'],
    customerAvatars: ['Homeowner with a Tesla'],
    competitors: ['competitor.com'],
    targetCustomerSites: ['acme-engineering.com'],
    marketScope: 'local',
    serpLocationName: 'Maui, Hawaii, United States',
    city: 'Maui',
    state: 'Hawaii',
  };

  const site = {
    id: 's1',
    displayName: 'Maui Electric',
    url: 'https://mauielectric.com',
    hostname: 'mauielectric.com',
  };

  it('maps getting started from profile and site', () => {
    const readout = buildDiscoveryBookOnboardingReadout(
      'onboarding:getting-started',
      profile,
      site,
    );
    expect(readout.fields[0]?.value).toBe('I have a website');
    expect(readout.fields[1]?.value).toBe('https://mauielectric.com');
  });

  it('maps chip steps from profile arrays', () => {
    expect(
      buildDiscoveryBookOnboardingReadout('onboarding:offer', profile, site).chips,
    ).toEqual(['EV charger installation']);
    expect(
      buildDiscoveryBookOnboardingReadout('onboarding:competition', profile, site).chips,
    ).toEqual(['competitor.com']);
  });

  it('maps business name from site display name', () => {
    const readout = buildDiscoveryBookOnboardingReadout(
      'onboarding:business-name',
      profile,
      site,
    );
    expect(readout.fields[0]?.value).toBe('Maui Electric');
  });
});
