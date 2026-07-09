import { findBuildBookBlockDefinition } from './build-book-block.catalog';
import { BUILD_BOOK_SECTION_SLOTS, type BuildBookSection } from './build-book.constants';
import type { BuildBookBlockInstance, BuildBookPage, BuildBookPageKind } from './build-book.types';
import type { SitePageDraft, SitePageSectionDraft } from '@hive/contracts';

export type BaselineSiteRenderer =
  | 'wri-site'
  | 'sparky-site'
  | 'wilco-site'
  | 'veil-site'
  | 'hil-site';

export type BaselineRendererBrand = 'sparky' | 'wri' | 'wilco' | 'veil' | 'hil';

const BASELINE_BLOCK_ID_PREFIXES: ReadonlyArray<[string, BaselineSiteRenderer]> = [
  ['wri-baseline-', 'wri-site'],
  ['sparky-baseline-', 'sparky-site'],
  ['wilco-baseline-', 'wilco-site'],
  ['veil-baseline-', 'veil-site'],
  ['hil-baseline-', 'hil-site'],
];

export function isBaselineBlockId(blockId: string | null | undefined): boolean {
  if (!blockId) return false;
  if (findBuildBookBlockDefinition(blockId)) return true;
  return BASELINE_BLOCK_ID_PREFIXES.some(([prefix]) => blockId.startsWith(prefix));
}

export function isBaselineBlock(
  blockId: string | null | undefined,
  props: Record<string, unknown>,
): boolean {
  return isBaselineBlockId(blockId) || isBaselineBlockProps(props);
}

export function isBaselineBlockProps(props: Record<string, unknown>): boolean {
  const renderer = props['baselineRenderer'];
  return (
    renderer === 'wri-site' ||
    renderer === 'sparky-site' ||
    renderer === 'wilco-site' ||
    renderer === 'veil-site' ||
    renderer === 'hil-site'
  );
}

export function baselineRendererFromProps(
  props: Record<string, unknown>,
): BaselineSiteRenderer | null {
  const renderer = props['baselineRenderer'];
  if (
    renderer === 'wri-site' ||
    renderer === 'sparky-site' ||
    renderer === 'wilco-site' ||
    renderer === 'veil-site' ||
    renderer === 'hil-site'
  ) {
    return renderer;
  }
  return null;
}

/** Block catalog owns renderer identity — props may be stale after cross-template inserts. */
export function resolveBaselineBlockRenderer(
  blockId: string | null | undefined,
  props: Record<string, unknown>,
): BaselineSiteRenderer | null {
  if (blockId) {
    const def = findBuildBookBlockDefinition(blockId);
    const fromCatalog = def ? baselineRendererFromProps(def.defaultProps) : null;
    if (fromCatalog) return fromCatalog;

    for (const [prefix, renderer] of BASELINE_BLOCK_ID_PREFIXES) {
      if (blockId.startsWith(prefix)) return renderer;
    }
  }

  return baselineRendererFromProps(props);
}

export function baselineRendererBrandFromSiteRenderer(
  renderer: BaselineSiteRenderer | null | undefined,
): BaselineRendererBrand | null {
  switch (renderer) {
    case 'sparky-site':
      return 'sparky';
    case 'wri-site':
      return 'wri';
    case 'wilco-site':
      return 'wilco';
    case 'veil-site':
      return 'veil';
    case 'hil-site':
      return 'hil';
    default:
      return null;
  }
}

export function baselineRendererBrandFromBlockId(
  blockId: string | null | undefined,
  props: Record<string, unknown> = {},
): BaselineRendererBrand | null {
  return baselineRendererBrandFromSiteRenderer(resolveBaselineBlockRenderer(blockId, props));
}

export function isBaselineHomepage(pages: BuildBookPage[]): boolean {
  const homepage = pages.find((page) => page.kind === 'homepage');
  return Boolean(
    homepage?.blocks.some((block) => isBaselineBlock(block.blockId, block.props)),
  );
}

export function homepageBlocksFromPages(pages: BuildBookPage[]): BuildBookBlockInstance[] {
  const homepage = pages.find((page) => page.kind === 'homepage');
  if (!homepage) return [];
  return [...homepage.blocks].sort((a, b) => a.order - b.order);
}

export function findDraftSectionForBlock(
  draft: SitePageDraft,
  block: BuildBookBlockInstance,
): SitePageSectionDraft | null {
  const page = draft.pages[0];
  if (!page) return null;

  const slotId = BUILD_BOOK_SECTION_SLOTS[block.section];
  const byInstanceId = page.sections.find((section) => section.id === block.id);
  if (byInstanceId) return byInstanceId;

  const byBlockId = page.sections.find((section) => section.id === block.blockId);
  if (byBlockId) return byBlockId;

  const seoCopyBlockId =
    typeof block.props['seoCopyBlockId'] === 'string' ? block.props['seoCopyBlockId'] : undefined;
  if (seoCopyBlockId) {
    const bySeo = page.sections.find(
      (section) => section.props['seoCopyBlockId'] === seoCopyBlockId,
    );
    if (bySeo) return bySeo;
  }

  const bySlotAndComponent = page.sections.find(
    (section) => section.id === slotId && section.componentId === block.componentId,
  );
  if (bySlotAndComponent) return bySlotAndComponent;

  return page.sections.find((section) => section.componentId === block.componentId) ?? null;
}

export function findPageById(pages: BuildBookPage[], pageId: string): BuildBookPage | undefined {
  return pages.find((page) => page.id === pageId);
}

export function findPageByKind(pages: BuildBookPage[], kind: BuildBookPageKind): BuildBookPage | undefined {
  return pages.find((page) => page.kind === kind);
}

export function blocksForPage(pages: BuildBookPage[], pageId: string): BuildBookBlockInstance[] {
  const page = findPageById(pages, pageId);
  if (!page) return [];
  return [...page.blocks].sort((a, b) => a.order - b.order);
}

export function findPageBlockById(
  pages: BuildBookPage[],
  blockInstanceId: string,
): BuildBookBlockInstance | null {
  for (const page of pages) {
    const block = page.blocks.find(
      (item) => item.id === blockInstanceId || item.blockId === blockInstanceId,
    );
    if (block) return block;
  }
  return null;
}

export function findPageContainingBlock(
  pages: BuildBookPage[],
  blockInstanceId: string,
): BuildBookPage | undefined {
  return pages.find((page) =>
    page.blocks.some(
      (item) => item.id === blockInstanceId || item.blockId === blockInstanceId,
    ),
  );
}

export function baselineVariantLabel(props: Record<string, unknown>): string | null {
  const variantId = props['option2VariantId'];
  if (variantId === '2b') return 'Option 2B · Life + Proof';
  if (variantId === '2a') return 'Option 2A · Green Narrative';
  if (variantId === '2c') return 'Option 2C';
  return null;
}

export function isHilBaselineBlockId(blockId: string | null | undefined): boolean {
  return typeof blockId === 'string' && blockId.startsWith('hil-baseline-');
}

export function isVeilBaselineBlockId(blockId: string | null | undefined): boolean {
  return typeof blockId === 'string' && blockId.startsWith('veil-baseline-');
}

export function sectionFromBlockInstanceId(
  blockInstanceId: string,
  blocks: BuildBookBlockInstance[],
): BuildBookSection | null {
  const block = blocks.find((item) => item.id === blockInstanceId || item.blockId === blockInstanceId);
  return block?.section ?? null;
}
