import type { ProtopipeOnboardingProfile, ProtopipeSite } from '@hive/contracts';

export type DashboardDiscoveryStatus =
  | 'collecting'
  | 'market-ready'
  | 'keyword-loading'
  | 'keyword-ready'
  | 'confirmed'
  | 'failed';

export type DashboardStepStatus = 'locked' | 'in_progress' | 'ready' | 'complete';

export type DashboardStepTarget =
  | 'keywords'
  | 'mentions-book'
  | 'strategy'
  | 'build-book'
  | 'business-details';

export type DashboardStepIcon = 'keywords' | 'mentions' | 'seo' | 'content';

export interface DashboardChip {
  id: string;
  label: string;
}

export interface DashboardField {
  id: string;
  label: string;
  value: string;
}

export interface DashboardStepCard {
  id: string;
  title: string;
  metric: string;
  hint: string;
  status: DashboardStepStatus;
  statusLabel: string;
  icon: DashboardStepIcon;
  target: DashboardStepTarget | null;
}

export interface DashboardWorkspaceCard {
  id: string;
  title: string;
  metric: string;
  hint: string;
  target: DashboardStepTarget;
  empty: boolean;
}

export interface DashboardBaselineKeywordRow {
  id: string;
  phrase: string;
  source: string;
  volume: string;
  rank: string;
}

export interface DashboardCustomerCard {
  id: string;
  label: string;
  initials: string;
}

interface DashboardMarketBaselineSource {
  label: string;
  status: string;
  count: number;
  reason?: string;
}

interface DashboardBaselineCandidate {
  phrase?: string;
  source?: string;
  searchVolume?: number;
  position?: number;
  yourRank?: number | null;
  competitorRank?: number;
  clicks?: number;
  impressions?: number;
}

export interface DashboardMarketBaselineLike {
  sources?: Record<string, DashboardMarketBaselineSource>;
  rankedKeywords?: DashboardBaselineCandidate[];
  gscQueries?: DashboardBaselineCandidate[];
  competitorGaps?: DashboardBaselineCandidate[];
}

export interface DashboardMarketStatusInput {
  onboardingDone: boolean;
  keywordPlanConfirmed: boolean;
  keywordResearchReady: boolean;
  baselineReady: boolean;
  loading: boolean;
  discoveryProgress: string | null;
}

export interface DashboardStepInput {
  onboardingDone: boolean;
  keywordPlanConfirmed: boolean;
  keywordResearchReady: boolean;
  keywordResearchInProgress: boolean;
  baselineReady: boolean;
  discoveryFailed: boolean;
  contentPlanComplete: boolean;
  contentPlanRunning: boolean;
  keywordCount: number;
  baselineSignalCount: number;
}

export interface DashboardWorkspaceInput {
  site: ProtopipeSite | null | undefined;
  profile: ProtopipeOnboardingProfile | null | undefined;
  baselineSignalCount: number;
  topBaselinePhrase: string | null;
  keywordResearchInProgress: boolean;
}

const BASELINE_TABLE_LIMIT = 12;

function formatVolume(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toLocaleString();
}

function formatRank(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `#${value}`;
}

function sourceLabel(source: string | undefined): string {
  switch (source) {
    case 'gsc':
      return 'Search Console';
    case 'ranked':
      return 'Current rankings';
    case 'spyfu_gap':
      return 'Competitor gap';
    default:
      return 'Discovery';
  }
}

function stepStatusLabel(status: DashboardStepStatus): string {
  switch (status) {
    case 'complete':
      return 'Complete';
    case 'ready':
      return 'Ready';
    case 'in_progress':
      return 'In progress';
    default:
      return 'Locked';
  }
}

export function buildDashboardSteps(input: DashboardStepInput): DashboardStepCard[] {
  const keywordStatus: DashboardStepStatus = !input.onboardingDone
    ? 'locked'
    : input.keywordPlanConfirmed
      ? 'complete'
      : input.keywordResearchReady
        ? 'ready'
        : input.keywordResearchInProgress
          ? 'in_progress'
          : input.discoveryFailed
            ? 'ready'
            : 'locked';

  const mentionsStatus: DashboardStepStatus = !input.keywordPlanConfirmed ? 'locked' : 'ready';

  const seoStatus: DashboardStepStatus = !input.onboardingDone
    ? 'locked'
    : input.baselineReady
      ? 'complete'
      : input.keywordResearchInProgress
        ? 'in_progress'
        : 'locked';

  const contentPlanStatus: DashboardStepStatus = !input.keywordPlanConfirmed
    ? 'locked'
    : input.contentPlanComplete
      ? 'complete'
      : input.contentPlanRunning
        ? 'in_progress'
        : 'ready';

  return [
    {
      id: 'keywords',
      title: 'Keyword selection',
      metric: keywordMetric(input, keywordStatus),
      hint: keywordHint(keywordStatus),
      status: keywordStatus,
      statusLabel:
        keywordStatus === 'locked' ? 'Finish onboarding' : stepStatusLabel(keywordStatus),
      icon: 'keywords',
      target: keywordStatus === 'locked' ? null : 'keywords',
    },
    {
      id: 'mentions',
      title: 'AI Visibility',
      metric: mentionsStatus === 'locked' ? 'Confirm keywords' : 'Track visibility',
      hint: mentionsStatus === 'locked' ? 'Confirm keywords first' : 'Open mentions book',
      status: mentionsStatus,
      statusLabel:
        mentionsStatus === 'locked' ? 'Confirm keywords' : stepStatusLabel(mentionsStatus),
      icon: 'mentions',
      target: mentionsStatus === 'locked' ? null : 'mentions-book',
    },
    {
      id: 'seo',
      title: 'SEO rankings',
      metric: seoMetric(input, seoStatus),
      hint: seoHint(seoStatus),
      status: seoStatus,
      statusLabel: seoStatus === 'locked' ? 'Run discovery' : stepStatusLabel(seoStatus),
      icon: 'seo',
      target: seoStatus === 'locked' ? null : 'keywords',
    },
    {
      id: 'content-plan',
      title: 'Content plan',
      metric: contentPlanMetric(contentPlanStatus),
      hint: contentPlanHint(contentPlanStatus),
      status: contentPlanStatus,
      statusLabel:
        contentPlanStatus === 'locked'
          ? 'Confirm keywords'
          : stepStatusLabel(contentPlanStatus),
      icon: 'content',
      target: contentPlanStatus === 'locked' ? null : 'strategy',
    },
  ];
}

function keywordMetric(input: DashboardStepInput, status: DashboardStepStatus): string {
  if (status === 'complete') {
    return input.keywordCount > 0 ? `${input.keywordCount} keywords` : 'Confirmed';
  }
  if (status === 'ready') return 'Ready to review';
  if (status === 'in_progress') return 'Researching…';
  if (input.discoveryFailed) return 'Needs attention';
  return 'Not started';
}

function keywordHint(status: DashboardStepStatus): string {
  if (status === 'complete') return 'Open keyword book';
  if (status === 'ready') return 'Review shortlist';
  if (status === 'in_progress') return 'Pulling market data';
  return 'Finish onboarding';
}

function seoMetric(input: DashboardStepInput, status: DashboardStepStatus): string {
  if (status === 'complete') {
    return input.baselineSignalCount > 0
      ? `${input.baselineSignalCount} signals`
      : 'Baseline ready';
  }
  if (status === 'in_progress') return 'Collecting…';
  return 'Not started';
}

function seoHint(status: DashboardStepStatus): string {
  if (status === 'complete') return 'View rankings baseline';
  if (status === 'in_progress') return 'GSC + competitor gaps';
  return 'Unlocks after onboarding';
}

function contentPlanMetric(status: DashboardStepStatus): string {
  if (status === 'complete') return 'Plan ready';
  if (status === 'in_progress') return 'Building…';
  if (status === 'ready') return 'Generate plan';
  return 'Confirm keywords';
}

function contentPlanHint(status: DashboardStepStatus): string {
  if (status === 'complete') return 'Open in Strategy';
  if (status === 'in_progress') return 'From your keywords';
  if (status === 'ready') return 'Build content calendar';
  return 'Confirm keywords first';
}

export function buildWorkspaceCards(input: DashboardWorkspaceInput): DashboardWorkspaceCard[] {
  const profile = input.profile;
  const serviceCount = profile?.services?.length ?? 0;
  const competitorCount = profile?.competitors?.filter((c) => c.trim()).length ?? 0;
  const market =
    profile?.serpLocationName ||
    [profile?.city, profile?.state].filter(Boolean).join(', ') ||
    profile?.marketScope ||
    '';

  const businessName =
    input.site?.displayName?.trim() || input.site?.hostname?.trim() || 'Your business';
  const hasBusiness = Boolean(input.site?.displayName || input.site?.hostname || profile);

  return [
    {
      id: 'business',
      title: 'Business profile',
      metric: hasBusiness ? businessName : 'Not saved',
      hint: hasBusiness
        ? [market, serviceCount > 0 ? `${serviceCount} services` : null]
            .filter(Boolean)
            .join(' · ') || 'View onboarding inputs'
        : 'Complete onboarding',
      target: 'business-details',
      empty: !hasBusiness,
    },
    {
      id: 'competitors',
      title: 'Competitors',
      metric: competitorCount > 0 ? `${competitorCount} tracked` : 'None yet',
      hint:
        competitorCount > 0
          ? profile?.competitors?.[0]?.trim() || 'Manage competitor list'
          : 'Add competitors in profile',
      target: 'business-details',
      empty: competitorCount === 0,
    },
    {
      id: 'baseline',
      title: 'Keyword baseline',
      metric:
        input.baselineSignalCount > 0
          ? `${input.baselineSignalCount} signals`
          : input.keywordResearchInProgress
            ? 'Building…'
            : 'No signals',
      hint: input.topBaselinePhrase
        ? `Top: ${input.topBaselinePhrase}`
        : input.keywordResearchInProgress
          ? 'Market research running'
          : 'Open discovery book',
      target: 'keywords',
      empty: input.baselineSignalCount === 0 && !input.keywordResearchInProgress,
    },
  ];
}

export function buildBusinessInfo(
  site: ProtopipeSite | null | undefined,
  profile: ProtopipeOnboardingProfile | null | undefined,
): DashboardField[] {
  const fields: DashboardField[] = [];
  const name = site?.displayName?.trim();
  if (name) fields.push({ id: 'name', label: 'Business', value: name });

  const website = site?.url?.trim() || site?.hostname?.trim() || profile?.websiteUrl?.trim();
  if (website) fields.push({ id: 'website', label: 'Website', value: website });

  if (profile?.marketScope) {
    const location =
      profile.serpLocationName ||
      [profile.city, profile.state, profile.countryIso].filter(Boolean).join(', ');
    fields.push({
      id: 'market',
      label: 'Market',
      value: location ? `${profile.marketScope} · ${location}` : profile.marketScope,
    });
  }

  if (profile?.services?.length) {
    fields.push({
      id: 'services',
      label: 'Services',
      value: profile.services.join(', '),
    });
  }

  if (profile?.customerAvatars?.length) {
    fields.push({
      id: 'customers',
      label: 'Customer moments',
      value: profile.customerAvatars.join(' · '),
    });
  }

  return fields;
}

export function buildCompetitors(profile: ProtopipeOnboardingProfile | null | undefined): string[] {
  return (profile?.competitors ?? []).map((value) => value.trim()).filter(Boolean);
}

export function buildCustomerCards(
  profile: ProtopipeOnboardingProfile | null | undefined,
): DashboardCustomerCard[] {
  return (profile?.customerAvatars ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((label, index) => ({
      id: `customer-${index}`,
      label,
      initials: initialsFromLabel(label),
    }));
}

function initialsFromLabel(label: string): string {
  const words = label.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export function buildKeywordBaselineRows(
  baseline: DashboardMarketBaselineLike | null | undefined,
): DashboardBaselineKeywordRow[] {
  if (!baseline) return [];

  const merged = [
    ...(baseline.rankedKeywords ?? []).map((row) => ({ ...row, source: row.source ?? 'ranked' })),
    ...(baseline.gscQueries ?? []).map((row) => ({ ...row, source: row.source ?? 'gsc' })),
    ...(baseline.competitorGaps ?? []).map((row) => ({
      ...row,
      source: row.source ?? 'spyfu_gap',
    })),
  ];

  const seen = new Set<string>();
  const rows: DashboardBaselineKeywordRow[] = [];

  for (const candidate of merged) {
    const phrase = candidate.phrase?.trim();
    if (!phrase) continue;
    const key = phrase.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const rank =
      candidate.yourRank != null
        ? formatRank(candidate.yourRank)
        : candidate.position != null
          ? formatRank(candidate.position)
          : candidate.competitorRank != null
            ? formatRank(candidate.competitorRank)
            : '—';

    rows.push({
      id: `${key}-${rows.length}`,
      phrase,
      source: sourceLabel(candidate.source),
      volume: formatVolume(candidate.searchVolume),
      rank,
    });

    if (rows.length >= BASELINE_TABLE_LIMIT) break;
  }

  return rows;
}

export function buildCollectedFields(
  site: ProtopipeSite | null | undefined,
  profile: ProtopipeOnboardingProfile | null | undefined,
): DashboardField[] {
  return buildBusinessInfo(site, profile);
}

export function buildCollectedChips(
  profile: ProtopipeOnboardingProfile | null | undefined,
): DashboardChip[] {
  return [
    ...(profile?.services ?? []).slice(0, 4).map((label, index) => ({
      id: `service-${index}`,
      label,
    })),
    ...(profile?.customerAvatars ?? []).slice(0, 3).map((label, index) => ({
      id: `customer-${index}`,
      label,
    })),
    ...(profile?.competitors ?? []).slice(0, 3).map((label, index) => ({
      id: `competitor-${index}`,
      label,
    })),
  ];
}

export function buildMarketSourceRows(
  baseline: DashboardMarketBaselineLike | null | undefined,
): DashboardField[] {
  if (!baseline?.sources) return [];
  return Object.entries(baseline.sources).map(([id, source]) => ({
    id,
    label: source.label,
    value:
      source.status === 'available'
        ? `${source.count} found`
        : source.reason || source.status.replace(/_/g, ' '),
  }));
}

export function dashboardMarketStatus(input: DashboardMarketStatusInput): string {
  if (!input.onboardingDone) return 'Complete onboarding to unlock your workspace.';
  if (input.keywordPlanConfirmed) return 'Keyword plan confirmed — continue through the steps.';
  if (input.keywordResearchReady) return 'Keywords ready for review.';
  if (input.baselineReady) return 'SEO baseline ready — keywords still loading.';
  if (input.loading) return input.discoveryProgress ?? 'Researching your market.';
  return 'Your growth workspace is ready.';
}

export function keywordPlannerLabel(input: {
  keywordPlanConfirmed: boolean;
  keywordResearchReady: boolean;
  baselineReady: boolean;
  discoveryFailed: boolean;
}): string {
  if (input.keywordPlanConfirmed) return 'Confirmed';
  if (input.keywordResearchReady) return 'Ready to review';
  if (input.baselineReady) return 'Loading keywords';
  if (input.discoveryFailed) return 'Needs attention';
  return 'Researching';
}
