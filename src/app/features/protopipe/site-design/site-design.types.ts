import type { BuildBookPageKind } from '../build-book/build-book.types';

export type SiteMediaAssetSource = 'page' | 'site' | 'uploaded' | 'generated' | 'template';

export type SiteBaselineRenderer =
  | 'wri-site'
  | 'sparky-site'
  | 'wilco-site'
  | 'veil-site'
  | 'hil-site';

export interface SiteThemeColorTokens {
  background: string;
  surface: string;
  ink: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  accentOn: string;
  onInk: string;
  onSurface: string;
  onAccentSoft: string;
  border: string;
}

export interface SiteThemeTypographyTokens {
  fontSans: string;
  fontSerif: string;
  headingWeight: number;
  bodyWeight: number;
}

export interface SiteThemeLayoutTokens {
  contentMax: string;
  gutter: string;
  sectionSpacing: string;
}

export interface SiteThemeShapeTokens {
  radiusSm: string;
  radiusMd: string;
  buttonRadius: string;
}

export interface SiteThemeTokens {
  color: SiteThemeColorTokens;
  typography: SiteThemeTypographyTokens;
  layout: SiteThemeLayoutTokens;
  shape: SiteThemeShapeTokens;
}

export interface SiteMediaAsset {
  id: string;
  url: string;
  label: string;
  source: SiteMediaAssetSource;
}

export interface SiteMediaLibrary {
  all: SiteMediaAsset[];
  pageInUse: SiteMediaAsset[];
  siteWideInUse: SiteMediaAsset[];
  uploaded: SiteMediaAsset[];
  generated: SiteMediaAsset[];
  templateStock: SiteMediaAsset[];
}

export interface SiteCopyProfile {
  siteDisplayName: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  exampleEyebrow: string;
}

export interface SiteIdentityAssets {
  siteUrl: string;
  phoneHref: string | null;
}

export interface SiteDesignContext {
  siteId: string;
  templateId: string | null;
  pageId: string | null;
  pageKind: BuildBookPageKind;
  baselineRenderer: SiteBaselineRenderer | null;
  theme: SiteThemeTokens;
  media: SiteMediaLibrary;
  voice: SiteCopyProfile;
  identity: SiteIdentityAssets;
}

export type MediaSlotRole =
  | 'hero-background'
  | 'featured'
  | 'split'
  | 'gallery'
  | 'avatar'
  | 'generic';

export interface MediaSlotPickRequest {
  propPath: string;
  role: MediaSlotRole;
}

export interface SiteThemeColorOverride {
  background?: string;
  surface?: string;
  ink?: string;
  text?: string;
  muted?: string;
  accent?: string;
  accentSoft?: string;
  accentOn?: string;
  border?: string;
}

export interface SiteThemeTypographyOverride {
  fontSans?: string;
  fontSerif?: string;
  headingWeight?: number;
  bodyWeight?: number;
}

export interface SiteThemePersistedOverride {
  colorOverride?: SiteThemeColorOverride;
  typographyOverride?: SiteThemeTypographyOverride;
}

export interface ResolveSiteDesignContextInput {
  siteId: string;
  templateId: string | null;
  pageId: string | null;
  pageKind: BuildBookPageKind;
  siteDisplayName?: string;
  siteUrl?: string;
  phoneHref?: string | null;
  studioAssets?: ReadonlyArray<{
    id: string;
    url: string;
    label?: string | null;
    originalFilename?: string | null;
    source?: string;
  }>;
  themeOverride?: Partial<SiteThemeColorTokens>;
  typographyOverride?: SiteThemeTypographyOverride;
  brandPalette?: Partial<{
    primary: string;
    accent: string;
    background: string;
  }> | null;
}

export interface MaterializeBlockPropsOptions {
  preserveCopy?: Record<string, unknown>;
  usedUrls?: Set<string>;
}
