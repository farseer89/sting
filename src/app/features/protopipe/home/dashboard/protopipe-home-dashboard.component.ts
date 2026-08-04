import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  output,
} from '@angular/core';
import { ProtopipeOnboardingStateService } from '../../onboarding/protopipe-onboarding-state.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { ProtopipeKeywordPickerStore } from '../keyword-picker/protopipe-keyword-picker.store';
import {
  buildCollectedChips,
  buildCollectedFields,
  buildMarketSourceRows,
  dashboardMarketStatus,
  keywordPlannerLabel,
} from './protopipe-home-dashboard.view-model';

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

  readonly open = output<DashboardTarget>();

  readonly dataForSeoStatus = this.strategy.dataForSeoStatus;
  readonly spyFuStatus = this.strategy.spyFuStatus;
  readonly providerLoading = this.strategy.dataForSeoTesting;
  readonly providerError = this.strategy.dataForSeoTestError;
  readonly discoveryProgress = this.keywordStore.discoveryProgress;
  readonly discoveryProgressPercent = this.keywordStore.discoveryProgressPercent;
  readonly discoveryStatus = this.keywordStore.dashboardDiscoveryStatus;
  readonly marketBaseline = this.keywordStore.dashboardMarketBaseline;

  readonly onboardingDone = computed(() => this.onboarding.onboardingCompleted());
  readonly baselineReady = this.keywordStore.dashboardHasMarketBaseline;
  readonly keywordResearchReady = this.keywordStore.dashboardKeywordResearchReady;
  readonly keywordPlanConfirmed = computed(
    () => this.discoveryStatus() === 'confirmed' || this.strategy.keywords().length > 0,
  );
  readonly businessName = computed(
    () =>
      this.strategy.site()?.displayName?.trim() || this.strategy.site()?.hostname || 'your market',
  );
  readonly collectedFields = computed(() =>
    buildCollectedFields(this.strategy.site(), this.strategy.onboardingProfile()),
  );
  readonly collectedChips = computed(() => buildCollectedChips(this.strategy.onboardingProfile()));
  readonly marketSourceRows = computed(() => buildMarketSourceRows(this.marketBaseline()));
  readonly marketStatus = computed(() =>
    dashboardMarketStatus({
      onboardingDone: this.onboardingDone(),
      keywordPlanConfirmed: this.keywordPlanConfirmed(),
      keywordResearchReady: this.keywordResearchReady(),
      baselineReady: this.baselineReady(),
      loading: this.keywordStore.loading(),
      discoveryProgress: this.discoveryProgress(),
    }),
  );
  readonly keywordPlannerLabel = computed(() =>
    keywordPlannerLabel({
      keywordPlanConfirmed: this.keywordPlanConfirmed(),
      keywordResearchReady: this.keywordResearchReady(),
      baselineReady: this.baselineReady(),
      discoveryFailed: this.keywordStore.dashboardDiscoveryFailed(),
    }),
  );

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
