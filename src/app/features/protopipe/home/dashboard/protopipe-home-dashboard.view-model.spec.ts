import { describe, expect, it } from 'vitest';
import {
  buildCollectedChips,
  buildCollectedFields,
  buildMarketSourceRows,
  dashboardMarketStatus,
  keywordPlannerLabel,
} from './protopipe-home-dashboard.view-model';

describe('protopipe home dashboard view model', () => {
  const site = {
    id: 'site-1',
    displayName: 'Maui Plumbers',
    url: 'https://mauiplumbers.example',
    hostname: 'mauiplumbers.example',
  };
  const profile = {
    services: ['Emergency plumbing', 'Water heater repair'],
    customerAvatars: ['Homeowner with a leak before guests arrive'],
    competitors: ['competitor.example'],
    marketScope: 'local' as const,
    serpLocationName: 'Maui, Hawaii',
  };

  it('summarizes collected onboarding inputs', () => {
    expect(buildCollectedFields(site, profile)).toEqual([
      { id: 'website', label: 'Website', value: 'https://mauiplumbers.example' },
      { id: 'market', label: 'Market', value: 'local · Maui, Hawaii' },
      { id: 'services', label: 'Services', value: '2 services captured' },
      { id: 'customers', label: 'Customers', value: '1 customer moment captured' },
      { id: 'competitors', label: 'Competitors', value: '1 competitor queued' },
    ]);
    expect(buildCollectedChips(profile).map((chip) => chip.label)).toEqual([
      'Emergency plumbing',
      'Water heater repair',
      'Homeowner with a leak before guests arrive',
      'competitor.example',
    ]);
  });

  it('shows market baseline as ready while keyword planning continues', () => {
    expect(
      dashboardMarketStatus({
        onboardingDone: true,
        keywordPlanConfirmed: false,
        keywordResearchReady: false,
        baselineReady: true,
        loading: false,
        discoveryProgress: null,
      }),
    ).toBe('Your market baseline is ready. Keyword planning is still loading.');
    expect(
      keywordPlannerLabel({
        keywordPlanConfirmed: false,
        keywordResearchReady: false,
        baselineReady: true,
        discoveryFailed: false,
      }),
    ).toBe('Loading keywords');
  });

  it('surfaces source status rows for the baseline card', () => {
    expect(
      buildMarketSourceRows({
        sources: {
          gsc: { label: 'Search Console', status: 'available', count: 4 },
          spyfu: {
            label: 'Competitor gaps',
            status: 'skipped',
            count: 0,
            reason: 'No competitors yet',
          },
        },
      }),
    ).toEqual([
      { id: 'gsc', label: 'Search Console', value: '4 found' },
      { id: 'spyfu', label: 'Competitor gaps', value: 'No competitors yet' },
    ]);
  });

  it('uses user-facing dashboard language without runner terms', () => {
    const copy = [
      dashboardMarketStatus({
        onboardingDone: true,
        keywordPlanConfirmed: false,
        keywordResearchReady: true,
        baselineReady: true,
        loading: false,
        discoveryProgress: null,
      }),
      keywordPlannerLabel({
        keywordPlanConfirmed: false,
        keywordResearchReady: true,
        baselineReady: true,
        discoveryFailed: false,
      }),
    ]
      .join(' ')
      .toLowerCase();

    expect(copy).toContain('keyword plan');
    expect(copy).not.toContain('runner');
    expect(copy).not.toContain('thinker');
    expect(copy).not.toContain('pipeline');
  });
});
