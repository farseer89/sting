import type { SiteThemeColorTokens, SiteThemeTokens } from './site-design.types';
import { resolveSiteThemeTokens } from './site-theme.util';

/** Phase 4 bridge — merge Brand Book infographic palette into site theme colors. */
export function mergeBrandBookPaletteIntoTheme(
  templateId: string | null | undefined,
  brandPalette?: Partial<{
    primary: string;
    accent: string;
    background: string;
  }> | null,
): SiteThemeTokens {
  if (!brandPalette) return resolveSiteThemeTokens(templateId);

  const override: Partial<SiteThemeColorTokens> = {};
  if (brandPalette.primary) override.ink = brandPalette.primary;
  if (brandPalette.accent) override.accent = brandPalette.accent;
  if (brandPalette.background) {
    override.background = brandPalette.background;
    override.surface = brandPalette.background;
  }

  return resolveSiteThemeTokens(templateId, override);
}
