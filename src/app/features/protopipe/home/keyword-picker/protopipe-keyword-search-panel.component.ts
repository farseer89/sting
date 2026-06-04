import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { formatCompetitionLabel, formatKeywordVolume, sourceLabel } from './keyword-picker.types';
import type { KeywordPickerOption } from './keyword-picker.types';
import { ProtopipeKeywordPickerStore } from './protopipe-keyword-picker.store';

@Component({
  selector: 'app-protopipe-keyword-search-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-keyword-search-panel.component.html',
  styleUrl: './protopipe-keyword-search-panel.component.scss',
})
export class ProtopipeKeywordSearchPanelComponent {
  readonly store = inject(ProtopipeKeywordPickerStore);

  readonly formatVolume = formatKeywordVolume;
  readonly formatCompetition = formatCompetitionLabel;
  readonly sourceLabel = sourceLabel;

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

  addCustomFromSearch(): void {
    const q = this.store.searchQuery().trim();
    if (q) {
      this.store.addCustom(q);
    }
  }
}
