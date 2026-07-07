import { WRI_BASELINE_BLOCK_DEFINITIONS } from './build-book-baseline-block.catalog';
import { SPARKY_BASELINE_BLOCK_DEFINITIONS } from './build-book-sparky-baseline-block.catalog';
import { WILCO_BASELINE_BLOCK_DEFINITIONS } from './build-book-wilco-baseline-block.catalog';
import { VEIL_BASELINE_BLOCK_DEFINITIONS } from './build-book-veil-baseline-block.catalog';
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

const SPARKY_STACK_BLOCK_IDS = [
  'sparky-baseline-hero-callout',
  'sparky-baseline-trust-stats',
  'sparky-baseline-services-grid',
  'sparky-baseline-brand-partners',
  'sparky-baseline-process',
  'sparky-baseline-reviews',
  'sparky-baseline-why-evidence',
  'sparky-baseline-project-feature',
  'sparky-baseline-areas-map',
  'sparky-baseline-gallery-cta',
  'sparky-baseline-field-notes',
] as const;

const WILCO_STACK_BLOCK_IDS = [
  'wilco-baseline-hero-split',
  'wilco-baseline-stats-band',
  'wilco-baseline-trusted-by',
  'wilco-baseline-services-intro',
  'wilco-baseline-core-services',
  'wilco-baseline-projects-intro',
  'wilco-baseline-project-awcc',
  'wilco-baseline-project-seldovia',
  'wilco-baseline-project-dillingham',
  'wilco-baseline-testimonials',
  'wilco-baseline-faq',
  'wilco-baseline-call-cta',
] as const;

const VEIL_STACK_BLOCK_IDS = [
  'veil-baseline-hero-easel-witness',
  'veil-baseline-fold-process',
  'veil-baseline-fold-portfolio',
  'veil-baseline-fold-packages',
  'veil-baseline-fold-reviews',
  'veil-baseline-fold-availability',
  'veil-baseline-fold-faq',
  'veil-baseline-fold-inquire',
] as const;

const WRI_BLOCKS_BY_ID = new Map(WRI_BASELINE_BLOCK_DEFINITIONS.map((block) => [block.id, block]));
const SPARKY_BLOCKS_BY_ID = new Map(SPARKY_BASELINE_BLOCK_DEFINITIONS.map((block) => [block.id, block]));
const WILCO_BLOCKS_BY_ID = new Map(WILCO_BASELINE_BLOCK_DEFINITIONS.map((block) => [block.id, block]));
const VEIL_BLOCKS_BY_ID = new Map(VEIL_BASELINE_BLOCK_DEFINITIONS.map((block) => [block.id, block]));

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
  'sparky-electric-trades-v1': [
    {
      id: 'home',
      kind: 'homepage',
      label: 'Home',
      slug: '/',
      blocks: SPARKY_STACK_BLOCK_IDS.map((blockId, order) => {
        const block = SPARKY_BLOCKS_BY_ID.get(blockId);
        if (!block) throw new Error(`Missing Sparky baseline block: ${blockId}`);
        return instanceFromBlock(block, order);
      }),
    },
  ],
  'wilco-consulting-v1': [
    {
      id: 'home',
      kind: 'homepage',
      label: 'Home',
      slug: '/',
      blocks: WILCO_STACK_BLOCK_IDS.map((blockId, order) => {
        const block = WILCO_BLOCKS_BY_ID.get(blockId);
        if (!block) throw new Error(`Missing Wilco baseline block: ${blockId}`);
        return instanceFromBlock(block, order);
      }),
    },
  ],
  'veil-live-painter-v1': [
    {
      id: 'home',
      kind: 'homepage',
      label: 'Home',
      slug: '/',
      blocks: VEIL_STACK_BLOCK_IDS.map((blockId, order) => {
        const block = VEIL_BLOCKS_BY_ID.get(blockId);
        if (!block) throw new Error(`Missing Veil baseline block: ${blockId}`);
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
