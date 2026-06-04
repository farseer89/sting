import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  formatCompetitionCell,
  fitLabel,
  sortPlanRows,
  COLUMN_TOOLTIPS,
  type KeywordPlanSortColumn,
  type KeywordPlanSortDirection,
} from './keyword-picker.table';
import { sourceLabel, formatKeywordVolume } from './keyword-picker.types';
import type { KeywordPickerOption } from './keyword-picker.types';
import { ProtopipeHomeSidePanelService } from '../protopipe-home-side-panel.service';
import { ProtopipeKeywordPickerStore } from './protopipe-keyword-picker.store';

@Component({
  selector: 'app-protopipe-keyword-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-keyword-picker.component.html',
  styleUrl: './protopipe-keyword-picker.component.scss',
})
export class ProtopipeKeywordPickerComponent {
  readonly store = inject(ProtopipeKeywordPickerStore);
  readonly sidePanel = inject(ProtopipeHomeSidePanelService);

  readonly siteLabel = input('');
  readonly confirmed = output<void>();

  readonly formatCompetitionCell = formatCompetitionCell;
  readonly formatVolume = formatKeywordVolume;
  readonly fitLabel = fitLabel;
  readonly sourceLabel = sourceLabel;
  readonly columnTooltips = COLUMN_TOOLTIPS;

  readonly sortColumn = signal<KeywordPlanSortColumn>('opportunity');
  readonly sortDirection = signal<KeywordPlanSortDirection>('desc');

  readonly sortedPlanRows = computed(() =>
    sortPlanRows(this.store.pool(), this.sortColumn(), this.sortDirection()),
  );

  formatOpportunity(option: KeywordPickerOption): string {
    if (option.opportunityScore == null) return '—';
    return option.opportunityScore.toLocaleString();
  }

  sortIndicator(column: KeywordPlanSortColumn): string {
    if (this.sortColumn() !== column) return '↕';
    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  toggleSort(column: KeywordPlanSortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    this.sortColumn.set(column);
    this.sortDirection.set(column === 'phrase' ? 'asc' : 'desc');
  }

  onSuggestedRowClick(event: Event, option: KeywordPickerOption): void {
    const target = event.target as HTMLElement;
    if (target.closest('input[type="checkbox"]') || target.closest('.kwpick__th-sort')) return;
    this.toggle(option);
  }

  toggle(option: KeywordPickerOption): void {
    this.store.toggle(option);
  }

  remove(phraseKey: string): void {
    this.store.remove(phraseKey);
  }

  async confirm(): Promise<void> {
    const ok = await this.store.confirmAndBuildPlan();
    if (ok) {
      this.confirmed.emit();
    }
  }
}
