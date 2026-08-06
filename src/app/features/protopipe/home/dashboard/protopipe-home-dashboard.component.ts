import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import type { KeywordRankingRow } from '@hive/contracts';
import { firstValueFrom } from 'rxjs';
import { ContentPlanStore } from '../../content-plan/content-plan.store';
import { ProtopipeOnboardingStateService } from '../../onboarding/protopipe-onboarding-state.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { ShireApiService } from '../../shire/shire-api.service';
import { ProtopipeKeywordPickerStore } from '../keyword-picker/protopipe-keyword-picker.store';
import {
  buildCompetitors,
  buildCustomerCards,
  buildDashboardSteps,
  buildKeywordBaselineRows,
  buildWorkspaceCards,
  dashboardMarketStatus,
  type DashboardStepTarget,
} from './protopipe-home-dashboard.view-model';

interface DashboardContentPlanInfo {
  status: string;
  title: string;
  hint: string;
  items: { label: string; value: string }[];
}

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
  private readonly shireApi = inject(ShireApiService);

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
  readonly baselineRows = computed(() => buildKeywordBaselineRows(this.marketBaseline()));
  readonly baselineSignalCount = computed(() => this.baselineRows().length);
  readonly rankingRows = signal<KeywordRankingRow[]>([]);
  readonly rankingSignalCount = computed(() => this.rankingRows().length);
  readonly topBaselinePhrase = computed(() => this.baselineRows()[0]?.phrase ?? null);
  readonly competitors = computed(() => buildCompetitors(this.strategy.onboardingProfile()));
  readonly customerCards = computed(() => buildCustomerCards(this.strategy.onboardingProfile()));
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
      baselineReady: this.rankingSignalCount() > 0,
      discoveryFailed: this.keywordStore.dashboardDiscoveryFailed(),
      contentPlanComplete: this.contentPlan.isComplete(),
      contentPlanRunning: this.contentPlan.isRunning(),
      keywordCount: this.strategy.keywords().length,
      baselineSignalCount: this.rankingSignalCount(),
    }),
  );
  readonly workspaceCards = computed(() =>
    buildWorkspaceCards({
      site: this.strategy.site(),
      profile: this.strategy.onboardingProfile(),
      baselineSignalCount: this.baselineSignalCount(),
      topBaselinePhrase: this.topBaselinePhrase(),
      keywordResearchInProgress: this.keywordResearchInProgress(),
    }),
  );
  readonly contentPlanInfo = computed<DashboardContentPlanInfo>(() => {
    const plan = this.contentPlan.plan();
    if (!plan) {
      return {
        status: this.keywordPlanConfirmed() ? 'Ready' : 'Waiting on keywords',
        title: this.keywordPlanConfirmed()
          ? 'Content plan is ready to generate'
          : 'Content plan unlocks after keywords',
        hint: this.keywordPlanConfirmed()
          ? 'Generate a calendar from your confirmed keyword strategy.'
          : 'Confirm keywords to turn research into pillars, articles, and a calendar.',
        items: [
          { label: 'Source', value: this.keywordPlanConfirmed() ? 'Confirmed keywords' : 'Pending' },
          { label: 'Output', value: 'Pillars + calendar' },
        ],
      };
    }

    const scheduledCount = plan.calendar.filter((item) => item.proposedPublishAt).length;
    const backlogCount = plan.backlog?.length ?? 0;
    const status = plan.status === 'complete' ? 'Ready' : this.formatPlanStatus(plan.status);

    return {
      status,
      title: plan.narrative?.headline?.trim() || 'Content plan generated',
      hint:
        plan.narrative?.why?.trim() ||
        (this.contentPlan.isRunning()
          ? 'Building article topics and a publishing calendar from your keyword plan.'
          : 'Review the recommended content pillars and calendar in Strategy.'),
      items: [
        { label: 'Pillars', value: `${plan.pillars.length}` },
        { label: 'Calendar', value: `${scheduledCount} scheduled` },
        { label: 'Backlog', value: `${backlogCount}` },
      ],
    };
  });

  ngOnInit(): void {
    void this.keywordStore.load();
    const siteId = this.strategy.siteId();
    if (siteId) {
      this.contentPlan.setSiteId(siteId);
      void this.contentPlan.loadLatest();
      void this.loadRankingsSummary(siteId);
    }
  }

  openStep(target: DashboardStepTarget | null): void {
    if (!target) return;
    this.open.emit(target);
  }

  private async loadRankingsSummary(siteId: string): Promise<void> {
    try {
      const response = await firstValueFrom(this.shireApi.listRankings$(siteId));
      this.rankingRows.set(response.rankings);
    } catch {
      this.rankingRows.set([]);
    }
  }

  private formatPlanStatus(status: string): string {
    return status
      .split(/[_-]/)
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(' ');
  }
}
