import type {
  ProtopipeContentPlanCalendarItem,
  ProtopipeContentPost,
  ProtopipeSiteContentPlan,
} from '@hive/contracts';
import { describe, expect, it } from 'vitest';
import { calendarItemKey } from '../strategy/strategy.helpers';
import {
  buildCalendarNextActionMap,
  findPostForCalendarItem,
  resolveCalendarNextAction,
} from './calendar-article-action.util';

function item(
  overrides: Partial<ProtopipeContentPlanCalendarItem> &
    Pick<ProtopipeContentPlanCalendarItem, 'workingTitle' | 'suggestedKeyword'>,
): ProtopipeContentPlanCalendarItem {
  return {
    proposedPublishAt: '2026-07-20T12:00:00.000Z',
    intent: 'informational',
    priority: 'medium',
    kind: 'new',
    ...overrides,
  };
}

function post(
  overrides: Partial<ProtopipeContentPost> & Pick<ProtopipeContentPost, 'id' | 'title'>,
): ProtopipeContentPost {
  return {
    siteId: 'site-1',
    slug: 'x',
    description: '',
    bodyMarkdown: '',
    status: 'draft',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('calendar-article-action.util', () => {
  it('shows Write when there is no contentPostId', () => {
    const next = resolveCalendarNextAction(item({ workingTitle: 'A', suggestedKeyword: 'a' }), []);
    expect(next.stage).toBe('write');
    expect(next.label).toBe('Write');
    expect(next.statusLabel).toBe('Not written');
  });

  it('shows Write when contentPostId is set but post has no run/body', () => {
    const posts = [post({ id: 'p1', title: 'Draft only' })];
    const next = resolveCalendarNextAction(
      item({
        workingTitle: 'A',
        suggestedKeyword: 'kw',
        contentPostId: 'p1',
      }),
      posts,
    );
    expect(next.stage).toBe('write');
    expect(next.postId).toBe('p1');
  });

  it('shows Review when contentPostId links a post with a generation run', () => {
    const posts = [
      post({
        id: 'p1',
        title: 'Rewritten SEO title',
        articleGenerationRunId: 'run-1',
      }),
    ];
    const next = resolveCalendarNextAction(
      item({
        workingTitle: 'Old working title',
        suggestedKeyword: 'ac repair phoenix',
        contentPostId: 'p1',
      }),
      posts,
    );
    expect(next.stage).toBe('review');
    expect(next.label).toBe('View on Blog');
    expect(next.statusLabel).toBe('Ready');
    expect(next.postId).toBe('p1');
  });

  it('matches by contentPostId and shows Published', () => {
    const posts = [post({ id: 'p2', title: 'T', status: 'published', bodyMarkdown: '# hi' })];
    const next = resolveCalendarNextAction(
      item({ workingTitle: 'T', suggestedKeyword: 'kw', contentPostId: 'p2' }),
      posts,
    );
    expect(next.stage).toBe('published');
    expect(next.label).toBe('View on Blog');
  });

  it('does not fuzzy-match by keyword or title', () => {
    const posts = [
      post({
        id: 'linked',
        title: 'Best heat pumps 2026',
        suggestedKeyword: 'heat pump',
        articleGenerationRunId: 'r1',
      }),
    ];
    const row = item({ workingTitle: 'A', suggestedKeyword: 'heat pump' });
    expect(findPostForCalendarItem(row, posts)).toBeUndefined();
    expect(resolveCalendarNextAction(row, posts).stage).toBe('write');
  });

  it('buildCalendarNextActionMap applies Build Book page links', () => {
    const row = item({ workingTitle: 'A', suggestedKeyword: 'orphan keyword' });
    const plan = { calendar: [row] } as ProtopipeSiteContentPlan;
    const posts = [
      post({
        id: 'page-linked',
        title: 'Totally different',
        articleGenerationRunId: 'r1',
      }),
    ];
    const key = calendarItemKey(row);
    const map = buildCalendarNextActionMap(plan, posts, { [key]: 'page-linked' });
    expect(map[key]?.stage).toBe('review');
    expect(map[key]?.postId).toBe('page-linked');
  });
});
