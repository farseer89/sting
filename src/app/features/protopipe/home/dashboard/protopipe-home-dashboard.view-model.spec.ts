import { describe, expect, it } from 'vitest';
import {
  buildCollectedChips,
  buildCollectedFields,
  buildCompetitors,
  buildDashboardSteps,
  buildKeywordBaselineRows,
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
    competitors: ['competitor.example', 'rival.co'],
    marketScope: 'local' as const,
    serpLocationName: 'Maui, Hawaii',
  };

  it('summarizes collected onboarding inputs', () => {
    expect(buildCollectedFields(site, profile)).toEqual([
      { id: 'name', label: 'Business', value: 'Maui Plumbers' },
      { id: 'website', label: 'Website', value: 'https://mauiplumbers.example' },
      { id: 'market', label: 'Market', value: 'local · Maui, Hawaii' },
      {
        id: 'services',
        label: 'Services',
        value: 'Emergency plumbing, Water heater repair',
      },
      {
        id: 'customers',
        label: 'Customer moments',
        value: 'Homeowner with a leak before guests arrive',
      },
    ]);
    expect(buildCollectedChips(profile).map((chip) => chip.label)).toEqual([
      'Emergency plumbing',
      'Water heater repair',
      'Homeowner with a leak before guests arrive',
      'competitor.example',
      'rival.co',
    ]);
  });

  it('builds the four SaaS setup steps', () => {
    const steps = buildDashboardSteps({
      onboardingDone: true,
      keywordPlanConfirmed: false,
      keywordResearchReady: false,
      keywordResearchInProgress: true,
      baselineReady: false,
      discoveryFailed: false,
      contentPlanComplete: false,
      contentPlanRunning: false,
    });

    expect(steps.map((step) => step.title)).toEqual([
      'Keyword selection',
      'AI mentions',
      'SEO rankings',
      'Content plan',
    ]);
    expect(steps[0]?.status).toBe('in_progress');
    expect(steps[1]?.status).toBe('locked');
    expect(steps[2]?.status).toBe('in_progress');
    expect(steps[3]?.status).toBe('locked');
  });

  it('lists competitors and baseline keyword rows', () => {
    expect(buildCompetitors(profile)).toEqual(['competitor.example', 'rival.co']);
    expect(
      buildKeywordBaselineRows({
        rankedKeywords: [
          { phrase: 'emergency plumber', source: 'ranked', searchVolume: 1200, position: 8 },
        ],
        gscQueries: [{ phrase: 'plumber near me', source: 'gsc', impressions: 400, position: 12 }],
      }),
    ).toEqual([
      {
        id: 'emergency plumber-0',
        phrase: 'emergency plumber',
        source: 'Current rankings',
        volume: '1,200',
        rank: '#8',
      },
      {
        id: 'plumber near me-1',
        phrase: 'plumber near me',
        source: 'Search Console',
        volume: '—',
        rank: '#12',
      },
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
    ).toBe('SEO baseline is ready. Keyword selection is still loading.');
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
      ...buildDashboardSteps({
        onboardingDone: true,
        keywordPlanConfirmed: false,
        keywordResearchReady: true,
        keywordResearchInProgress: false,
        baselineReady: true,
        discoveryFailed: false,
        contentPlanComplete: false,
        contentPlanRunning: false,
      }).map((step) => step.description),
    ]
      .join(' ')
      .toLowerCase();

    expect(copy).toContain('keyword');
    expect(copy).not.toContain('runner');
    expect(copy).not.toContain('thinker');
    expect(copy).not.toContain('pipeline');
  });
});
