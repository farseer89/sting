import type { ShirePublishSitePagePublished } from '@hive/contracts';
import { findBuildBookBlockDefinition } from './build-book-block.catalog';
import type { BuildBookBlockInstance, BuildBookPage } from './build-book.types';

const EDITOR_ONLY_PROP_KEYS = new Set([
  'baselineRenderer',
  'baselinePreviewUrl',
  'labUnit',
  'labBrand',
  'labCatalog',
  'labLayout',
]);

/** Compiler-owned layout variant for aliased theme components. */
export const UNIVERSAL_PUBLISH_VARIANT_BY_COMPONENT_ID: Record<string, string> = {
  'universal-stats-compact': 'compact',
  'universal-stats-cards': 'cards',
  'stats-bar': 'default',
  'universal-process-vertical': 'vertical',
  'universal-process-visual': 'visual',
  'process-steps': 'vertical',
  'universal-faq-accordion': 'accordion',
  'universal-faq-two-col': 'two-col',
  'faq-accordion': 'accordion',
  'universal-cta-band': 'band',
  'universal-cta-split': 'split',
  'cta-banner': 'band',
  'universal-services-grid': 'grid',
  'universal-services-list': 'list',
  'services-grid': 'grid',
  'universal-gallery-grid': 'grid',
  'universal-gallery-masonry': 'masonry',
  'gallery-showcase': 'grid',
  'universal-logos-row': 'row',
  'universal-logos-grid': 'grid',
  'logo-strip': 'row',
  'universal-before-after': 'side',
  'universal-before-after-stack': 'stack',
  'before-after': 'side',
};

export function stripEditorOnlyProps(props: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!EDITOR_ONLY_PROP_KEYS.has(key)) {
      next[key] = value;
    }
  }
  return next;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Remap Build Book flat props to theme landing component shapes + emit variant. */
export function adaptPublishProps(
  componentId: string,
  props: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...props };

  const mappedVariant = UNIVERSAL_PUBLISH_VARIANT_BY_COMPONENT_ID[componentId];
  if (mappedVariant && next['variant'] == null) {
    next['variant'] = mappedVariant;
  }

  if (componentId.startsWith('universal-faq') || componentId === 'faq-accordion') {
    const items = next['items'];
    if (Array.isArray(items)) {
      next['items'] = items.map((item) => {
        if (!item || typeof item !== 'object') return item;
        const row = item as Record<string, unknown>;
        return {
          question: row['question'] ?? row['q'] ?? '',
          answer: row['answer'] ?? row['a'] ?? '',
        };
      });
    }
  }

  if (
    componentId.startsWith('universal-cta') ||
    componentId === 'cta-banner' ||
    componentId === 'saas-cta-band'
  ) {
    if (next['body'] == null && typeof next['subhead'] === 'string') {
      next['body'] = next['subhead'];
    }
    if (next['body'] == null && typeof next['lede'] === 'string') {
      next['body'] = next['lede'];
    }
    if (typeof next['body'] !== 'string' || !(next['body'] as string).trim()) {
      next['body'] = ' ';
    }
  }

  if (componentId.startsWith('universal-process') || componentId === 'process-steps') {
    if (next['heading'] == null && typeof next['kicker'] === 'string') {
      next['heading'] = next['kicker'];
    }
    if (typeof next['heading'] !== 'string' || !(next['heading'] as string).trim()) {
      next['heading'] = 'How it works';
    }
  }

  if (componentId === 'universal-intro-centered' || componentId === 'page-intro') {
    if (next['subheading'] == null && typeof next['subhead'] === 'string') {
      next['subheading'] = next['subhead'];
    }
    if (next['subheading'] == null && typeof next['kicker'] === 'string') {
      next['subheading'] = next['kicker'];
    }
    if (next['paragraphs'] == null) {
      if (typeof next['body'] === 'string' && (next['body'] as string).trim()) {
        next['paragraphs'] = [next['body']];
      } else if (typeof next['lede'] === 'string' && (next['lede'] as string).trim()) {
        next['paragraphs'] = [next['lede']];
      }
    }
  }

  if (
    componentId === 'universal-intro-split' ||
    componentId.startsWith('universal-split') ||
    componentId === 'content-split'
  ) {
    if (next['paragraphs'] == null) {
      if (typeof next['body'] === 'string' && (next['body'] as string).trim()) {
        next['paragraphs'] = [next['body']];
      } else if (typeof next['lede'] === 'string' && (next['lede'] as string).trim()) {
        next['paragraphs'] = [next['lede']];
      } else {
        next['paragraphs'] = [];
      }
    }
    if (typeof next['imageSrc'] !== 'string') {
      next['imageSrc'] = '';
    }
    if (typeof next['imageAlt'] !== 'string' || !(next['imageAlt'] as string).trim()) {
      next['imageAlt'] = stringOrEmpty(next['heading']) || 'Section image';
    }
    if (next['imagePosition'] == null && componentId.includes('left')) {
      next['imagePosition'] = 'left';
    }
    if (next['imagePosition'] == null && componentId.includes('right')) {
      next['imagePosition'] = 'right';
    }
    if (next['imagePosition'] == null) {
      next['imagePosition'] = 'right';
    }
  }

  if (componentId.startsWith('universal-gallery') || componentId === 'gallery-showcase') {
    if (next['images'] == null && Array.isArray(next['gallery'])) {
      next['images'] = (next['gallery'] as unknown[]).map((item) => {
        const row = asRecord(item) ?? {};
        return {
          src: stringOrEmpty(row['src'] ?? row['image']),
          alt: stringOrEmpty(row['alt'] ?? row['imageAlt'] ?? row['caption']) || 'Gallery image',
        };
      });
    }
  }

  if (componentId.startsWith('universal-logos') || componentId === 'logo-strip') {
    if (Array.isArray(next['logos'])) {
      next['logos'] = (next['logos'] as unknown[]).map((item) => {
        const row = asRecord(item) ?? {};
        return {
          src: stringOrEmpty(row['src'] ?? row['image']),
          alt: stringOrEmpty(row['alt'] ?? row['name']) || 'Logo',
        };
      });
    }
  }

  if (componentId.startsWith('universal-services') || componentId === 'services-grid') {
    if (Array.isArray(next['services'])) {
      next['services'] = (next['services'] as unknown[]).map((item) => {
        const row = asRecord(item) ?? {};
        const mapped: Record<string, unknown> = {
          title: stringOrEmpty(row['title']),
          body: stringOrEmpty(row['body']),
        };
        if (row['icon'] != null) mapped['icon'] = row['icon'];
        if (row['image'] != null) mapped['image'] = row['image'];
        if (row['imageAlt'] != null) mapped['imageAlt'] = row['imageAlt'];
        if (row['href'] != null) mapped['href'] = row['href'];
        if (row['linkLabel'] != null) mapped['linkLabel'] = row['linkLabel'];
        return mapped;
      });
    }
  }

  if (componentId.startsWith('universal-before-after') || componentId === 'before-after') {
    if (next['title'] == null && typeof next['heading'] === 'string') {
      next['title'] = next['heading'];
    }
  }

  if (componentId.startsWith('universal-reviews-quote') || componentId === 'saas-quote-highlight') {
    const testimonials = next['testimonials'];
    if (Array.isArray(testimonials) && testimonials[0] && typeof testimonials[0] === 'object') {
      const first = testimonials[0] as Record<string, unknown>;
      if (next['quote'] == null) next['quote'] = first['quote'];
      if (next['attribution'] == null) {
        next['attribution'] = [first['name'], first['role']].filter(Boolean).join(' · ');
      }
    }
  }

  if (componentId.startsWith('universal-case-metrics') || componentId === 'saas-customer-metrics') {
    if (next['metrics'] == null && Array.isArray(next['stats'])) {
      next['metrics'] = next['stats'];
    }
  }

  return next;
}

export interface CompileBuildBookHomepageInput {
  homepage: BuildBookPage;
  sourceTemplateId?: string;
  theme?: string;
  siteTheme?: Record<string, unknown> | null;
}

export function compileBuildBookHomepage(
  input: CompileBuildBookHomepageInput,
): ShirePublishSitePagePublished {
  const sections = [...input.homepage.blocks]
    .sort((a, b) => a.order - b.order)
    .map((block) => compileBlockSection(block));

  return {
    pages: [
      {
        id: input.homepage.id || 'home',
        label: input.homepage.label || 'Home',
        sections,
      },
    ],
    siteTheme: input.siteTheme ?? undefined,
    sourceTemplateId: input.sourceTemplateId,
    theme: input.theme,
    updatedAt: new Date().toISOString(),
  };
}

function compileBlockSection(
  block: BuildBookBlockInstance,
): ShirePublishSitePagePublished['pages'][0]['sections'][0] {
  const definition = findBuildBookBlockDefinition(block.blockId);
  const section: ShirePublishSitePagePublished['pages'][0]['sections'][0] = {
    componentId: block.componentId,
    props: adaptPublishProps(block.componentId, stripEditorOnlyProps(structuredClone(block.props))),
  };
  if (definition?.astroComponent) {
    section.astroComponent = definition.astroComponent;
  }
  return section;
}
