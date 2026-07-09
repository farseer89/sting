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

export function stripEditorOnlyProps(props: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!EDITOR_ONLY_PROP_KEYS.has(key)) {
      next[key] = value;
    }
  }
  return next;
}

/** Remap Build Book flat props to theme landing component shapes. */
export function adaptPublishProps(
  componentId: string,
  props: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...props };

  if (componentId.startsWith('universal-faq') || componentId === 'faq-accordion') {
    const items = next.items;
    if (Array.isArray(items)) {
      next.items = items.map((item) => {
        if (!item || typeof item !== 'object') return item;
        const row = item as Record<string, unknown>;
        return {
          question: row.question ?? row.q ?? '',
          answer: row.answer ?? row.a ?? '',
        };
      });
    }
  }

  if (
    componentId.startsWith('universal-cta') ||
    componentId === 'cta-banner' ||
    componentId === 'saas-cta-band'
  ) {
    if (next.body == null && typeof next.subhead === 'string') {
      next.body = next.subhead;
    }
    if (next.body == null && typeof next.lede === 'string') {
      next.body = next.lede;
    }
    if (typeof next.body !== 'string' || !next.body.trim()) {
      next.body = ' ';
    }
  }

  if (componentId.startsWith('universal-process') || componentId === 'process-steps') {
    if (next.heading == null && typeof next.kicker === 'string') {
      next.heading = next.kicker;
    }
    if (typeof next.heading !== 'string' || !next.heading.trim()) {
      next.heading = 'How it works';
    }
  }

  if (componentId.startsWith('universal-intro') || componentId === 'page-intro') {
    if (next.subheading == null && typeof next.subhead === 'string') {
      next.subheading = next.subhead;
    }
    if (next.paragraphs == null && typeof next.lede === 'string') {
      next.paragraphs = [next.lede];
    }
  }

  if (componentId.startsWith('universal-before-after') || componentId === 'before-after') {
    if (next.title == null && typeof next.heading === 'string') {
      next.title = next.heading;
    }
  }

  if (componentId.startsWith('universal-reviews-quote') || componentId === 'saas-quote-highlight') {
    const testimonials = next.testimonials;
    if (Array.isArray(testimonials) && testimonials[0] && typeof testimonials[0] === 'object') {
      const first = testimonials[0] as Record<string, unknown>;
      if (next.quote == null) next.quote = first.quote;
      if (next.attribution == null) {
        next.attribution = [first.name, first.role].filter(Boolean).join(' · ');
      }
    }
  }

  if (componentId.startsWith('universal-case-metrics') || componentId === 'saas-customer-metrics') {
    if (next.metrics == null && Array.isArray(next.stats)) {
      next.metrics = next.stats;
    }
  }

  if (componentId.startsWith('universal-split') || componentId === 'content-split') {
    if (next.imagePosition == null && componentId.includes('left')) {
      next.imagePosition = 'left';
    }
    if (next.imagePosition == null && componentId.includes('right')) {
      next.imagePosition = 'right';
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
