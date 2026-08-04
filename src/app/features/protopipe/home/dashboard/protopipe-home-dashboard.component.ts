import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  output,
} from '@angular/core';
import { ContentPlanStore } from '../../content-plan/content-plan.store';
import { ProtopipeOnboardingStateService } from '../../onboarding/protopipe-onboarding-state.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { ProtopipeKeywordPickerStore } from '../keyword-picker/protopipe-keyword-picker.store';
import {
  buildBusinessInfo,
  buildCompetitors,
  buildDashboardSteps,
  buildKeywordBaselineRows,
  dashboardMarketStatus,
  type DashboardStepTarget,
} from './protopipe-home-dashboard.view-model';

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
  private readonly contentPlan = inject(ContentPlanStore);

  readonly open = output<DashboardStepTarget>();

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
      this.strategy.site()?.displayName?.trim() ||
      this.strategy.site()?.hostname ||
      'Your workspace',
  );
  readonly businessInfo = computed(() =>
    buildBusinessInfo(this.strategy.site(), this.strategy.onboardingProfile()),
  );
  readonly competitors = computed(() => buildCompetitors(this.strategy.onboardingProfile()));
  readonly baselineRows = computed(() => buildKeywordBaselineRows(this.marketBaseline()));
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
  readonly keywordResearchInProgress = computed(
    () =>
      this.onboardingDone() &&
      !this.keywordResearchReady() &&
      !this.keywordPlanConfirmed() &&
      !this.keywordStore.dashboardDiscoveryFailed(),
  );
  readonly stepCards = computed(() =>
    buildDashboardSteps({
      onboardingDone: this.onboardingDone(),
      keywordPlanConfirmed: this.keywordPlanConfirmed(),
      keywordResearchReady: this.keywordResearchReady(),
      keywordResearchInProgress: this.keywordResearchInProgress(),
      baselineReady: this.baselineReady(),
      discoveryFailed: this.keywordStore.dashboardDiscoveryFailed(),
      contentPlanComplete: this.contentPlan.isComplete(),
      contentPlanRunning: this.contentPlan.isRunning(),
    }),
  );

  ngOnInit(): void {
    void this.keywordStore.load();
    const siteId = this.strategy.siteId();
    if (siteId) {
      this.contentPlan.setSiteId(siteId);
      void this.contentPlan.loadLatest();
    }
  }

  openStep(target: DashboardStepTarget | null): void {
    if (!target) return;
    this.open.emit(target);
  }
}
