import { describe, expect, it } from 'vitest';
import { buildOnboardingScanUiContext } from './onboarding-scan-context';

describe('buildOnboardingScanUiContext', () => {
  it('derives trade-specific help examples from scan results', () => {
    const ctx = buildOnboardingScanUiContext({
      scan: {
        siteServices: ['Drain cleaning', 'Water heater repair'],
        suggestedServices: ['Sewer line repair'],
        tradeLabel: 'Plumber',
        customerAvatars: ['Homeowner with a slow drain before guests arrive'],
        businessNameHint: 'Bay Area Plumbing',
      },
      websiteUrl: 'https://bayareaplumbing.com',
    });

    expect(ctx.stepHelpExamples[2]).toContain('Drain cleaning');
    expect(ctx.stepHelpExamples[3]).toContain('slow drain');
    expect(ctx.businessNameHint).toBe('Bay Area Plumbing');
    expect(ctx.urlPlaceholder).toBe('bayareaplumbing.com');
    expect(ctx.avatarPlaceholders[0]).toContain('slow drain');
  });

  it('uses entered services for strategy-only flows', () => {
    const ctx = buildOnboardingScanUiContext({
      scan: null,
      services: ['SaaS onboarding audits'],
      isStrategyOnly: true,
    });

    expect(ctx.stepHelpExamples[2]).toContain('SaaS onboarding audits');
    expect(ctx.servicePlaceholder).toContain('saas onboarding audits');
  });
});
