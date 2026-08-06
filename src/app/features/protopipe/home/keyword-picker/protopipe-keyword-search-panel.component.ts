import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { fitLabel, marketBadgeLabel } from './keyword-picker.table';
import {
  formatCompetitionLabel,
  formatKeywordVolume,
} from './keyword-picker.types';
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
  readonly fitLabel = fitLabel;
  readonly marketBadgeLabel = marketBadgeLabel;

  readonly selectedVolume = computed(() =>
    this.store.selectedPanelList().reduce((sum, k) => sum + (k.searchVolume ?? 0), 0),
  );

  remove(phraseKey: string): void {
    this.store.remove(phraseKey);
  }

  formatPlanVolume(total: number): string {
    if (total >= 1000) {
      return `${(total / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    }
    return total.toLocaleString();
  }
}
