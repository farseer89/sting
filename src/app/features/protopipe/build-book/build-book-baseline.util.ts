import { BUILD_BOOK_SECTION_SLOTS, type BuildBookSection } from './build-book.constants';
import type { BuildBookBlockInstance, BuildBookPage } from './build-book.types';
import type { SitePageDraft, SitePageSectionDraft } from '@hive/contracts';

export function isBaselineBlockProps(props: Record<string, unknown>): boolean {
  const renderer = props['baselineRenderer'];
  return renderer === 'wri-site' || renderer === 'sparky-site' || renderer === 'wilco-site' || renderer === 'veil-site';
}

export function baselineRendererFromProps(
  props: Record<string, unknown>,
): 'wri-site' | 'sparky-site' | 'wilco-site' | 'veil-site' | null {
  const renderer = props['baselineRenderer'];
  if (renderer === 'wri-site' || renderer === 'sparky-site' || renderer === 'wilco-site' || renderer === 'veil-site') return renderer;
  return null;
}

export function isBaselineHomepage(pages: BuildBookPage[]): boolean {
  const homepage = pages.find((page) => page.kind === 'homepage');
  return Boolean(homepage?.blocks.some((block) => isBaselineBlockProps(block.props)));
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

export function findPageBlockById(
  pages: BuildBookPage[],
  blockInstanceId: string,
): BuildBookBlockInstance | null {
  const homepage = pages.find((page) => page.kind === 'homepage');
  if (!homepage) return null;
  return (
    homepage.blocks.find((block) => block.id === blockInstanceId || block.blockId === blockInstanceId) ??
    null
  );
}

export function baselineVariantLabel(props: Record<string, unknown>): string | null {
  const variantId = props['option2VariantId'];
  if (variantId === '2b') return 'Option 2B · Life + Proof';
  if (variantId === '2a') return 'Option 2A · Green Narrative';
  if (variantId === '2c') return 'Option 2C';
  return null;
}

export function sectionFromBlockInstanceId(
  blockInstanceId: string,
  blocks: BuildBookBlockInstance[],
): BuildBookSection | null {
  const block = blocks.find((item) => item.id === blockInstanceId || item.blockId === blockInstanceId);
  return block?.section ?? null;
}
