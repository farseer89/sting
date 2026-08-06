import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import type { KeywordRankingMarketTier, KeywordRankingRow } from '@hive/contracts';
import type { RankingsDrawerTab, RankingsSortColumn, RankingsSortState } from './protopipe-home-rankings.model';
import { firstValueFrom } from 'rxjs';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { ThoughtRunSession } from '../../runs/thought-run-session.service';
import { ShireApiService } from '../../shire/shire-api.service';
import {
  biggestRankingGaps,
  buildRankingsSummary,
  defaultDrawerTab,
  drawerTabsForRow,
  hasSerpFeature,
  locationShortLabel,
  marketScopeLabel,
  rankLabel,
  RANKINGS_TABLE_SERP_COLUMNS,
  sortRankingRows,
  topCompetitorsByOverlap,
} from './protopipe-home-rankings.model';

type MarketFilter = 'all' | KeywordRankingMarketTier;

@Component({
  selector: 'app-protopipe-home-rankings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-home-rankings.component.html',
  styleUrl: './protopipe-home-rankings.component.scss',
})
export class ProtopipeHomeRankingsComponent implements OnInit {
  private readonly api = inject(ShireApiService);
  private readonly strategy = inject(ProtopipeStrategyService);
  readonly runSession = inject(ThoughtRunSession);

  private readonly rows = signal<KeywordRankingRow[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly sort = signal<RankingsSortState>({ column: 'rank', direction: 'asc' });
  readonly marketFilter = signal<MarketFilter>('all');
  readonly selectedRow = signal<KeywordRankingRow | null>(null);
  readonly drawerTab = signal<RankingsDrawerTab>('organic');

  readonly filteredRows = computed(() => {
    const filter = this.marketFilter();
    const all = this.rows();
    if (filter === 'all') return all;
    return all.filter((row) => row.latest.marketTier === filter);
  });
  readonly sortedRows = computed(() => sortRankingRows(this.filteredRows(), this.sort()));
  readonly summaryCards = computed(() =>
    buildRankingsSummary(this.rows(), this.strategy.keywords().length),
  );
  readonly topCompetitors = computed(() => topCompetitorsByOverlap(this.rows()));
  readonly biggestGaps = computed(() => biggestRankingGaps(this.rows()));
  readonly capturedAt = computed(() => latestCapturedAt(this.rows()));
  readonly hasRows = computed(() => this.filteredRows().length > 0);
  readonly keywordCount = computed(() => this.strategy.keywords().length);
  readonly uniqueTrackedKeywords = computed(
    () => new Set(this.rows().map((row) => row.keywordId)).size,
  );
  readonly marketSnapshotCount = computed(() => this.rows().length);
  readonly coverageLabel = computed(() => {
    const confirmed = this.strategy.keywords().length;
    const researched = this.uniqueTrackedKeywords();
    const snapshots = this.marketSnapshotCount();
    if (confirmed === 0 && snapshots === 0) return 'No ranking snapshots yet';
    if (confirmed > researched) {
      return `${confirmed} confirmed · ${researched} researched · ${snapshots} snapshot(s)`;
    }
    return `${researched} keyword(s) · ${snapshots} market snapshot(s)`;
  });
  readonly researchGap = computed(() => {
    const gap = this.strategy.keywords().length - this.uniqueTrackedKeywords();
    return gap > 0 ? gap : 0;
  });
  readonly drawerTabs = computed(() => {
    const row = this.selectedRow();
    return row ? drawerTabsForRow(row) : [];
  });
  readonly canResearch = computed(
    () => Boolean(this.strategy.siteId()) && this.keywordCount() > 0 && !this.runSession.isActive(),
  );
  readonly emptyMessage = computed(() =>
    this.keywordCount() === 0
      ? 'Confirm keywords first. Once keywords are saved, research rankings to capture SERP detail.'
      : 'Research rankings to capture current positions, AI overviews, and competitors.',
  );
  readonly runStatusLabel = computed(() => {
    const thought = this.runSession.thought();
    if (!thought)
      return this.capturedAt()
        ? `Fresh as of ${this.formatDate(this.capturedAt())}`
        : 'No research run yet';
    if (thought.status === 'pending' || thought.status === 'running') return 'Research running';
    if (thought.status === 'complete') return 'Research complete';
    if (thought.status === 'failed') return 'Research failed';
    return thought.status;
  });

  readonly marketScopeLabel = marketScopeLabel;
  readonly rankLabel = rankLabel;
  readonly serpFeatureColumns = RANKINGS_TABLE_SERP_COLUMNS;
  readonly hasSerpFeature = hasSerpFeature;
  readonly locationShortLabel = locationShortLabel;
  readonly marketFilters: { id: MarketFilter; label: string }[] = [
    { id: 'all', label: 'All markets' },
    { id: 'local', label: 'Local' },
    { id: 'national', label: 'Nationwide' },
    { id: 'worldwide', label: 'Worldwide' },
  ];

  constructor() {
    effect(() => {
      if (this.runSession.isComplete()) {
        void this.loadRankings();
      }
    });
  }

  ngOnInit(): void {
    void this.loadRankings();
    void this.attachLatestResearchRun();
  }

  private async attachLatestResearchRun(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId || this.runSession.isActive()) return;
    try {
      const { run } = await firstValueFrom(
        this.api.getLatestRun$(siteId, 'rankings_baseline'),
      );
      if (run.status === 'pending' || run.status === 'running') {
        this.runSession.attach(siteId, run.id, run);
      }
    } catch {
      // No prior research run — fine.
    }
  }

  async loadRankings(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(this.api.listRankings$(siteId));
      this.rows.set(response.rankings);
      const selected = this.selectedRow();
      if (selected) {
        const refreshed =
          response.rankings.find(
            (row) =>
              row.keywordId === selected.keywordId &&
              row.latest.marketTier === selected.latest.marketTier &&
              row.latest.locationCode === selected.latest.locationCode,
          ) ?? null;
        this.selectedRow.set(refreshed);
      }
    } catch (err) {
      if (isRankingsNotReadyError(err)) {
        this.rows.set([]);
        return;
      }
      this.error.set(parseProtopipeApiError(err, 'Could not load rankings.'));
    } finally {
      this.loading.set(false);
    }
  }

  async runResearch(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId || !this.canResearch()) return;
    this.error.set(null);
    const run = await this.runSession.enqueueRun(siteId, {
      thinkerKind: 'rankings_baseline',
      params: { source: 'researchRankings' },
    });
    if (!run && this.runSession.loadError()) {
      this.error.set(this.runSession.loadError());
    }
  }

  setMarketFilter(filter: MarketFilter): void {
    this.marketFilter.set(filter);
  }

  openRow(row: KeywordRankingRow): void {
    this.selectedRow.set(row);
    this.drawerTab.set(defaultDrawerTab(drawerTabsForRow(row)));
  }

  closeDrawer(): void {
    this.selectedRow.set(null);
    this.drawerTab.set('organic');
  }

  setDrawerTab(tab: RankingsDrawerTab): void {
    this.drawerTab.set(tab);
  }

  featureChips(row: KeywordRankingRow): string[] {
    return row.latest.serpFeatures ?? [];
  }

  featureLabel(feature: string): string {
    switch (feature) {
      case 'ai_overview':
        return 'AI overview';
      case 'local_pack':
        return 'Local pack';
      case 'people_also_ask':
        return 'People also ask';
      case 'featured_snippet':
        return 'Featured snippet';
      case 'related_searches':
        return 'Related searches';
      case 'images':
        return 'Images';
      case 'video':
        return 'Video';
      case 'knowledge_graph':
        return 'Knowledge graph';
      default:
        return feature;
    }
  }

  aiOverviewText(row: KeywordRankingRow): string | null {
    const overview = row.latest.serpDetail?.aiOverview;
    if (!overview?.present) return null;
    return overview.markdown?.trim() || overview.text?.trim() || null;
  }

  toggleSort(column: RankingsSortColumn): void {
    this.sort.update((current) => ({
      column,
      direction:
        current.column === column
          ? current.direction === 'asc'
            ? 'desc'
            : 'asc'
          : column === 'rank' || column === 'market'
            ? 'asc'
            : 'desc',
    }));
  }

  sortIndicator(column: RankingsSortColumn): string {
    const sort = this.sort();
    if (sort.column !== column) return '';
    return sort.direction === 'asc' ? '↑' : '↓';
  }

  competitorsAheadCount(row: KeywordRankingRow): string {
    const count = row.latest.competitorsAbove.length;
    return count === 0 ? '—' : String(count);
  }

  competitorLeaders(row: KeywordRankingRow): string {
    const labels = row.latest.competitorsAbove
      .map((competitor) => competitor.title ?? competitor.domain)
      .slice(0, 3);
    return labels.length ? labels.join(', ') : '—';
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return 'Not captured';
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  }
}

function isRankingsNotReadyError(err: unknown): boolean {
  if (!(err instanceof HttpErrorResponse)) return false;
  if (err.status !== 404) return false;
  const message =
    typeof err.error === 'string'
      ? err.error
      : typeof err.error?.message === 'string'
        ? err.error.message
        : err.message;
  return message.includes('/api/sites/') && message.includes('/rankings');
}

function latestCapturedAt(rows: KeywordRankingRow[]): string | null {
  return rows.reduce<string | null>((latest, row) => {
    if (!latest || row.latest.capturedAt > latest) return row.latest.capturedAt;
    return latest;
  }, null);
}
