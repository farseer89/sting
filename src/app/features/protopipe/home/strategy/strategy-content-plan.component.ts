import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { ProtopipeContentPlanCalendarItem, ProtopipeSiteContentPlan } from '@hive/contracts';
import { ProtopipeHomeStrategyViewState } from './protopipe-home-strategy-view.state';
import { calendarItemKey, formatPublishDate } from './strategy.helpers';
import { planAudienceSections, planClustersWithArticles } from './strategy-content-plan';

@Component({
  selector: 'app-strategy-content-plan',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './strategy-content-plan.component.html',
  styleUrl: './strategy-content-plan.component.scss',
})
export class StrategyContentPlanComponent {
  private readonly viewState = inject(ProtopipeHomeStrategyViewState);

  readonly plan = input.required<ProtopipeSiteContentPlan>();

  readonly clusters = computed(() => planClustersWithArticles(this.plan()));

  readonly audiences = computed(() => planAudienceSections(this.plan()));

  readonly articleCount = computed(() => this.plan().calendar.length);

  readonly selectedItemKey = computed(() => {
    const article = this.viewState.selectedArticle();
    return article ? calendarItemKey(article) : null;
  });

  formatDate = formatPublishDate;
  itemKey = calendarItemKey;

  openArticle(item: ProtopipeContentPlanCalendarItem): void {
    this.viewState.selectArticle(item);
  }

  isArticleSelected(item: ProtopipeContentPlanCalendarItem): boolean {
    return this.selectedItemKey() === calendarItemKey(item);
  }

  roleLabel(item: ProtopipeContentPlanCalendarItem): string {
    if (item.clusterRole === 'pillar') {
      return 'Pillar';
    }
    return 'Supporting';
  }

  kindLabel(item: ProtopipeContentPlanCalendarItem): string {
    return item.kind === 'refresh-existing' ? 'Refresh' : 'New';
  }
}
