export type BuildBookBlockIntent =
  | 'establish-trust'
  | 'explain-offer'
  | 'show-work'
  | 'prove-outcomes'
  | 'answer-questions'
  | 'qualify-lead'
  | 'capture-lead'
  | 'schedule-meeting'
  | 'close-conversion';

export type BuildBookBlockPatternCategory =
  | 'hero'
  | 'content'
  | 'social'
  | 'interactive'
  | 'cta';

export type BuildBookBlockRenderMode =
  | 'baseline-angular'
  | 'interactive-stub'
  | 'iframe-preview';

export interface BuildBookBlockPattern {
  id: string;
  label: string;
  category: BuildBookBlockPatternCategory;
  intents: BuildBookBlockIntent[];
  interactive: boolean;
  sortOrder: number;
}

export const BUILD_BOOK_BLOCK_PATTERNS: BuildBookBlockPattern[] = [
  { id: 'hero', label: 'Hero', category: 'hero', intents: ['establish-trust', 'close-conversion'], interactive: false, sortOrder: 10 },
  { id: 'stats-band', label: 'Trust bar / stats', category: 'content', intents: ['establish-trust'], interactive: false, sortOrder: 20 },
  { id: 'logo-strip', label: 'Logo strip', category: 'social', intents: ['establish-trust'], interactive: false, sortOrder: 30 },
  { id: 'section-intro', label: 'Section intro', category: 'content', intents: ['explain-offer'], interactive: false, sortOrder: 40 },
  { id: 'service-grid', label: 'Service grid', category: 'content', intents: ['explain-offer'], interactive: false, sortOrder: 50 },
  { id: 'process-timeline', label: 'Process timeline', category: 'content', intents: ['explain-offer'], interactive: false, sortOrder: 60 },
  { id: 'pricing-packages', label: 'Packages / pricing', category: 'content', intents: ['qualify-lead'], interactive: false, sortOrder: 70 },
  { id: 'work-gallery', label: 'Work gallery', category: 'content', intents: ['show-work'], interactive: false, sortOrder: 80 },
  { id: 'case-study', label: 'Case study / project', category: 'content', intents: ['prove-outcomes'], interactive: false, sortOrder: 90 },
  { id: 'before-after', label: 'Before & after', category: 'content', intents: ['prove-outcomes'], interactive: false, sortOrder: 100 },
  { id: 'video-reel', label: 'Video highlights', category: 'content', intents: ['show-work'], interactive: false, sortOrder: 110 },
  { id: 'testimonial-grid', label: 'Testimonials', category: 'content', intents: ['establish-trust', 'prove-outcomes'], interactive: false, sortOrder: 120 },
  { id: 'content-split', label: 'Content split', category: 'content', intents: ['prove-outcomes'], interactive: false, sortOrder: 130 },
  { id: 'coverage-map', label: 'Coverage / areas', category: 'content', intents: ['answer-questions'], interactive: false, sortOrder: 140 },
  { id: 'faq-accordion', label: 'FAQ', category: 'content', intents: ['answer-questions'], interactive: false, sortOrder: 150 },
  { id: 'availability', label: 'Availability', category: 'content', intents: ['qualify-lead'], interactive: false, sortOrder: 160 },
  { id: 'prose-band', label: 'Editorial band', category: 'content', intents: ['establish-trust'], interactive: false, sortOrder: 170 },
  { id: 'cta-banner', label: 'CTA banner', category: 'cta', intents: ['close-conversion'], interactive: false, sortOrder: 180 },
  { id: 'inquiry-close', label: 'Inquiry / close', category: 'cta', intents: ['capture-lead', 'close-conversion'], interactive: false, sortOrder: 190 },
  { id: 'lead-form', label: 'Lead form', category: 'interactive', intents: ['capture-lead'], interactive: true, sortOrder: 200 },
  { id: 'quote-request-form', label: 'Quote tool', category: 'interactive', intents: ['capture-lead'], interactive: true, sortOrder: 210 },
  { id: 'scheduler-embed', label: 'Schedule / Calendly', category: 'interactive', intents: ['schedule-meeting'], interactive: true, sortOrder: 220 },
];

const PATTERNS_BY_ID = new Map(BUILD_BOOK_BLOCK_PATTERNS.map((p) => [p.id, p]));

export function findBuildBookBlockPattern(patternId: string): BuildBookBlockPattern | undefined {
  return PATTERNS_BY_ID.get(patternId);
}

export function patternLabel(patternId: string): string {
  return findBuildBookBlockPattern(patternId)?.label ?? patternId;
}
