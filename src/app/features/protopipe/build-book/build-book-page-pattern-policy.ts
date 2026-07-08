import type { BuildBookPageKind } from './build-book.types';
import { BUILD_BOOK_BLOCK_PATTERNS } from './build-book-block-patterns.catalog';

/** Pattern ids allowed per page kind — null means all patterns. */
const POLICY_BY_PAGE_KIND: Record<BuildBookPageKind, readonly string[] | null> = {
  homepage: null,
  'landing-page': [
    'hero',
    'stats-band',
    'logo-strip',
    'section-intro',
    'service-grid',
    'process-timeline',
    'testimonial-grid',
    'content-split',
    'case-study',
    'work-gallery',
    'before-after',
    'faq-accordion',
    'cta-banner',
    'inquiry-close',
    'lead-form',
    'quote-request-form',
    'scheduler-embed',
  ],
  'blog-post': [
    'section-intro',
    'prose-band',
    'work-gallery',
    'video-reel',
    'content-split',
    'cta-banner',
  ],
  'review-gate': ['section-intro', 'cta-banner', 'lead-form'],
  'lead-form': ['section-intro', 'lead-form', 'quote-request-form', 'inquiry-close'],
};

export function allowedPatternIdsForPageKind(pageKind: BuildBookPageKind): Set<string> | null {
  const allowed = POLICY_BY_PAGE_KIND[pageKind];
  if (allowed === null) return null;
  return new Set(allowed);
}

export function isPatternAllowedForPageKind(patternId: string, pageKind: BuildBookPageKind): boolean {
  const allowed = allowedPatternIdsForPageKind(pageKind);
  if (!allowed) return true;
  return allowed.has(patternId);
}

export function patternIdsForPageKind(pageKind: BuildBookPageKind): string[] {
  const allowed = allowedPatternIdsForPageKind(pageKind);
  if (!allowed) {
    return BUILD_BOOK_BLOCK_PATTERNS.map((pattern) => pattern.id);
  }
  return BUILD_BOOK_BLOCK_PATTERNS.filter((pattern) => allowed.has(pattern.id)).map(
    (pattern) => pattern.id,
  );
}
