import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  CONTENT_CALENDAR,
  CONTENT_DAYS,
  CONTENT_MONITOR,
  CONTENT_PIECES,
  CONTENT_PLANS,
  CONTENT_ROW_MODES,
  CONTENT_STAGES,
  CONTENT_VIEW_MODES,
  COVERAGE_STATUS_LABELS,
  KEYWORD_COVERAGE,
  POSTIT_NOTES,
  STATUS_LABELS,
  TRAFFIC_SPARKLINE,
  type ContentPiece,
  type ContentPlan,
  type ContentStage,
} from './void-premiere-scheduler.mock';

@Component({
  selector: 'app-void-premiere-scheduler',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './void-premiere-scheduler.component.html',
  styleUrl: './void-premiere-scheduler.component.scss',
})
export class VoidPremiereSchedulerComponent {
  readonly days = CONTENT_DAYS;
  readonly plans = CONTENT_PLANS;
  readonly stages = CONTENT_STAGES;
  readonly pieces = CONTENT_PIECES;
  readonly monitorCards = CONTENT_MONITOR;
  readonly keywordCoverage = KEYWORD_COVERAGE;
  readonly calendar = CONTENT_CALENDAR;
  readonly notes = POSTIT_NOTES;
  readonly viewModes = CONTENT_VIEW_MODES;
  readonly rowModes = CONTENT_ROW_MODES;
  readonly trafficSparkline = TRAFFIC_SPARKLINE;
  readonly statusLabels = STATUS_LABELS;
  readonly coverageLabels = COVERAGE_STATUS_LABELS;

  readonly focusedPlanId = signal('cp1');
  readonly viewMode = signal<'week' | 'month'>('week');
  readonly rowMode = signal<'pipeline' | 'articles' | 'traffic'>('articles');
  readonly selectedStageId = signal('s2');
  readonly playheadPct = signal(18);
  readonly editMode = signal(false);

  focusedPlan(): ContentPlan {
    return this.plans.find((p) => p.id === this.focusedPlanId()) ?? this.plans[0];
  }

  stagesForPlan(planId: string): ContentStage[] {
    return this.stages.filter((s) => s.planId === planId);
  }

  piecesForPlan(planId: string): ContentPiece[] {
    return this.pieces.filter((p) => p.planId === planId);
  }

  selectStage(id: string): void {
    this.selectedStageId.set(id);
  }

  isStageSelected(id: string): boolean {
    return this.selectedStageId() === id;
  }

  setViewMode(id: 'week' | 'month'): void {
    this.viewMode.set(id);
  }

  setRowMode(id: 'pipeline' | 'articles' | 'traffic'): void {
    this.rowMode.set(id);
  }

  toggleEditMode(): void {
    this.editMode.update((v) => !v);
  }

  clearFocus(): void {
    this.focusedPlanId.set('');
  }

  focusPlan(plan: ContentPlan): void {
    this.focusedPlanId.set(plan.id);
  }

  isFocused(): boolean {
    return !!this.focusedPlanId();
  }

  sparkHeight(value: number): number {
    const max = Math.max(...this.trafficSparkline, 1);
    return Math.max(8, (value / max) * 100);
  }

  truncate(text: string, max: number): string {
    if (text.length <= max) {
      return text;
    }
    return `${text.slice(0, max - 1)}…`;
  }
}
