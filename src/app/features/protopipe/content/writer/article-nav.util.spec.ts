import { describe, expect, it } from 'vitest';
import type { ArticleGenerationRunDto, ProtopipeContentTemplate } from '@hive/contracts';
import { mergeRunPreviewTemplate } from './article-nav.util';

describe('mergeRunPreviewTemplate', () => {
  const skeleton: ProtopipeContentTemplate = {
    primaryKeywordPhrase: 'maui wedding portrait',
    title: 'Custom Wedding Portraits',
    intro: '',
    sections: [],
    blocks: [
      {
        id: 'intro',
        slotId: 'intro',
        kind: 'prose',
        label: 'Introduction',
        body: '',
      },
      {
        id: 's1',
        slotId: 'section_1',
        kind: 'prose',
        label: 'Section 1',
        h2: 'Why painted portraits differ',
        body: '',
      },
      {
        id: 's2',
        slotId: 'section_2',
        kind: 'prose',
        label: 'Section 2',
        h2: 'How to commission',
        body: '',
      },
    ],
  };

  it('maps drafted sections by layout sectionIndex and does not put section 0 into intro', () => {
    const run = {
      id: 'run-1',
      status: 'running',
      artifacts: {
        layoutSkeleton: skeleton,
        layoutPlan: {
          layoutVersion: 1,
          source: 'outline_driven',
          plannedAt: '2026-07-13T00:00:00.000Z',
          slots: [
            { slotId: 'intro', blockId: 'prose-intro', kind: 'prose', patternId: 'section-intro' },
            {
              slotId: 'section_1',
              blockId: 'prose-0',
              kind: 'prose',
              patternId: 'prose-band',
              sectionIndex: 0,
              h2: 'Why painted portraits differ',
            },
            {
              slotId: 'section_2',
              blockId: 'prose-1',
              kind: 'prose',
              patternId: 'prose-band',
              sectionIndex: 1,
              h2: 'How to commission',
            },
          ],
        },
        sections: [
          {
            section: { h2: 'Why painted portraits differ', targetWordCount: 200 },
            prose: 'Section one body about painted portraits.',
          },
          {
            section: { h2: 'How to commission', targetWordCount: 200 },
            prose: 'Section two body about commissioning.',
          },
        ],
      },
    } as ArticleGenerationRunDto;

    const merged = mergeRunPreviewTemplate(run, null);
    expect(merged).toBeTruthy();
    const intro = merged!.blocks!.find((b) => b.slotId === 'intro');
    const s1 = merged!.blocks!.find((b) => b.slotId === 'section_1');
    const s2 = merged!.blocks!.find((b) => b.slotId === 'section_2');

    expect(intro && intro.kind === 'prose' ? intro.body : '').not.toContain('Section one body');
    expect(s1 && s1.kind === 'prose' ? s1.body : '').toContain('Section one body');
    expect(s2 && s2.kind === 'prose' ? s2.body : '').toContain('Section two body');
  });

  it('prefers assembled template intro for the intro block', () => {
    const assembled: ProtopipeContentTemplate = {
      ...skeleton,
      intro: 'A real opening line for the article.',
      blocks: skeleton.blocks?.map((b) =>
        b.kind === 'prose' && b.slotId === 'intro'
          ? { ...b, body: 'A real opening line for the article.' }
          : b,
      ),
    };
    const run = {
      id: 'run-2',
      status: 'complete',
      artifacts: {
        template: assembled,
        sections: [
          {
            section: { h2: 'Why painted portraits differ', targetWordCount: 200 },
            prose: 'Should not become intro.',
          },
        ],
      },
    } as ArticleGenerationRunDto;

    const merged = mergeRunPreviewTemplate(run, null);
    const intro = merged!.blocks!.find((b) => b.slotId === 'intro');
    expect(merged!.intro).toContain('real opening line');
    expect(intro && intro.kind === 'prose' ? intro.body : '').toContain('real opening line');
  });
});
