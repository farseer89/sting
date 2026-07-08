import type { BuildBookBlockIntent } from '../build-book-block-patterns.catalog';

export interface BuildBookPatternContract {
  requiredCopyPaths?: readonly string[];
  requiredMediaPaths?: readonly string[];
  requiredHrefPaths?: readonly string[];
  reducedForStub?: boolean;
}

/** Pattern-level edit contracts — expanded as inspector wiring matures. */
export const BUILD_BOOK_PATTERN_CONTRACTS: Record<string, BuildBookPatternContract> = {
  hero: {
    requiredCopyPaths: ['heading', 'subhead', 'primaryCtaLabel'],
    requiredMediaPaths: ['backgroundImageSrc', 'imageSrc', 'leftImageSrc', 'rightImageSrc'],
    requiredHrefPaths: ['primaryCtaHref', 'phoneHref'],
  },
  'stats-band': { requiredCopyPaths: ['stats.*.value', 'stats.*.label'] },
  'faq-accordion': { requiredCopyPaths: ['heading', 'items.*.q', 'items.*.a'] },
  'service-grid': { requiredCopyPaths: ['heading', 'services.*.title', 'services.*.body'], requiredMediaPaths: ['services.*.image'] },
  'testimonial-grid': { requiredCopyPaths: ['testimonials.*.quote', 'testimonials.*.name'] },
  'section-intro': { requiredCopyPaths: ['heading', 'body'] },
  'content-split': { requiredCopyPaths: ['heading', 'body'], requiredMediaPaths: ['imageSrc'] },
  'work-gallery': { requiredCopyPaths: ['heading', 'gallery.*.caption'], requiredMediaPaths: ['gallery.*.image'] },
  'case-study': { requiredCopyPaths: ['heading'], requiredMediaPaths: ['imageSrc'] },
  'logo-strip': { requiredCopyPaths: ['heading', 'logos.*.name'], requiredMediaPaths: ['logos.*.image'] },
  'before-after': { requiredCopyPaths: ['heading', 'before.label', 'after.label'], requiredMediaPaths: ['before.image', 'after.image'] },
  'process-timeline': {
    requiredCopyPaths: ['heading', 'steps.*.title', 'steps.*.body'],
    requiredMediaPaths: ['steps.*.image'],
  },
  'cta-banner': { requiredCopyPaths: ['heading', 'body', 'ctaLabel'], requiredHrefPaths: ['ctaHref'] },
  'lead-form': { reducedForStub: true },
  'quote-request-form': { reducedForStub: true },
  'scheduler-embed': { reducedForStub: true },
};

export function contractForPattern(patternId: string): BuildBookPatternContract {
  return BUILD_BOOK_PATTERN_CONTRACTS[patternId] ?? {};
}

export function isStubPatternContract(patternId: string): boolean {
  return contractForPattern(patternId).reducedForStub === true;
}

export type BuildBookBaselineEditManifest = {
  wiredCopyPaths?: readonly string[];
  wiredMediaPaths?: readonly string[];
  wiredHrefPaths?: readonly string[];
};

/** Per-block inspector wiring manifests — grow with baseline audits. */
export const BUILD_BOOK_BASELINE_EDIT_MANIFESTS: Record<string, BuildBookBaselineEditManifest> = {};

export function manifestForBlock(blockId: string): BuildBookBaselineEditManifest {
  return BUILD_BOOK_BASELINE_EDIT_MANIFESTS[blockId] ?? {};
}

export const REQUIRED_PATTERN_INTENTS: BuildBookBlockIntent[] = [
  'establish-trust',
  'explain-offer',
  'show-work',
  'prove-outcomes',
  'answer-questions',
  'qualify-lead',
  'capture-lead',
  'schedule-meeting',
  'close-conversion',
];
