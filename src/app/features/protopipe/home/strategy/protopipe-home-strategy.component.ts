import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import type { ProtopipeSiteContentPlan } from '@hive/contracts';
import { ContentPlanStore } from '../../content-plan/content-plan.store';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { ProtopipeHomeStrategyViewState } from './protopipe-home-strategy-view.state';
import {
  ProtopipeHomeStrategyBinderComponent,
  type StrategySection,
} from '../strategy-binder/protopipe-home-strategy-binder.component';
import { ProtopipeHomeStrategyDashboardComponent } from '../strategy-dashboard/protopipe-home-strategy-dashboard.component';

type StrategyShellView = 'dashboard' | 'detail';

@Component({
  selector: 'app-protopipe-home-strategy',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProtopipeHomeStrategyBinderComponent, ProtopipeHomeStrategyDashboardComponent],
  templateUrl: './protopipe-home-strategy.component.html',
  styleUrl: './protopipe-home-strategy.component.scss',
})
export class ProtopipeHomeStrategyComponent implements OnInit {
  private readonly store = inject(ContentPlanStore);
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly viewState = inject(ProtopipeHomeStrategyViewState);
  private readonly destroyRef = inject(DestroyRef);

  readonly siteLabel = signal('');
  readonly strategySummary = signal('');
  readonly shellView = signal<StrategyShellView>('dashboard');
  readonly activeSection = signal<StrategySection>('overview');

  readonly isRunning = this.store.isRunning;
  readonly starting = this.store.starting;
  readonly loading = this.store.loading;
  readonly isComplete = this.store.isComplete;
  readonly hasFailed = this.store.hasFailed;
  readonly isStalled = this.store.isStalled;
  readonly needsBuildRestart = this.store.needsBuildRestart;
  readonly error = this.store.error;
  readonly planError = this.store.planError;
  readonly progress = this.store.progress;
  readonly currentStep = this.store.currentStep;

  readonly displayPlan = computed<ProtopipeSiteContentPlan | null>(() => this.store.plan());

  readonly showLoading = computed(
    () => (this.loading() || this.starting()) && !this.store.plan(),
  );

  readonly showEmpty = computed(
    () =>
      !this.showLoading() &&
      !this.displayPlan() &&
      !this.loading() &&
      !this.starting(),
  );

  readonly showBuildProblem = computed(
    () => this.needsBuildRestart() && Boolean(this.displayPlan()),
  );

  readonly showBuildingBanner = computed(
    () => this.isRunning() && !!this.store.plan() && !this.showBuildProblem(),
  );

  readonly buildingStageLabel = computed(() => {
    const step = this.currentStep();
    const progress = this.progress();
    if (!step || step === 'done') return 'Building your strategy…';
    const labels: Record<string, string> = {
      audit: 'Auditing your site',
      score_tier: 'Scoring keywords',
      cluster: 'Grouping topics',
      deep_scan: 'Deep-scanning focus keywords',
      strategy_intel: 'Warming strategy intel',
      unify: 'Building your calendar',
    };
    const base = labels[step] ?? 'Building your strategy…';
    if (step === 'deep_scan' && progress && progress.total > 0) {
      return `${base} (${progress.scanned}/${progress.total})`;
    }
    return base;
  });

  readonly showResults = computed(() => Boolean(this.displayPlan()));

  readonly buildProblemMessage = computed(() => {
    if (this.planError()) return this.planError()!;
    if (this.isStalled()) {
      return 'This build stopped making progress. Restart to try again.';
    }
    if (this.error()) return this.error()!;
    return 'Something went wrong while building your strategy.';
  });

  readonly buildActionLabel = computed(() =>
    this.displayPlan() ? 'Rebuild strategy' : 'Build strategy',
  );

  constructor() {
    effect(() => {
      this.viewState.setPlan(this.displayPlan());
      this.viewState.setSiteLabel(this.siteLabel());
    });
  }

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.store.stopPolling());
    void this.bootstrap();
  }

  retry(): void {
    void this.restartBuild();
  }

  buildStrategy(): void {
    void this.restartBuild();
  }

  restartBuild(): void {
    void this.store.restartBuild();
  }

  openSection(section: StrategySection): void {
    this.activeSection.set(section);
    this.shellView.set('detail');
  }

  backToDashboard(): void {
    this.shellView.set('dashboard');
    this.activeSection.set('overview');
  }

  viewRunbook(): void {
    this.viewState.openStrategyBuildRun();
  }

  private async bootstrap(): Promise<void> {
    await this.strategy.ensureLoaded();
    const site = this.strategy.site();
    this.siteLabel.set(site?.hostname?.trim() || site?.displayName?.trim() || '');
    const summary = this.strategy.strategy().summary.trim();
    this.viewState.setStrategySummary(summary);
    this.strategySummary.set(summary);

    const siteId = this.strategy.siteId();
    if (siteId) {
      this.store.setSiteId(siteId);
      await this.store.loadLatest();
    }
  }
}
