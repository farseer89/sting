import { describe, expect, it } from 'vitest';
import { buildProtopipeAccessState, hasProtopipeCapability } from './protopipe-access.model';

describe('buildProtopipeAccessState', () => {
  it('treats active trials as advanced access', () => {
    const access = buildProtopipeAccessState({
      subscriptionStatus: 'trialing',
      trialEndsAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      planTier: 'basic',
    });

    expect(access.isTrialing).toBe(true);
    expect(access.planTier).toBe('advanced');
    expect(hasProtopipeCapability(access, 'writer')).toBe(true);
    expect(hasProtopipeCapability(access, 'article_generation')).toBe(false);
  });

  it('defaults active subscriptions to basic when planTier is missing', () => {
    const access = buildProtopipeAccessState({ subscriptionStatus: 'active' });

    expect(access.planTier).toBe('basic');
    expect(hasProtopipeCapability(access, 'ai_mentions')).toBe(true);
    expect(hasProtopipeCapability(access, 'writer')).toBe(false);
  });

  it('keeps expired trials readable but locks paid actions', () => {
    const access = buildProtopipeAccessState({
      subscriptionStatus: 'trialing',
      trialEndsAt: new Date(Date.now() - 86_400_000).toISOString(),
      planTier: 'advanced',
    });

    expect(access.billingStatus).toBe('expired');
    expect(access.isReadOnly).toBe(true);
    expect(hasProtopipeCapability(access, 'ai_mentions')).toBe(true);
    expect(hasProtopipeCapability(access, 'writer')).toBe(false);
  });
});
