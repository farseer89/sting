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

export type {
  BuildBookDemoBrand,
  BuildBookDemoCatalog,
  BuildBookDemoMeta,
  BuildBookOption,
} from './build-book.types';

import type { BuildBookOption } from './build-book.types';

import {
  BUILD_BOOK_DEMO_FOLD_OPTIONS,
  BUILD_BOOK_DEMO_HERO_OPTIONS,
} from './build-book-demo.catalog';

/** Preferred section ids on service-business-landing-v1 — fallback matches by componentId. */
export const BUILD_BOOK_SECTION_SLOTS: Record<BuildBookSection, string> = {
  hero: 'hero',
  fold: 'logos',
  services: 'features',
  proof: 'testimonials',
  areas: 'faq',
  close: 'inquiry',
};

export const BUILD_BOOK_SECTION_ORDER: BuildBookSection[] = [
  'hero',
  'fold',
  'services',
  'proof',
  'areas',
  'close',
];

export const BUILD_BOOK_OPTIONS: Record<BuildBookSection, BuildBookOption[]> = {
  hero: BUILD_BOOK_DEMO_HERO_OPTIONS,
  fold: BUILD_BOOK_DEMO_FOLD_OPTIONS,
  services: [
    {
      id: 'svc-grid',
      label: 'Service grid',
      desc: 'Equal cards in a 2×2 or 3-column grid — scannable for multi-trade shops.',
      componentId: 'services-grid',
      layout: 'grid',
    },
    {
      id: 'svc-list',
      label: 'Stacked list',
      desc: 'Full-width rows with chevron — compact when you have many line items.',
      componentId: 'process-steps',
      layout: 'list',
    },
    {
      id: 'svc-cards',
      label: 'Photo cards',
      desc: 'Image-forward cards with scope hints — high visual weight.',
      componentId: 'gallery-showcase',
      layout: 'cards',
    },
    {
      id: 'svc-tabs',
      label: 'Value trio',
      desc: 'Numbered value blocks — residential / commercial / industrial angles.',
      componentId: 'saas-value-trio',
      layout: 'tabs',
    },
  ],
  proof: [
    {
      id: 'proof-reviews',
      label: 'Review grid',
      desc: 'Testimonial cards with photo, quote, and name — social proof at scale.',
      componentId: 'testimonial-grid',
      layout: 'reviews',
    },
    {
      id: 'proof-metrics',
      label: 'Outcome metrics',
      desc: 'Customer outcome cards with bold stats — B2B and consulting.',
      componentId: 'saas-customer-metrics',
      layout: 'stats',
    },
    {
      id: 'proof-quote',
      label: 'Quote highlight',
      desc: 'Single large pull quote — one strong voice, minimal chrome.',
      componentId: 'saas-quote-highlight',
      layout: 'reviews',
    },
  ],
  areas: [
    {
      id: 'areas-faq',
      label: 'Service area FAQ',
      desc: 'Accordion with coverage, licensing, and quote questions.',
      componentId: 'faq-accordion',
      layout: 'map',
    },
    {
      id: 'areas-steps',
      label: 'How it works',
      desc: 'Three-step process band — good when geography is implied in steps.',
      componentId: 'process-steps',
      layout: 'list',
    },
  ],
  close: [
    {
      id: 'close-banner',
      label: 'CTA banner',
      desc: 'Final conversion band with headline, body, and primary action.',
      componentId: 'cta-banner',
      layout: 'close-form',
    },
    {
      id: 'close-form',
      label: 'Lead form',
      desc: 'Inquiry form with heading and submit — quote requests and contact.',
      componentId: 'lead-capture-form',
      layout: 'close-form',
    },
  ],
};

export function buildBookSectionLabel(id: BuildBookSection): string {
  const labels: Record<BuildBookSection, string> = {
    hero: 'Hero',
    fold: 'Fold',
    services: 'Services',
    proof: 'Proof',
    areas: 'Areas',
    close: 'Close',
  };
  return labels[id];
}

export function buildBookSectionNum(id: BuildBookSection): string {
  const idx = BUILD_BOOK_SECTION_ORDER.indexOf(id);
  return String(idx + 1).padStart(2, '0');
}

export function findBuildBookOption(
  section: BuildBookSection,
  optionId: string,
): BuildBookOption | undefined {
  return BUILD_BOOK_OPTIONS[section].find((o) => o.id === optionId);
}

export function findBuildBookOptionByComponentId(
  section: BuildBookSection,
  componentId: string,
): BuildBookOption | undefined {
  return BUILD_BOOK_OPTIONS[section].find((o) => o.componentId === componentId);
}

export function findBuildBookOptionByLabLayout(
  section: BuildBookSection,
  labLayout: string,
): BuildBookOption | undefined {
  return BUILD_BOOK_OPTIONS[section].find((o) => o.id === labLayout);
}
