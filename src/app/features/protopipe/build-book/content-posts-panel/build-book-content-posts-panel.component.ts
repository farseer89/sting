import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Button } from 'primeng/button';
import type { ProtopipeContentPlanCalendarItem } from '@hive/contracts';
import { ContentPlanStore } from '../../content-plan/content-plan.store';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import type { BuildBookPage } from '../build-book.types';
import { ProtopipeBuildBookService } from '../protopipe-build-book.service';

function calendarItemKey(item: ProtopipeContentPlanCalendarItem): string {
  return `${item.proposedPublishAt ?? 'backlog'}|${item.workingTitle}`;
}

function formatPublishDate(iso: string | null | undefined): string {
  if (!iso) return 'Backlog';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Backlog';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

@Component({
  selector: 'app-build-book-content-posts-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  templateUrl: './build-book-content-posts-panel.component.html',
  styleUrl: './build-book-content-posts-panel.component.scss',
})
export class BuildBookContentPostsPanelComponent implements OnInit {
  readonly buildBook = inject(ProtopipeBuildBookService);
  private readonly contentPlan = inject(ContentPlanStore);
  private readonly strategy = inject(ProtopipeStrategyService);

  readonly selectedPageId = input<string | null>(null);
  readonly selectedPageIdChange = output<string | null>();

  readonly newPageLabel = signal('Default blog template');
  readonly addingPlanKey = signal<string | null>(null);
  readonly planError = signal<string | null>(null);

  readonly plan = this.contentPlan.plan;
  readonly planLoading = this.contentPlan.loading;
  readonly planComplete = this.contentPlan.isComplete;

  readonly calendarItems = computed(() => this.plan()?.calendar ?? []);

  pages(): BuildBookPage[] {
    return this.buildBook.blogPosts();
  }

  ngOnInit(): void {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    this.contentPlan.setSiteId(siteId);
    void this.contentPlan.loadLatest();
  }

  selectPage(pageId: string): void {
    this.selectedPageIdChange.emit(pageId);
  }

  createPage(): void {
    const page = this.buildBook.createBlogPostPage(this.newPageLabel());
    if (page) {
      this.selectedPageIdChange.emit(page.id);
      this.newPageLabel.set('Default blog template');
    }
  }

  pageForPlanItem(item: ProtopipeContentPlanCalendarItem): BuildBookPage | null {
    return this.buildBook.findBlogPostByPlanItemKey(calendarItemKey(item));
  }

  itemKey(item: ProtopipeContentPlanCalendarItem): string {
    return calendarItemKey(item);
  }

  isAddingItem(item: ProtopipeContentPlanCalendarItem): boolean {
    return this.addingPlanKey() === calendarItemKey(item);
  }

  planItemTitle(item: ProtopipeContentPlanCalendarItem): string {
    return item.workingTitle?.trim() || item.suggestedKeyword || 'Untitled';
  }

  planItemMeta(item: ProtopipeContentPlanCalendarItem): string {
    const parts = [
      formatPublishDate(item.proposedPublishAt),
      item.suggestedKeyword,
      item.clusterName,
    ].filter(Boolean);
    return parts.join(' · ');
  }

  async addFromPlan(item: ProtopipeContentPlanCalendarItem): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;

    const itemKey = calendarItemKey(item);
    const existing = this.buildBook.findBlogPostByPlanItemKey(itemKey);
    if (existing) {
      this.selectedPageIdChange.emit(existing.id);
      return;
    }

    this.addingPlanKey.set(itemKey);
    this.planError.set(null);
    try {
      let contentPostId = item.contentPostId;
      // confirm-item requires a non-empty proposedPublishAt; backlog rows skip materialize.
      if (!contentPostId && item.proposedPublishAt) {
        const confirmed = await this.contentPlan.confirmCalendarItem({
          proposedPublishAt: item.proposedPublishAt,
          workingTitle: item.workingTitle,
        });
        contentPostId = confirmed?.contentPostId ?? contentPostId;
      }

      const title = this.planItemTitle(item);
      const briefParts = [
        item.rationale,
        item.keyQuestionToAnswer ? `Key question: ${item.keyQuestionToAnswer}` : null,
        item.strategyNarrative,
      ].filter(Boolean);

      const page = this.buildBook.createBlogPostPage(title, {
        contentPostId,
        contentPlanItemKey: itemKey,
        suggestedKeyword: item.suggestedKeyword,
        briefBody: briefParts.join('\n\n') || undefined,
      });
      if (page) {
        this.selectedPageIdChange.emit(page.id);
      }
    } catch {
      this.planError.set('Could not add this plan item as a blog page.');
    } finally {
      this.addingPlanKey.set(null);
    }
  }
}
