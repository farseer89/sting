import type { ProtopipeOnboardingProfile, ProtopipeSite } from '@hive/contracts';

export type DashboardDiscoveryStatus =
  | 'collecting'
  | 'market-ready'
  | 'keyword-loading'
  | 'keyword-ready'
  | 'confirmed'
  | 'failed';

export type DashboardStepStatus = 'locked' | 'in_progress' | 'ready' | 'complete';

export type DashboardStepTarget = 'keywords' | 'mentions-book' | 'strategy' | 'build-book';

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
  description: string;
  status: DashboardStepStatus;
  statusLabel: string;
  actionLabel: string | null;
  target: DashboardStepTarget | null;
}

export interface DashboardBaselineKeywordRow {
  id: string;
  phrase: string;
  source: string;
  volume: string;
  rank: string;
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
      description: keywordDescription(input, keywordStatus),
      status: keywordStatus,
      statusLabel: stepStatusLabel(keywordStatus),
      actionLabel: keywordActionLabel(keywordStatus),
      target: keywordStatus === 'locked' ? null : 'keywords',
    },
    {
      id: 'mentions',
      title: 'AI mentions',
      description: mentionsDescription(mentionsStatus),
      status: mentionsStatus,
      statusLabel: stepStatusLabel(mentionsStatus),
      actionLabel: mentionsStatus === 'ready' ? 'Open mentions' : null,
      target: mentionsStatus === 'locked' ? null : 'mentions-book',
    },
    {
      id: 'seo',
      title: 'SEO rankings',
      description: seoDescription(input, seoStatus),
      status: seoStatus,
      statusLabel: stepStatusLabel(seoStatus),
      actionLabel: seoStatus === 'locked' ? null : 'View baseline',
      target: seoStatus === 'locked' ? null : 'keywords',
    },
    {
      id: 'content-plan',
      title: 'Content plan',
      description: contentPlanDescription(input, contentPlanStatus),
      status: contentPlanStatus,
      statusLabel: stepStatusLabel(contentPlanStatus),
      actionLabel: contentPlanActionLabel(contentPlanStatus),
      target: contentPlanStatus === 'locked' ? null : 'strategy',
    },
  ];
}

function keywordDescription(input: DashboardStepInput, status: DashboardStepStatus): string {
  if (status === 'complete') return 'Your keyword plan is confirmed.';
  if (status === 'ready') return 'Review and confirm the keyword shortlist.';
  if (status === 'in_progress') return 'Keyword research is running from your onboarding inputs.';
  if (input.discoveryFailed) return 'Keyword research needs attention before you can continue.';
  return 'Finish onboarding to start keyword research.';
}

function keywordActionLabel(status: DashboardStepStatus): string | null {
  if (status === 'complete') return 'Open keywords';
  if (status === 'ready') return 'Review keywords';
  if (status === 'in_progress') return 'View progress';
  return null;
}

function mentionsDescription(status: DashboardStepStatus): string {
  if (status === 'locked') return 'Confirm keywords to start AI mention tracking.';
  return 'Measure how AI engines mention and recommend your business.';
}

function seoDescription(input: DashboardStepInput, status: DashboardStepStatus): string {
  if (status === 'complete') return 'Early rankings and Search Console signals are captured.';
  if (status === 'in_progress')
    return 'Collecting rankings, Search Console queries, and competitor gaps.';
  return 'Market baseline unlocks after onboarding is saved.';
}

function contentPlanDescription(input: DashboardStepInput, status: DashboardStepStatus): string {
  if (status === 'complete') return 'Your content plan is ready in Strategy.';
  if (status === 'in_progress') return 'Building your content plan from confirmed keywords.';
  if (status === 'ready') return 'Generate the content calendar from your keyword plan.';
  return 'Confirm keywords before building the content plan.';
}

function contentPlanActionLabel(status: DashboardStepStatus): string | null {
  if (status === 'complete') return 'Open plan';
  if (status === 'ready') return 'Build plan';
  if (status === 'in_progress') return 'View plan';
  return null;
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
  if (!input.onboardingDone) return 'Complete onboarding to unlock your growth workspace.';
  if (input.keywordPlanConfirmed)
    return 'Your keyword plan is confirmed. Work through the remaining steps below.';
  if (input.keywordResearchReady)
    return 'Review keyword selection, then unlock mentions and content planning.';
  if (input.baselineReady) return 'SEO baseline is ready. Keyword selection is still loading.';
  if (input.loading) return input.discoveryProgress ?? 'Researching your market.';
  return 'We saved your business profile and are preparing your first baseline.';
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
