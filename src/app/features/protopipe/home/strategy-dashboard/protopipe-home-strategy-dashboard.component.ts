import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import type { ProtopipeSiteContentPlan } from '@hive/contracts';
import {
  mapStrategyBinderView,
} from '../strategy-binder/strategy-binder.mapper';
import type { StrategySection } from '../strategy-binder/protopipe-home-strategy-binder.component';
import {
  buildStrategyCalendarRows,
  buildStrategyPillarRows,
  buildStrategyStepCards,
  buildStrategySummaryCards,
  buildStrategyWinRows,
  buildStrategyWorkspaceCards,
  strategyDashboardStatusLabel,
  strategyPlanCapturedAt,
} from './protopipe-home-strategy-dashboard.view-model';

@Component({
  selector: 'app-protopipe-home-strategy-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-home-strategy-dashboard.component.html',
  styleUrl: './protopipe-home-strategy-dashboard.component.scss',
})
export class ProtopipeHomeStrategyDashboardComponent {
  readonly plan = input.required<ProtopipeSiteContentPlan>();
  readonly siteLabel = input('');
  readonly strategySummary = input('');
  readonly isRunning = input(false);
  readonly canBuild = input(true);
  readonly buildLabel = input('Build strategy');
  readonly statusDetail = input<string | null>(null);

  readonly openSection = output<StrategySection>();
  readonly build = output<void>();
  readonly viewRunbook = output<void>();

  readonly vm = computed(() =>
    mapStrategyBinderView(this.plan(), this.siteLabel(), this.strategySummary()),
  );

  readonly summaryCards = computed(() => buildStrategySummaryCards(this.vm()));
  readonly stepCards = computed(() => buildStrategyStepCards(this.vm()));
  readonly workspaceCards = computed(() => buildStrategyWorkspaceCards(this.vm()));
  readonly calendarRows = computed(() => buildStrategyCalendarRows(this.vm()));
  readonly pillarRows = computed(() => buildStrategyPillarRows(this.vm()));
  readonly winRows = computed(() => buildStrategyWinRows(this.vm()));
  readonly headline = computed(() => this.vm().narrative.headline);
  readonly lede = computed(() => this.vm().narrative.why);
  readonly capturedAt = computed(() => strategyPlanCapturedAt(this.plan()));

  readonly statusLabel = computed(() =>
    strategyDashboardStatusLabel({
      isRunning: this.isRunning(),
      isComplete: Boolean(this.plan()),
      hasFailed: false,
      capturedAt: this.capturedAt(),
    }),
  );

  open(target: StrategySection): void {
    this.openSection.emit(target);
  }
}
