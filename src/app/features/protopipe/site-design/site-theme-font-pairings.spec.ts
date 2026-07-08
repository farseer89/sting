import { describe, expect, it } from 'vitest';
import { extractPrimaryFontFamily } from './site-theme-fonts.catalog';
import { siteThemeFontPreviewStyleRules } from './site-theme-font-preview-styles.util';
import {
  SITE_THEME_FONT_PAIRINGS,
  googleFontSpecsForPairingsCatalog,
  matchSiteThemeFontPairingId,
  resolvedSiteThemeFontPairings,
  typographyOverrideForPairingId,
} from './site-theme-font-pairings.catalog';

describe('site-theme-font-pairings', () => {
  it('defines curated sans and serif pairings', () => {
    expect(SITE_THEME_FONT_PAIRINGS.length).toBeGreaterThanOrEqual(10);
    for (const pairing of SITE_THEME_FONT_PAIRINGS) {
      expect(pairing.sansId).toBeTruthy();
      expect(pairing.serifId).toBeTruthy();
      expect(pairing.label).toBeTruthy();
    }
  });

  it('matches typography stacks to a pairing id', () => {
    expect(
      matchSiteThemeFontPairingId({
        fontSans: "'DM Sans', system-ui, sans-serif",
        fontSerif: 'Georgia, serif',
      }),
    ).toBe('trades-bold');
  });

  it('returns typography override for a pairing id', () => {
    const override = typographyOverrideForPairingId('modern-display');
    expect(override?.fontSans).toContain('Inter');
    expect(override?.fontSerif).toContain('Playfair Display');
  });

  it('loads google specs only for fonts used in pairings', () => {
    const specs = googleFontSpecsForPairingsCatalog();
    expect(specs.length).toBeGreaterThan(10);
    expect(specs.some((spec) => spec.startsWith('Inter'))).toBe(true);
    expect(specs.some((spec) => spec.startsWith('Lato'))).toBe(false);
  });

  it('resolves different sans primary families for trades-bold vs editorial-grace', () => {
    const pairings = resolvedSiteThemeFontPairings();
    const tradesBold = pairings.find((pairing) => pairing.id === 'trades-bold');
    const editorialGrace = pairings.find((pairing) => pairing.id === 'editorial-grace');

    expect(tradesBold?.fontSans).toContain('DM Sans');
    expect(editorialGrace?.fontSans).toContain('Source Sans 3');
    expect(extractPrimaryFontFamily(tradesBold?.fontSans)).toBe('DM Sans');
    expect(extractPrimaryFontFamily(editorialGrace?.fontSans)).toBe('Source Sans 3');
  });

  it('generates distinct data-bk-font preview rules for trades-bold vs editorial-grace sans', () => {
    const rules = siteThemeFontPreviewStyleRules();
    expect(rules).toContain('[data-bk-font="dm-sans"]');
    expect(rules).toContain('[data-bk-font="source-sans-3"]');
    expect(rules).toContain("'DM Sans'");
    expect(rules).toContain("'Source Sans 3'");

    const dmRule = rules
      .split('\n')
      .find((line) => line.startsWith('[data-bk-font="dm-sans"]'));
    const ssRule = rules
      .split('\n')
      .find((line) => line.startsWith('[data-bk-font="source-sans-3"]'));
    expect(dmRule).toBeTruthy();
    expect(ssRule).toBeTruthy();
    expect(dmRule).not.toBe(ssRule);
  });

  it('applies distinct sans stacks via setProperty (directive mechanism)', () => {
    const tradesStyles = new Map<string, string>();
    const editorialStyles = new Map<string, string>();
    const trades = {
      style: {
        setProperty(key: string, value: string, priority?: string) {
          tradesStyles.set(key, value);
        },
        getPropertyValue(key: string) {
          return tradesStyles.get(key) ?? '';
        },
      },
    } as unknown as HTMLElement;
    const editorial = {
      style: {
        setProperty(key: string, value: string, priority?: string) {
          editorialStyles.set(key, value);
        },
        getPropertyValue(key: string) {
          return editorialStyles.get(key) ?? '';
        },
      },
    } as unknown as HTMLElement;

    trades.style.setProperty('font-family', "'DM Sans', system-ui, sans-serif", 'important');
    editorial.style.setProperty('font-family', "'Source Sans 3', system-ui, sans-serif", 'important');

    expect(trades.style.getPropertyValue('font-family')).toContain('DM Sans');
    expect(editorial.style.getPropertyValue('font-family')).toContain('Source Sans 3');
    expect(trades.style.getPropertyValue('font-family')).not.toBe(
      editorial.style.getPropertyValue('font-family'),
    );
  });
});
