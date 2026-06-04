import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';
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
