import type {
  ProtopipeContentPlanCalendarItem,
  ProtopipeContentPost,
  ProtopipeSiteContentPlan,
} from '@hive/contracts';
import { calendarItemKey } from '../strategy/strategy.helpers';

/** Funnel stage for a calendar row — drives label + click. */
export type CalendarArticleStage = 'write' | 'review' | 'published';

export interface CalendarNextAction {
  stage: CalendarArticleStage;
  /** Primary CTA on the row */
  label: string;
  /** Status chip beside the title */
  statusLabel: string;
  postId?: string;
  post?: ProtopipeContentPost;
}

/** True when catalog post looks like it has article content (Shire list often blanks bodyMarkdown). */
export function postHasArticleBody(post: ProtopipeContentPost): boolean {
  const template = post.template;
  const hasTemplateBody =
    Boolean(template?.intro?.trim()) ||
    (template?.sections?.length ?? 0) > 0 ||
    (template?.blocks?.length ?? 0) > 0 ||
    Boolean(template?.h1?.trim()) ||
    Boolean(template?.title?.trim() && template?.metaDescription?.trim());
  return hasTemplateBody || Boolean(post.bodyMarkdown?.trim());
}

/**
 * Resolve a calendar row to a catalog post by contentPostId only.
 * Fuzzy title/keyword joins are intentionally removed from the CTA path.
 */
export function findPostForCalendarItem(
  item: ProtopipeContentPlanCalendarItem,
  posts: readonly ProtopipeContentPost[],
): ProtopipeContentPost | undefined {
  const id = item.contentPostId?.trim();
  if (!id) return undefined;
  return posts.find((post) => post.id === id);
}

/**
 * Single source of truth for calendar row CTAs.
 *
 * Write → not started (no linked post, or linked post not generated)
 * Review on blog → generated (run linked and/or body present)
 * Review on blog + Published → already published
 */
export function resolveCalendarNextAction(
  item: ProtopipeContentPlanCalendarItem,
  posts: readonly ProtopipeContentPost[],
): CalendarNextAction {
  const post = findPostForCalendarItem(item, posts);
  const postId = post?.id ?? (item.contentPostId?.trim() || undefined);

  if (post?.status === 'published') {
    return {
      stage: 'published',
      label: 'Review on blog',
      statusLabel: 'Published',
      post,
      postId,
    };
  }

  // Written = body/template present OR a generation run was linked to this post.
  if (post && (postHasArticleBody(post) || Boolean(post.articleGenerationRunId))) {
    return {
      stage: 'review',
      label: 'Review on blog',
      statusLabel: 'Ready',
      post,
      postId,
    };
  }

  return {
    stage: 'write',
    label: 'Write',
    statusLabel: 'Not written',
    post,
    postId,
  };
}

/**
 * Build the calendar SoT map: itemKey → next action.
 * `extraPostIdsByItemKey` is for Build Book pages linked by plan item key.
 */
export function buildCalendarNextActionMap(
  plan: ProtopipeSiteContentPlan | null | undefined,
  posts: readonly ProtopipeContentPost[],
  extraPostIdsByItemKey: Readonly<Record<string, string>> = {},
): Readonly<Record<string, CalendarNextAction>> {
  if (!plan?.calendar?.length) return {};

  const out: Record<string, CalendarNextAction> = {};
  for (const item of plan.calendar) {
    const key = calendarItemKey(item);
    const linkedId = item.contentPostId?.trim() || extraPostIdsByItemKey[key]?.trim();
    const enriched: ProtopipeContentPlanCalendarItem = linkedId
      ? { ...item, contentPostId: linkedId }
      : item;
    out[key] = resolveCalendarNextAction(enriched, posts);
  }
  return out;
}

/** Fingerprint so OnPush calendars re-render when the catalog updates. */
export function contentPostsActionRevision(posts: readonly ProtopipeContentPost[]): string {
  return posts
    .map(
      (p) =>
        `${p.id}:${p.updatedAt}:${p.articleGenerationRunId ?? ''}:${p.status}:${p.bodyMarkdown?.length ?? 0}:${p.template ? 1 : 0}`,
    )
    .join('|');
}
