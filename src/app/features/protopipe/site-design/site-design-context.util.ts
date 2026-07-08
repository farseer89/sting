import { findBuildBookTemplate } from '../build-book/build-book-template.catalog';
import type { BuildBookPage, BuildBookPageKind } from '../build-book/build-book.types';
import { blocksForPage } from '../build-book/build-book-baseline.util';
import { collectSiteMediaLibrary } from './site-media.util';
import { mergeBrandBookPaletteIntoTheme } from './site-design-brand.util';
import {
  baselineRendererForTemplate,
  mergeSiteThemeColorOverride,
  mergeSiteThemeTypographyOverride,
  resolveSiteThemeTokens,
} from './site-theme.util';
import type {
  ResolveSiteDesignContextInput,
  SiteCopyProfile,
  SiteDesignContext,
  SiteIdentityAssets,
} from './site-design.types';

function resolveVoice(
  templateId: string | null | undefined,
  siteDisplayName: string,
): SiteCopyProfile {
  const template = findBuildBookTemplate(templateId);
  const name = siteDisplayName.trim() || template?.previewKicker || 'Your business';

  if (templateId?.includes('veil')) {
    return {
      siteDisplayName: name,
      primaryCtaLabel: 'Check availability',
      secondaryCtaLabel: 'View portfolio',
      exampleEyebrow: name,
    };
  }
  if (templateId?.includes('sparky')) {
    return {
      siteDisplayName: name,
      primaryCtaLabel: 'Call now',
      secondaryCtaLabel: 'View services',
      exampleEyebrow: name,
    };
  }
  if (templateId?.includes('wilco') || templateId?.includes('consult')) {
    return {
      siteDisplayName: name,
      primaryCtaLabel: 'Book a consultation',
      secondaryCtaLabel: 'Our services',
      exampleEyebrow: name,
    };
  }

  return {
    siteDisplayName: name,
    primaryCtaLabel: template?.conversionGoal?.includes('quote') ? 'Get a quote' : 'Contact us',
    secondaryCtaLabel: 'Learn more',
    exampleEyebrow: name,
  };
}

function resolveIdentity(siteUrl?: string, phoneHref?: string | null): SiteIdentityAssets {
  return {
    siteUrl: siteUrl?.trim() || 'https://example.com',
    phoneHref: phoneHref ?? null,
  };
}

export function resolveSiteDesignContext(
  input: ResolveSiteDesignContextInput,
  pages: ReadonlyArray<BuildBookPage>,
): SiteDesignContext {
  const pageKind: BuildBookPageKind =
    pages.find((page) => page.id === input.pageId)?.kind ?? input.pageKind;

  let theme = input.brandPalette
    ? mergeBrandBookPaletteIntoTheme(input.templateId, input.brandPalette)
    : resolveSiteThemeTokens(input.templateId);
  if (input.themeOverride && Object.keys(input.themeOverride).length > 0) {
    theme = {
      ...theme,
      color: mergeSiteThemeColorOverride(input.templateId, theme.color, input.themeOverride),
    };
  }
  if (input.typographyOverride && Object.keys(input.typographyOverride).length > 0) {
    theme = {
      ...theme,
      typography: mergeSiteThemeTypographyOverride(
        input.templateId,
        theme.typography,
        input.typographyOverride,
      ),
    };
  }

  return {
    siteId: input.siteId,
    templateId: input.templateId,
    pageId: input.pageId,
    pageKind,
    baselineRenderer: baselineRendererForTemplate(input.templateId),
    theme,
    media: collectSiteMediaLibrary({
      templateId: input.templateId,
      pages,
      currentPageId: input.pageId,
      studioAssets: input.studioAssets,
    }),
    voice: resolveVoice(input.templateId, input.siteDisplayName ?? ''),
    identity: resolveIdentity(input.siteUrl, input.phoneHref),
  };
}

export function resolveSiteDesignContextForPage(
  input: ResolveSiteDesignContextInput,
  pages: ReadonlyArray<BuildBookPage>,
): SiteDesignContext {
  const pageBlocks = input.pageId ? blocksForPage([...pages], input.pageId) : [];
  void pageBlocks;
  return resolveSiteDesignContext(input, pages);
}
