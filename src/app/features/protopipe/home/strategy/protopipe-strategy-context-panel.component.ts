import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { ProtopipeContentPlanCalendarItem } from '@hive/contracts';
import { buildArticlePanelContext, formatPublishDate } from './strategy.helpers';
import { ProtopipeHomeStrategyViewState } from './protopipe-home-strategy-view.state';

@Component({
  selector: 'app-protopipe-strategy-context-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-strategy-context-panel.component.html',
  styleUrl: './protopipe-strategy-context-panel.component.scss',
})
export class ProtopipeStrategyContextPanelComponent {
  readonly view = inject(ProtopipeHomeStrategyViewState);

  readonly articleContext = computed(() => {
    const plan = this.view.plan();
    const article = this.view.selectedArticle();
    if (!plan || !article) {
      return null;
    }
    return buildArticlePanelContext(plan, article);
  });

  formatDate = formatPublishDate;

  articleStatus(item: ProtopipeContentPlanCalendarItem): 'scheduled' | 'published' | 'draft' {
    if (item.kind === 'refresh-existing') {
      return 'published';
    }
    if (!item.proposedPublishAt) {
      return 'draft';
    }
    return new Date(item.proposedPublishAt).getTime() <= Date.now() ? 'published' : 'scheduled';
  }

  articleStatusLabel(item: ProtopipeContentPlanCalendarItem): string {
    const status = this.articleStatus(item);
    if (status === 'draft') {
      return 'Backlog';
    }
    if (status === 'published') {
      return item.kind === 'refresh-existing' ? 'Refresh queued' : 'Published';
    }
    return 'Scheduled';
  }

  formatMetric(value: number | string | null | undefined, suffix = ''): string {
    if (value == null || value === '') {
      return '—';
    }
    return `${value}${suffix}`;
  }

  openInWriter(article: ProtopipeContentPlanCalendarItem): void {
    void this.view.openInWriter(article);
  }

  openInThinker(article: ProtopipeContentPlanCalendarItem): void {
    void this.view.openInThinker(article);
  }
}
