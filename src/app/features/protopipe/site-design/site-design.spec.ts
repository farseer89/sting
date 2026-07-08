import { describe, expect, it } from 'vitest';
import type { BuildBookBlockInstance, BuildBookPage } from '../build-book/build-book.types';
import { mergeBrandBookPaletteIntoTheme } from './site-design-brand.util';
import { resolveSiteDesignContext } from './site-design-context.util';
import { resolveSiteThemeTokens, applySiteThemeCssVarsToCanvas, applySiteThemeCssVarsToElement, siteThemeFontFamilyVarStyle, siteThemeTokensToCssVars } from './site-theme.util';
import { resolveBaselineBlockRenderer } from '../build-book/build-book-baseline.util';
import {
  materializeBlockPropsForInsert,
} from './materialize-block-props.util';
import {
  collectSiteMediaLibrary,
  pickMediaForSlot,
} from './site-media.util';
import { themedPlaceholderImageUrl } from './site-design-placeholder.util';

const PAGE_HERO_URL = 'https://cdn.example.com/site/hero-in-use.jpg';
const TEMPLATE_STOCK_URL = 'https://cs-futureproof.pages.dev/sparky/site/hero-aerial.jpg';
const UPLOADED_URL = 'https://cdn.example.com/studio/uploaded.jpg';
const SPARKY_HERO_BLOCK = 'sparky-baseline-hero-callout';

function samplePage(pageId: string, blocks: BuildBookBlockInstance[]): BuildBookPage {
  return {
    id: pageId,
    kind: 'homepage',
    label: 'Home',
    slug: '/',
    blocks,
  };
}

describe('site-design media library', () => {
  it('prefers page in-use images over template stock when picking slots', () => {
    const pages = [
      samplePage('home', [
        {
          id: 'hero-1',
          blockId: SPARKY_HERO_BLOCK,
          section: 'hero',
          componentId: 'baseline-sparky-hero',
          order: 0,
          props: { backgroundImageSrc: PAGE_HERO_URL },
        },
      ]),
    ];

    const library = collectSiteMediaLibrary({
      templateId: 'sparky-electric-trades-v1',
      pages,
      currentPageId: 'home',
      studioAssets: [{ id: 'u1', url: UPLOADED_URL, label: 'Uploaded' }],
    });

    const used = new Set<string>();
    const first = pickMediaForSlot({ propPath: 'backgroundImageSrc', role: 'hero-background' }, library, used);
    const second = pickMediaForSlot({ propPath: 'imageSrc', role: 'featured' }, library, used);

    expect(first).toBe(PAGE_HERO_URL);
    expect(second).toBe(UPLOADED_URL);
    expect(library.templateStock.some((item) => item.url === TEMPLATE_STOCK_URL)).toBe(true);
  });
});

describe('materializeBlockProps', () => {
  it('produces identical props for ghost preview and commit insert', () => {
    const pages = [
      samplePage('home', [
        {
          id: 'hero-1',
          blockId: SPARKY_HERO_BLOCK,
          section: 'hero',
          componentId: 'baseline-sparky-hero',
          order: 0,
          props: { backgroundImageSrc: PAGE_HERO_URL },
        },
      ]),
    ];

    const ctx = resolveSiteDesignContext(
      {
        siteId: 'site-1',
        templateId: 'sparky-electric-trades-v1',
        pageId: 'home',
        pageKind: 'homepage',
        siteDisplayName: 'Sparky Electric',
        studioAssets: [{ id: 'u1', url: UPLOADED_URL, label: 'Uploaded' }],
      },
      pages,
    );

    const blockId = SPARKY_HERO_BLOCK;
    const ghost = materializeBlockPropsForInsert(blockId, ctx);
    const commit = materializeBlockPropsForInsert(blockId, ctx);

    expect(ghost).toEqual(commit);
    expect(ghost['baselineRenderer']).toBe('sparky-site');
    expect(ghost['labBrand']).toBe('sparky');
    expect(JSON.stringify(ghost)).not.toContain(TEMPLATE_STOCK_URL);
  });

  it('keeps WRI renderer when materializing WRI blocks on a Sparky site', () => {
    const pages = [samplePage('home', [])];
    const ctx = resolveSiteDesignContext(
      {
        siteId: 'site-1',
        templateId: 'sparky-electric-trades-v1',
        pageId: 'home',
        pageKind: 'homepage',
        siteDisplayName: 'Sparky Electric',
      },
      pages,
    );

    const props = materializeBlockPropsForInsert('wri-baseline-sidebar-facts', ctx);
    expect(props['baselineRenderer']).toBe('wri-site');
    expect(props['labBrand']).toBe('wri');
  });

  it('falls back to themed SVG when no unused media remains in the library', () => {
    const library = collectSiteMediaLibrary({
      templateId: 'sparky-electric-trades-v1',
      pages: [samplePage('home', [])],
      currentPageId: 'home',
    });
    const used = new Set(library.all.map((asset) => asset.url));

    expect(
      pickMediaForSlot({ propPath: 'backgroundImageSrc', role: 'hero-background' }, library, used),
    ).toBeNull();

    const theme = resolveSiteDesignContext(
      {
        siteId: 'site-1',
        templateId: 'sparky-electric-trades-v1',
        pageId: 'home',
        pageKind: 'homepage',
        siteDisplayName: 'Sparky Electric',
      },
      [samplePage('home', [])],
    ).theme;

    expect(themedPlaceholderImageUrl(theme, 'Preview')).toMatch(/^data:image\/svg\+xml,/);
  });
});

describe('brand book theme merge', () => {
  it('merges Brand Book palette accents into site theme tokens', () => {
    const theme = mergeBrandBookPaletteIntoTheme('wri-field-authority-v1', {
      primary: '#112233',
      accent: '#ff5500',
      background: '#fafafa',
    });

    expect(theme.color.ink).toBe('#112233');
    expect(theme.color.accent).toBe('#ff5500');
    expect(theme.color.background).toBe('#fafafa');
  });
});

describe('theme contrast tokens', () => {
  it('uses dark text on light accent backgrounds', () => {
    const theme = resolveSiteThemeTokens('sparky-electric-trades-v1');
    expect(theme.color.accent).toBe('#f59e0b');
    expect(theme.color.accentOn).toBe('#171a20');
  });

  it('uses light text on dark accent backgrounds', () => {
    const theme = resolveSiteThemeTokens('wilco-consulting-v1');
    expect(theme.color.accentOn).toBe('#ffffff');
  });

  it('re-derives onInk when persisted theme override changes ink', () => {
    const ctx = resolveSiteDesignContext(
      {
        siteId: 'site-1',
        templateId: 'wri-field-authority-v1',
        pageId: 'home',
        pageKind: 'homepage',
        themeOverride: { ink: '#f4f4f5' },
      },
      [samplePage('home', [])],
    );

    expect(ctx.theme.color.ink).toBe('#f4f4f5');
    expect(ctx.theme.color.onInk).toBe('#171a20');
  });

  it('derives onSurface for readable text on themed surface bands', () => {
    const theme = resolveSiteThemeTokens('sparky-electric-trades-v1', {
      surface: '#171a20',
    });

    expect(theme.color.surface).toBe('#171a20');
    expect(theme.color.onSurface).toBe('#ffffff');
  });

  it('applies persisted typography overrides to site design context', () => {
    const ctx = resolveSiteDesignContext(
      {
        siteId: 'site-1',
        templateId: 'sparky-electric-trades-v1',
        pageId: 'home',
        pageKind: 'homepage',
        typographyOverride: {
          fontSans: "'Source Sans 3', system-ui, sans-serif",
          fontSerif: "'Cormorant Garamond', Georgia, serif",
        },
      },
      [samplePage('home', [])],
    );

    expect(ctx.theme.typography.fontSans).toContain('Source Sans 3');
    expect(ctx.theme.typography.fontSerif).toContain('Cormorant Garamond');
  });

  it('applies font stacks to css vars via setProperty', () => {
    const styles = new Map<string, string>();
    const element = {
      style: {
        setProperty(key: string, value: string) {
          styles.set(key, value);
        },
        getPropertyValue(key: string) {
          return styles.get(key) ?? '';
        },
      },
    } as unknown as HTMLElement;
    const theme = resolveSiteThemeTokens('sparky-electric-trades-v1', undefined, {
      fontSans: "'Inter', system-ui, sans-serif",
      fontSerif: "'Playfair Display', Georgia, serif",
    });

    applySiteThemeCssVarsToElement(element, siteThemeTokensToCssVars(theme));

    expect(element.style.getPropertyValue('--bb-font-sans')).toBe("'Inter', system-ui, sans-serif");
    expect(element.style.getPropertyValue('--bb-font-serif')).toBe(
      "'Playfair Display', Georgia, serif",
    );
  });

  it('binds comma-safe font stacks through css custom properties', () => {
    expect(
      siteThemeFontFamilyVarStyle("'Inter', system-ui, sans-serif", '--bk-type-font-sans'),
    ).toEqual({
      '--bk-type-font-sans': "'Inter', system-ui, sans-serif",
    });
  });

  it('applies theme vars to canvas host and scrollport', () => {
    const hostStyles = new Map<string, string>();
    const canvasStyles = new Map<string, string>();
    const host = {
      querySelector() {
        return canvas;
      },
      style: {
        setProperty(key: string, value: string) {
          hostStyles.set(key, value);
        },
        getPropertyValue(key: string) {
          return hostStyles.get(key) ?? '';
        },
      },
    } as unknown as HTMLElement;
    const canvas = {
      style: {
        setProperty(key: string, value: string) {
          canvasStyles.set(key, value);
        },
        getPropertyValue(key: string) {
          return canvasStyles.get(key) ?? '';
        },
      },
    } as unknown as HTMLElement;
    const theme = resolveSiteThemeTokens('veil-live-painter-v1', undefined, {
      fontSans: "'Nunito Sans', system-ui, sans-serif",
      fontSerif: "'Playfair Display', Georgia, serif",
    });

    applySiteThemeCssVarsToCanvas(host, siteThemeTokensToCssVars(theme));

    expect(host.style.getPropertyValue('--bb-font-sans')).toContain('Nunito Sans');
    expect(canvas.style.getPropertyValue('--bb-font-serif')).toContain('Playfair Display');
  });

  it('resolves block renderer from catalog even when props were overwritten', () => {
    expect(
      resolveBaselineBlockRenderer('wri-baseline-regulatory-trust', {
        baselineRenderer: 'sparky-site',
      }),
    ).toBe('wri-site');
    expect(
      resolveBaselineBlockRenderer('sparky-baseline-trust-stats', {
        baselineRenderer: 'wri-site',
      }),
    ).toBe('sparky-site');
  });
});
