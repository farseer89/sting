import type { ProtopipeContentAudit, ProtopipeExistingPage } from '@hive/contracts';

export type SiteHealthTab = 'overview' | 'refresh' | 'pages' | 'wins';

export interface SiteHealthSummaryCard {
  id: string;
  label: string;
  value: string;
  hint: string;
}

export interface SiteHealthPageRow {
  id: string;
  source: ProtopipeExistingPage;
  title: string;
  url: string;
  h1: string;
  wordCount: string;
  internalLinks: string;
  modified: string;
  reasons: string[];
  statusLabel: string;
}

export interface SiteHealthWinRow {
  id: string;
  phrase: string;
  position: string;
  url: string;
}

export interface SiteHealthTabOption {
  id: SiteHealthTab;
  label: string;
  count?: number;
}

export function buildSiteHealthSummaryCards(
  audit: ProtopipeContentAudit | null | undefined,
): SiteHealthSummaryCard[] {
  const pages = audit?.pages ?? [];
  const refreshCandidates = audit?.refreshCandidates ?? [];
  const thinCount = pages.filter((page) => page.isThin).length;
  const staleCount = pages.filter((page) => page.isStale).length;
  const winsCount = audit?.alreadyRanking?.length ?? 0;

  return [
    {
      id: 'scanned',
      label: 'Pages scanned',
      value: formatCount(audit?.scannedCount ?? pages.length),
      hint: sourceHint(audit),
    },
    {
      id: 'refresh',
      label: 'Refresh candidates',
      value: formatCount(refreshCandidates.length),
      hint:
        refreshCandidates.length > 0
          ? 'Existing pages worth improving before adding more content.'
          : 'No thin or stale pages flagged in this scan.',
    },
    {
      id: 'thin',
      label: 'Thin pages',
      value: formatCount(thinCount),
      hint: 'Pages under 300 words.',
    },
    {
      id: 'stale',
      label: 'Stale pages',
      value: formatCount(staleCount),
      hint: 'Pages older than one year.',
    },
    {
      id: 'wins',
      label: 'Ranking wins',
      value: formatCount(winsCount),
      hint: 'Keywords where your site already appears.',
    },
  ];
}

export function siteHealthTabs(audit: ProtopipeContentAudit | null | undefined): SiteHealthTabOption[] {
  return [
    { id: 'overview', label: 'Overview' },
    { id: 'refresh', label: 'Refresh', count: audit?.refreshCandidates?.length ?? 0 },
    { id: 'pages', label: 'Pages', count: audit?.pages?.length ?? 0 },
    { id: 'wins', label: 'Wins', count: audit?.alreadyRanking?.length ?? 0 },
  ];
}

export function pageRows(pages: ProtopipeExistingPage[] | null | undefined): SiteHealthPageRow[] {
  return (pages ?? []).map((page) => {
    const reasons = pageReasons(page);
    return {
      id: page.url,
      source: page,
      title: pageTitle(page),
      url: page.url,
      h1: page.h1?.trim() || 'No H1 found',
      wordCount: formatCount(page.wordCount),
      internalLinks: formatCount(page.internalLinkCount),
      modified: formatDate(page.modifiedDate ?? page.publishedDate),
      reasons,
      statusLabel: reasons.length > 0 ? reasons.join(' · ') : 'Healthy',
    };
  });
}

export function refreshRows(audit: ProtopipeContentAudit | null | undefined): SiteHealthPageRow[] {
  return pageRows(audit?.refreshCandidates);
}

export function winRows(audit: ProtopipeContentAudit | null | undefined): SiteHealthWinRow[] {
  return (audit?.alreadyRanking ?? []).map((win) => ({
    id: `${win.phrase}:${win.position}:${win.url ?? ''}`,
    phrase: win.phrase,
    position: `#${win.position}`,
    url: win.url ?? 'No URL captured',
  }));
}

export function pageReasons(page: ProtopipeExistingPage): string[] {
  const reasons: string[] = [];
  if (page.isThin) reasons.push('Thin content');
  if (page.isStale) reasons.push('Possibly stale');
  return reasons;
}

export function sourceLabel(source: ProtopipeContentAudit['source'] | undefined): string {
  switch (source) {
    case 'sitemap':
      return 'Sitemap';
    case 'homepage_crawl':
      return 'Homepage crawl';
    case 'none':
      return 'No crawl source';
    default:
      return 'Not scanned yet';
  }
}

export function sourceDescription(audit: ProtopipeContentAudit | null | undefined): string {
  if (!audit) return 'Run a site audit to populate crawl coverage before planning articles.';
  if (audit.note) return audit.note;
  if (audit.source === 'sitemap') {
    return 'We found pages from your sitemap, which usually gives the strongest coverage.';
  }
  if (audit.source === 'homepage_crawl') {
    return 'We found pages by following links from your homepage.';
  }
  return 'We could not find crawlable pages, so the plan leans more heavily on confirmed keywords.';
}

export function pageTitle(page: ProtopipeExistingPage): string {
  return page.title?.trim() || page.h1?.trim() || urlLabel(page.url);
}

export function headingSummary(page: ProtopipeExistingPage): string {
  if (!page.topHeadings.length) return 'No section headings found.';
  return page.topHeadings.slice(0, 5).join(' · ');
}

export function schemaSummary(page: ProtopipeExistingPage): string {
  if (!page.schemaTypes.length) return 'No schema detected';
  return page.schemaTypes.join(', ');
}

export function formatDate(value: string | undefined): string {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function sourceHint(audit: ProtopipeContentAudit | null | undefined): string {
  if (!audit) return 'No scan loaded yet.';
  if (audit.source === 'sitemap') return 'Found through sitemap.';
  if (audit.source === 'homepage_crawl') return 'Found through homepage links.';
  return 'No crawlable source found.';
}

function formatCount(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString() : '0';
}

function urlLabel(raw: string): string {
  try {
    const url = new URL(raw);
    return url.pathname === '/' ? url.hostname : url.pathname;
  } catch {
    return raw;
  }
}
