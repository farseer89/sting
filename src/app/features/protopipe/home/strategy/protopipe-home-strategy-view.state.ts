import { Injectable, signal } from '@angular/core';
import type { ProtopipeContentPlanCalendarItem, ProtopipeSiteContentPlan } from '@hive/contracts';
import type { StrategyVisualView } from './strategy-visual-view';

@Injectable()
export class ProtopipeHomeStrategyViewState {
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

  openArticle(item: ProtopipeContentPlanCalendarItem): void {
    this._selectedArticle.set(item);
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
