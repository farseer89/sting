import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { ProgressSpinner } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import type {
  ProtopipeCompetitorGapKeywordRow,
  ProtopipeSiteCompetitorsResponse,
  ProtopipeSpyFuCompetitor,
} from '@hive/contracts';
import { ProtopipeApiService } from '../protopipe-api.service';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { ProtopipeStrategyService } from '../protopipe-strategy.service';

interface GapSelectableRow extends ProtopipeCompetitorGapKeywordRow {
  phraseKey: string;
  selected: boolean;
}

@Component({
  selector: 'app-protopipe-competitors',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    Button,
    Checkbox,
    ProgressSpinner,
    TableModule,
    Tag,
    Toast,
  ],
  providers: [MessageService],
  templateUrl: './protopipe-competitors.component.html',
  styleUrl: './protopipe-competitors.component.scss',
})
export class ProtopipeCompetitorsComponent implements OnInit {
  private readonly api = inject(ProtopipeApiService);
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly messages = inject(MessageService);

  readonly loadingCompetitors = signal(true);
  readonly loadingGap = signal(false);
  readonly adding = signal(false);
  readonly competitorsError = signal<string | null>(null);
  readonly gapError = signal<string | null>(null);
  readonly notConfigured = signal(false);

  readonly competitorsResponse = signal<ProtopipeSiteCompetitorsResponse | null>(null);
  readonly selectedCompetitor = signal<ProtopipeSpyFuCompetitor | null>(null);
  readonly gapRows = signal<GapSelectableRow[]>([]);
  readonly gapFetchedAt = signal<string | null>(null);
  readonly gapSource = signal<'live' | 'cache' | null>(null);
  readonly gapRowLimit = signal<number | null>(null);

  readonly hostname = computed(
    () => this.competitorsResponse()?.hostname ?? this.strategy.site()?.hostname ?? null,
  );

  readonly selectedGapCount = computed(() => this.gapRows().filter((r) => r.selected).length);

  ngOnInit(): void {
    void this.loadCompetitors();
  }

  async loadCompetitors(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) {
      this.competitorsError.set('No site selected.');
      this.loadingCompetitors.set(false);
      return;
    }

    this.loadingCompetitors.set(true);
    this.competitorsError.set(null);
    this.notConfigured.set(false);
    this.selectedCompetitor.set(null);
    this.gapRows.set([]);
    this.gapRowLimit.set(null);

    try {
      await this.strategy.ensureLoaded();
      const result = await this.api.siteCompetitors(siteId);
      this.competitorsResponse.set(result);
    } catch (err) {
      const message = parseProtopipeApiError(err, 'Could not load competitors.');
      if (message.toLowerCase().includes('not configured')) {
        this.notConfigured.set(true);
      }
      this.competitorsError.set(message);
    } finally {
      this.loadingCompetitors.set(false);
    }
  }

  async selectCompetitor(competitor: ProtopipeSpyFuCompetitor): Promise<void> {
    if (this.loadingGap()) return;
    this.selectedCompetitor.set(competitor);
    await this.loadGapKeywords(competitor.domain);
  }

  async loadGapKeywords(competitorDomain: string): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;

    this.loadingGap.set(true);
    this.gapError.set(null);

    try {
      const result = await this.api.competitorGapKeywords(siteId, competitorDomain);
      this.gapFetchedAt.set(result.fetchedAt);
      this.gapSource.set(result.source);
      this.gapRowLimit.set(result.rowLimit);
      this.gapRows.set(
        result.rows.map((row) => ({
          ...row,
          phraseKey: normalizePhraseKey(row.phrase),
          selected: false,
        })),
      );
    } catch (err) {
      this.gapError.set(parseProtopipeApiError(err, 'Could not load gap keywords.'));
      this.gapRows.set([]);
    } finally {
      this.loadingGap.set(false);
    }
  }

  toggleGapRow(phraseKey: string, next: boolean): void {
    this.gapRows.update((rows) =>
      rows.map((r) =>
        r.phraseKey === phraseKey && !r.tracked ? { ...r, selected: next } : r,
      ),
    );
  }

  toggleAllGap(next: boolean): void {
    this.gapRows.update((rows) =>
      rows.map((r) => (r.tracked ? r : { ...r, selected: next })),
    );
  }

  allGapSelected(): boolean {
    const selectable = this.gapRows().filter((r) => !r.tracked);
    return selectable.length > 0 && selectable.every((r) => r.selected);
  }

  async addSelectedGap(): Promise<void> {
    if (this.adding()) return;
    const picks = this.gapRows().filter((r) => r.selected);
    if (picks.length === 0) return;

    this.adding.set(true);
    try {
      const deduped = new Set<string>();
      for (const row of picks) {
        if (deduped.has(row.phraseKey)) continue;
        deduped.add(row.phraseKey);
        this.strategy.addKeyword({
          phrase: row.phrase,
          intent: 'commercial',
          priority: 'medium',
          notes: `Gap vs ${this.selectedCompetitor()?.domain ?? 'competitor'}`,
        });
      }
      const ok = await this.strategy.saveKeywords();
      if (ok) {
        this.messages.add({
          severity: 'success',
          summary: 'Added to plan',
          detail: `${deduped.size} keyword${deduped.size === 1 ? '' : 's'} saved.`,
          life: 4000,
        });
        const domain = this.selectedCompetitor()?.domain;
        if (domain) {
          await this.loadGapKeywords(domain);
        }
      } else {
        this.messages.add({
          severity: 'error',
          summary: 'Save failed',
          detail: this.strategy.error() ?? 'Could not save keywords.',
          life: 5000,
        });
      }
    } finally {
      this.adding.set(false);
    }
  }

  formatNumber(value: number | undefined): string {
    if (value == null || Number.isNaN(value)) return '—';
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return Math.round(value).toString();
  }

  formatPercent(value: number | undefined): string {
    if (value == null || Number.isNaN(value)) return '—';
    return `${Math.round(value * 100)}%`;
  }

  formatPosition(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return '—';
    return String(Math.round(value));
  }
}

function normalizePhraseKey(phrase: string): string {
  return phrase.trim().toLowerCase().replace(/\s+/g, ' ');
}
