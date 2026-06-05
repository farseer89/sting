import { Injectable, inject, signal } from '@angular/core';
import type { ProtopipeContentPlanCalendarItem, ProtopipeSiteContentPlan } from '@hive/contracts';
import type { SpokeNode } from '../../lab/void-dashboard/void-content-spoke.mock';
import { ProtopipeHomeSidePanelService } from '../protopipe-home-side-panel.service';
import { ProtopipeHomeWriterViewState } from '../protopipe-home-writer-view.state';
import { calendarItemForPhrase, calendarItemFromSpokeNode } from './strategy.helpers';
import type { StrategyVisualView } from './strategy-visual-view';

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

  selectArticle(item: ProtopipeContentPlanCalendarItem): void {
    this.writerView.clearPanel();
    this._selectedArticle.set(item);
    this.sidePanel.ensureOpen();
  }

  openArticle(item: ProtopipeContentPlanCalendarItem): void {
    this.selectArticle(item);
  }

  selectFromSpokeNode(plan: ProtopipeSiteContentPlan, node: SpokeNode): void {
    const item = calendarItemFromSpokeNode(plan, node);
    if (item) {
      this.selectArticle(item);
    }
  }

  selectFromKeywordPhrase(plan: ProtopipeSiteContentPlan, phrase: string): void {
    const item = calendarItemForPhrase(plan, phrase);
    if (item) {
      this.selectArticle(item);
    }
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
}
