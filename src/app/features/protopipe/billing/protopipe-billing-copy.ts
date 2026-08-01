import type { SubscriptionState } from '@hive/contracts';
import type { ProtopipeAccessState, ProtopipePlanTier } from '../access/protopipe-access.model';

export interface ProtopipeBillingSummary {
  planLabel: string;
  statusTitle: string;
  statusDetail: string;
  nextStep: string;
  trialWindowLabel: string | null;
}

export interface ProtopipeBillingTierOption {
  id: ProtopipePlanTier;
  name: string;
  eyebrow: string;
  priceLabel: string;
  priceCadence: string;
  description: string;
  included: readonly string[];
  note: string;
}

export interface ProtopipeBillingTierState {
  isCurrent: boolean;
  actionLabel: string;
}

export type ProtopipeBillingSection = 'overview' | 'plans' | 'stripe';

export interface ProtopipeBillingNavSection {
  id: ProtopipeBillingSection;
  navLabel: string;
}

export interface ProtopipeBillingComparisonGroup {
  id: string;
  label: string;
}

export interface ProtopipeBillingComparisonRow {
  id: string;
  groupId: string;
  label: string;
  availability: Record<ProtopipePlanTier, boolean>;
}

export const PROTOPIPE_BILLING_NAV_SECTIONS: readonly ProtopipeBillingNavSection[] = [
  { id: 'overview', navLabel: 'Overview' },
  { id: 'plans', navLabel: 'Compare plans' },
  { id: 'stripe', navLabel: 'Stripe portal' },
];

export const PROTOPIPE_BILLING_RECOMMENDED_TIER: ProtopipePlanTier = 'advanced';

export const PROTOPIPE_BILLING_COMPARISON_GROUPS: readonly ProtopipeBillingComparisonGroup[] = [
  { id: 'visibility', label: 'Visibility & plan' },
  { id: 'writing', label: 'Write with AI' },
  { id: 'production', label: 'Done for you' },
];

export const PROTOPIPE_BILLING_COMPARISON_ROWS: readonly ProtopipeBillingComparisonRow[] = [
  {
    id: 'discovery',
    groupId: 'visibility',
    label: 'Discovery book onboarding',
    availability: { basic: true, advanced: true, pro: true, agency_pro: true },
  },
  {
    id: 'mentions',
    groupId: 'visibility',
    label: 'AI Mentions and content calendar',
    availability: { basic: true, advanced: true, pro: true, agency_pro: true },
  },
  {
    id: 'brief-export',
    groupId: 'visibility',
    label: 'Brief export from calendar items',
    availability: { basic: true, advanced: true, pro: true, agency_pro: true },
  },
  {
    id: 'writer',
    groupId: 'writing',
    label: 'Writing book and draft assistant',
    availability: { basic: false, advanced: true, pro: true, agency_pro: true },
  },
  {
    id: 'sharpen',
    groupId: 'writing',
    label: 'Sharpen gap cards and thought packs',
    availability: { basic: false, advanced: true, pro: true, agency_pro: true },
  },
  {
    id: 'article-gen',
    groupId: 'production',
    label: 'One-click article generation',
    availability: { basic: false, advanced: false, pro: true, agency_pro: true },
  },
  {
    id: 'batch-runs',
    groupId: 'production',
    label: 'Batch article runs',
    availability: { basic: false, advanced: false, pro: true, agency_pro: true },
  },
  {
    id: 'publishing',
    groupId: 'production',
    label: 'Publishing-oriented workflows',
    availability: { basic: false, advanced: false, pro: true, agency_pro: true },
  },
];

export function comparisonRowsForGroup(
  groupId: string,
): readonly ProtopipeBillingComparisonRow[] {
  return PROTOPIPE_BILLING_COMPARISON_ROWS.filter((row) => row.groupId === groupId);
}

const TIER_RANK: Record<ProtopipePlanTier, number> = {
  basic: 1,
  advanced: 2,
  pro: 3,
  agency_pro: 4,
};

export const PROTOPIPE_BILLING_TIER_OPTIONS: readonly ProtopipeBillingTierOption[] = [
  {
    id: 'basic',
    name: 'Basic',
    eyebrow: 'AI Visibility + Plan',
    priceLabel: '$29.99',
    priceCadence: 'per month',
    description: 'See where AI mentions you and what to publish next.',
    included: [
      'Discovery book onboarding',
      'Keyword discovery and confirmation',
      'AI Mentions book',
      'Content calendar and brief export',
    ],
    note: 'Best for validating the visibility loop before writing inside the product.',
  },
  {
    id: 'advanced',
    name: 'Advanced',
    eyebrow: 'Write with AI',
    priceLabel: '$49.99',
    priceCadence: 'per month',
    description: 'Everything in Basic, plus writing tools inside the workspace.',
    included: ['Writing book', 'Sharpen gap cards', 'Thought packs', 'Advanced trial access'],
    note: 'Best for hands-on teams that want to turn plan items into drafts.',
  },
  {
    id: 'pro',
    name: 'Pro',
    eyebrow: 'Done for you',
    priceLabel: '$99.00',
    priceCadence: 'per month',
    description: 'Everything in Advanced, plus article runs and publishing workflows.',
    included: ['One-click article generation', 'Batch article runs', 'Publishing workflows', 'Future QA tier'],
    note: 'Best for testing the paid action path and higher-touch content production.',
  },
];

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return DATE_FORMATTER.format(date);
}

function titleCasePlan(planTier: ProtopipeAccessState['planTier']): string {
  if (planTier === 'agency_pro') return 'Agency Pro';
  return `${planTier.charAt(0).toUpperCase()}${planTier.slice(1)}`;
}

export function buildProtopipeBillingSummary(
  subscription: SubscriptionState | null | undefined,
  access: ProtopipeAccessState,
): ProtopipeBillingSummary {
  const planLabel = access.isTrialing ? 'Advanced trial' : `${titleCasePlan(access.planTier)} plan`;
  const trialEnd = formatDate(subscription?.trialEndsAt);
  const trialWindowLabel = trialEnd ? `Trial ends ${trialEnd}` : null;

  if (access.billingStatus === 'trialing') {
    return {
      planLabel,
      statusTitle: access.statusLabel,
      statusDetail:
        'Your trial includes Advanced access so you can test the full onboarding, AI Mentions, Sharpen, and Writer loop.',
      nextStep:
        'Use the Stripe billing portal to change payment details, change plan, or cancel before the trial ends.',
      trialWindowLabel,
    };
  }

  if (access.billingStatus === 'active') {
    return {
      planLabel,
      statusTitle: access.statusLabel,
      statusDetail: `Your ${planLabel.toLowerCase()} is active and billing self-service is available through Stripe.`,
      nextStep: 'Open Stripe to update the card, change plan, review invoices, or cancel.',
      trialWindowLabel,
    };
  }

  if (access.billingStatus === 'past_due') {
    return {
      planLabel,
      statusTitle: 'Payment needs attention',
      statusDetail:
        'Stripe reported a billing issue. The portal is the fastest path to update payment details and restore access.',
      nextStep: 'Open Stripe, update the payment method, then refresh billing status here.',
      trialWindowLabel,
    };
  }

  if (access.billingStatus === 'expired') {
    return {
      planLabel,
      statusTitle: 'Trial ended',
      statusDetail:
        'Your trial window has ended. Billing remains available so you can pick a plan or update payment details.',
      nextStep: 'Open Stripe to choose a plan, then refresh billing status after returning.',
      trialWindowLabel,
    };
  }

  return {
    planLabel,
    statusTitle: access.statusLabel,
    statusDetail:
      'This subscription is not currently active. Billing self-service stays available for recovery and cancellation testing.',
    nextStep: 'Open Stripe to manage the subscription, then refresh billing status after returning.',
    trialWindowLabel,
  };
}

export function resolveProtopipeBillingTierState(
  access: ProtopipeAccessState,
  tier: ProtopipeBillingTierOption,
): ProtopipeBillingTierState {
  const currentTier = access.isTrialing ? 'advanced' : access.planTier;
  const isCurrent =
    tier.id === currentTier && (access.isTrialing || access.billingStatus === 'active');

  if (isCurrent) {
    return {
      isCurrent: true,
      actionLabel: access.isTrialing ? 'Included in trial' : 'Current plan',
    };
  }

  if (access.isReadOnly) {
    return {
      isCurrent: false,
      actionLabel: `Choose ${tier.name}`,
    };
  }

  const targetRank = TIER_RANK[tier.id];
  const currentRank = TIER_RANK[currentTier];
  return {
    isCurrent: false,
    actionLabel: targetRank > currentRank ? `Upgrade to ${tier.name}` : `Change to ${tier.name}`,
  };
}
