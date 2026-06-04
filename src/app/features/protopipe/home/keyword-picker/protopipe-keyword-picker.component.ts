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
import {
  formatCompetitionCell,
  fitLabel,
  sortPlanRows,
  COLUMN_TOOLTIPS,
  type KeywordPlanSortColumn,
  type KeywordPlanSortDirection,
} from './keyword-picker.table';
import {
  formatCompetitionLabel,
  formatKeywordVolume,
  sourceLabel,
} from './keyword-picker.types';
import type { KeywordPickerOption } from './keyword-picker.types';
import { ProtopipeKeywordPickerStore } from './protopipe-keyword-picker.store';

@Component({
  selector: 'app-protopipe-keyword-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ProtopipeKeywordPickerStore],
  templateUrl: './protopipe-keyword-picker.component.html',
  styleUrl: './protopipe-keyword-picker.component.scss',
})
export class ProtopipeKeywordPickerComponent implements OnInit {
  readonly store = inject(ProtopipeKeywordPickerStore);

  readonly siteLabel = input('');
  readonly confirmed = output<void>();

  readonly formatVolume = formatKeywordVolume;
  readonly formatCompetition = formatCompetitionLabel;
  readonly sourceLabel = sourceLabel;
  readonly formatCompetitionCell = formatCompetitionCell;
  readonly fitLabel = fitLabel;
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

  ngOnInit(): void {
    void this.store.load();
  }

  onSearchInput(value: string): void {
    this.store.setSearchQuery(value);
  }

  clearSearch(): void {
    this.store.clearSearch();
  }

  toggle(option: KeywordPickerOption): void {
    this.store.toggle(option);
  }

  addFromSearch(option: KeywordPickerOption): void {
    this.store.addFromOption(option);
  }

  addPrimarySearch(): void {
    const primary = this.store.searchPrimary();
    if (primary) {
      this.store.addFromOption(primary);
    }
  }

  addCustomFromSearch(): void {
    const q = this.store.searchQuery().trim();
    if (q) {
      this.store.addCustom(q);
    }
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
