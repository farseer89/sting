import type { SiteDesignContext } from './site-design.types';
import { siteThemeTokensToCssVars } from './site-theme.util';

/** Phase 6 — export tokens for client-sites Astro theme at publish time. */
export function exportSiteThemeForPublish(ctx: SiteDesignContext): Record<string, unknown> {
  return {
    templateId: ctx.templateId,
    baselineRenderer: ctx.baselineRenderer,
    cssVars: siteThemeTokensToCssVars(ctx.theme),
    colors: ctx.theme.color,
    typography: ctx.theme.typography,
    layout: ctx.theme.layout,
    shape: ctx.theme.shape,
  };
}
