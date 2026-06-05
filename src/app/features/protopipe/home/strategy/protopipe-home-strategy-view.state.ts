import { Injectable, inject, signal } from '@angular/core';
import type { ProtopipeContentPlanCalendarItem, ProtopipeSiteContentPlan } from '@hive/contracts';
import type { SpokeNode } from '../../lab/void-dashboard/void-content-spoke.mock';
import { ProtopipeHomeSidePanelService } from '../protopipe-home-side-panel.service';
import { ProtopipeHomeWriterViewState } from '../protopipe-home-writer-view.state';
import {
  calendarItemByKey,
  calendarItemForPhrase,
  calendarItemFromSpokeNode,
} from './strategy.helpers';
import type { StrategyVisualView } from './strategy-visual-view';

/**
 * Strategy selection + right-panel coordination.
 *
 * TROUBLESHOOT — panel visibility chain (all must be true for the slider to show):
 * 1. User is on home nav "Your strategy" → protopipe-user-home activeView() === 'strategy'
 * 2. ProtopipeHomeSidePanelService.open() === true (set here or via Brief toggle)
 * 3. protopipe-user-home template renders <app-protopipe-strategy-context-panel> in void__side-panel
 * 4. selectedArticle() set → context panel shows article block; null → strategy brief
 *
 * Brief button (strategy-hero) and article clicks must both call methods on this service
 * so they hit the same sidePanel instance provided by protopipe-user-home.
 */
@Injectable()
export class ProtopipeHomeStrategyViewState {
  private readonly sidePanel = inject(ProtopipeHomeSidePanelService);
  private readonly writerView = inject(ProtopipeHomeWriterViewState);

  private readonly _plan = signal<ProtopipeSiteContentPlan | null>(null);
  private readonly _siteLabel = signal('');
  private readonly _strategySummary = signal('');
  private readonly _selectedArticle = signal<ProtopipeContentPlanCalendarItem | null>(null);
  private readonly _visualView = signal<StrategyVisualView>('calendar');

  readonly plan = this._plan.asReadonly();
  readonly siteLabel = this._siteLabel.asReadonly();
  readonly strategySummary = this._strategySummary.asReadonly();
  readonly selectedArticle = this._selectedArticle.asReadonly();
  readonly visualView = this._visualView.asReadonly();

  setPlan(plan: ProtopipeSiteContentPlan | null): void {
    this._plan.set(plan);
  }

  setSiteLabel(label: string): void {
    this._siteLabel.set(label);
  }

  setStrategySummary(summary: string): void {
    this._strategySummary.set(summary);
  }

  /** Same right panel as Brief — shows strategy brief (no article selected). */
  openBriefPanel(): void {
    this.clearArticle();
    this.openStrategyPanel();
  }

  /** Brief button: toggle closed when brief is showing; otherwise open brief panel. */
  toggleBriefPanel(): void {
    this.writerView.clearPanel();
    if (this.sidePanel.open() && !this._selectedArticle()) {
      this.sidePanel.setOpen(false);
      return;
    }
    this.openBriefPanel();
  }

  /** Same right panel as Brief — shows article detail in app-protopipe-strategy-context-panel. */
  openArticlePanel(item: ProtopipeContentPlanCalendarItem): void {
    console.info('[strategy-map] 6 openArticlePanel attempt', { title: item.workingTitle });
    this.writerView.clearPanel();
    this._selectedArticle.set(item);
    this.openStrategyPanel();
    console.info('[strategy-map] 7 panel open result', {
      sidePanelOpen: this.sidePanel.open(),
      selectedArticle: this._selectedArticle()?.workingTitle ?? null,
    });
  }

  selectArticle(item: ProtopipeContentPlanCalendarItem): void {
    this.openArticlePanel(item);
  }

  openArticle(item: ProtopipeContentPlanCalendarItem): void {
    this.openArticlePanel(item);
  }

  selectFromSpokeNode(plan: ProtopipeSiteContentPlan, node: SpokeNode): void {
    const resolvedPlan = this._plan() ?? plan;
    console.info('[strategy-map] 5 resolving calendar item', {
      nodeKind: node.kind,
      nodeLabel: node.label,
      calendarItemKey: node.calendarItemKey,
      calendarCount: resolvedPlan.calendar.length,
    });
    const item = calendarItemFromSpokeNode(resolvedPlan, node);
    if (!item) {
      console.warn('[strategy-map] 5 FAILED — no calendar item matched', {
        nodeKind: node.kind,
        nodeLabel: node.label,
        calendarItemKey: node.calendarItemKey,
        calendarTitles: resolvedPlan.calendar.map((entry) => entry.workingTitle),
      });
      return;
    }
    console.info('[strategy-map] 5 resolved calendar item', { title: item.workingTitle });
    this.openArticlePanel(item);
  }

  selectFromKeywordPhrase(plan: ProtopipeSiteContentPlan, phrase: string): void {
    const resolvedPlan = this._plan() ?? plan;
    const item = calendarItemForPhrase(resolvedPlan, phrase);
    if (!item) {
      console.warn('[strategy-panel] Keyword row did not resolve to a scheduled article.', {
        phrase,
        calendarCount: resolvedPlan.calendar.length,
      });
      return;
    }
    this.openArticlePanel(item);
  }

  selectFromCalendarKey(plan: ProtopipeSiteContentPlan, itemKey: string): void {
    const resolvedPlan = this._plan() ?? plan;
    const item = calendarItemByKey(resolvedPlan, itemKey);
    if (!item) {
      console.warn('[strategy-panel] Calendar sticky did not resolve to a plan item.', { itemKey });
      return;
    }
    this.openArticlePanel(item);
  }

  clearArticle(): void {
    this._selectedArticle.set(null);
  }

  setVisualView(view: StrategyVisualView): void {
    if (this._visualView() === view) {
      return;
    }
    this._visualView.set(view);
  }

  isVisualView(view: StrategyVisualView): boolean {
    return this._visualView() === view;
  }

  /** Opens the home-scoped right panel (void__side-panel). Matches Brief button behavior. */
  private openStrategyPanel(): void {
    const wasOpen = this.sidePanel.open();
    this.sidePanel.setOpen(true);
    console.info('[strategy-map] 6b sidePanel.setOpen(true)', { wasOpen, nowOpen: this.sidePanel.open() });
  }
}
