import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { HOME_KEYWORDS_PATH } from '../protopipe-home.routes';
import {
  alignmentEmptyMessage,
  alignmentPrerequisite,
  alignmentRows,
  buildKeywordAlignmentSummaryCards,
  buildSiteHealthSummaryCards,
  headingSummary,
  pageRows,
  refreshRows,
  schemaSummary,
  siteHealthTabs,
  sourceDescription,
  sourceLabel,
  winRows,
  type SiteHealthPageRow,
  type SiteHealthTab,
} from './protopipe-site-health.model';
import { KeywordAlignmentStore } from './keyword-alignment.store';
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
  readonly alignmentStore = inject(KeywordAlignmentStore);

  readonly activeTab = signal<SiteHealthTab>('overview');
  readonly selectedPage = signal<SiteHealthPageRow | null>(null);
  private readonly alignmentAutoStartSiteId = signal<string | null>(null);

  readonly audit = this.store.audit;
  readonly alignmentSnapshot = this.alignmentStore.snapshot;
  readonly keywordCount = computed(() => this.strategy.keywords().length);
  readonly alignmentPrerequisite = computed(() =>
    alignmentPrerequisite({
      hasAudit: this.store.hasAudit(),
      keywordCount: this.keywordCount(),
    }),
  );
  readonly canStartAlignment = computed(
    () =>
      !this.alignmentStore.hasSnapshot() &&
      !this.alignmentStore.loading() &&
      this.alignmentPrerequisite() === null,
  );
  readonly showAuditSummaryCards = computed(() => this.activeTab() !== 'alignment');
  readonly summaryCards = computed(() =>
    this.showAuditSummaryCards()
      ? buildSiteHealthSummaryCards(this.audit())
      : buildKeywordAlignmentSummaryCards(this.alignmentSnapshot()?.summary),
  );
  readonly tabs = computed(() => siteHealthTabs(this.audit(), this.alignmentSnapshot()));
  readonly alignmentRows = computed(() => alignmentRows(this.alignmentSnapshot()));
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
    if (this.activeTab() === 'alignment') {
      return alignmentEmptyMessage({
        loading: this.alignmentStore.loading(),
        hasSnapshot: this.alignmentStore.hasSnapshot(),
        prerequisite: this.alignmentPrerequisite(),
      });
    }
    if (this.store.loading()) return 'Loading site health…';
    if (!this.store.hasAudit()) {
      return 'No site audit snapshot is stored yet. Complete onboarding or run a site audit to populate Site Health.';
    }
    if (this.activeTab() === 'refresh') return 'No refresh candidates were flagged in this scan.';
    if (this.activeTab() === 'wins') return 'No already-ranking wins were captured in this plan.';
    return 'No crawlable pages were found in this scan.';
  });

  readonly showAlignmentLoading = computed(
    () => this.activeTab() === 'alignment' && this.alignmentStore.loading(),
  );
  readonly showAuditLoading = computed(
    () => this.activeTab() !== 'alignment' && this.store.loading(),
  );

  readonly headingSummary = headingSummary;
  readonly schemaSummary = schemaSummary;

  constructor() {
    effect(() => {
      const siteId = this.strategy.siteId();
      if (siteId) {
        void this.store.load(siteId);
        void this.alignmentStore.load(siteId);
      }
    });

    effect(() => {
      const siteId = this.strategy.siteId();
      if (!siteId) {
        this.alignmentAutoStartSiteId.set(null);
        return;
      }
      const ready =
        this.store.hasAudit() &&
        this.keywordCount() > 0 &&
        !this.alignmentStore.hasSnapshot() &&
        !this.alignmentStore.loading();
      if (ready && this.alignmentAutoStartSiteId() !== siteId) {
        this.alignmentAutoStartSiteId.set(siteId);
        void this.alignmentStore.reload({ startIfMissing: true });
      }
    });
  }

  async reload(): Promise<void> {
    if (this.activeTab() === 'alignment') {
      await this.alignmentStore.reload({ startIfMissing: this.canStartAlignment() });
      return;
    }
    await this.store.reload();
  }

  async startAudit(): Promise<void> {
    await this.store.startAudit();
  }

  async startAlignment(): Promise<void> {
    this.alignmentAutoStartSiteId.set(this.strategy.siteId());
    await this.alignmentStore.startAlignment();
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
