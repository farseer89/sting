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
import type {
  RankingSerpDetailView,
  RankingSerpMediaResult,
  RankingSerpSource,
  RankingsSortColumn,
  RankingsSortState,
} from './protopipe-home-rankings.model';
import { firstValueFrom } from 'rxjs';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { ThoughtRunSession } from '../../runs/thought-run-session.service';
import { ShireApiService } from '../../shire/shire-api.service';
import {
  biggestRankingGaps,
  buildRankingsSummary,
  locationShortLabel,
  marketScopeLabel,
  rankLabel,
  rankingSerpDetail,
  sortRankingRows,
  topCompetitorsByOverlap,
} from './protopipe-home-rankings.model';
import {
  rankingsResearchProgressDetail,
  rankingsResearchProgressFromThought,
  rankingsResearchProgressLabel,
  rankingsResearchProgressPercent,
} from './rankings-research-progress';

type MarketFilter = 'all' | KeywordRankingMarketTier;
type DrawerFolderTab = 'overview' | 'features' | 'competition' | 'organic';

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
  readonly drawerTab = signal<DrawerFolderTab>('overview');

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
    if (this.runSession.isActive()) {
      return this.researchProgressLabel();
    }
    if (!thought)
      return this.capturedAt()
        ? `Fresh as of ${this.formatDate(this.capturedAt())}`
        : 'No research run yet';
    if (thought.status === 'complete') return 'Research complete';
    if (thought.status === 'failed') return 'Research failed';
    return thought.status;
  });
  readonly researchProgress = computed(() =>
    rankingsResearchProgressFromThought(this.runSession.thought()),
  );
  readonly researchProgressPercent = computed(() =>
    rankingsResearchProgressPercent(this.runSession.thought(), this.researchProgress()),
  );
  readonly researchProgressLabel = computed(() =>
    rankingsResearchProgressLabel(this.runSession.thought(), this.researchProgress()),
  );
  readonly researchProgressDetail = computed(() =>
    rankingsResearchProgressDetail(this.researchProgress()),
  );
  readonly showResearchProgress = computed(() => this.runSession.isActive());

  readonly marketScopeLabel = marketScopeLabel;
  readonly rankLabel = rankLabel;
  readonly locationShortLabel = locationShortLabel;
  readonly marketFilters: { id: MarketFilter; label: string }[] = [
    { id: 'all', label: 'All markets' },
    { id: 'local', label: 'Local' },
    { id: 'national', label: 'Nationwide' },
    { id: 'worldwide', label: 'Worldwide' },
  ];
  readonly drawerFolderTabs: { id: DrawerFolderTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'features', label: 'Features' },
    { id: 'competition', label: 'Competition' },
    { id: 'organic', label: 'Organic' },
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
    this.drawerTab.set('overview');
  }

  closeDrawer(): void {
    this.selectedRow.set(null);
    this.drawerTab.set('overview');
  }

  setDrawerTab(tab: DrawerFolderTab): void {
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
      case 'image':
      case 'image_pack':
      case 'images':
        return 'Images';
      case 'videos':
      case 'video_box':
      case 'video_carousel':
      case 'video':
        return 'Video';
      case 'knowledge_graph':
        return 'Knowledge graph';
      default:
        return feature;
    }
  }

  serpFeaturesTooltip(row: KeywordRankingRow): string {
    const features = this.featureChips(row);
    if (!features.length) return 'No SERP features detected';
    return features.map((feature) => this.featureLabel(feature)).join(', ');
  }

  aiOverviewText(row: KeywordRankingRow): string | null {
    const overview = this.serpDetail(row)?.aiOverview;
    if (!overview?.present) return null;
    return overview.markdown?.trim() || overview.text?.trim() || null;
  }

  aiOverviewTitle(row: KeywordRankingRow): string {
    return this.serpDetail(row)?.aiOverview?.title?.trim() || 'AI overview detected';
  }

  aiOverviewParagraphs(row: KeywordRankingRow): string[] {
    const text = this.aiOverviewText(row);
    if (!text) return [];
    return text
      .replace(/^#{1,6}\s+/gm, '')
      .split(/\n{2,}|\n(?=(?:[-*]|\d+\.)\s+)/)
      .map((part) =>
        part
          .replace(/^\s*(?:[-*]|\d+\.)\s+/gm, '')
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
          .trim(),
      )
      .filter(Boolean)
      .slice(0, 8);
  }

  serpDetail(row: KeywordRankingRow): RankingSerpDetailView | undefined {
    return rankingSerpDetail(row);
  }

  hasFeature(row: KeywordRankingRow, feature: string): boolean {
    return this.featureChips(row).includes(feature);
  }

  serpOpportunity(row: KeywordRankingRow): string {
    const features = new Set(this.featureChips(row));
    const signals: string[] = [];
    if (features.has('ai_overview')) signals.push('AI overview');
    if (this.hasMediaFeature(row)) signals.push('media modules');
    if (features.has('knowledge_graph')) signals.push('entity panel');
    if (features.has('local_pack')) signals.push('local pack');
    if (signals.length === 0) {
      return 'This SERP is mostly organic results. The next move is to compare the pages ranking above you and tighten the target page.';
    }
    return `Google is showing ${signals.join(', ')} signals here. Treat this as more than a text ranking: strengthen the page, supporting media, and entity/local signals that match this SERP shape.`;
  }

  yourOrganicResult(
    row: KeywordRankingRow,
  ): NonNullable<RankingSerpDetailView['organic']>[number] | undefined {
    const organic = this.serpDetail(row)?.organic ?? [];
    return (
      organic.find((result) => result.isYourSite) ??
      organic.find((result) => result.url === row.latest.rankingUrl)
    );
  }

  positionDetailLabel(position: number | null | undefined): string {
    return position == null ? 'Not found' : `#${position}`;
  }

  adsSummary(row: KeywordRankingRow): string {
    const ads = this.serpDetail(row)?.adsCount;
    const top = ads?.top ?? 0;
    const bottom = ads?.bottom ?? 0;
    if (top === 0 && bottom === 0) return 'No ads';
    return `${top} top · ${bottom} bottom`;
  }

  aiOverviewSources(row: KeywordRankingRow): RankingSerpSource[] {
    const detail = this.serpDetail(row);
    return detail?.aiOverview?.sources ?? detail?.aiOverviewSources ?? [];
  }

  imagePack(row: KeywordRankingRow): RankingSerpMediaResult[] {
    return this.serpDetail(row)?.imagePack ?? [];
  }

  videoPack(row: KeywordRankingRow): RankingSerpMediaResult[] {
    return this.serpDetail(row)?.videoPack ?? [];
  }

  mediaCount(row: KeywordRankingRow): number {
    return this.imagePack(row).length + this.videoPack(row).length;
  }

  hasMediaFeature(row: KeywordRankingRow): boolean {
    return this.featureChips(row).some((feature) =>
      ['image', 'image_pack', 'images', 'video', 'videos', 'video_box', 'video_carousel'].includes(
        feature,
      ),
    );
  }

  sourceLabel(source: RankingSerpSource | RankingSerpMediaResult): string {
    const mediaSource = 'source' in source ? source.source : undefined;
    return source.domain ?? mediaSource ?? source.title ?? source.url ?? 'Source';
  }

  hasValue(value: unknown): boolean {
    return value !== null && value !== undefined;
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
