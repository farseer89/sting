import type {
  KeywordAlignmentAction,
  KeywordAlignmentRow,
  KeywordAlignmentSnapshot,
  KeywordAlignmentStatus,
  KeywordAlignmentSummary,
  PageOptimizationPageReport,
  PageOptimizationSnapshot,
  PageOptimizationSummary,
  PageSpeedPageReport,
  PageSpeedSnapshot,
  PageSpeedSummary,
  ProtopipeContentAudit,
  ProtopipeExistingPage,
} from '@hive/contracts';

export type SiteHealthTab =
  | 'overview'
  | 'optimization'
  | 'performance'
  | 'refresh'
  | 'pages'
  | 'wins';

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

export interface KeywordAlignmentDisplayRow {
  id: string;
  phrase: string;
  status: KeywordAlignmentStatus;
  statusLabel: string;
  actionLabel: string;
  score: string;
  pageTitle: string;
  pageUrl: string;
  ranking: string;
  reasons: string;
}

export interface KeywordAlignmentPrerequisite {
  message: string;
  actionLabel?: string;
}

export interface PageOptimizationDisplayRow {
  id: string;
  source: PageOptimizationPageReport;
  title: string;
  url: string;
  pageRole: string;
  score: string;
  issueCount: string;
  severityLabel: string;
  topIssue: string;
  suggestedValue: string;
  supportOpportunity: string;
}

export interface PageSpeedDisplayRow {
  id: string;
  source: PageSpeedPageReport;
  url: string;
  statusLabel: string;
  performanceScore: string;
  lcp: string;
  cls: string;
  issueSummary: string;
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

export function siteHealthTabs(
  audit: ProtopipeContentAudit | null | undefined,
  optimization?: PageOptimizationSnapshot | null,
  speed?: PageSpeedSnapshot | null,
): SiteHealthTabOption[] {
  return [
    { id: 'overview', label: 'Overview' },
    {
      id: 'optimization',
      label: 'Page Optimization',
      count: optimization?.summary.pageCount ?? undefined,
    },
    {
      id: 'performance',
      label: 'Performance',
      count: speed?.summary.testedUrlCount ?? undefined,
    },
    { id: 'refresh', label: 'Refresh', count: audit?.refreshCandidates?.length ?? 0 },
    { id: 'pages', label: 'Pages', count: audit?.pages?.length ?? 0 },
    { id: 'wins', label: 'Wins', count: audit?.alreadyRanking?.length ?? 0 },
  ];
}

export function buildPageOptimizationSummaryCards(
  summary: PageOptimizationSummary | null | undefined,
): SiteHealthSummaryCard[] {
  return [
    {
      id: 'pages',
      label: 'Pages reviewed',
      value: formatCount(summary?.pageCount ?? 0),
      hint: 'Existing pages checked for page-level SEO fixes.',
    },
    {
      id: 'site-fixes',
      label: 'Site fixes',
      value: formatCount(summary?.siteFixCount ?? 0),
      hint: 'Client-site recommendations, not blog deliverables.',
    },
    {
      id: 'critical',
      label: 'Critical issues',
      value: formatCount(summary?.criticalIssueCount ?? 0),
      hint: 'Fix these before leaning on the page.',
    },
    {
      id: 'warnings',
      label: 'Warnings',
      value: formatCount(summary?.warningIssueCount ?? 0),
      hint: 'Metadata, structure, freshness, or linking work.',
    },
    {
      id: 'support',
      label: 'Blog support targets',
      value: formatCount(summary?.supportOpportunityCount ?? 0),
      hint: 'Pages blog content can support with internal links.',
    },
  ];
}

export function buildPageSpeedSummaryCards(
  summary: PageSpeedSummary | null | undefined,
): SiteHealthSummaryCard[] {
  return [
    {
      id: 'tested',
      label: 'URLs tested',
      value: formatCount(summary?.testedUrlCount ?? 0),
      hint: 'Mobile readiness checks for important pages.',
    },
    {
      id: 'poor',
      label: 'Poor',
      value: formatCount(summary?.poorCount ?? 0),
      hint: 'Pages with serious mobile performance risk.',
    },
    {
      id: 'needs-work',
      label: 'Needs work',
      value: formatCount(summary?.needsImprovementCount ?? 0),
      hint: 'Usable, but worth client dev attention.',
    },
    {
      id: 'good',
      label: 'Good',
      value: formatCount(summary?.goodCount ?? 0),
      hint: 'Pages ready to receive blog support traffic.',
    },
    {
      id: 'critical',
      label: 'Critical fixes',
      value: formatCount(summary?.criticalIssueCount ?? 0),
      hint: 'Highest-priority dev handoff items.',
    },
  ];
}

export function buildKeywordAlignmentSummaryCards(
  summary: KeywordAlignmentSummary | null | undefined,
): SiteHealthSummaryCard[] {
  return [
    {
      id: 'keywords',
      label: 'Keywords checked',
      value: formatCount(summary?.totalKeywords ?? 0),
      hint: 'Confirmed keywords scored against audited pages.',
    },
    {
      id: 'missing',
      label: 'Missing pages',
      value: formatCount(summary?.missingCount ?? 0),
      hint: 'Keywords with no clear page target yet.',
    },
    {
      id: 'weak',
      label: 'Weak matches',
      value: formatCount(summary?.weakMatchCount ?? 0),
      hint: 'Pages mention some terms but lack strong alignment.',
    },
    {
      id: 'refresh-fit',
      label: 'Refresh fit',
      value: formatCount(summary?.refreshCandidateCount ?? 0),
      hint: 'Aligned pages that are thin or stale.',
    },
    {
      id: 'ranking-fit',
      label: 'Ranking wins',
      value: formatCount(summary?.rankingWinCount ?? 0),
      hint: 'Keywords already ranking with a matched page.',
    },
  ];
}

export function alignmentRows(
  snapshot: KeywordAlignmentSnapshot | null | undefined,
): KeywordAlignmentDisplayRow[] {
  return (snapshot?.rows ?? []).map((row) => alignmentDisplayRow(row));
}

export function alignmentPrerequisite(input: {
  hasAudit: boolean;
  keywordCount: number;
}): KeywordAlignmentPrerequisite | null {
  if (input.keywordCount <= 0) {
    return {
      message: 'Add confirmed keywords before we can score keyword-to-page fit.',
      actionLabel: 'Go to Keywords',
    };
  }
  if (!input.hasAudit) {
    return {
      message: 'Run a site audit first so we can match keywords to your existing pages.',
      actionLabel: 'Run site audit',
    };
  }
  return null;
}

export function alignmentEmptyMessage(input: {
  loading: boolean;
  hasSnapshot: boolean;
  prerequisite: KeywordAlignmentPrerequisite | null;
}): string {
  if (input.loading) return 'Loading keyword alignment…';
  if (input.prerequisite) return input.prerequisite.message;
  if (!input.hasSnapshot) {
    return 'No keyword alignment snapshot is stored yet. Run keyword alignment to score fit against your latest site audit.';
  }
  return 'No keyword alignment rows were produced for this site.';
}

export function pageOptimizationRows(
  snapshot: PageOptimizationSnapshot | null | undefined,
): PageOptimizationDisplayRow[] {
  return (snapshot?.pages ?? []).map((page) => {
    const topIssue = page.issues[0];
    return {
      id: page.url,
      source: page,
      title: page.title?.trim() || page.h1?.trim() || urlLabel(page.url),
      url: page.url,
      pageRole: page.pageRole,
      score: `${page.score}/100`,
      issueCount: formatCount(page.issues.length),
      severityLabel: severityLabel(topIssue?.severity),
      topIssue: topIssue?.rationale ?? 'No major page optimization issues captured.',
      suggestedValue: topIssue?.suggestedValue ?? 'See recommendations for this page.',
      supportOpportunity:
        page.contentPlanSignal?.supportWithBlogTopics?.slice(0, 2).join(' · ') ||
        'No blog support topic suggested.',
    };
  });
}

export function pageSpeedRows(snapshot: PageSpeedSnapshot | null | undefined): PageSpeedDisplayRow[] {
  return (snapshot?.pages ?? []).map((page) => ({
    id: page.url,
    source: page,
    url: page.url,
    statusLabel: speedStatusLabel(page.status),
    performanceScore:
      page.metrics.performanceScore != null ? `${page.metrics.performanceScore}/100` : 'Unknown',
    lcp: formatMs(page.metrics.lcpMs),
    cls: page.metrics.cls != null ? page.metrics.cls.toFixed(2) : 'Unknown',
    issueSummary: page.issues.map((issue) => issue.recommendation).join(' · ') || 'No issues captured.',
  }));
}

export function pageOptimizationEmptyMessage(input: {
  loading: boolean;
  hasSnapshot: boolean;
  hasAudit: boolean;
}): string {
  if (input.loading) return 'Loading page optimization...';
  if (!input.hasAudit) return 'Run a site audit first so we can evaluate existing pages.';
  if (!input.hasSnapshot) {
    return 'No page optimization snapshot is stored yet. Run Page Optimization to generate client-ready site fix recommendations.';
  }
  return 'No page optimization rows were produced for this site.';
}

export function pageSpeedEmptyMessage(input: {
  loading: boolean;
  hasSnapshot: boolean;
  hasAudit: boolean;
}): string {
  if (input.loading) return 'Loading performance audit...';
  if (!input.hasAudit) return 'Run a site audit first so we can select important URLs to test.';
  if (!input.hasSnapshot) {
    return 'No performance snapshot is stored yet. Run Performance to check mobile readiness.';
  }
  return 'No performance rows were produced for this site.';
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

function alignmentDisplayRow(row: KeywordAlignmentRow): KeywordAlignmentDisplayRow {
  const matchedPage = row.matchedPage;
  return {
    id: row.keywordId,
    phrase: row.phrase,
    status: row.status,
    statusLabel: alignmentStatusLabel(row.status),
    actionLabel: alignmentActionLabel(row.recommendedAction),
    score: `${row.score}/100`,
    pageTitle: matchedPage?.title?.trim() || matchedPage?.h1?.trim() || 'No matched page',
    pageUrl: matchedPage?.url ?? '—',
    ranking: row.rankingPosition != null ? `#${row.rankingPosition}` : '—',
    reasons: row.reasons.join(' · ') || 'No detail captured',
  };
}

function alignmentStatusLabel(status: KeywordAlignmentStatus): string {
  switch (status) {
    case 'missing':
      return 'Missing page';
    case 'weak_match':
      return 'Weak match';
    case 'matched':
      return 'Aligned';
    case 'refresh_candidate':
      return 'Refresh fit';
    case 'ranking_win':
      return 'Ranking win';
    default:
      return status;
  }
}

function alignmentActionLabel(action: KeywordAlignmentAction): string {
  switch (action) {
    case 'create_new_page':
      return 'Create page';
    case 'improve_existing_page':
      return 'Improve page';
    case 'refresh_existing_page':
      return 'Refresh page';
    case 'protect_ranking_page':
      return 'Protect ranking';
    default:
      return action;
  }
}

function severityLabel(severity: string | undefined): string {
  switch (severity) {
    case 'critical':
      return 'Critical';
    case 'warning':
      return 'Warning';
    case 'notice':
      return 'Notice';
    default:
      return 'Healthy';
  }
}

function speedStatusLabel(status: string): string {
  switch (status) {
    case 'good':
      return 'Good';
    case 'needs_improvement':
      return 'Needs work';
    case 'poor':
      return 'Poor';
    default:
      return 'Unknown';
  }
}

function formatMs(value: number | undefined): string {
  if (value == null) return 'Unknown';
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${Math.round(value)}ms`;
}
