import { describe, expect, it } from 'vitest';
import type { ProtopipeContentTemplate } from '@hive/contracts';
import {
  articleFillFingerprint,
  fillBlogPostBlockProps,
  fillSourceFromProtopipeTemplate,
} from './build-book-article-fill.util';
import type { BuildBookBlockInstance } from './build-book.types';

function block(
  id: string,
  blockId: string,
  patternId: string,
  props: Record<string, unknown>,
): BuildBookBlockInstance {
  return {
    id,
    blockId,
    patternId,
    section: 'proof',
    componentId: blockId,
    order: 0,
    props,
  };
}

describe('build-book-article-fill.util', () => {
  const template: ProtopipeContentTemplate = {
    primaryKeywordPhrase: 'live wedding painting',
    title: 'Live Wedding Painting in Maui',
    h1: 'Live Wedding Painting in Maui',
    metaDescription: 'Watch your wedding become art.',
    intro: 'Couples hire live painters to freeze the first dance in oil.',
    sections: [
      { h2: 'What to expect', body: 'A painter works through the reception.' },
      { h2: 'Packages', body: 'Half-day and full-day options cover most venues.' },
      { h2: 'Booking tips', body: 'Reserve peak dates six months out.' },
    ],
    cta: { label: 'Check my date', href: '/contact' },
    blocks: [
      {
        id: 'img-1',
        slotId: 'hero-image',
        kind: 'image',
        url: 'https://cdn.example.com/hero.jpg',
        alt: 'Painter at easel',
        role: 'hero',
      },
      {
        id: 'faq-1',
        slotId: 'faq',
        kind: 'faq_list',
        items: [{ question: 'How long does it take?', answer: 'Usually three to five hours.' }],
      },
    ],
  };

  it('builds a fill source from a portable template', () => {
    const source = fillSourceFromProtopipeTemplate(template, { kicker: 'live wedding painting' });
    expect(source.title).toBe('Live Wedding Painting in Maui');
    expect(source.intro).toContain('first dance');
    expect(source.sections).toHaveLength(3);
    expect(source.images[0]?.url).toContain('hero.jpg');
    expect(source.faqItems?.[0]?.question).toContain('How long');
    expect(source.cta?.label).toBe('Check my date');
    expect(articleFillFingerprint(source).length).toBeGreaterThan(10);
  });

  it('maps template copy onto the beautiful blog stack', () => {
    const stack = [
      block('a', 'universal-intro-centered', 'section-intro', {
        kicker: 'Article',
        heading: 'Placeholder',
        body: 'Article copy will appear here after generation.',
      }),
      block('b', 'universal-prose-band', 'prose-band', {
        kicker: 'Article',
        heading: 'Placeholder',
        body: '',
      }),
      block('c', 'universal-split-image-right', 'content-split', {
        kicker: 'Article',
        heading: 'Placeholder',
        body: '',
        imageSrc: '',
        imageAlt: '',
      }),
      block('d', 'universal-prose-band', 'prose-band', {
        heading: '',
        body: '',
      }),
      block('e', 'universal-split-image-left', 'content-split', {
        heading: '',
        body: '',
        imageSrc: '',
        imageAlt: '',
      }),
      block('f', 'universal-faq-accordion', 'faq-accordion', {
        kicker: 'FAQ',
        heading: 'FAQ',
        items: [],
      }),
      block('g', 'universal-cta-band', 'cta-banner', {
        heading: 'CTA',
        ctaLabel: 'Get in touch',
        ctaHref: '/contact',
      }),
    ];

    const filled = fillBlogPostBlockProps(
      stack,
      fillSourceFromProtopipeTemplate(template, { kicker: 'live wedding painting' }),
    );

    expect(filled[0].props['heading']).toBe('Live Wedding Painting in Maui');
    expect(filled[0].props['body']).toContain('first dance');
    expect(filled[1].props['heading']).toBe('What to expect');
    expect(filled[2].props['heading']).toBe('Packages');
    expect(filled[2].props['imageSrc']).toContain('hero.jpg');
    expect(filled[3].props['heading']).toBe('Booking tips');
    expect((filled[5].props['items'] as Array<{ q: string }>)[0].q).toContain('How long');
    expect(filled[6].props['ctaLabel']).toBe('Check my date');
  });

  it('does not duplicate section 0 into intro when intro is missing', () => {
    const source = fillSourceFromProtopipeTemplate({
      ...template,
      intro: '',
      blocks: template.blocks?.filter((b) => b.kind !== 'faq_list'),
    });
    expect(source.intro).toBe('');

    const filled = fillBlogPostBlockProps(
      [
        block('a', 'universal-intro-centered', 'section-intro', {
          heading: '',
          body: 'placeholder',
        }),
        block('b', 'universal-split-image-right', 'content-split', {
          heading: '',
          body: '',
          imageSrc: '',
          imageAlt: '',
        }),
      ],
      source,
    );

    expect(filled[0].props['body']).toBe('');
    expect(filled[1].props['heading']).toBe('What to expect');
    expect(filled[1].props['body']).toContain('painter works');
  });

  it('strips a leading markdown H2 that duplicates the section heading', () => {
    const filled = fillBlogPostBlockProps(
      [
        block('b', 'universal-prose-band', 'prose-band', {
          heading: '',
          body: '',
        }),
      ],
      {
        title: 'Article',
        sections: [
          {
            h2: 'Why painted portraits differ',
            body: '## Why painted portraits differ\n\nMost couples leave with photos.',
          },
        ],
        images: [],
      },
    );

    expect(filled[0].props['heading']).toBe('Why painted portraits differ');
    expect(String(filled[0].props['body'])).toBe('Most couples leave with photos.');
    expect(String(filled[0].props['body'])).not.toContain('##');
  });
});
