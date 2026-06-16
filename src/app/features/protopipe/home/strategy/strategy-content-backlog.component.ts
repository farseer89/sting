import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { ProtopipeContentPlanCalendarItem, ProtopipeSiteContentPlan } from '@hive/contracts';
import { ProtopipeHomeStrategyViewState } from './protopipe-home-strategy-view.state';
import { calendarItemKey, planBacklogItems } from './strategy.helpers';

@Component({
  selector: 'app-strategy-content-backlog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './strategy-content-backlog.component.html',
  styleUrl: './strategy-content-backlog.component.scss',
})
export class StrategyContentBacklogComponent {
  private readonly viewState = inject(ProtopipeHomeStrategyViewState);

  readonly plan = input.required<ProtopipeSiteContentPlan>();

  readonly items = computed(() => planBacklogItems(this.plan()));
  readonly calendarItemKey = calendarItemKey;

  readonly selectedItemKey = computed(() => {
    const article = this.viewState.selectedArticle();
    return article ? calendarItemKey(article) : null;
  });

  openItem(item: ProtopipeContentPlanCalendarItem): void {
    this.viewState.openArticlePanel(item);
  }

  isSelected(item: ProtopipeContentPlanCalendarItem): boolean {
    return this.selectedItemKey() === calendarItemKey(item);
  }
}
