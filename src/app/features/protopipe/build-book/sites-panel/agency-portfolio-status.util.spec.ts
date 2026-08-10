import { describe, expect, it } from 'vitest';
import {
  buildAgencySitePortfolioStatus,
  type AgencySiteStatusSignals,
} from './agency-portfolio-status.util';
import type { ProtopipeSite } from '@hive/contracts';

function site(partial: Partial<ProtopipeSite> & Pick<ProtopipeSite, 'id' | 'displayName' | 'url' | 'hostname'>): ProtopipeSite {
  return partial;
}

describe('buildAgencySitePortfolioStatus', () => {
  it('flags missing slug and suggests register', () => {
    const status = buildAgencySitePortfolioStatus(
      site({
        id: '1',
        displayName: 'Draft',
        url: 'https://example.com',
        hostname: 'example.com',
      }),
      { keywordCount: 0, contentPlanComplete: false, blogPostPageCount: 0 },
    );
    expect(status.chips.some((c) => c.id === 'slug' && c.tone === 'warn')).toBe(true);
    expect(status.nextStep).toBe('Register hosted slug');
  });

  it('surfaces next step after slug when keywords missing', () => {
    const status = buildAgencySitePortfolioStatus(
      site({
        id: '2',
        displayName: 'DWP',
        url: 'https://destinationweddingpainter.com',
        hostname: 'destinationweddingpainter.com',
        clientSitesSlug: 'destinationweddingpainter',
        previewBaseUrl: 'https://destinationweddingpainter.com',
      }),
      { keywordCount: 0, contentPlanComplete: false, blogPostPageCount: 0 },
    );
    expect(status.chips.some((c) => c.id === 'slug' && c.tone === 'ok')).toBe(true);
    expect(status.nextStep).toBe('Add keywords / run discovery');
  });

  it('is ready when plan and blog profile exist', () => {
    const signals: AgencySiteStatusSignals = {
      keywordCount: 5,
      contentPlanComplete: true,
      calendarItemCount: 3,
      blogPostPageCount: 2,
      hasBlogHome: true,
    };
    const status = buildAgencySitePortfolioStatus(
      site({
        id: '3',
        displayName: 'Sparky',
        url: 'https://sparkyelectrichawaii.com',
        hostname: 'sparkyelectrichawaii.com',
        clientSitesSlug: 'sparky3',
        previewBaseUrl: 'https://sparkyelectrichawaii.com',
      }),
      signals,
    );
    expect(status.nextStep).toBe('Publish portable post to Astro');
    expect(status.chips.find((c) => c.id === 'blog')?.label).toContain('home');
    expect(status.chips.find((c) => c.id === 'publish')?.tone).toBe('ok');
  });
});
