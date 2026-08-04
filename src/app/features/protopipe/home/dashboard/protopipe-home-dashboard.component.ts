import { ChangeDetectionStrategy, Component, OnInit, computed, inject, output } from '@angular/core';
import { ProtopipeOnboardingStateService } from '../../onboarding/protopipe-onboarding-state.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { ProtopipeKeywordPickerStore } from '../keyword-picker/protopipe-keyword-picker.store';
import { ProtopipeHomeThinkerViewState } from '../protopipe-home-thinker-view.state';

type DashboardTarget = 'keywords' | 'strategy' | 'mentions-book' | 'build-book';

@Component({
  selector: 'app-protopipe-home-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-home-dashboard.component.html',
  styleUrl: './protopipe-home-dashboard.component.scss',
})
export class ProtopipeHomeDashboardComponent implements OnInit {
  private readonly onboarding = inject(ProtopipeOnboardingStateService);
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly keywordStore = inject(ProtopipeKeywordPickerStore);
  private readonly thinkerView = inject(ProtopipeHomeThinkerViewState);

  readonly open = output<DashboardTarget>();

  readonly dataForSeoStatus = this.strategy.dataForSeoStatus;
  readonly spyFuStatus = this.strategy.spyFuStatus;
  readonly providerLoading = this.strategy.dataForSeoTesting;
  readonly providerError = this.strategy.dataForSeoTestError;
  readonly discoveryProgress = this.keywordStore.discoveryProgress;
  readonly discoveryProgressPercent = this.keywordStore.discoveryProgressPercent;
  readonly run = this.thinkerView.discoveryRun;

  readonly onboardingDone = computed(() => this.onboarding.onboardingCompleted());
  readonly baselineReady = computed(() => {
    const artifacts = this.run()?.artifacts as
      | { marketBaseline?: unknown; marketBaselineReadyAt?: string }
      | undefined;
    return Boolean(artifacts?.marketBaseline || artifacts?.marketBaselineReadyAt);
  });
  readonly keywordResearchReady = computed(() => {
    const run = this.run();
    if (!run) return false;
    const artifacts = run.artifacts as
      | { scoredCandidates?: unknown[]; suggestedAvatars?: unknown[] }
      | undefined;
    return (
      run.status === 'ready' ||
      run.status === 'confirmed' ||
      Boolean(artifacts?.scoredCandidates?.length && artifacts?.suggestedAvatars?.length)
    );
  });
  readonly keywordPlanConfirmed = computed(
    () => this.run()?.status === 'confirmed' || this.strategy.keywords().length > 0,
  );
  readonly marketStatus = computed(() => {
    if (!this.onboardingDone()) return 'Complete onboarding to start market discovery.';
    if (this.keywordResearchReady()) return 'Keyword research is ready for review.';
    if (this.baselineReady()) return 'Market baseline is ready. Full keyword research is still running.';
    if (this.run()) return this.discoveryProgress() ?? 'Discovery is running.';
    return 'Discovery will start when onboarding is complete.';
  });

  ngOnInit(): void {
    void this.strategy.refreshMarketProviderStatus();
  }

  providerLabel(connected: boolean | undefined, configured: boolean | undefined): string {
    if (configured === false) return 'Not configured';
    if (connected) return 'Connected';
    return 'Needs attention';
  }

  openTarget(target: DashboardTarget): void {
    this.open.emit(target);
  }
}
