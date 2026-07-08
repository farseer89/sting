import { googleFontSpecsForPairingsCatalog } from './site-theme-font-pairings.catalog';
import {
  SITE_THEME_FONT_STACK_OPTIONS,
  extractPrimaryFontFamily,
  matchSiteThemeFontOptionId,
} from './site-theme-fonts.catalog';
import type { SiteThemeTypographyTokens } from './site-design.types';

const GOOGLE_FONTS_LINK_ID = 'protopipe-site-theme-google-fonts';
const GOOGLE_FONTS_CATALOG_LINK_PREFIX = 'protopipe-site-theme-google-fonts-catalog';
const GOOGLE_FONTS_CATALOG_CHUNK_SIZE = 8;

function encodeGoogleFamilySpec(spec: string): string {
  return `family=${spec.replace(/ /g, '+')}`;
}

export function buildGoogleFontsStylesheetUrl(specs: readonly string[]): string | null {
  const unique = [...new Set(specs.filter(Boolean))];
  if (unique.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${unique.map(encodeGoogleFamilySpec).join('&')}&display=swap`;
}

export function googleFontSpecsForStacks(...stacks: (string | undefined)[]): string[] {
  const specs: string[] = [];

  for (const stack of stacks) {
    if (!stack) continue;
    const optionId = matchSiteThemeFontOptionId(stack);
    const option = optionId
      ? SITE_THEME_FONT_STACK_OPTIONS.find((entry) => entry.id === optionId)
      : SITE_THEME_FONT_STACK_OPTIONS.find(
          (entry) =>
            extractPrimaryFontFamily(entry.stack)?.toLowerCase() ===
            extractPrimaryFontFamily(stack)?.toLowerCase(),
        );

    if (option?.googleSpec) specs.push(option.googleSpec);
  }

  return specs;
}

export function googleFontSpecsForTypography(
  typography: Pick<SiteThemeTypographyTokens, 'fontSans' | 'fontSerif'>,
): string[] {
  return googleFontSpecsForStacks(typography.fontSans, typography.fontSerif);
}

export function googleFontSpecsForCatalog(): string[] {
  return googleFontSpecsForPairingsCatalog();
}

function upsertStylesheetLink(linkId: string, url: string | null): void {
  if (typeof document === 'undefined') return;

  const existing = document.getElementById(linkId) as HTMLLinkElement | null;
  if (!url) {
    existing?.remove();
    return;
  }

  if (existing) {
    if (existing.href !== url) existing.href = url;
    return;
  }

  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

function removeStylesheetLinksWithPrefix(prefix: string, keepCount: number): void {
  if (typeof document === 'undefined') return;

  for (let index = keepCount; ; index += 1) {
    const link = document.getElementById(`${prefix}-${index}`);
    if (!link) break;
    link.remove();
  }
}

/** Load only the sans/serif pair used on the live site canvas. */
export function ensureSiteThemeGoogleFontsLoaded(
  typography: Pick<SiteThemeTypographyTokens, 'fontSans' | 'fontSerif'>,
): void {
  upsertStylesheetLink(
    GOOGLE_FONTS_LINK_ID,
    buildGoogleFontsStylesheetUrl(googleFontSpecsForTypography(typography)),
  );
}

export function siteThemeGoogleFontCatalogStylesheetUrls(): string[] {
  const specs = googleFontSpecsForCatalog();
  const chunks: string[][] = [];

  for (let index = 0; index < specs.length; index += GOOGLE_FONTS_CATALOG_CHUNK_SIZE) {
    chunks.push(specs.slice(index, index + GOOGLE_FONTS_CATALOG_CHUNK_SIZE));
  }

  return chunks
    .map((chunk) => buildGoogleFontsStylesheetUrl(chunk))
    .filter((url): url is string => url !== null);
}

/** Load the full curated catalog so typography pickers can preview every option. */
export function ensureSiteThemeGoogleFontCatalogLoaded(): void {
  const urls = siteThemeGoogleFontCatalogStylesheetUrls();

  urls.forEach((url, index) => {
    upsertStylesheetLink(`${GOOGLE_FONTS_CATALOG_LINK_PREFIX}-${index}`, url);
  });

  removeStylesheetLinksWithPrefix(GOOGLE_FONTS_CATALOG_LINK_PREFIX, urls.length);
}
