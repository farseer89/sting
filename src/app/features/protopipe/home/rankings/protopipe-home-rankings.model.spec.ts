import { describe, expect, it } from 'vitest';
import type { KeywordRankingRow } from '@hive/contracts';
import {
  buildRankingsSummary,
  drawerTabsForRow,
  marketScopeLabel,
  sortRankingRows,
  topCompetitorsByOverlap,
} from './protopipe-home-rankings.model';

const rows: KeywordRankingRow[] = [
  {
    keywordId: 'kw-1',
    phrase: 'maui wedding painter',
    latest: {
      position: 2,
      marketTier: 'local',
      locationCode: 1001,
      locationName: 'Maui County',
      device: 'desktop',
      competitorsAbove: [{ domain: 'competitor-a.com', position: 1 }],
      capturedAt: '2026-08-04T10:00:00.000Z',
      source: 'dataforseo',
    },
  },
  {
    keywordId: 'kw-2',
    phrase: 'destination wedding artist',
    latest: {
      position: null,
      marketTier: 'worldwide',
      locationCode: 2840,
      locationName: 'United States',
      device: 'desktop',
      competitorsAbove: [
        { domain: 'competitor-b.com', position: 1 },
        { domain: 'competitor-a.com', position: 2 },
      ],
      capturedAt: '2026-08-04T11:00:00.000Z',
      source: 'dataforseo',
    },
  },
];

describe('protopipe rankings dashboard model', () => {
  it('labels market tiers', () => {
    expect(marketScopeLabel('local')).toBe('Local');
    expect(marketScopeLabel('national')).toBe('Nationwide');
    expect(marketScopeLabel('worldwide')).toBe('Worldwide');
  });

  it('builds summary cards from ranking rows', () => {
    const summary = buildRankingsSummary(rows);
    expect(summary.find((card) => card.id === 'tracked')?.value).toBe('2');
    expect(summary.find((card) => card.id === 'top3')?.value).toBe('1');
    expect(summary.find((card) => card.id === 'missing')?.value).toBe('1');
    expect(summary.find((card) => card.id === 'competitors')?.value).toBe('2');
  });

  it('sorts missing ranks last in ascending rank order', () => {
    expect(sortRankingRows(rows, { column: 'rank', direction: 'asc' }).map((row) => row.phrase)).toEqual([
      'maui wedding painter',
      'destination wedding artist',
    ]);
  });

  it('counts competitor overlap', () => {
    expect(topCompetitorsByOverlap(rows)[0]).toEqual({ domain: 'competitor-a.com', count: 2 });
  });

  it('adds tabs for richer SERP detail blocks', () => {
    const tabs = drawerTabsForRow({
      keywordId: 'kw-3',
      phrase: 'maui wedding planner',
      latest: {
        position: 1,
        marketTier: 'local',
        device: 'desktop',
        competitorsAbove: [],
        capturedAt: '2026-08-04T12:00:00.000Z',
        source: 'dataforseo',
        serpDetail: {
          organic: [],
          paidResults: [{ position: 1, title: 'Sponsored planner' }],
          imagePack: [{ title: 'Image result' }],
          videoPack: [{ title: 'Video result' }],
          knowledgeGraph: { title: 'Maui Weddings' },
        },
      },
    } as KeywordRankingRow);

    expect(tabs.map((tab) => tab.id)).toEqual([
      'organic',
      'paid',
      'media',
      'knowledge_graph',
    ]);
  });
});
