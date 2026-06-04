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

function competitionHint(option: KeywordPickerOption): string {
  if (option.keywordDifficulty != null) {
    const kd = option.keywordDifficulty;
    if (kd <= 40) return 'Easier organic win';
    if (kd <= 60) return 'Moderate effort';
    return 'Hard to rank';
  }
  if (option.competition) {
    const c = option.competition.toUpperCase();
    if (c === 'LOW') return 'Less ad crowding';
    if (c === 'MEDIUM') return 'Moderate crowding';
    return 'High crowding';
  }
  return 'Unknown difficulty';
}

function fitLabel(score: number | undefined): string {
  if (score == null) return '—';
  if (score >= 70) return 'Strong';
  if (score >= 40) return 'Good';
  return 'Fair';
}

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
  readonly competitionHint = competitionHint;
  readonly fitLabel = fitLabel;

  formatOpportunity(option: KeywordPickerOption): string {
    if (option.opportunityScore == null) return '—';
    return option.opportunityScore.toLocaleString();
  }

  onSuggestedRowClick(event: Event, option: KeywordPickerOption): void {
    const target = event.target as HTMLElement;
    if (target.closest('input[type="checkbox"]')) return;
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
