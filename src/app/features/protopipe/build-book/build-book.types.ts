export type {
  BuildBookBlockIntent,
  BuildBookBlockPatternCategory,
  BuildBookBlockRenderMode,
} from './build-book-block-patterns.catalog';
import type { BuildBookBlockRenderMode } from './build-book-block-patterns.catalog';

export type BuildBookSection = 'hero' | 'fold' | 'services' | 'proof' | 'areas' | 'close';

export type BuildBookWireLayout =
  | 'fullbleed'
  | 'split'
  | 'bento'
  | 'dual-path'
  | 'metrics'
  | 'band'
  | 'contract-bar'
  | 'capabilities'
  | 'featured'
  | 'stats'
  | 'grid'
  | 'list'
  | 'cards'
  | 'tabs'
  | 'reviews'
  | 'map'
  | 'close-form';

export type BuildBookDemoBrand = 'sparky' | 'wri' | 'consult' | 'veil';
export type BuildBookDemoCatalog = 'heroes' | 'fold';

export interface BuildBookDemoMeta {
  brand: BuildBookDemoBrand;
  catalog: BuildBookDemoCatalog;
  labId: string;
  astroUnit: string;
}

export interface BuildBookOption {
  id: string;
  label: string;
  desc: string;
  componentId: string;
  layout: BuildBookWireLayout;
  tag?: string;
  demo?: BuildBookDemoMeta;
  previewPath?: string;
  /** Static thumbnail — fal-generated or lab site photography for card previews. */
  previewImage?: string;
}

export type BuildBookPageKind =
  | 'homepage'
  | 'landing-page'
  | 'blog-home'
  | 'blog-post'
  | 'review-gate'
  | 'lead-form';

export interface BuildBookTemplateBlockRef {
  section: BuildBookSection;
  blockId: string;
}

export interface BuildBookTemplateDefinition {
  id: string;
  label: string;
  category: string;
  serviceOffered: string;
  bestFor: string;
  stack: string;
  theme: string;
  accent: string;
  seoPurpose: string;
  conversionGoal: string;
  visualTone: string;
  previewUrl: string;
  previewDescription: string;
  previewKicker: string;
  previewHeadline: string;
  previewSubhead: string;
  previewStats: string[];
  previewSections: string[];
  recommendedHeroId: string;
  recommendedFoldId: string;
  recommendedServicesId: string;
  defaultHomepageBlocks: BuildBookTemplateBlockRef[];
}

export interface BuildBookBlockNavThumbAspect {
  width: number;
  height: number;
}

export type BuildBookBlockNavThumbKind =
  | 'generic'
  | 'wri-hero-fullbleed'
  | 'wri-contract-bar'
  | 'wri-capabilities-grid'
  | 'wri-copy-split'
  | 'wri-lifecycle'
  | 'wri-featured-well'
  | 'wri-sidebar-facts'
  | 'wri-regulatory-trust'
  | 'wri-island-coverage'
  | 'wri-gallery-cta';

export interface BuildBookBlockDefinition {
  id: string;
  section: BuildBookSection;
  label: string;
  description: string;
  sourceTemplateId?: string;
  componentId: string;
  astroComponent?: string;
  layout: BuildBookWireLayout;
  editableFields: string[];
  defaultProps: Record<string, unknown>;
  seoRole: string;
  conversionRole: string;
  previewPath?: string;
  previewImage?: string;
  demo?: BuildBookDemoMeta;
  /** Mini wireframe for homepage stack nav — future block library thumbnail key. */
  navThumbKind?: BuildBookBlockNavThumbKind;
  /** Relative nav thumbnail proportions vs on-page block height. */
  navThumbAspect?: BuildBookBlockNavThumbAspect;
  /** Canonical pattern id — set on enriched definitions from variant registry. */
  patternId?: string;
  variantLabel?: string;
  renderMode?: BuildBookBlockRenderMode;
}

export interface BuildBookBlockInstance {
  id: string;
  blockId: string;
  section: BuildBookSection;
  componentId: string;
  label?: string;
  order: number;
  props: Record<string, unknown>;
  notes?: string;
  sourceTemplateId?: string;
  /** Denormalized pattern id for Shire saves and library queries. */
  patternId?: string;
}

export interface BuildBookPage {
  id: string;
  kind: BuildBookPageKind;
  label: string;
  slug?: string;
  /** Shire content-post id when this page was materialized from the content plan. */
  contentPostId?: string;
  /** Stable calendar row key: `${proposedPublishAt|backlog}|${workingTitle}`. */
  contentPlanItemKey?: string;
  suggestedKeyword?: string;
  blocks: BuildBookBlockInstance[];
}

/** Synthetic canvas id for pending-add ghost preview. */
export const BUILD_BOOK_PENDING_ADD_BLOCK_ID = '__pending-add__';

/** In-progress add: pattern chosen on left, variant chosen on Layout tab. */
export interface BuildBookPendingAdd {
  patternId: string;
  insertAt: number;
  /** Hero/fold layout option id while browsing. */
  previewOptionId?: string;
  /** Resolved catalog block id for ghost preview / commit. */
  previewBlockId?: string;
}
