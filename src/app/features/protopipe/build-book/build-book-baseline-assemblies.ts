import { WRI_BASELINE_BLOCK_DEFINITIONS } from './build-book-baseline-block.catalog';
import type { BuildBookBlockDefinition, BuildBookBlockInstance, BuildBookPage } from './build-book.types';

function instanceFromBlock(block: BuildBookBlockDefinition, order: number): BuildBookBlockInstance {
  return {
    id: `home-${block.id}`,
    blockId: block.id,
    section: block.section,
    componentId: block.componentId,
    label: block.label,
    order,
    props: structuredClone(block.defaultProps),
    sourceTemplateId: block.sourceTemplateId,
  };
}

const WRI_2B_BLOCK_IDS = [
  'wri-baseline-hero-life-proof',
  'wri-baseline-contract-bar',
  'wri-baseline-capabilities-grid',
  'wri-baseline-life-proof-split',
  'wri-baseline-project-lifecycle',
  'wri-baseline-featured-well',
  'wri-baseline-sidebar-facts',
  'wri-baseline-regulatory-trust',
  'wri-baseline-island-coverage',
  'wri-baseline-rig-gallery-cta',
] as const;

const WRI_BLOCKS_BY_ID = new Map(WRI_BASELINE_BLOCK_DEFINITIONS.map((block) => [block.id, block]));

export const BUILD_BOOK_BASELINE_PAGE_ASSEMBLIES: Record<string, BuildBookPage[]> = {
  'wri-field-authority-v1': [
    {
      id: 'home',
      kind: 'homepage',
      label: 'Home',
      slug: '/',
      blocks: WRI_2B_BLOCK_IDS.map((blockId, order) => {
        const block = WRI_BLOCKS_BY_ID.get(blockId);
        if (!block) throw new Error(`Missing WRI baseline block: ${blockId}`);
        return instanceFromBlock(block, order);
      }),
    },
  ],
};

export function findBuildBookBaselineAssembly(templateId: string | null | undefined): BuildBookPage[] | undefined {
  if (!templateId) return undefined;
  const pages = BUILD_BOOK_BASELINE_PAGE_ASSEMBLIES[templateId];
  return pages ? structuredClone(pages) : undefined;
}

export function hasBuildBookBaselineAssembly(templateId: string | null | undefined): boolean {
  return Boolean(templateId && BUILD_BOOK_BASELINE_PAGE_ASSEMBLIES[templateId]);
}
