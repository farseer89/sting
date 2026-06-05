import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  FACT_CHECK_CATEGORY_LABELS,
  INSPO_FILTERS,
  KNOWN_FACT_CATEGORIES,
  MOCK_STRATEGY_TUNE,
  TUNE_TABS,
  type StrategyInspoFilter,
  type StrategyTuneFactCheck,
  type StrategyTuneFactCheckStatus,
  type StrategyTuneInspiration,
  type StrategyTuneKnownFact,
  type StrategyTuneKnownFactCategory,
  type StrategyTuneReference,
  type StrategyTuneTab,
} from './strategy-tune.mock';

@Component({
  selector: 'app-strategy-content-tune',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './strategy-content-tune.component.html',
  styleUrl: './strategy-content-tune.component.scss',
})
export class StrategyContentTuneComponent {
  readonly tabs = TUNE_TABS;
  readonly inspoFilters = INSPO_FILTERS;
  readonly knownFactCategories = KNOWN_FACT_CATEGORIES;
  readonly factCheckCategoryLabels = FACT_CHECK_CATEGORY_LABELS;
  readonly styleOptions = MOCK_STRATEGY_TUNE.styleOptions;
  readonly styleNotes = signal(MOCK_STRATEGY_TUNE.styleNotes);
  readonly activeStyles = signal(new Set(MOCK_STRATEGY_TUNE.activeStyleIds));
  readonly inspirations = MOCK_STRATEGY_TUNE.inspirations;
  readonly references = signal<StrategyTuneReference[]>([...MOCK_STRATEGY_TUNE.references]);
  readonly knownFacts = signal<StrategyTuneKnownFact[]>([...MOCK_STRATEGY_TUNE.knownFacts]);
  readonly factChecks = MOCK_STRATEGY_TUNE.factChecks;

  readonly activeTab = signal<StrategyTuneTab>('voice');
  readonly inspoFilter = signal<StrategyInspoFilter>('all');
  readonly newLinkUrl = signal('');
  readonly newLinkLabel = signal('');
  readonly newFactCategory = signal<StrategyTuneKnownFactCategory>('services');
  readonly newFactStatement = signal('');
  readonly newFactSource = signal('');
  readonly dropHint = signal<string | null>(null);

  readonly filteredInspirations = computed(() => {
    const filter = this.inspoFilter();
    if (filter === 'all') {
      return this.inspirations;
    }
    return this.inspirations.filter((item) => item.kind === filter);
  });

  readonly activeStyleCount = computed(() => this.activeStyles().size);

  readonly pendingFactCheckCount = computed(
    () => this.factChecks.filter((item) => item.status === 'pending').length,
  );

  readonly tabCounts = computed(() => ({
    voice: this.activeStyleCount(),
    inspiration: this.inspirations.length,
    references: this.references().length,
    facts: this.knownFacts().length + this.pendingFactCheckCount(),
  }));

  setTab(tab: StrategyTuneTab): void {
    this.activeTab.set(tab);
  }

  isTab(tab: StrategyTuneTab): boolean {
    return this.activeTab() === tab;
  }

  tabCount(tab: StrategyTuneTab): number {
    const counts = this.tabCounts();
    return counts[tab];
  }

  setInspoFilter(filter: StrategyInspoFilter): void {
    this.inspoFilter.set(filter);
  }

  isInspoFilter(filter: StrategyInspoFilter): boolean {
    return this.inspoFilter() === filter;
  }

  toggleStyle(id: string): void {
    this.activeStyles.update((set) => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  isStyleActive(id: string): boolean {
    return this.activeStyles().has(id);
  }

  onNotesInput(event: Event): void {
    this.styleNotes.set((event.target as HTMLTextAreaElement).value);
  }

  onLinkUrlInput(event: Event): void {
    this.newLinkUrl.set((event.target as HTMLInputElement).value);
  }

  onLinkLabelInput(event: Event): void {
    this.newLinkLabel.set((event.target as HTMLInputElement).value);
  }

  addReference(): void {
    const url = this.newLinkUrl().trim();
    if (!url) {
      return;
    }
    const label = this.newLinkLabel().trim() || this.hostnameFromUrl(url);
    const accents = ['#5c8fb0', '#0a9396', '#c45c26', '#5c6bc0', '#8b7355'];
    this.references.update((list) => [
      ...list,
      {
        id: `ref-${Date.now()}`,
        url,
        label,
        note: 'Added for tone or structure reference',
        accent: accents[list.length % accents.length],
      },
    ]);
    this.newLinkUrl.set('');
    this.newLinkLabel.set('');
  }

  removeReference(id: string): void {
    this.references.update((list) => list.filter((r) => r.id !== id));
  }

  onFactCategoryChange(event: Event): void {
    this.newFactCategory.set((event.target as HTMLSelectElement).value as StrategyTuneKnownFactCategory);
  }

  onFactStatementInput(event: Event): void {
    this.newFactStatement.set((event.target as HTMLTextAreaElement).value);
  }

  onFactSourceInput(event: Event): void {
    this.newFactSource.set((event.target as HTMLInputElement).value);
  }

  addKnownFact(): void {
    const statement = this.newFactStatement().trim();
    if (!statement) {
      return;
    }
    const source = this.newFactSource().trim();
    this.knownFacts.update((list) => [
      ...list,
      {
        id: `kf-${Date.now()}`,
        category: this.newFactCategory(),
        statement,
        ...(source ? { source } : {}),
      },
    ]);
    this.newFactStatement.set('');
    this.newFactSource.set('');
  }

  removeKnownFact(id: string): void {
    this.knownFacts.update((list) => list.filter((f) => f.id !== id));
  }

  knownFactCategoryLabel(category: StrategyTuneKnownFactCategory): string {
    return this.knownFactCategories.find((item) => item.id === category)?.label ?? category;
  }

  factCheckStatusLabel(status: StrategyTuneFactCheckStatus): string {
    if (status === 'confirmed') return 'Confirmed';
    if (status === 'dismissed') return 'Dismissed';
    return 'Needs review';
  }

  factCheckCategoryLabel(check: StrategyTuneFactCheck): string {
    return this.factCheckCategoryLabels[check.category];
  }

  onDropZoneClick(): void {
    this.dropHint.set('Upload mock — wire to asset storage in a later pass.');
    setTimeout(() => this.dropHint.set(null), 2400);
  }

  inspirationKindLabel(item: StrategyTuneInspiration): string {
    if (item.kind === 'pdf') return 'PDF';
    if (item.kind === 'link') return 'Link';
    return 'Image';
  }

  referenceHost(url: string): string {
    try {
      return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }

  private hostnameFromUrl(url: string): string {
    return this.referenceHost(url);
  }
}
