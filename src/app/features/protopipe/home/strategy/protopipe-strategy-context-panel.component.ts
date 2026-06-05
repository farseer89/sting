import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { ProtopipeContentPlanCalendarItem } from '@hive/contracts';
import { formatPublishDate } from './strategy.helpers';
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

  formatDate = formatPublishDate;

  articleStatus(item: ProtopipeContentPlanCalendarItem): 'scheduled' | 'published' | 'draft' {
    if (item.kind === 'refresh-existing') {
      return 'published';
    }
    return new Date(item.proposedPublishAt).getTime() <= Date.now() ? 'published' : 'scheduled';
  }

  articleStatusLabel(item: ProtopipeContentPlanCalendarItem): string {
    const status = this.articleStatus(item);
    if (status === 'published') {
      return item.kind === 'refresh-existing' ? 'Refresh queued' : 'Published';
    }
    return 'Scheduled';
  }
}
