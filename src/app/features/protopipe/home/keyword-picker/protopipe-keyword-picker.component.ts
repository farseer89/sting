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
import { ProtopipeAvatarSuggestionPanelComponent } from './protopipe-avatar-suggestion-panel.component';
import {
  ProtopipeKeywordPickerStore,
  type KeywordPickerWizardStep,
} from './protopipe-keyword-picker.store';

@Component({
  selector: 'app-protopipe-keyword-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProtopipeAvatarSuggestionPanelComponent],
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

  readonly wizardSteps: { id: KeywordPickerWizardStep; label: string }[] = [
    { id: 'keywords', label: 'Keywords' },
    { id: 'avatars', label: 'Audiences' },
    { id: 'build', label: 'Build' },
  ];

  readonly headline = computed(() => {
    switch (this.store.wizardStep()) {
      case 'avatars':
        return 'Who are you writing for?';
      case 'build':
        return 'Ready to build your plan';
      default:
        return 'Choose what you want to rank for';
    }
  });

  readonly lede = computed(() => {
    switch (this.store.wizardStep()) {
      case 'avatars':
        return 'Pick the customer types that match your selected keywords. We use them to shape topics and tone in your content plan.';
      case 'build':
        return 'We will save your keywords and audiences, then generate your content plan in the background.';
      default:
        return 'Suggestions are matched to your business profile from onboarding. Add or remove keywords, then continue when you are ready.';
    }
  });

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

  isWizardStepActive(step: KeywordPickerWizardStep): boolean {
    return this.store.wizardStep() === step;
  }

  isWizardStepDone(step: KeywordPickerWizardStep): boolean {
    const order: KeywordPickerWizardStep[] = ['keywords', 'avatars', 'build'];
    const current = order.indexOf(this.store.wizardStep());
    const idx = order.indexOf(step);
    return idx >= 0 && current > idx;
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

  continueFromKeywords(): void {
    if (this.store.wizardEnabled()) {
      this.store.confirmKeywordSelection();
      return;
    }
    void this.confirm();
  }

  continueFromAvatars(): void {
    this.store.goToBuildStep();
  }

  async confirm(): Promise<void> {
    const ok = await this.store.confirmAvatarsAndBuildPlan();
    if (ok) {
      this.confirmed.emit();
    }
  }

  avatarLabel(id: string): string {
    return this.store.suggestedAvatars().find((a) => a.id === id)?.description ?? id;
  }
}
