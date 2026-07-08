import { describe, expect, it } from 'vitest';
import {
  matchSiteThemeFontOptionId,
  siteThemeFontOptionsForCategory,
  siteThemeFontStackForOptionId,
} from './site-theme-fonts.catalog';

describe('site-theme-fonts.catalog', () => {
  it('exposes expanded sans and serif catalogs', () => {
    expect(siteThemeFontOptionsForCategory('sans').length).toBeGreaterThanOrEqual(10);
    expect(siteThemeFontOptionsForCategory('serif').length).toBeGreaterThanOrEqual(8);
  });

  it('matches stacks by primary font family when the fallback stack differs', () => {
    expect(matchSiteThemeFontOptionId("'DM Sans', Arial, sans-serif")).toBe('dm-sans');
    expect(matchSiteThemeFontOptionId("'Cormorant Garamond', Times, serif")).toBe(
      'cormorant-garamond',
    );
  });

  it('returns stacks for option ids', () => {
    expect(siteThemeFontStackForOptionId('inter')).toContain('Inter');
    expect(siteThemeFontStackForOptionId('playfair-display')).toContain('Playfair Display');
  });
});
