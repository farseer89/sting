import type { SubscriptionState, SubscriptionStatus } from '@hive/contracts';

export type ProtopipePlanTier = 'basic' | 'advanced' | 'pro' | 'agency_pro';

export type ProtopipeBillingStatus = SubscriptionStatus | 'expired';

export type ProtopipeCapability =
  | 'discovery'
  | 'ai_mentions'
  | 'strategy'
  | 'sharpen'
  | 'content_calendar'
  | 'writer'
  | 'content_packs'
  | 'article_generation'
  | 'publish'
  | 'admin_internal';

export interface ProtopipeAccessState {
  planTier: ProtopipePlanTier;
  billingStatus: ProtopipeBillingStatus;
  trialEndsAt?: string;
  trialDaysRemaining?: number;
  entitlements: readonly ProtopipeCapability[];
  isTrialing: boolean;
  isTrialExpired: boolean;
  isReadOnly: boolean;
  /** Bypasses tier gating — full product + internal nav. */
  isInternalAdmin?: boolean;
  statusLabel: string;
  upgradeLabel: string;
}

const BASIC_CAPABILITIES: readonly ProtopipeCapability[] = [
  'discovery',
  'ai_mentions',
  'strategy',
  'content_calendar',
];

const ADVANCED_CAPABILITIES: readonly ProtopipeCapability[] = [
  ...BASIC_CAPABILITIES,
  'sharpen',
  'writer',
  'content_packs',
];

const PRO_CAPABILITIES: readonly ProtopipeCapability[] = [
  ...ADVANCED_CAPABILITIES,
  'article_generation',
  'publish',
];

const INTERNAL_ADMIN_CAPABILITIES: readonly ProtopipeCapability[] = [
  ...PRO_CAPABILITIES,
  'admin_internal',
];

/** Platform operators who bypass subscription tier gating in the home dashboard. */
export const PROTOPIPE_INTERNAL_ADMIN_EMAILS: readonly string[] = [
  'michaeldempsey89@gmail.com',
];

export function isProtopipeInternalAdminEmail(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  return PROTOPIPE_INTERNAL_ADMIN_EMAILS.some((allowed) => allowed === normalized);
}

const ACTIVE_STATUSES = new Set<SubscriptionStatus>(['trialing', 'active']);

function normalizePlanTier(value?: string): ProtopipePlanTier {
  if (value === 'advanced' || value === 'pro' || value === 'agency_pro') return value;
  return 'basic';
}

function trialDaysRemaining(trialEndsAt?: string): number | undefined {
  if (!trialEndsAt) return undefined;
  const endsAt = new Date(trialEndsAt).getTime();
  if (Number.isNaN(endsAt)) return undefined;
  const msRemaining = endsAt - Date.now();
  return Math.max(0, Math.ceil(msRemaining / 86_400_000));
}

function capabilitiesForTier(tier: ProtopipePlanTier): readonly ProtopipeCapability[] {
  if (tier === 'agency_pro' || tier === 'pro') return PRO_CAPABILITIES;
  if (tier === 'advanced') return ADVANCED_CAPABILITIES;
  return BASIC_CAPABILITIES;
}

function statusLabel(
  billingStatus: ProtopipeBillingStatus,
  planTier: ProtopipePlanTier,
  daysRemaining?: number,
): string {
  if (billingStatus === 'trialing') {
    return `Advanced trial${daysRemaining != null ? ` · ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left` : ''}`;
  }
  if (billingStatus === 'expired') return 'Trial ended';
  if (billingStatus === 'past_due') return 'Payment needs attention';
  if (billingStatus === 'canceled' || billingStatus === 'unpaid') return 'Subscription inactive';
  return `${planTier.charAt(0).toUpperCase()}${planTier.slice(1)} plan`;
}

export function buildProtopipeAccessState(
  subscription?: SubscriptionState | null,
  options?: { isInternalAdmin?: boolean },
): ProtopipeAccessState {
  if (options?.isInternalAdmin) {
    return {
      planTier: 'pro',
      billingStatus: 'active',
      trialEndsAt: subscription?.trialEndsAt,
      trialDaysRemaining: trialDaysRemaining(subscription?.trialEndsAt),
      entitlements: INTERNAL_ADMIN_CAPABILITIES,
      isTrialing: false,
      isTrialExpired: false,
      isReadOnly: false,
      isInternalAdmin: true,
      statusLabel: 'Internal admin',
      upgradeLabel: 'Manage plan',
    };
  }

  const subscriptionStatus = subscription?.subscriptionStatus ?? 'none';
  const daysRemaining = trialDaysRemaining(subscription?.trialEndsAt);
  const isTrialExpired = subscriptionStatus === 'trialing' && daysRemaining === 0;
  const billingStatus: ProtopipeBillingStatus = isTrialExpired ? 'expired' : subscriptionStatus;
  const planTier = billingStatus === 'trialing' ? 'advanced' : normalizePlanTier(subscription?.planTier);
  const isActive = ACTIVE_STATUSES.has(subscriptionStatus) && !isTrialExpired;
  const isReadOnly = !isActive;

  return {
    planTier,
    billingStatus,
    trialEndsAt: subscription?.trialEndsAt,
    trialDaysRemaining: daysRemaining,
    entitlements: isActive ? capabilitiesForTier(planTier) : BASIC_CAPABILITIES,
    isTrialing: billingStatus === 'trialing',
    isTrialExpired,
    isReadOnly,
    statusLabel: statusLabel(billingStatus, planTier, daysRemaining),
    upgradeLabel:
      planTier === 'agency_pro' || planTier === 'pro'
        ? 'Manage plan'
        : `Upgrade to ${planTier === 'basic' ? 'Advanced' : 'Pro'}`,
  };
}

export function hasProtopipeCapability(
  access: ProtopipeAccessState,
  capability?: ProtopipeCapability,
): boolean {
  if (!capability) return true;
  if (access.isInternalAdmin) return true;
  if (capability === 'admin_internal') return false;
  return access.entitlements.includes(capability);
}
