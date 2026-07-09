import { SITE_THEME_FONT_STACK_OPTIONS } from './site-theme-fonts.catalog';

const STYLE_ID = 'bk-site-theme-font-preview';

/** CSS rules for [data-bk-font] preview chips — single source of truth from the catalog. */
export function siteThemeFontPreviewStyleRules(): string {
  return SITE_THEME_FONT_STACK_OPTIONS.map(
    (option) => `[data-bk-font="${option.id}"]{font-family:${option.stack} !important;}`,
  ).join('\n');
}

/** Inject catalog-driven font preview rules so pairing cards beat shell .p-component / Inter. */
export function ensureSiteThemeFontPreviewStyles(): void {
  if (typeof document === 'undefined') return;

  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }

  const rules = siteThemeFontPreviewStyleRules();
  if (style.textContent !== rules) {
    style.textContent = rules;
  }
}
