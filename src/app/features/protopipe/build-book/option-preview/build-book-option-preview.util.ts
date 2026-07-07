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
import { readHeroImageUrl } from '../build-hero-block.util';
import { foldLabPreviewProps, resolveFoldWireLayout } from '../build-fold-block.util';
import type { BuildBookOption, BuildBookSection, BuildBookWireLayout } from '../build-book.types';

export type BaselineRendererBrand = 'sparky' | 'wri' | 'wilco' | 'veil';

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

export function resolveOptionPreviewTarget(
  option: BuildBookOption,
  section: BuildBookSection,
): BuildBookOptionPreviewTarget {
  if (section === 'hero') {
    if (isBaselineApprovedHeroLayout(option.id)) {
      return {
        kind: 'baseline',
        renderer: baselineHeroRendererBrand(option.id),
        blockId: baselineHeroBlockIdForLayout(option.id),
        props: defaultPropsForLayoutOption(option.id, 'hero'),
      };
    }

    const props = defaultPropsForLayoutOption(option.id, 'hero');
    return {
      kind: 'hero-lab',
      renderer: null,
      blockId: null,
      props,
      heroLayoutId: option.id,
      heroImageUrl: option.previewImage ?? readHeroImageUrl(props) ?? undefined,
    };
  }

  if (isBaselineApprovedFoldLayout(option.id)) {
    return {
      kind: 'baseline',
      renderer: baselineFoldRendererBrand(option.id),
      blockId: option.id,
      props: defaultPropsForLayoutOption(option.id, 'fold'),
    };
  }

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
