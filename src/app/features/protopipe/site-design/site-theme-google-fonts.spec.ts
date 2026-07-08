import { describe, expect, it } from 'vitest';
import {
  buildGoogleFontsStylesheetUrl,
  googleFontSpecsForCatalog,
  googleFontSpecsForTypography,
  siteThemeGoogleFontCatalogStylesheetUrls,
} from './site-theme-google-fonts.util';

describe('site-theme-google-fonts', () => {
  it('builds a Google Fonts stylesheet URL from family specs', () => {
    const url = buildGoogleFontsStylesheetUrl([
      'Inter:wght@400;500;600;700',
      'Playfair Display:wght@400;600;700',
    ]);

    expect(url).toContain('fonts.googleapis.com/css2');
    expect(url).toContain('family=Inter:wght@400;500;600;700');
    expect(url).toContain('family=Playfair+Display:wght@400;600;700');
    expect(url).toContain('display=swap');
  });

  it('returns null when no google families are requested', () => {
    expect(buildGoogleFontsStylesheetUrl([])).toBeNull();
  });

  it('resolves google specs from typography stacks', () => {
    const specs = googleFontSpecsForTypography({
      fontSans: "'DM Sans', system-ui, sans-serif",
      fontSerif: "'Cormorant Garamond', Georgia, serif",
    });

    expect(specs).toContain('DM+Sans:wght@400;500;600;700');
    expect(specs).toContain('Cormorant+Garamond:wght@400;500;600;700');
  });

  it('includes google specs for pairing catalog fonts', () => {
    const specs = googleFontSpecsForCatalog();
    expect(specs.length).toBeGreaterThan(10);
    expect(specs.some((spec) => spec.startsWith('Inter'))).toBe(true);
    expect(specs.some((spec) => spec.startsWith('Playfair'))).toBe(true);
  });

  it('chunks catalog fonts into stylesheet URLs for index.html preload', () => {
    const urls = siteThemeGoogleFontCatalogStylesheetUrls();
    expect(urls.length).toBeGreaterThanOrEqual(2);
    for (const url of urls) {
      expect(url).toContain('fonts.googleapis.com/css2');
      expect(url).toContain('display=swap');
    }
  });
});
