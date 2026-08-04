import type { ProtopipeOnboardingProfile, ProtopipeSite } from '@hive/contracts';

export type DashboardDiscoveryStatus =
  | 'collecting'
  | 'market-ready'
  | 'keyword-loading'
  | 'keyword-ready'
  | 'confirmed'
  | 'failed';

export interface DashboardChip {
  id: string;
  label: string;
}

export interface DashboardField {
  id: string;
  label: string;
  value: string;
}

interface DashboardMarketBaselineSource {
  label: string;
  status: string;
  count: number;
  reason?: string;
}

export interface DashboardMarketBaselineLike {
  sources?: Record<string, DashboardMarketBaselineSource>;
}

export interface DashboardMarketStatusInput {
  onboardingDone: boolean;
  keywordPlanConfirmed: boolean;
  keywordResearchReady: boolean;
  baselineReady: boolean;
  loading: boolean;
  discoveryProgress: string | null;
}

export function buildCollectedFields(
  site: ProtopipeSite | null | undefined,
  profile: ProtopipeOnboardingProfile | null | undefined,
): DashboardField[] {
  const fields: DashboardField[] = [];
  const website = site?.url?.trim() || site?.hostname?.trim();
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
      value: `${profile.services.length} service${profile.services.length === 1 ? '' : 's'} captured`,
    });
  }
  if (profile?.customerAvatars?.length) {
    fields.push({
      id: 'customers',
      label: 'Customers',
      value: `${profile.customerAvatars.length} customer moment${profile.customerAvatars.length === 1 ? '' : 's'} captured`,
    });
  }
  if (profile?.competitors?.length) {
    fields.push({
      id: 'competitors',
      label: 'Competitors',
      value: `${profile.competitors.length} competitor${profile.competitors.length === 1 ? '' : 's'} queued`,
    });
  }
  return fields;
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
  if (!input.onboardingDone) return 'Complete onboarding to start market research.';
  if (input.keywordPlanConfirmed)
    return 'Your keyword plan is confirmed. Strategy and visibility tools are ready.';
  if (input.keywordResearchReady) return 'Your keyword plan is ready to review and confirm.';
  if (input.baselineReady)
    return 'Your market baseline is ready. Keyword planning is still loading.';
  if (input.loading) return input.discoveryProgress ?? 'Researching your market.';
  return 'We saved your inputs and are preparing your first market baseline.';
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
