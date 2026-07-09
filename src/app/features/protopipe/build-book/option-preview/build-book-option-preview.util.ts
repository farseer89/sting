import {
  BASELINE_HERO_BLOCK_TO_APPROVED_LAYOUT,
  findBaselineApprovedHeroOption,
  isBaselineApprovedHeroLayout,
} from '../build-book-baseline-hero.catalog';
import {
  baselineFoldBlockIdForLayout,
  baselineFoldRendererBrand,
  isBaselineApprovedFoldLayout,
} from '../build-book-baseline-fold.catalog';
import { findBuildBookBlockDefinition } from '../build-book-block.catalog';
import {
  baselineRendererBrandFromBlockId,
} from '../build-book-baseline.util';
import { heroPreviewImageForLayout, resolveHeroPreviewWireLayout } from '../build-book-demo.catalog';
import {
  isVeilHeroLabLayout,
  resolveVeilHeroPreviewBlockId,
  veilHeroLabPreviewProps,
} from '../build-book-veil-hero.catalog';
import { heroImageToProps, readHeroImageUrl } from '../build-hero-block.util';
import { foldLabPreviewProps, resolveFoldWireLayout } from '../build-fold-block.util';
import type { BuildBookOption, BuildBookSection, BuildBookWireLayout } from '../build-book.types';
import type { SiteDesignContext } from '../../site-design/public';

export type BaselineRendererBrand = 'sparky' | 'wri' | 'wilco' | 'veil' | 'hil';

export type BuildBookOptionPreviewKind = 'baseline' | 'hero-lab' | 'fold-lab';

export interface BuildBookOptionPreviewTarget {
  kind: BuildBookOptionPreviewKind;
  renderer: BaselineRendererBrand | null;
  blockId: string | null;
  props: Record<string, unknown>;
  heroLayoutId?: string;
  heroImageUrl?: string;
  foldWireLayout?: BuildBookWireLayout;
  foldLayoutId?: string;
}

export const OPTION_PREVIEW_VIEWPORT_WIDTH = 960;

/** Fold strips are short horizontal bands — use a narrower design surface so scale fits the rail card. */
export const OPTION_PREVIEW_FOLD_VIEWPORT_WIDTH = 640;

export function optionPreviewViewportWidth(section: BuildBookSection): number {
  return section === 'fold' ? OPTION_PREVIEW_FOLD_VIEWPORT_WIDTH : OPTION_PREVIEW_VIEWPORT_WIDTH;
}

function reverseHeroLayoutToBlockId(layoutId: string): string | null {
  for (const [blockId, layout] of Object.entries(BASELINE_HERO_BLOCK_TO_APPROVED_LAYOUT)) {
    if (layout === layoutId) return blockId;
  }
  return null;
}

export function baselineHeroBlockIdForLayout(layoutId: string): string | null {
  if (!isBaselineApprovedHeroLayout(layoutId)) return null;
  return reverseHeroLayoutToBlockId(layoutId);
}

export function baselineHeroRendererBrand(layoutId: string): BaselineRendererBrand | null {
  const option = findBaselineApprovedHeroOption(layoutId);
  if (!option?.demo?.brand) return null;
  if (option.demo.brand === 'consult') return 'wilco';
  return option.demo.brand;
}

export function defaultPropsForLayoutOption(
  optionId: string,
  section: BuildBookSection,
): Record<string, unknown> {
  const blockId =
    section === 'hero'
      ? baselineHeroBlockIdForLayout(optionId) ?? optionId
      : baselineFoldBlockIdForLayout(optionId) ?? optionId;
  const def = findBuildBookBlockDefinition(blockId);
  return def ? structuredClone(def.defaultProps) : {};
}

/**
 * Rail option cards must keep each layout's catalog/stock image.
 * Do not call materializeBlockPropsForInsert here — that strips stock URLs and
 * assigns the same site-media pick to every card, so the chooser looks stuck.
 */
function optionRailPreviewProps(
  option: BuildBookOption,
  section: BuildBookSection,
  blockId: string | null,
  options?: { liveHeroImageUrl?: string | null; selected?: boolean },
): Record<string, unknown> {
  let props = blockId
    ? defaultPropsForLayoutOption(blockId, section)
    : defaultPropsForLayoutOption(option.id, section);

  if (section === 'hero') {
    const catalogImage =
      option.previewImage ??
      heroPreviewImageForLayout(option.id) ??
      readHeroImageUrl(props, option.id);
    if (catalogImage && !readHeroImageUrl(props, option.id)) {
      props = { ...props, ...heroImageToProps(catalogImage) };
    }

    if (options?.selected && options.liveHeroImageUrl?.trim()) {
      props = { ...props, ...heroImageToProps(options.liveHeroImageUrl.trim()) };
    }
  }

  return props;
}

function resolveCatalogBaselinePreview(
  optionId: string,
): BuildBookOptionPreviewTarget | null {
  const catalogBlock = findBuildBookBlockDefinition(optionId);
  if (!catalogBlock) return null;

  const renderer = baselineRendererBrandFromBlockId(optionId, catalogBlock.defaultProps);
  if (!renderer) return null;

  return {
    kind: 'baseline',
    renderer,
    blockId: optionId,
    props: structuredClone(catalogBlock.defaultProps),
  };
}

export interface ResolveOptionPreviewOptions {
  /** When this card is the active layout, overlay the canvas hero image. */
  liveHeroImageUrl?: string | null;
  selected?: boolean;
}

export function resolveOptionPreviewTarget(
  option: BuildBookOption,
  section: BuildBookSection,
  _designContext?: SiteDesignContext | null,
  resolveOptions?: ResolveOptionPreviewOptions,
): BuildBookOptionPreviewTarget {
  const live = {
    liveHeroImageUrl: resolveOptions?.liveHeroImageUrl,
    selected: resolveOptions?.selected,
  };

  if (section === 'hero') {
    if (isBaselineApprovedHeroLayout(option.id)) {
      const blockId = baselineHeroBlockIdForLayout(option.id);
      const props = optionRailPreviewProps(option, 'hero', blockId, live);
      return {
        kind: 'baseline',
        renderer: baselineHeroRendererBrand(option.id),
        blockId,
        props,
        heroLayoutId: option.id,
        heroImageUrl: readHeroImageUrl(props, option.id) ?? option.previewImage ?? undefined,
      };
    }

    if (isVeilHeroLabLayout(option.id)) {
      const blockId = resolveVeilHeroPreviewBlockId(option.id);
      const baseProps = optionRailPreviewProps(option, 'hero', blockId, live);
      const props = veilHeroLabPreviewProps(option.id, baseProps);
      if (live.selected && live.liveHeroImageUrl?.trim()) {
        Object.assign(props, heroImageToProps(live.liveHeroImageUrl.trim()));
      }
      return {
        kind: 'baseline',
        renderer: 'veil',
        blockId,
        props,
        heroLayoutId: option.id,
        heroImageUrl: readHeroImageUrl(props, option.id) ?? option.previewImage ?? undefined,
      };
    }

    const props = optionRailPreviewProps(option, 'hero', null, live);
    const liveUrl = live.selected ? live.liveHeroImageUrl?.trim() : undefined;
    return {
      kind: 'hero-lab',
      renderer: null,
      blockId: null,
      props,
      heroLayoutId: resolveHeroPreviewWireLayout(option.id),
      heroImageUrl:
        liveUrl ||
        option.previewImage ||
        heroPreviewImageForLayout(option.id) ||
        readHeroImageUrl(props, option.id) ||
        undefined,
    };
  }

  if (isBaselineApprovedFoldLayout(option.id)) {
    return {
      kind: 'baseline',
      renderer: baselineFoldRendererBrand(option.id),
      blockId: option.id,
      props: optionRailPreviewProps(option, 'fold', option.id),
    };
  }

  const catalogPreview = resolveCatalogBaselinePreview(option.id);
  if (catalogPreview) return catalogPreview;

  const foldLayoutId = option.id;
  return {
    kind: 'fold-lab',
    renderer: null,
    blockId: null,
    props: foldLabPreviewProps(foldLayoutId, {}),
    foldWireLayout: resolveFoldWireLayout(foldLayoutId),
    foldLayoutId,
  };
}

export function baselineRendererBrandFromLayout(
  section: BuildBookSection,
  layoutId: string,
): BaselineRendererBrand | null {
  return section === 'hero'
    ? baselineHeroRendererBrand(layoutId)
    : baselineFoldRendererBrand(layoutId);
}

export function effectiveBaselineBlockIdForLayout(
  section: BuildBookSection,
  layoutId: string,
  stackBlockId: string,
): string {
  if (section === 'hero' && isBaselineApprovedHeroLayout(layoutId)) {
    return baselineHeroBlockIdForLayout(layoutId) ?? stackBlockId;
  }
  if (section === 'fold' && isBaselineApprovedFoldLayout(layoutId)) {
    return baselineFoldBlockIdForLayout(layoutId) ?? stackBlockId;
  }
  return stackBlockId;
}
