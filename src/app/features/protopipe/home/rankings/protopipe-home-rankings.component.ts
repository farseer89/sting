import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import type { KeywordRankingRow } from '@hive/contracts';
import type { RankingsSortColumn, RankingsSortState } from './protopipe-home-rankings.model';
import { firstValueFrom } from 'rxjs';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { ThoughtRunSession } from '../../runs/thought-run-session.service';
import { ShireApiService } from '../../shire/shire-api.service';
import {
  biggestRankingGaps,
  buildRankingsSummary,
  marketScopeLabel,
  rankLabel,
  sortRankingRows,
  topCompetitorsByOverlap,
} from './protopipe-home-rankings.model';

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

  readonly sortedRows = computed(() => sortRankingRows(this.rows(), this.sort()));
  readonly summaryCards = computed(() => buildRankingsSummary(this.rows()));
  readonly topCompetitors = computed(() => topCompetitorsByOverlap(this.rows()));
  readonly biggestGaps = computed(() => biggestRankingGaps(this.rows()));
  readonly capturedAt = computed(() => latestCapturedAt(this.rows()));
  readonly hasRows = computed(() => this.rows().length > 0);
  readonly runStatusLabel = computed(() => {
    const thought = this.runSession.thought();
    if (!thought) return this.capturedAt() ? `Fresh as of ${this.formatDate(this.capturedAt())}` : 'No baseline yet';
    if (thought.status === 'pending' || thought.status === 'running') return 'Baseline running';
    if (thought.status === 'complete') return 'Baseline complete';
    if (thought.status === 'failed') return 'Baseline failed';
    return thought.status;
  });

  readonly marketScopeLabel = marketScopeLabel;
  readonly rankLabel = rankLabel;

  constructor() {
    effect(() => {
      if (this.runSession.isComplete()) {
        void this.loadRankings();
      }
    });
  }

  ngOnInit(): void {
    void this.loadRankings();
  }

  async loadRankings(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(this.api.listRankings$(siteId));
      this.rows.set(response.rankings);
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Could not load rankings.'));
    } finally {
      this.loading.set(false);
    }
  }

  async runBaseline(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId || this.runSession.isActive()) return;
    this.error.set(null);
    const run = await this.runSession.enqueueRun(siteId, { thinkerKind: 'rankings_baseline' });
    if (!run && this.runSession.loadError()) {
      this.error.set(this.runSession.loadError());
    }
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

  competitorsLabel(row: KeywordRankingRow): string {
    const count = row.latest.competitorsAbove.length;
    if (count === 0) return 'Clear lane';
    return `${count} above us`;
  }

  topCompetitorDomains(row: KeywordRankingRow): string {
    const domains = row.latest.competitorsAbove.map((competitor) => competitor.domain).slice(0, 3);
    return domains.length ? domains.join(', ') : 'No competitor above captured';
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

function latestCapturedAt(rows: KeywordRankingRow[]): string | null {
  return rows.reduce<string | null>((latest, row) => {
    if (!latest || row.latest.capturedAt > latest) return row.latest.capturedAt;
    return latest;
  }, null);
}
