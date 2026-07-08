import { findBuildBookTemplate } from '../build-book/build-book-template.catalog';
import { contrastTextOn } from './site-theme-contrast.util';
import type {
  SiteBaselineRenderer,
  SiteThemeColorTokens,
  SiteThemeTokens,
  SiteThemeTypographyOverride,
} from './site-design.types';

const RENDERER_BY_TEMPLATE: Record<string, SiteBaselineRenderer> = {
  'sparky-electric-trades-v1': 'sparky-site',
  'wri-field-authority-v1': 'wri-site',
  'wilco-consulting-v1': 'wilco-site',
  'veil-live-painter-v1': 'veil-site',
  'blackstone-landscaping-v1': 'hil-site',
};

const TYPOGRAPHY_BY_RENDERER: Record<
  SiteBaselineRenderer,
  Pick<SiteThemeTokens['typography'], 'fontSans' | 'fontSerif'>
> = {
  'sparky-site': {
    fontSans: "'DM Sans', system-ui, sans-serif",
    fontSerif: 'Georgia, serif',
  },
  'wri-site': {
    fontSans: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    fontSerif: "Georgia, 'Times New Roman', serif",
  },
  'wilco-site': {
    fontSans: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    fontSerif: "Georgia, 'Times New Roman', serif",
  },
  'veil-site': {
    fontSans: "'Source Sans 3', system-ui, sans-serif",
    fontSerif: "'Cormorant Garamond', Georgia, serif",
  },
  'hil-site': {
    fontSans: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    fontSerif: 'Georgia, serif',
  },
};

const SHAPE_BY_RENDERER: Record<
  SiteBaselineRenderer,
  Pick<SiteThemeTokens['shape'], 'radiusSm' | 'radiusMd' | 'buttonRadius'>
> = {
  'sparky-site': { radiusSm: '4px', radiusMd: '6px', buttonRadius: '4px' },
  'wri-site': { radiusSm: '2px', radiusMd: '2px', buttonRadius: '2px' },
  'wilco-site': { radiusSm: '4px', radiusMd: '8px', buttonRadius: '999px' },
  'veil-site': { radiusSm: '6px', radiusMd: '12px', buttonRadius: '999px' },
  'hil-site': { radiusSm: '4px', radiusMd: '8px', buttonRadius: '6px' },
};

export function baselineRendererForTemplate(
  templateId: string | null | undefined,
): SiteBaselineRenderer | null {
  if (!templateId) return null;
  return RENDERER_BY_TEMPLATE[templateId] ?? null;
}

function deriveColorTokens(
  templateId: string | null | undefined,
  override?: Partial<SiteThemeColorTokens>,
): SiteThemeColorTokens {
  const template = findBuildBookTemplate(templateId);
  const accent = override?.accent ?? template?.accent ?? '#2563eb';

  const isSparky = templateId?.includes('sparky');
  const isWri = templateId?.includes('wri');
  const isWilco = templateId?.includes('wilco');
  const isVeil = templateId?.includes('veil');
  const isHil = templateId?.includes('blackstone');

  const background =
    override?.background ??
    (isSparky ? '#ffffff' : isVeil ? '#faf7f2' : isWri ? '#f6f8fa' : '#ffffff');
  const surface =
    override?.surface ??
    (isSparky ? '#f4f4f4' : isVeil ? '#ffffff' : isWri ? '#e8eef3' : '#f4f4f5');
  const ink =
    override?.ink ??
    (isWilco ? '#18181b' : isVeil ? '#2c2420' : isWri ? '#0a2240' : '#171a20');
  const text = override?.text ?? ink;
  const muted =
    override?.muted ??
    (isVeil ? '#7a6e68' : isWri ? '#5c7389' : '#71717a');
  const border =
    override?.border ??
    (isVeil ? '#e8dfd4' : isWri ? '#d4dee8' : '#e4e4e7');
  const accentSoft =
    override?.accentSoft ??
    (isSparky ? '#ecfeff' : isVeil ? '#f5eed9' : isWri ? '#e6f3f9' : '#eff6ff');
  const accentOn = override?.accentOn ?? contrastTextOn(accent);
  const onInk = override?.onInk ?? contrastTextOn(ink);
  const onSurface = override?.onSurface ?? contrastTextOn(surface);
  const onAccentSoft = override?.onAccentSoft ?? contrastTextOn(accentSoft);

  return {
    background,
    surface,
    ink,
    text,
    muted,
    accent,
    accentSoft,
    border,
    accentOn,
    onInk,
    onSurface,
    onAccentSoft,
  };
}

/** Merge color overrides and re-derive contrast tokens from final ink/accent/accentSoft. */
export function mergeSiteThemeColorOverride(
  templateId: string | null | undefined,
  base: SiteThemeColorTokens,
  override?: Partial<SiteThemeColorTokens>,
): SiteThemeColorTokens {
  if (!override || Object.keys(override).length === 0) return base;

  const { accentOn: _accentOn, onInk: _onInk, onSurface: _onSurface, onAccentSoft: _onAccentSoft, ...baseColors } = base;
  void _accentOn;
  void _onInk;
  void _onSurface;
  void _onAccentSoft;

  return deriveColorTokens(templateId, { ...baseColors, ...override });
}

function defaultTypography(renderer: SiteBaselineRenderer | null): SiteThemeTokens['typography'] {
  if (renderer) {
    return { ...TYPOGRAPHY_BY_RENDERER[renderer], headingWeight: 700, bodyWeight: 400 };
  }
  return {
    fontSans: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    fontSerif: 'Georgia, serif',
    headingWeight: 700,
    bodyWeight: 400,
  };
}

export function mergeSiteThemeTypographyOverride(
  templateId: string | null | undefined,
  base: SiteThemeTokens['typography'],
  override?: SiteThemeTypographyOverride,
): SiteThemeTokens['typography'] {
  if (!override || Object.keys(override).length === 0) return base;

  const renderer = baselineRendererForTemplate(templateId);
  const defaults = defaultTypography(renderer);

  return {
    fontSans: override.fontSans ?? base.fontSans ?? defaults.fontSans,
    fontSerif: override.fontSerif ?? base.fontSerif ?? defaults.fontSerif,
    headingWeight: override.headingWeight ?? base.headingWeight ?? defaults.headingWeight,
    bodyWeight: override.bodyWeight ?? base.bodyWeight ?? defaults.bodyWeight,
  };
}

export function resolveSiteThemeTokens(
  templateId: string | null | undefined,
  colorOverride?: Partial<SiteThemeColorTokens>,
  typographyOverride?: SiteThemeTypographyOverride,
): SiteThemeTokens {
  const renderer = baselineRendererForTemplate(templateId);
  const typography = mergeSiteThemeTypographyOverride(
    templateId,
    defaultTypography(renderer),
    typographyOverride,
  );
  const shape = renderer
    ? SHAPE_BY_RENDERER[renderer]
    : { radiusSm: '4px', radiusMd: '6px', buttonRadius: '4px' };

  return {
    color: deriveColorTokens(templateId, colorOverride),
    typography,
    layout: {
      contentMax: '76rem',
      gutter: 'clamp(1.25rem, 5vw, 2rem)',
      sectionSpacing: '4rem',
    },
    shape,
  };
}

const SITE_THEME_CSS_VAR_KEYS = [
  '--bb-background',
  '--bb-surface',
  '--bb-ink',
  '--bb-text',
  '--bb-muted',
  '--bb-accent',
  '--bb-accent-soft',
  '--bb-accent-on',
  '--bb-on-ink',
  '--bb-on-navy',
  '--bb-on-surface',
  '--bb-on-accent-soft',
  '--bb-border',
  '--bb-font-sans',
  '--bb-font-serif',
  '--bb-content-max',
  '--bb-gutter',
  '--bb-section-spacing',
  '--bb-radius-sm',
  '--bb-radius-md',
  '--bb-button-radius',
] as const;

/** Apply theme tokens with setProperty so comma-separated font stacks survive. */
export function applySiteThemeCssVarsToElement(
  element: HTMLElement | null | undefined,
  vars: Record<string, string> | null | undefined,
): void {
  if (!element || !vars) return;

  for (const key of SITE_THEME_CSS_VAR_KEYS) {
    const value = vars[key];
    if (value == null) continue;
    element.style.setProperty(key, value);
  }
}

/** Apply theme tokens on the canvas host and scrollport so baseline blocks inherit font vars. */
export function applySiteThemeCssVarsToCanvas(
  host: HTMLElement | null | undefined,
  vars: Record<string, string> | null | undefined,
): void {
  applySiteThemeCssVarsToElement(host, vars);
  applySiteThemeCssVarsToElement(host?.querySelector('.bb-page-canvas') ?? null, vars);
}

export function siteThemeTypographyStyle(
  typography: Pick<SiteThemeTokens['typography'], 'fontSans' | 'fontSerif'> | null | undefined,
  role: 'sans' | 'serif',
): Record<string, string> {
  if (!typography) return {};
  return { fontFamily: role === 'sans' ? typography.fontSans : typography.fontSerif };
}

export function siteThemeFontStack(
  typography: Pick<SiteThemeTokens['typography'], 'fontSans' | 'fontSerif'> | null | undefined,
  role: 'sans' | 'serif',
): string | null {
  if (!typography) return null;
  return role === 'sans' ? typography.fontSans : typography.fontSerif;
}

/** Bind a comma-safe font stack to an element via a CSS custom property. */
export function siteThemeFontFamilyVarStyle(
  stack: string | null | undefined,
  varName: '--bk-type-font-sans' | '--bk-type-font-serif' = '--bk-type-font-sans',
): Record<string, string> {
  const value = stack?.trim();
  return value ? { [varName]: value } : {};
}

export function siteThemeTokensToCssVars(theme: SiteThemeTokens): Record<string, string> {
  const { color, typography, layout, shape } = theme;
  return {
    '--bb-background': color.background,
    '--bb-surface': color.surface,
    '--bb-ink': color.ink,
    '--bb-text': color.text,
    '--bb-muted': color.muted,
    '--bb-accent': color.accent,
    '--bb-accent-soft': color.accentSoft,
    '--bb-accent-on': color.accentOn,
    '--bb-on-ink': color.onInk,
    '--bb-on-navy': color.onInk,
    '--bb-on-surface': color.onSurface,
    '--bb-on-accent-soft': color.onAccentSoft,
    '--bb-border': color.border,
    '--bb-font-sans': typography.fontSans,
    '--bb-font-serif': typography.fontSerif,
    '--bb-content-max': layout.contentMax,
    '--bb-gutter': layout.gutter,
    '--bb-section-spacing': layout.sectionSpacing,
    '--bb-radius-sm': shape.radiusSm,
    '--bb-radius-md': shape.radiusMd,
    '--bb-button-radius': shape.buttonRadius,
  };
}

export function siteThemeToInfographicPalette(theme: SiteThemeTokens): {
  primary: string;
  accent: string;
  background: string;
} {
  return {
    primary: theme.color.ink,
    accent: theme.color.accent,
    background: theme.color.surface,
  };
}
