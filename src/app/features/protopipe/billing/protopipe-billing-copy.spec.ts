import { describe, expect, it } from 'vitest';
import type { SubscriptionState } from '@hive/contracts';
import { buildProtopipeAccessState } from '../access/protopipe-access.model';
import { buildProtopipeBillingSummary } from './protopipe-billing-copy';

function summaryFor(subscription: SubscriptionState) {
  return buildProtopipeBillingSummary(subscription, buildProtopipeAccessState(subscription));
}

describe('buildProtopipeBillingSummary', () => {
  it('explains trial billing self-service', () => {
    const summary = summaryFor({
      subscriptionStatus: 'trialing',
      trialEndsAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      planTier: 'basic',
    });

    expect(summary.planLabel).toBe('Advanced trial');
    expect(summary.statusDetail).toContain('Advanced access');
    expect(summary.nextStep).toContain('cancel before the trial ends');
  });

  it('keeps active users on Stripe for card and cancellation actions', () => {
    const summary = summaryFor({
      subscriptionStatus: 'active',
      planTier: 'pro',
    });

    expect(summary.planLabel).toBe('Pro plan');
    expect(summary.nextStep).toContain('update the card');
    expect(summary.nextStep).toContain('cancel');
  });

  it('keeps inactive billing recoverable', () => {
    const summary = summaryFor({
      subscriptionStatus: 'canceled',
      planTier: 'basic',
    });

    expect(summary.statusDetail).toContain('not currently active');
    expect(summary.nextStep).toContain('manage the subscription');
  });
});
