import { describe, expect, it } from 'vitest';
import type { ProtopipeContentPost } from '@hive/contracts';
import type { BuildBookPage } from '../../build-book/build-book.types';
import { resolveBlogPreviewStack } from './resolve-blog-preview-stack.util';

function post(overrides: Partial<ProtopipeContentPost> = {}): ProtopipeContentPost {
  return {
    id: 'post-1',
    siteId: 'site-1',
    title: 'Heat pumps in Phoenix',
    slug: 'heat-pumps',
    description: '',
    bodyMarkdown: '',
    status: 'draft',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function profile(id: string, label: string): BuildBookPage {
  return {
    id,
    kind: 'blog-post',
    role: 'template-profile',
    label,
    templateProfileMeta: { varietyKey: 'editorial-split' },
    blocks: [
      {
        id: `${id}-b1`,
        blockId: 'universal-intro-centered',
        componentId: 'universal-intro-centered',
        section: 'fold',
        order: 0,
        patternId: 'section-intro',
        props: { heading: 'Placeholder' },
      },
      {
        id: `${id}-b2`,
        blockId: 'universal-prose-band',
        componentId: 'universal-prose-band',
        section: 'fold',
        order: 1,
        patternId: 'prose-band',
        props: { body: 'Placeholder body' },
      },
    ],
  };
}

describe('resolveBlogPreviewStack', () => {
  it('fills the selected template profile from ContentTemplate', () => {
    const profiles = [profile('blog-faq', 'FAQ-led'), profile('blog-editorial', 'Editorial')];
    const resolved = resolveBlogPreviewStack({
      post: post({
        blogTemplateProfileId: 'blog-editorial',
        template: {
          version: 1,
          title: 'Heat pumps in Phoenix',
          h1: 'Heat pumps in Phoenix',
          intro: 'Real intro copy.',
          sections: [{ h2: 'Why it matters', body: 'Section body.' }],
          blocks: [],
        },
      }),
      profiles,
    });

    expect(resolved.profileId).toBe('blog-editorial');
    expect(resolved.hasArticleBody).toBe(true);
    expect(resolved.blockStates).toHaveLength(2);
    expect(resolved.blockStates[0]?.props['heading']).toBe('Heat pumps in Phoenix');
  });

  it('falls back to first profile when blogTemplateProfileId is missing', () => {
    const profiles = [profile('blog-faq', 'FAQ-led')];
    const resolved = resolveBlogPreviewStack({
      post: post({
        template: {
          version: 1,
          title: 'T',
          intro: 'Intro',
          sections: [],
          blocks: [],
        },
      }),
      profiles,
    });
    expect(resolved.profileId).toBe('blog-faq');
    expect(resolved.hasArticleBody).toBe(true);
  });

  it('uses the hardcoded default stack when no profiles exist', () => {
    const resolved = resolveBlogPreviewStack({
      post: post({
        template: {
          version: 1,
          title: 'Solo',
          intro: 'Intro only.',
          sections: [],
          blocks: [],
        },
      }),
      profiles: [],
    });
    expect(resolved.profileId).toBeUndefined();
    expect(resolved.blockStates.length).toBeGreaterThan(3);
    expect(resolved.hasArticleBody).toBe(true);
  });
});
