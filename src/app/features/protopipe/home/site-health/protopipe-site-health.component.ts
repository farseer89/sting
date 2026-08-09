import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { HOME_KEYWORDS_PATH } from '../protopipe-home.routes';
import {
  alignmentPrerequisite,
  buildKeywordAlignmentSummaryCards,
  buildPageOptimizationSummaryCards,
  buildPageSpeedSummaryCards,
  buildSiteHealthSummaryCards,
  headingSummary,
  pageRows,
  pageOptimizationEmptyMessage,
  pageOptimizationRows,
  pageSpeedEmptyMessage,
  pageSpeedRows,
  refreshRows,
  schemaSummary,
  siteHealthTabs,
  sourceDescription,
  sourceLabel,
  winRows,
  type SiteHealthPageRow,
  type SiteHealthTab,
} from './protopipe-site-health.model';
import { PageOptimizationStore } from './page-optimization.store';
import { PageSpeedStore } from './page-speed.store';
import { SiteHealthStore } from './site-health.store';

@Component({
  selector: 'app-protopipe-site-health',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-site-health.component.html',
  styleUrl: './protopipe-site-health.component.scss',
})
export class ProtopipeSiteHealthComponent {
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly router = inject(Router);
  readonly store = inject(SiteHealthStore);
  readonly optimizationStore = inject(PageOptimizationStore);
  readonly speedStore = inject(PageSpeedStore);

  readonly activeTab = signal<SiteHealthTab>('overview');
  readonly selectedPage = signal<SiteHealthPageRow | null>(null);

  readonly audit = this.store.audit;
  readonly optimizationSnapshot = this.optimizationStore.snapshot;
  readonly speedSnapshot = this.speedStore.snapshot;
  readonly keywordCount = computed(() => this.strategy.keywords().length);
  readonly alignmentPrerequisite = computed(() =>
    alignmentPrerequisite({
      hasAudit: this.store.hasAudit(),
      keywordCount: this.keywordCount(),
    }),
  );
  readonly canStartOptimization = computed(
    () => this.store.hasAudit() && this.optimizationStore.canStart(),
  );
  readonly canStartPerformance = computed(() => this.store.hasAudit() && this.speedStore.canStart());
  readonly showAuditSummaryCards = computed(
    () => this.activeTab() !== 'optimization' && this.activeTab() !== 'performance',
  );
  readonly summaryCards = computed(() =>
    this.activeTab() === 'optimization'
      ? buildPageOptimizationSummaryCards(this.optimizationSnapshot()?.summary)
      : this.activeTab() === 'performance'
        ? buildPageSpeedSummaryCards(this.speedSnapshot()?.summary)
        : this.showAuditSummaryCards()
          ? buildSiteHealthSummaryCards(this.audit())
          : buildKeywordAlignmentSummaryCards(null),
  );
  readonly tabs = computed(() =>
    siteHealthTabs(this.audit(), this.optimizationSnapshot(), this.speedSnapshot()),
  );
  readonly optimizationRows = computed(() => pageOptimizationRows(this.optimizationSnapshot()));
  readonly speedRows = computed(() => pageSpeedRows(this.speedSnapshot()));
  readonly allPages = computed(() => pageRows(this.audit()?.pages));
  readonly refreshPages = computed(() => refreshRows(this.audit()));
  readonly wins = computed(() => winRows(this.audit()));
  readonly sourceLabel = computed(() => sourceLabel(this.audit()?.source));
  readonly sourceDescription = computed(() => sourceDescription(this.audit()));

  readonly visiblePages = computed(() => {
    if (this.activeTab() === 'refresh') return this.refreshPages();
    return this.allPages();
  });

  readonly emptyMessage = computed(() => {
    if (this.activeTab() === 'optimization') {
      return pageOptimizationEmptyMessage({
        loading: !this.optimizationStore.hasCheckedLatest(),
        hasSnapshot: this.optimizationStore.hasSnapshot(),
        hasAudit: this.store.hasAudit(),
      });
    }
    if (this.activeTab() === 'performance') {
      return pageSpeedEmptyMessage({
        loading: !this.speedStore.hasCheckedLatest(),
        hasSnapshot: this.speedStore.hasSnapshot(),
        hasAudit: this.store.hasAudit(),
      });
    }
    if (!this.store.hasCheckedLatest()) return 'Loading site health…';
    if (!this.store.hasAudit()) {
      return 'No site audit snapshot is stored yet. Complete onboarding or run a site audit to populate Site Health.';
    }
    if (this.activeTab() === 'refresh') return 'No refresh candidates were flagged in this scan.';
    if (this.activeTab() === 'wins') return 'No already-ranking wins were captured in this plan.';
    return 'No crawlable pages were found in this scan.';
  });

  readonly showOptimizationLoading = computed(
    () => this.activeTab() === 'optimization' && this.optimizationStore.showProgress(),
  );
  readonly showPerformanceLoading = computed(
    () => this.activeTab() === 'performance' && this.speedStore.showProgress(),
  );
  readonly showAuditLoading = computed(
    () =>
      this.activeTab() !== 'optimization' &&
      this.activeTab() !== 'performance' &&
      this.store.showAuditProgress(),
  );
  readonly isRefreshing = computed(() =>
    this.activeTab() === 'optimization'
      ? this.optimizationStore.refreshingLatest()
      : this.activeTab() === 'performance'
        ? this.speedStore.refreshingLatest()
        : this.store.refreshingLatest(),
  );

  readonly headingSummary = headingSummary;
  readonly schemaSummary = schemaSummary;

  constructor() {
    effect(() => {
      const siteId = this.strategy.siteId();
      if (siteId) {
        void this.store.load(siteId);
        void this.optimizationStore.load(siteId);
        void this.speedStore.load(siteId);
      }
    });
  }

  async reload(): Promise<void> {
    if (this.activeTab() === 'optimization') {
      await this.optimizationStore.reload();
      return;
    }
    if (this.activeTab() === 'performance') {
      await this.speedStore.reload();
      return;
    }
    await this.store.reload();
  }

  async startAudit(): Promise<void> {
    await this.store.startAudit();
  }

  async startOptimization(): Promise<void> {
    await this.optimizationStore.start();
  }

  async startPerformance(): Promise<void> {
    await this.speedStore.start();
  }

  handleAlignmentPrerequisiteAction(): void {
    const prerequisite = this.alignmentPrerequisite();
    if (!prerequisite) return;
    if (prerequisite.actionLabel === 'Go to Keywords') {
      void this.router.navigate([HOME_KEYWORDS_PATH]);
      return;
    }
    void this.startAudit();
  }

  setTab(tab: SiteHealthTab): void {
    this.activeTab.set(tab);
    this.selectedPage.set(null);
  }

  openPage(row: SiteHealthPageRow): void {
    this.selectedPage.set(row);
  }

  closeDrawer(): void {
    this.selectedPage.set(null);
  }
}
