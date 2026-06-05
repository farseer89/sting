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
import { ActivatedRoute, Router } from '@angular/router';
import type { ProtopipeSiteContentPlan } from '@hive/contracts';
import { ContentPlanStore } from '../../content-plan/content-plan.store';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { MOCK_STRATEGY_PLAN } from './strategy.mock';
import { parseStrategyLayout, type StrategyLayoutId } from './strategy.helpers';
import { ProtopipeHomeStrategyViewState } from './protopipe-home-strategy-view.state';
import { StrategyLayoutAComponent } from './strategy-layout-a.component';
import { StrategyLayoutBComponent } from './strategy-layout-b.component';
import { StrategyLayoutCComponent } from './strategy-layout-c.component';

@Component({
  selector: 'app-protopipe-home-strategy',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StrategyLayoutAComponent, StrategyLayoutBComponent, StrategyLayoutCComponent],
  templateUrl: './protopipe-home-strategy.component.html',
  styleUrl: './protopipe-home-strategy.component.scss',
})
export class ProtopipeHomeStrategyComponent implements OnInit {
  private readonly store = inject(ContentPlanStore);
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly viewState = inject(ProtopipeHomeStrategyViewState);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly siteLabel = signal('');
  readonly layout = signal<StrategyLayoutId>('a');
  /** Dev-only: explicit mock preview. Live plan is default when a run exists. */
  readonly useMockPreview = signal(false);

  readonly isRunning = this.store.isRunning;
  readonly starting = this.store.starting;
  readonly loading = this.store.loading;
  readonly isComplete = this.store.isComplete;
  readonly hasFailed = this.store.hasFailed;
  readonly error = this.store.error;
  readonly currentStep = this.store.currentStep;

  readonly displayPlan = computed<ProtopipeSiteContentPlan>(() => {
    if (this.useMockPreview()) return MOCK_STRATEGY_PLAN;
    return this.store.plan() ?? MOCK_STRATEGY_PLAN;
  });

  readonly showLoading = computed(
    () =>
      !this.useMockPreview() &&
      (this.loading() || this.starting()) &&
      !this.store.plan(),
  );

  readonly showBuildingBanner = computed(
    () => !this.useMockPreview() && this.isRunning() && !!this.store.plan(),
  );

  readonly buildingStageLabel = computed(() => {
    const step = this.currentStep();
    if (!step || step === 'done') return 'Building your strategy…';
    const labels: Record<string, string> = {
      audit: 'Auditing your site',
      score_tier: 'Scoring keywords',
      cluster: 'Grouping topics',
      deep_scan: 'Deep-scanning focus keywords',
      unify: 'Building your calendar',
    };
    return labels[step] ?? 'Building your strategy…';
  });

  readonly showResults = computed(() => {
    if (this.useMockPreview()) return true;
    if (this.hasFailed()) return false;
    return this.isComplete() || this.isRunning() || !!this.store.plan();
  });

  constructor() {
    effect(() => {
      this.viewState.setPlan(this.displayPlan());
      this.viewState.setSiteLabel(this.siteLabel());
    });
  }

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.store.stopPolling());

    const layoutParam = this.route.snapshot.queryParamMap.get('strategyLayout');
    this.layout.set(parseStrategyLayout(layoutParam));

    void this.bootstrap();
  }

  setLayout(id: StrategyLayoutId): void {
    this.layout.set(id);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { strategyLayout: id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  toggleMockPreview(): void {
    this.useMockPreview.update((v) => !v);
  }

  retry(): void {
    void this.store.generate();
  }

  private async bootstrap(): Promise<void> {
    await this.strategy.ensureLoaded();
    const site = this.strategy.site();
    this.siteLabel.set(site?.hostname?.trim() || site?.displayName?.trim() || '');
    const summary = this.strategy.strategy().summary.trim();
    this.viewState.setStrategySummary(
      summary ||
        'Live wedding painter specializing in destination ceremonies across Italy and the Mediterranean.',
    );

    const siteId = this.strategy.siteId();
    if (siteId) {
      this.store.setSiteId(siteId);
      await this.store.loadLatest();
      const live = this.store.plan();
      if (
        live &&
        (live.status === 'pending' || live.status === 'running' || live.status === 'complete')
      ) {
        this.useMockPreview.set(false);
      }
    }
  }
}
