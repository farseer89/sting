import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Tag } from 'primeng/tag';
import { ProtopipeContentService } from '../protopipe-content.service';
import type { ProtopipeContentPost } from '../protopipe.models';
import { CalendarComponent, type CalendarItem } from '../../../shared/ui';

/**
 * Smart wrapper that turns the Protopipe content catalog into a calendar view.
 *
 * Phase 1: real `ProtopipeContentPost[]` only. Suggestions and GA metrics arrive
 * later — the mapper is additive so wiring them in is a one-function change.
 *
 * See: Mothership/ai-plans/protopipe-content-pipeline-calendar.md
 */
@Component({
  selector: 'app-protopipe-content-pipeline-calendar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Button, ProgressSpinner, Tag, CalendarComponent],
  templateUrl: './protopipe-content-pipeline-calendar.component.html',
  styleUrl: './protopipe-content-pipeline-calendar.component.scss',
})
export class ProtopipeContentPipelineCalendarComponent {
  protected readonly content = inject(ProtopipeContentService);
  private readonly router = inject(Router);

  protected readonly loading = this.content.loading;
  protected readonly error = this.content.loadError;
  protected readonly posts = this.content.posts;

  protected readonly items = computed<CalendarItem<ProtopipeContentPost>[]>(() => [
    ...this.posts().map((post) => postToCalendarItem(post)),
    // Phase 2: ...this.suggestions().map(suggestionToCalendarItem),
  ]);

  constructor() {
    this.content.ensureCatalogLoaded();
  }

  protected onItemAction(event: {
    item: CalendarItem<ProtopipeContentPost>;
    actionId: string;
  }): void {
    const post = event.item.data;
    if (event.actionId === 'edit') {
      void this.router.navigate(['/protopipe/content', post.id]);
    } else if (event.actionId === 'view' && post.publishedUrl) {
      window.open(post.publishedUrl, '_blank', 'noopener,noreferrer');
    }
  }

  protected statusSeverity(
    status: ProtopipeContentPost['status'],
  ): 'success' | 'warn' | 'secondary' {
    if (status === 'published') return 'success';
    if (status === 'scheduled') return 'warn';
    return 'secondary';
  }

  protected formatDateLabel(post: ProtopipeContentPost): string {
    const iso = pickDateIso(post);
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  protected dateLabelPrefix(post: ProtopipeContentPost): string {
    if (post.status === 'published') return 'Published';
    if (post.status === 'scheduled') return 'Scheduled for';
    return 'Last edited';
  }
}

/** Build a default action list per status. */
function buildActions(post: ProtopipeContentPost): CalendarItem<ProtopipeContentPost>['actions'] {
  const actions: NonNullable<CalendarItem<ProtopipeContentPost>['actions']> = [
    { id: 'edit', label: 'Edit', icon: 'pi pi-pencil', kind: 'primary' },
  ];
  if (post.status === 'published' && post.publishedUrl) {
    actions.unshift({
      id: 'view',
      label: 'View live',
      icon: 'pi pi-external-link',
      kind: 'primary',
    });
    actions[1] = { id: 'edit', label: 'Edit', icon: 'pi pi-pencil' };
  }
  return actions;
}

/** Pick the most meaningful date for the calendar bucketing. */
function pickDateIso(post: ProtopipeContentPost): string | undefined {
  if (post.status === 'published') return post.publishedAt ?? post.updatedAt;
  if (post.status === 'scheduled') return post.publishAt ?? post.updatedAt;
  return post.updatedAt;
}

/** Map a content post into a generic calendar item. */
export function postToCalendarItem(
  post: ProtopipeContentPost,
): CalendarItem<ProtopipeContentPost> {
  const iso = pickDateIso(post) ?? new Date().toISOString();
  return {
    id: post.id,
    date: iso,
    title: post.title || 'Untitled',
    status: post.status,
    source: 'human',
    badge: post.template?.primaryKeywordPhrase,
    actions: buildActions(post),
    data: post,
  };
}
