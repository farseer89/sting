import {
  BUILD_DEMO_HERO_VARIANTS,
  BUILD_BOOK_DEMO_HERO_OPTIONS,
} from './build-book-demo.catalog';
import { isBaselineApprovedHeroLayout } from './build-book-baseline-hero.catalog';
import { readVeilHeroPrimaryImageUrl } from './build-book-veil-hero.catalog';
import {
  findBuildBookOption,
  findBuildBookOptionByComponentId,
  findBuildBookOptionByLabLayout,
} from './build-book.constants';
import {
  DEFAULT_HERO_PREVIEW_COPY,
  type BuildHeroPreviewCopy,
} from './build-hero-preview.types';

export function resolveHeroPreviewLayoutId(
  optionId: string | null | undefined,
  section: { componentId: string; props: Record<string, unknown> } | null | undefined,
): string {
  const props = section?.props;
  const labLayout = typeof props?.['labLayout'] === 'string' ? props['labLayout'] : undefined;

  if (labLayout) {
    if (isBaselineApprovedHeroLayout(labLayout)) return labLayout;

    const byLabLayout = findBuildBookOptionByLabLayout('hero', labLayout);
    if (byLabLayout) return byLabLayout.id;

    const byLabId = BUILD_BOOK_DEMO_HERO_OPTIONS.find((option) => option.demo?.labId === labLayout);
    if (byLabId) return byLabId.id;

    if (BUILD_DEMO_HERO_VARIANTS.some((hero) => hero.id === labLayout)) return labLayout;
  }

  if (optionId && findBuildBookOption('hero', optionId)) return optionId;

  if (section?.componentId) {
    const byComponent = findBuildBookOptionByComponentId('hero', section.componentId, labLayout);
    if (byComponent) return byComponent.id;
  }

  if (optionId && BUILD_DEMO_HERO_VARIANTS.some((hero) => hero.id === optionId)) return optionId;

  return 'sp-callout';
}

export function heroBackgroundImageStyle(imageUrl: string | null | undefined): string | null {
  if (!imageUrl?.trim()) return null;
  return `url(${JSON.stringify(imageUrl)})`;
}

export function readHeroImageUrl(
  props: Record<string, unknown>,
  layoutId?: string | null,
): string | null {
  if (layoutId?.startsWith('veil-')) {
    const veilImage = readVeilHeroPrimaryImageUrl(layoutId, props);
    if (veilImage) return veilImage;
  }

  const candidates = [
    props['imageSrc'],
    props['backgroundImageSrc'],
    props['paintingImageSrc'],
    props['visualSrc'],
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

export function readHeroCopy(props: Record<string, unknown>): BuildHeroPreviewCopy {
  return {
    eyebrow: String(props['eyebrow'] ?? DEFAULT_HERO_PREVIEW_COPY.eyebrow),
    headline: String(
      props['heading'] ?? props['headline'] ?? DEFAULT_HERO_PREVIEW_COPY.headline,
    ),
    subhead: String(
      props['subhead'] ?? props['subheading'] ?? DEFAULT_HERO_PREVIEW_COPY.subhead,
    ),
    primaryCta: String(
      props['ctaLabel'] ?? props['primaryCtaLabel'] ?? DEFAULT_HERO_PREVIEW_COPY.primaryCta,
    ),
    secondaryCta: String(
      props['secondaryCtaLabel'] ?? DEFAULT_HERO_PREVIEW_COPY.secondaryCta,
    ),
  };
}

export function heroCopyToProps(copy: BuildHeroPreviewCopy): Record<string, unknown> {
  return {
    eyebrow: copy.eyebrow,
    heading: copy.headline,
    subhead: copy.subhead,
    ctaLabel: copy.primaryCta,
    primaryCtaLabel: copy.primaryCta,
    secondaryCtaLabel: copy.secondaryCta,
  };
}

export function heroImageToProps(url: string): Record<string, unknown> {
  return {
    imageSrc: url,
    backgroundImageSrc: url,
    paintingImageSrc: url,
    visualSrc: url,
  };
}

export function clearHeroImageProps(): Record<string, null> {
  return {
    imageSrc: null,
    backgroundImageSrc: null,
    paintingImageSrc: null,
    visualSrc: null,
  };
}
