import type { ProtopipeContentAudit, ProtopipeExistingPage } from '@hive/contracts';
import { describe, expect, it } from 'vitest';
import {
  buildSiteHealthSummaryCards,
  pageReasons,
  pageRows,
  sourceDescription,
  sourceLabel,
  winRows,
} from './protopipe-site-health.model';

const page = (overrides: Partial<ProtopipeExistingPage> = {}): ProtopipeExistingPage => ({
  url: 'https://example.com/services',
  title: 'Services',
  h1: 'Our services',
  topHeadings: ['One', 'Two'],
  wordCount: 900,
  schemaTypes: ['Article'],
  internalLinkCount: 4,
  isThin: false,
  isStale: false,
  ...overrides,
});

const audit = (overrides: Partial<ProtopipeContentAudit> = {}): ProtopipeContentAudit => {
  const pages = overrides.pages ?? [
    page(),
    page({
      url: 'https://example.com/old',
      title: 'Old page',
      wordCount: 180,
      isThin: true,
      isStale: true,
    }),
  ];
  return {
    hostname: 'example.com',
    source: 'sitemap',
    scannedCount: pages.length,
    pages,
    refreshCandidates: pages.filter((candidate) => candidate.isThin || candidate.isStale),
    alreadyRanking: [{ phrase: 'local seo', position: 8, url: 'https://example.com/services' }],
    ...overrides,
  };
};

describe('site health model', () => {
  it('builds summary cards from audit counts', () => {
    const cards = buildSiteHealthSummaryCards(audit());

    expect(cards.find((card) => card.id === 'scanned')?.value).toBe('2');
    expect(cards.find((card) => card.id === 'refresh')?.value).toBe('1');
    expect(cards.find((card) => card.id === 'thin')?.value).toBe('1');
    expect(cards.find((card) => card.id === 'stale')?.value).toBe('1');
    expect(cards.find((card) => card.id === 'wins')?.value).toBe('1');
  });

  it('labels page reasons for thin and stale content', () => {
    expect(pageReasons(page({ isThin: true, isStale: false }))).toEqual(['Thin content']);
    expect(pageReasons(page({ isThin: false, isStale: true }))).toEqual(['Possibly stale']);
    expect(pageReasons(page({ isThin: true, isStale: true }))).toEqual([
      'Thin content',
      'Possibly stale',
    ]);
  });

  it('maps page rows with readable fallbacks', () => {
    const rows = pageRows([
      page({
        title: undefined,
        h1: undefined,
        url: 'https://example.com/about',
        modifiedDate: '2026-08-08T12:00:00.000Z',
      }),
    ]);

    expect(rows[0].title).toBe('/about');
    expect(rows[0].h1).toBe('No H1 found');
    expect(rows[0].modified).toContain('2026');
  });

  it('describes scan sources for user-facing copy', () => {
    expect(sourceLabel('sitemap')).toBe('Sitemap');
    expect(sourceLabel('homepage_crawl')).toBe('Homepage crawl');
    expect(sourceDescription(audit({ source: 'none', pages: [], refreshCandidates: [] }))).toContain(
      'could not find crawlable pages',
    );
  });

  it('maps already-ranking wins', () => {
    expect(winRows(audit())[0]).toEqual({
      id: 'local seo:8:https://example.com/services',
      phrase: 'local seo',
      position: '#8',
      url: 'https://example.com/services',
    });
  });
});
