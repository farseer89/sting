import { describe, expect, it } from 'vitest';
import {
  buildDiscoveryResultView,
  buildDiscoveryStepVisualizer,
} from './discovery-run-visualizer.util';
import { DISCOVERY_RESULT_STEP_ID } from '../../lab/keyword-discovery/discovery-run-to-thought';
import { FIXTURE_READY } from '../../lab/keyword-discovery/keyword-discovery.mock';

describe('discovery-run-visualizer.util', () => {
  it('buildDiscoveryResultView exposes result tabs from artifacts', () => {
    const view = buildDiscoveryResultView(FIXTURE_READY as never);
    expect(view.tabs?.map((tab) => tab.id)).toEqual(['keywords', 'audiences', 'sources']);
    expect(view.tabs?.find((tab) => tab.id === 'keywords')?.blocks.length).toBeGreaterThan(0);
    expect(view.tabs?.find((tab) => tab.id === 'audiences')?.blocks.length).toBeGreaterThan(0);
  });

  it('buildDiscoveryStepVisualizer returns tabbed result view for discovery_result', () => {
    const view = buildDiscoveryStepVisualizer(
      FIXTURE_READY as never,
      DISCOVERY_RESULT_STEP_ID,
      'done',
    );
    expect(view.tabs?.length).toBe(3);
    expect(view.defaultTabId).toBe('keywords');
  });

  it('renders market baseline evidence while keyword research is still running', () => {
    const run = {
      ...FIXTURE_READY,
      status: 'discovering',
      currentStep: 'expand_keyword_pool',
      artifacts: {
        ...FIXTURE_READY.artifacts,
        marketBaselineReadyAt: '2026-06-04T20:01:00.000Z',
        marketBaseline: {
          capturedAt: '2026-06-04T20:01:00.000Z',
          gscQueries: [],
          rankedKeywords: [],
          competitorGaps: [],
          sources: {
            gsc: {
              status: 'skipped',
              label: 'Search Console',
              count: 0,
              reason: 'Search Console is not connected.',
            },
            site_snapshot: {
              status: 'available',
              label: 'Site snapshot',
              count: 1,
            },
            ranked_keywords: {
              status: 'available',
              label: 'Current rankings',
              count: 1,
            },
            competitor_gaps: {
              status: 'available',
              label: 'Competitor gaps',
              count: 1,
            },
          },
          profileSummary: {
            services: ['live wedding painting'],
            competitors: ['wedpaint.co'],
            marketScope: 'national',
            onboardingReadiness: 'ready',
          },
          totals: {
            gscQueries: 0,
            rankedKeywords: 1,
            competitorGaps: 1,
          },
        },
        scoredCandidates: [],
        suggestedAvatars: [],
        rankedKeywords: [
          {
            phrase: 'live wedding painter',
            source: 'ranked',
            searchVolume: 2400,
            position: 7,
          },
        ],
        spyfuGaps: [
          {
            phrase: 'destination wedding painter',
            source: 'spyfu_gap',
            searchVolume: 1600,
            competitorDomain: 'wedpaint.co',
            competitorRank: 3,
            isGap: true,
          },
        ],
      },
    };

    const view = buildDiscoveryStepVisualizer(run as never, 'discovery:market', 'done');
    expect(
      view.blocks.some(
        (block) =>
          block.kind === 'meta-row' &&
          block.label === 'Search Console' &&
          block.value === 'Skipped' &&
          block.hint === 'Search Console is not connected.',
      ),
    ).toBe(true);
    expect(view.blocks.some((block) => block.kind === 'meta-row' && block.label === 'live wedding painter')).toBe(true);
    expect(
      view.blocks.some(
        (block) =>
          block.kind === 'meta-row' &&
          block.label === 'destination wedding painter' &&
          block.hint?.includes('wedpaint.co #3'),
      ),
    ).toBe(true);
  });
});
