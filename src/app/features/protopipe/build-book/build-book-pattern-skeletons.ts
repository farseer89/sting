import type { BuildBookBlockNavThumbAspect } from './build-book.types';

/** Wireframe skeleton keys for homepage stack nav — one per patternId. */
export type BuildBookPatternSkeletonKind =
  | 'pattern-hero'
  | 'pattern-stats'
  | 'pattern-logos'
  | 'pattern-intro'
  | 'pattern-services'
  | 'pattern-process'
  | 'pattern-pricing'
  | 'pattern-gallery'
  | 'pattern-case-study'
  | 'pattern-before-after'
  | 'pattern-video'
  | 'pattern-testimonials'
  | 'pattern-split'
  | 'pattern-map'
  | 'pattern-faq'
  | 'pattern-availability'
  | 'pattern-prose'
  | 'pattern-blog-masthead'
  | 'pattern-blog-featured'
  | 'pattern-blog-magazine'
  | 'pattern-blog-grid'
  | 'pattern-blog-topics'
  | 'pattern-cta'
  | 'pattern-inquiry'
  | 'pattern-interactive'
  | 'pattern-generic';

export interface BuildBookPatternSkeletonMeta {
  kind: BuildBookPatternSkeletonKind;
  aspect: BuildBookBlockNavThumbAspect;
}

const DEFAULT_ASPECT: BuildBookBlockNavThumbAspect = { width: 16, height: 10 };

const SKELETON_BY_PATTERN: Record<string, BuildBookPatternSkeletonMeta> = {
  hero: { kind: 'pattern-hero', aspect: { width: 16, height: 9 } },
  'stats-band': { kind: 'pattern-stats', aspect: { width: 16, height: 4 } },
  'logo-strip': { kind: 'pattern-logos', aspect: { width: 16, height: 3.5 } },
  'section-intro': { kind: 'pattern-intro', aspect: { width: 16, height: 5 } },
  'service-grid': { kind: 'pattern-services', aspect: { width: 16, height: 9 } },
  'process-timeline': { kind: 'pattern-process', aspect: { width: 16, height: 5 } },
  'pricing-packages': { kind: 'pattern-pricing', aspect: { width: 16, height: 8 } },
  'work-gallery': { kind: 'pattern-gallery', aspect: { width: 16, height: 8 } },
  'case-study': { kind: 'pattern-case-study', aspect: { width: 16, height: 9 } },
  'before-after': { kind: 'pattern-before-after', aspect: { width: 16, height: 8 } },
  'video-reel': { kind: 'pattern-video', aspect: { width: 16, height: 9 } },
  'testimonial-grid': { kind: 'pattern-testimonials', aspect: { width: 16, height: 7 } },
  'content-split': { kind: 'pattern-split', aspect: { width: 16, height: 8 } },
  'coverage-map': { kind: 'pattern-map', aspect: { width: 16, height: 9 } },
  'faq-accordion': { kind: 'pattern-faq', aspect: { width: 16, height: 7 } },
  availability: { kind: 'pattern-availability', aspect: { width: 16, height: 5 } },
  'prose-band': { kind: 'pattern-prose', aspect: { width: 16, height: 5 } },
  'quick-answer': { kind: 'pattern-prose', aspect: { width: 16, height: 4 } },
  'comparison-table': { kind: 'pattern-split', aspect: { width: 16, height: 8 } },
  'case-snapshot': { kind: 'pattern-case-study', aspect: { width: 16, height: 5 } },
  'related-links': { kind: 'pattern-prose', aspect: { width: 16, height: 4 } },
  'blog-masthead': { kind: 'pattern-blog-masthead', aspect: { width: 16, height: 5 } },
  'blog-featured': { kind: 'pattern-blog-featured', aspect: { width: 16, height: 8 } },
  'blog-magazine-split': { kind: 'pattern-blog-magazine', aspect: { width: 16, height: 9 } },
  'blog-post-grid': { kind: 'pattern-blog-grid', aspect: { width: 16, height: 9 } },
  'blog-topic-bar': { kind: 'pattern-blog-topics', aspect: { width: 16, height: 3 } },
  'cta-banner': { kind: 'pattern-cta', aspect: { width: 16, height: 4 } },
  'inquiry-close': { kind: 'pattern-inquiry', aspect: { width: 16, height: 8 } },
  'lead-form': { kind: 'pattern-interactive', aspect: { width: 16, height: 9 } },
  'quote-request-form': { kind: 'pattern-interactive', aspect: { width: 16, height: 9 } },
  'scheduler-embed': { kind: 'pattern-interactive', aspect: { width: 16, height: 9 } },
};

export const SKELETON_PATTERN_IDS = new Set(Object.keys(SKELETON_BY_PATTERN));

export function resolvePatternSkeleton(patternId: string): BuildBookPatternSkeletonMeta {
  return SKELETON_BY_PATTERN[patternId] ?? { kind: 'pattern-generic', aspect: DEFAULT_ASPECT };
}

const INTENT_LABELS: Record<string, string> = {
  'establish-trust': 'Trust',
  'explain-offer': 'Offer',
  'show-work': 'Work',
  'prove-outcomes': 'Proof',
  'answer-questions': 'FAQ',
  'qualify-lead': 'Qualify',
  'capture-lead': 'Lead',
  'schedule-meeting': 'Schedule',
  'close-conversion': 'Convert',
};

export function intentDisplayLabel(intent: string): string {
  return INTENT_LABELS[intent] ?? intent.replace(/-/g, ' ');
}
