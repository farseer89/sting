import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import {
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
  readonly store = inject(SiteHealthStore);

  readonly activeTab = signal<SiteHealthTab>('overview');
  readonly selectedPage = signal<SiteHealthPageRow | null>(null);

  readonly audit = this.store.audit;
  readonly summaryCards = computed(() => buildSiteHealthSummaryCards(this.audit()));
  readonly tabs = computed(() => siteHealthTabs(this.audit()));
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
    if (this.store.loading()) return 'Loading site health…';
    if (!this.store.hasAudit()) {
      return 'No site audit snapshot is stored yet. Complete onboarding or run a site audit to populate Site Health.';
    }
    if (this.activeTab() === 'refresh') return 'No refresh candidates were flagged in this scan.';
    if (this.activeTab() === 'wins') return 'No already-ranking wins were captured in this plan.';
    return 'No crawlable pages were found in this scan.';
  });

  readonly headingSummary = headingSummary;
  readonly schemaSummary = schemaSummary;

  constructor() {
    effect(() => {
      const siteId = this.strategy.siteId();
      if (siteId) void this.store.load(siteId);
    });
  }

  async reload(): Promise<void> {
    await this.store.reload();
  }

  async startAudit(): Promise<void> {
    await this.store.startAudit();
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
