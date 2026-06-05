import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  formatCompetitionCell,
  fitLabel,
  sortPlanRows,
  COLUMN_TOOLTIPS,
  type KeywordPlanSortColumn,
  type KeywordPlanSortDirection,
} from './keyword-picker.table';
import { sourceLabel, formatKeywordVolume } from './keyword-picker.types';
import type { ProtopipeSuggestedAvatar } from '@hive/contracts';
import type { KeywordPickerOption } from './keyword-picker.types';
import { ProtopipeHomeSidePanelService } from '../protopipe-home-side-panel.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
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
  private readonly router = inject(Router);
  private readonly strategy = inject(ProtopipeStrategyService);

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

  readonly planSections = computed((): {
    id: string;
    avatar: ProtopipeSuggestedAvatar | null;
    keywords: KeywordPickerOption[];
  }[] => {
    const selectedAvatars = this.store
      .suggestedAvatars()
      .filter((a) => this.store.selectedAvatarIds().has(a.id));
    const keywords = this.store.selectedList();
    const sections: {
      id: string;
      avatar: ProtopipeSuggestedAvatar | null;
      keywords: KeywordPickerOption[];
    }[] = selectedAvatars.map((avatar) => ({
      id: avatar.id,
      avatar,
      keywords: keywords.filter((k) => k.avatarId === avatar.id),
    }));
    const assignedIds = new Set(selectedAvatars.map((a) => a.id));
    const other = keywords.filter((k) => !k.avatarId || !assignedIds.has(k.avatarId));
    if (other.length > 0) {
      sections.push({ id: '_other', avatar: null, keywords: other });
    }
    return sections;
  });

  readonly planTotalVolume = computed(() =>
    this.store.selectedList().reduce((sum, k) => sum + (k.searchVolume ?? 0), 0),
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

  avatarById(id: string): ProtopipeSuggestedAvatar | undefined {
    return this.store.suggestedAvatars().find((a) => a.id === id);
  }

  keywordsForAvatar(avatarId: string): KeywordPickerOption[] {
    return this.store.selectedList().filter((k) => k.avatarId === avatarId);
  }

  avatarInitials(av: ProtopipeSuggestedAvatar): string {
    const source = av.intentCluster?.trim() || av.description.trim();
    const words = source.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return '?';
  }

  funnelLabel(stage: KeywordPickerOption['funnelStage']): string {
    switch (stage) {
      case 'awareness':
        return 'Awareness';
      case 'consideration':
        return 'Consideration';
      case 'decision':
        return 'Decision';
      default:
        return '';
    }
  }

  formatPlanVolume(total: number): string {
    if (total >= 1000) {
      return `${(total / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    }
    return total.toLocaleString();
  }

  /** TODO(pre-launch): remove temporary operator debug entry to the discovery Thinker lab. */
  viewDiscoveryRun(): void {
    const siteId = this.strategy.siteId();
    const runId = this.store.discoveryRunId();
    if (!siteId || !runId) return;
    void this.router.navigate(['/protopipe/lab/keyword-discovery'], {
      queryParams: { siteId, runId, returnTo: '/home' },
    });
  }
}
