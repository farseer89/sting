import { describe, expect, it } from 'vitest';
import { BUILD_BOOK_BASELINE_PAGE_ASSEMBLIES } from './build-book-baseline-assemblies';
import { UNIVERSAL_BASELINE_BLOCK_DEFINITIONS } from './build-book-universal-block.catalog';
import {
  adaptPublishProps,
  compileBuildBookHomepage,
  stripEditorOnlyProps,
  UNIVERSAL_PUBLISH_VARIANT_BY_COMPONENT_ID,
} from './build-book-publish-compiler.util';
import { validateBuildBookPublishGate } from './validation/build-book-publish-gate.util';

describe('build-book publish compiler', () => {
  it('strips editor-only props', () => {
    const props = stripEditorOnlyProps({
      heading: 'Hello',
      baselineRenderer: 'sparky-site',
      labUnit: 'foo',
    });
    expect(props).toEqual({ heading: 'Hello' });
  });

  for (const [templateId, pages] of Object.entries(BUILD_BOOK_BASELINE_PAGE_ASSEMBLIES)) {
    it(`compiles homepage for ${templateId}`, () => {
      const homepage = pages.find((page) => page.kind === 'homepage');
      expect(homepage).toBeTruthy();
      const compiled = compileBuildBookHomepage({
        homepage: homepage!,
        sourceTemplateId: templateId,
        theme: 'ocean',
      });
      expect(compiled.pages[0].sections.length).toBeGreaterThan(0);
      expect(compiled.sourceTemplateId).toBe(templateId);
      const gate = validateBuildBookPublishGate({
        homepage: homepage!,
        site: { clientSitesSlug: 'demo-site', publishStatus: 'draft' },
        dirty: false,
      });
      expect(gate.ok).toBe(true);
    });
  }
});

describe('adaptPublishProps variants and remaps', () => {
  it('emits expected variant for every mapped universal componentId', () => {
    for (const [componentId, variant] of Object.entries(UNIVERSAL_PUBLISH_VARIANT_BY_COMPONENT_ID)) {
      const adapted = adaptPublishProps(componentId, {});
      expect(adapted['variant']).toBe(variant);
    }
  });

  it('does not overwrite an explicit variant', () => {
    const adapted = adaptPublishProps('universal-stats-cards', { variant: 'custom' });
    expect(adapted['variant']).toBe('custom');
  });

  it('remaps gallery → images with captions', () => {
    const adapted = adaptPublishProps('universal-gallery-masonry', {
      gallery: [{ image: 'https://example.com/a.jpg', caption: 'A', imageAlt: 'Alt A' }],
    });
    expect(adapted['variant']).toBe('masonry');
    expect(adapted['images']).toEqual([
      { src: 'https://example.com/a.jpg', alt: 'Alt A', caption: 'A' },
    ]);
  });

  it('remaps logos name/image → src/alt', () => {
    const adapted = adaptPublishProps('universal-logos-grid', {
      logos: [{ name: 'Acme', image: 'https://example.com/logo.png' }],
    });
    expect(adapted['variant']).toBe('grid');
    expect(adapted['logos']).toEqual([{ src: 'https://example.com/logo.png', alt: 'Acme' }]);
  });

  it('keeps intro-centered body + kicker for SectionIntro', () => {
    const adapted = adaptPublishProps('universal-intro-centered', {
      heading: 'Hello',
      body: 'Lede copy',
      kicker: 'Eyebrow',
    });
    expect(adapted['variant']).toBe('centered');
    expect(adapted['body']).toBe('Lede copy');
    expect(adapted['kicker']).toBe('Eyebrow');
    expect(adapted['paragraphs']).toBeUndefined();
  });

  it('emits split variant for intro-split without forcing image props', () => {
    const adapted = adaptPublishProps('universal-intro-split', {
      heading: 'Split',
      body: 'Bridge copy',
      kicker: 'Why',
    });
    expect(adapted['variant']).toBe('split');
    expect(adapted['body']).toBe('Bridge copy');
    expect(adapted['imageSrc']).toBeUndefined();
  });

  it('remaps content-split body into paragraphs', () => {
    const adapted = adaptPublishProps('universal-split-image-right', {
      heading: 'Split',
      body: 'Bridge copy',
    });
    expect(adapted['paragraphs']).toEqual(['Bridge copy']);
    expect(adapted['imagePosition']).toBe('right');
    expect(adapted['imageAlt']).toBe('Split');
  });

  it('preserves service image fields', () => {
    const adapted = adaptPublishProps('universal-services-list', {
      services: [{ title: 'Core', body: 'Desc', image: 'https://example.com/s.jpg', imageAlt: 'Core' }],
    });
    expect(adapted['variant']).toBe('list');
    expect(adapted['services']).toEqual([
      { title: 'Core', body: 'Desc', image: 'https://example.com/s.jpg', imageAlt: 'Core' },
    ]);
  });

  it('remaps before-after subhead → lede', () => {
    const adapted = adaptPublishProps('universal-before-after', {
      heading: 'Before & after',
      subhead: 'See the difference',
    });
    expect(adapted['variant']).toBe('side');
    expect(adapted['title']).toBe('Before & after');
    expect(adapted['lede']).toBe('See the difference');
  });

  it('remaps reviews-quote testimonials into quote fields', () => {
    const adapted = adaptPublishProps('universal-reviews-quote', {
      kicker: 'Review',
      heading: 'Trusted',
      testimonials: [{ quote: 'Great work', name: 'Alex', role: 'Owner' }],
    });
    expect(adapted['quote']).toBe('Great work');
    expect(adapted['attribution']).toBe('Alex');
    expect(adapted['role']).toBe('Owner');
  });

  it('emits case-study variants and keeps metrics shape', () => {
    const featured = adaptPublishProps('universal-case-featured', {
      heading: 'Project',
      body: 'Story',
      imageSrc: 'https://example.com/p.jpg',
    });
    expect(featured['variant']).toBe('featured');

    const metrics = adaptPublishProps('universal-case-metrics', {
      heading: 'Outcomes',
      caption: 'Client',
      metrics: [{ value: '6 weeks', label: 'Timeline' }],
    });
    expect(metrics['variant']).toBe('metrics');
    expect(metrics['metrics']).toEqual([{ value: '6 weeks', label: 'Timeline' }]);
  });

  it('emits variant for every universal catalog block that has a mapped family', () => {
    for (const def of UNIVERSAL_BASELINE_BLOCK_DEFINITIONS) {
      const expected = UNIVERSAL_PUBLISH_VARIANT_BY_COMPONENT_ID[def.componentId];
      if (!expected) continue;
      const adapted = adaptPublishProps(def.componentId, structuredClone(def.defaultProps));
      expect(adapted['variant'], def.componentId).toBe(expected);
    }
  });
});
