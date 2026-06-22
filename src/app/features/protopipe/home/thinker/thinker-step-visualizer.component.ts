import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import type { StepVisualizerView, VisualizerBlock, VisualizerTab } from './article-run-visualizer.util';

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

  constructor() {
    effect(() => {
      const v = this.view();
      const tabs = v.tabs;
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
