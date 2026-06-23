import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import type { LeadTableRow, StepVisualizerView, VisualizerBlock, VisualizerTab } from './article-run-visualizer.util';

@Component({
  selector: 'app-thinker-step-visualizer',
  standalone: true,
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './thinker-step-visualizer.component.html',
  styleUrl: './thinker-step-visualizer.component.scss',
})
export class ThinkerStepVisualizerComponent {
  readonly view = input.required<StepVisualizerView>();
  /** When set, parent controls tab selection (e.g. left-rail aspect nav). */
  readonly selectedTabId = input<string | null>(null);
  /** Hide horizontal tabs when the binder side nav drives section selection. */
  readonly hideTabNav = input(false);

  readonly activeTabId = signal<string>('thesis');
  private tabKey = '';

  /** Names of selected leads. Resets when the view title changes (step navigation). */
  readonly selectedLeadNames = signal<Set<string>>(new Set());

  readonly effectiveTabId = computed(() => this.selectedTabId() ?? this.activeTabId());

  readonly activeTab = computed((): VisualizerTab | undefined => {
    const tabs = this.view().tabs;
    if (!tabs?.length) return undefined;
    return tabs.find((t) => t.id === this.effectiveTabId()) ?? tabs[0];
  });

  readonly bodyBlocks = computed((): VisualizerBlock[] => {
    const tab = this.activeTab();
    if (tab) return tab.blocks;
    return this.view().blocks;
  });

  readonly tabEmptyMessage = computed((): string | undefined => {
    const tab = this.activeTab();
    if (!tab || tab.blocks.length) return undefined;
    return tab.emptyMessage;
  });

  readonly allLeads = computed((): LeadTableRow[] =>
    this.bodyBlocks().flatMap((b) => b.leads ?? []),
  );

  readonly selectedCount = computed(() => this.selectedLeadNames().size);

  readonly allSelected = computed(() => {
    const all = this.allLeads();
    if (!all.length) return false;
    const sel = this.selectedLeadNames();
    return all.every((l) => sel.has(l.name));
  });

  constructor() {
    effect(() => {
      const v = this.view();
      const tabs = v.tabs;

      // Reset selection whenever the step view changes.
      this.selectedLeadNames.set(new Set());

      if (!tabs?.length) return;
      const key = tabs.map((t) => t.id).join('|');
      if (key === this.tabKey) return;
      this.tabKey = key;
      const defaultId = v.defaultTabId ?? tabs[0]?.id ?? 'thesis';
      this.activeTabId.set(defaultId);
    });
  }

  selectTab(id: string): void {
    this.activeTabId.set(id);
  }

  toggleLead(name: string): void {
    this.selectedLeadNames.update((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  toggleAll(): void {
    if (this.allSelected()) {
      this.selectedLeadNames.set(new Set());
    } else {
      this.selectedLeadNames.set(new Set(this.allLeads().map((l) => l.name)));
    }
  }

  clearSelection(): void {
    this.selectedLeadNames.set(new Set());
  }

  copySelected(): void {
    const leads = this.allLeads().filter((l) => this.selectedLeadNames().has(l.name));
    const lines = leads.map((l) => {
      const parts = [l.name];
      if (l.address) parts.push(l.address);
      if (l.websiteUri) parts.push(l.websiteUri);
      return parts.join('\t');
    });
    void navigator.clipboard.writeText(lines.join('\n'));
  }

  isLeadSelected(name: string): boolean {
    return this.selectedLeadNames().has(name);
  }

  scoreWidth(score?: number): string {
    if (score == null || !Number.isFinite(score)) return '0%';
    return `${Math.max(0, Math.min(100, score))}%`;
  }

  scoreTone(score?: number): string {
    if (score == null) return 'neutral';
    if (score >= 80) return 'good';
    if (score >= 60) return 'mid';
    return 'low';
  }
}
