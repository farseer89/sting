import type { SubscriptionState } from '@hive/contracts';
import type { ProtopipeAccessState } from '../access/protopipe-access.model';

export interface ProtopipeBillingSummary {
  planLabel: string;
  statusTitle: string;
  statusDetail: string;
  nextStep: string;
  trialWindowLabel: string | null;
}

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
