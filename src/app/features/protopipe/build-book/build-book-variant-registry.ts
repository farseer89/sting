import type { BuildBookBlockIntent, BuildBookBlockRenderMode } from './build-book-block-patterns.catalog';
import { BUILD_BOOK_ALL_TEMPLATE_IDS } from './build-book-universal-block.catalog';

/** Per-variant registry metadata — keyed by stable block id (never rename). */
export interface BuildBookVariantRegistryEntry {
  patternId: string;
  intents?: BuildBookBlockIntent[];
  variantLabel?: string;
  renderMode?: BuildBookBlockRenderMode;
  compatibleTemplateIds?: string[];
}

export const BUILD_BOOK_VARIANT_REGISTRY: Record<string, BuildBookVariantRegistryEntry> = {
  // WRI
  'wri-baseline-hero-life-proof': { patternId: 'hero', compatibleTemplateIds: ['wri-field-authority-v1'] },
  'wri-baseline-contract-bar': { patternId: 'stats-band', compatibleTemplateIds: ['wri-field-authority-v1'] },
  'wri-baseline-capabilities-grid': { patternId: 'service-grid', compatibleTemplateIds: ['wri-field-authority-v1'] },
  'wri-baseline-life-proof-split': { patternId: 'content-split', compatibleTemplateIds: ['wri-field-authority-v1'] },
  'wri-baseline-project-lifecycle': { patternId: 'process-timeline', compatibleTemplateIds: ['wri-field-authority-v1'] },
  'wri-baseline-featured-well': { patternId: 'case-study', variantLabel: 'Featured project', compatibleTemplateIds: ['wri-field-authority-v1'] },
  'wri-baseline-sidebar-facts': { patternId: 'stats-band', variantLabel: 'Sidebar facts', compatibleTemplateIds: ['wri-field-authority-v1'] },
  'wri-baseline-regulatory-trust': { patternId: 'stats-band', variantLabel: 'Regulatory trust', compatibleTemplateIds: ['wri-field-authority-v1'] },
  'wri-baseline-island-coverage': { patternId: 'coverage-map', compatibleTemplateIds: ['wri-field-authority-v1'] },
  'wri-baseline-rig-gallery-cta': { patternId: 'work-gallery', variantLabel: 'Gallery + CTA', compatibleTemplateIds: ['wri-field-authority-v1'] },
  // Sparky
  'sparky-baseline-hero-callout': { patternId: 'hero', compatibleTemplateIds: ['sparky-electric-trades-v1'] },
  'sparky-baseline-trust-stats': { patternId: 'stats-band', compatibleTemplateIds: ['sparky-electric-trades-v1'] },
  'sparky-baseline-services-grid': { patternId: 'service-grid', compatibleTemplateIds: ['sparky-electric-trades-v1'] },
  'sparky-baseline-brand-partners': { patternId: 'logo-strip', compatibleTemplateIds: ['sparky-electric-trades-v1'] },
  'sparky-baseline-process': { patternId: 'process-timeline', compatibleTemplateIds: ['sparky-electric-trades-v1'] },
  'sparky-baseline-reviews': { patternId: 'testimonial-grid', compatibleTemplateIds: ['sparky-electric-trades-v1'] },
  'sparky-baseline-why-evidence': { patternId: 'content-split', compatibleTemplateIds: ['sparky-electric-trades-v1'] },
  'sparky-baseline-project-feature': { patternId: 'case-study', compatibleTemplateIds: ['sparky-electric-trades-v1'] },
  'sparky-baseline-areas-map': { patternId: 'coverage-map', compatibleTemplateIds: ['sparky-electric-trades-v1'] },
  'sparky-baseline-gallery-cta': { patternId: 'work-gallery', compatibleTemplateIds: ['sparky-electric-trades-v1'] },
  'sparky-baseline-field-notes': { patternId: 'prose-band', compatibleTemplateIds: ['sparky-electric-trades-v1'] },
  // Wilco
  'wilco-baseline-hero-split': { patternId: 'hero', compatibleTemplateIds: ['wilco-consulting-v1'] },
  'wilco-baseline-stats-band': { patternId: 'stats-band', compatibleTemplateIds: ['wilco-consulting-v1'] },
  'wilco-baseline-trusted-by': { patternId: 'logo-strip', compatibleTemplateIds: ['wilco-consulting-v1'] },
  'wilco-baseline-services-intro': { patternId: 'section-intro', compatibleTemplateIds: ['wilco-consulting-v1'] },
  'wilco-baseline-core-services': { patternId: 'service-grid', compatibleTemplateIds: ['wilco-consulting-v1'] },
  'wilco-baseline-projects-intro': { patternId: 'section-intro', variantLabel: 'Projects intro', compatibleTemplateIds: ['wilco-consulting-v1'] },
  'wilco-baseline-project-awcc': { patternId: 'case-study', compatibleTemplateIds: ['wilco-consulting-v1'] },
  'wilco-baseline-project-seldovia': { patternId: 'case-study', compatibleTemplateIds: ['wilco-consulting-v1'] },
  'wilco-baseline-project-dillingham': { patternId: 'case-study', compatibleTemplateIds: ['wilco-consulting-v1'] },
  'wilco-baseline-testimonials': { patternId: 'testimonial-grid', compatibleTemplateIds: ['wilco-consulting-v1'] },
  'wilco-baseline-faq': { patternId: 'faq-accordion', compatibleTemplateIds: ['wilco-consulting-v1'] },
  'wilco-baseline-call-cta': { patternId: 'cta-banner', compatibleTemplateIds: ['wilco-consulting-v1'] },
  // Veil
  'veil-baseline-hero-easel-witness': { patternId: 'hero', compatibleTemplateIds: ['veil-live-painter-v1'] },
  'veil-baseline-hero-canvas-frame': { patternId: 'hero', variantLabel: 'Canvas frame', compatibleTemplateIds: ['veil-live-painter-v1'] },
  'veil-baseline-fold-process': { patternId: 'process-timeline', compatibleTemplateIds: ['veil-live-painter-v1'] },
  'veil-baseline-fold-portfolio': { patternId: 'work-gallery', compatibleTemplateIds: ['veil-live-painter-v1'] },
  'veil-baseline-fold-packages': { patternId: 'pricing-packages', compatibleTemplateIds: ['veil-live-painter-v1'] },
  'veil-baseline-fold-reviews': { patternId: 'testimonial-grid', compatibleTemplateIds: ['veil-live-painter-v1'] },
  'veil-baseline-fold-availability': { patternId: 'availability', compatibleTemplateIds: ['veil-live-painter-v1'] },
  'veil-baseline-fold-faq': { patternId: 'faq-accordion', compatibleTemplateIds: ['veil-live-painter-v1'] },
  'veil-baseline-fold-inquire': { patternId: 'inquiry-close', compatibleTemplateIds: ['veil-live-painter-v1'] },
  // HIL / Blackstone (Phase 4)
  'hil-baseline-hero-canopy': { patternId: 'hero', compatibleTemplateIds: ['blackstone-landscaping-v1'], renderMode: 'baseline-angular' },
  'hil-baseline-service-grid': { patternId: 'service-grid', compatibleTemplateIds: ['blackstone-landscaping-v1'] },
  'hil-baseline-work-gallery': { patternId: 'work-gallery', compatibleTemplateIds: ['blackstone-landscaping-v1'] },
  'hil-baseline-before-after': { patternId: 'before-after', compatibleTemplateIds: ['blackstone-landscaping-v1'] },
  'hil-baseline-scheduler-embed': { patternId: 'scheduler-embed', compatibleTemplateIds: ['blackstone-landscaping-v1'], renderMode: 'interactive-stub' },
  'hil-baseline-quote-form': { patternId: 'quote-request-form', compatibleTemplateIds: ['blackstone-landscaping-v1'], renderMode: 'interactive-stub' },
  'hil-baseline-faq': { patternId: 'faq-accordion', compatibleTemplateIds: ['blackstone-landscaping-v1'] },
  'hil-baseline-cta-banner': { patternId: 'cta-banner', compatibleTemplateIds: ['blackstone-landscaping-v1'] },
  // Universal — all templates
  'universal-process-vertical': {
    patternId: 'process-timeline',
    variantLabel: 'Vertical steps',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-process-visual': {
    patternId: 'process-timeline',
    variantLabel: 'Visual step cards',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-stats-compact': {
    patternId: 'stats-band',
    variantLabel: 'Compact strip',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-stats-cards': {
    patternId: 'stats-band',
    variantLabel: 'Credential cards',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-faq-accordion': {
    patternId: 'faq-accordion',
    variantLabel: 'Accordion',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-faq-two-col': {
    patternId: 'faq-accordion',
    variantLabel: 'Two column',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-cta-band': {
    patternId: 'cta-banner',
    variantLabel: 'Full band',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-cta-split': {
    patternId: 'cta-banner',
    variantLabel: 'Split with photo',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-reviews-grid': {
    patternId: 'testimonial-grid',
    variantLabel: 'Card grid',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-reviews-quote': {
    patternId: 'testimonial-grid',
    variantLabel: 'Featured quote',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-intro-centered': {
    patternId: 'section-intro',
    variantLabel: 'Centered',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-intro-split': {
    patternId: 'section-intro',
    variantLabel: 'Split with rule',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-prose-band': {
    patternId: 'prose-band',
    variantLabel: 'Editorial band',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-services-grid': {
    patternId: 'service-grid',
    variantLabel: 'Photo grid',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-services-list': {
    patternId: 'service-grid',
    variantLabel: 'Stacked list',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-split-image-right': {
    patternId: 'content-split',
    variantLabel: 'Image right',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-split-image-left': {
    patternId: 'content-split',
    variantLabel: 'Image left',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-gallery-grid': {
    patternId: 'work-gallery',
    variantLabel: 'Uniform grid',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-gallery-masonry': {
    patternId: 'work-gallery',
    variantLabel: 'Masonry',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-case-featured': {
    patternId: 'case-study',
    variantLabel: 'Featured story',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-case-metrics': {
    patternId: 'case-study',
    variantLabel: 'With metrics',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-logos-row': {
    patternId: 'logo-strip',
    variantLabel: 'Horizontal row',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-logos-grid': {
    patternId: 'logo-strip',
    variantLabel: 'Two-row grid',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-before-after': {
    patternId: 'before-after',
    variantLabel: 'Side by side',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-before-after-stack': {
    patternId: 'before-after',
    variantLabel: 'Stacked',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-blog-masthead-centered': {
    patternId: 'blog-masthead',
    variantLabel: 'Centered',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-blog-masthead-split': {
    patternId: 'blog-masthead',
    variantLabel: 'Split',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-blog-featured-split': {
    patternId: 'blog-featured',
    variantLabel: 'Split feature',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-blog-magazine-split': {
    patternId: 'blog-magazine-split',
    variantLabel: 'Feature + stack',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-blog-grid-3': {
    patternId: 'blog-post-grid',
    variantLabel: 'Three columns',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-blog-grid-list': {
    patternId: 'blog-post-grid',
    variantLabel: 'List',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
  'universal-blog-topic-bar': {
    patternId: 'blog-topic-bar',
    variantLabel: 'Chips',
    compatibleTemplateIds: [...BUILD_BOOK_ALL_TEMPLATE_IDS],
  },
};

export function variantRegistryEntry(blockId: string): BuildBookVariantRegistryEntry | undefined {
  return BUILD_BOOK_VARIANT_REGISTRY[blockId];
}
