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
import { Badge } from 'primeng/badge';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Drawer } from 'primeng/drawer';
import { ProgressSpinner } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import type {
  KeywordPriority,
  ProtopipeDiscoverAdsIdea,
  ProtopipeDiscoverGscQuery,
  ProtopipeDiscoverRankedKeyword,
  ProtopipeKeywordDiscoveryResponse,
  ProtopipeKeywordDto,
} from '@hive/contracts';
import { ProtopipeApiService } from '../protopipe-api.service';
import { parseProtopipeApiError } from '../protopipe-http.util';
import {
  intentSeverity,
  prioritySeverity,
} from '../protopipe-keyword-display';
import { ProtopipeStrategyService } from '../protopipe-strategy.service';

interface SelectableRow {
  phrase: string;
  phraseKey: string;
  searchVolume?: number;
  keywordDifficulty?: number;
  cpc?: number;
  position?: number;
  impressions?: number;
  clicks?: number;
  competition?: string;
  tracked: boolean;
  selected: boolean;
}

const MICROS_PER_DOLLAR = 1_000_000;

function normalizePhraseKey(phrase: string): string {
  return phrase.trim().toLowerCase().replace(/\s+/g, ' ');
}

function microsToDollars(value: number | undefined): number | undefined {
  return value != null ? value / MICROS_PER_DOLLAR : undefined;
}

@Component({
  selector: 'app-protopipe-discovery-diy',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    Badge,
    Button,
    Checkbox,
    Drawer,
    ProgressSpinner,
    TableModule,
    TabsModule,
    Tag,
    Toast,
  ],
  providers: [MessageService],
  templateUrl: './protopipe-discovery-diy.component.html',
  styleUrl: './protopipe-discovery-diy.component.scss',
})
export class ProtopipeDiscoveryDiyComponent implements OnInit {
  private readonly api = inject(ProtopipeApiService);
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly messages = inject(MessageService);

  readonly loading = signal(true);
  readonly adding = signal(false);
  readonly error = signal<string | null>(null);
  readonly response = signal<ProtopipeKeywordDiscoveryResponse | null>(null);
  readonly hostname = signal<string | null>(null);

  readonly rankedRows = signal<SelectableRow[]>([]);
  readonly adsRows = signal<SelectableRow[]>([]);
  readonly gscRows = signal<SelectableRow[]>([]);

  readonly selectedCount = computed(
    () =>
      this.rankedRows().filter((r) => r.selected).length +
      this.adsRows().filter((r) => r.selected).length +
      this.gscRows().filter((r) => r.selected).length,
  );

  readonly activeTab = signal<'ranked' | 'ads' | 'gsc'>('ranked');

  readonly planDrawerVisible = signal(false);
  readonly planKeywords = this.strategy.keywords;
  readonly planCount = this.strategy.keywordCount;
  readonly planHighPriorityCount = this.strategy.highPriorityCount;

  readonly intentSeverity = intentSeverity;
  readonly prioritySeverity = prioritySeverity;

  readonly planByPriority = computed<
    { label: string; key: KeywordPriority; items: ProtopipeKeywordDto[] }[]
  >(() => {
    const buckets: Record<KeywordPriority, ProtopipeKeywordDto[]> = {
      high: [],
      medium: [],
      low: [],
    };
    for (const kw of this.planKeywords()) {
      buckets[kw.priority].push(kw);
    }
    const groups: { label: string; key: KeywordPriority; items: ProtopipeKeywordDto[] }[] = [
      { label: 'High priority', key: 'high', items: buckets.high },
      { label: 'Medium priority', key: 'medium', items: buckets.medium },
      { label: 'Low priority', key: 'low', items: buckets.low },
    ];
    return groups.filter((group) => group.items.length > 0);
  });

  ngOnInit(): void {
    void this.load();
  }

  openPlanDrawer(): void {
    this.planDrawerVisible.set(true);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.strategy.ensureLoaded();
      const siteId = this.strategy.siteId();
      if (!siteId) {
        throw new Error('No site loaded for this account');
      }
      const res = await this.api.discoverKeywords(siteId);
      this.response.set(res);
      this.hostname.set(res.hostname);
      this.applyResponse(res);
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Failed to load discovery results'));
    } finally {
      this.loading.set(false);
    }
  }

  private applyResponse(res: ProtopipeKeywordDiscoveryResponse): void {
    const tracked = new Set(res.trackedPhraseKeys ?? []);

    const rankedSource = res.ranked.keywords ?? [];
    const ranked = rankedSource
      .map((k) => this.toRankedRow(k, tracked))
      .filter((r) => !!r.phrase);
    this.rankedRows.set(this.dedupe(ranked));

    const adsSource = res.ads.ideas ?? [];
    const ads = adsSource
      .map((i) => this.toAdsRow(i, tracked))
      .filter((r) => !!r.phrase);
    this.adsRows.set(this.dedupe(ads));

    const gscSource = res.gsc.queries ?? [];
    const gsc = gscSource
      .map((q) => this.toGscRow(q, tracked))
      .filter((r) => !!r.phrase);
    this.gscRows.set(this.dedupe(gsc));
  }

  private dedupe(rows: SelectableRow[]): SelectableRow[] {
    const seen = new Set<string>();
    const out: SelectableRow[] = [];
    for (const row of rows) {
      if (seen.has(row.phraseKey)) continue;
      seen.add(row.phraseKey);
      out.push(row);
    }
    return out;
  }

  private toRankedRow(k: ProtopipeDiscoverRankedKeyword, tracked: Set<string>): SelectableRow {
    const phrase = (k.phrase ?? '').trim();
    const phraseKey = normalizePhraseKey(phrase);
    return {
      phrase,
      phraseKey,
      searchVolume: k.searchVolume,
      keywordDifficulty: k.keywordDifficulty,
      cpc: k.cpc,
      position: k.position,
      tracked: tracked.has(phraseKey),
      selected: false,
    };
  }

  private toAdsRow(idea: ProtopipeDiscoverAdsIdea, tracked: Set<string>): SelectableRow {
    const phrase = (idea.phrase ?? '').trim();
    const phraseKey = normalizePhraseKey(phrase);
    const cpcLow = microsToDollars(idea.cpcLowMicros);
    const cpcHigh = microsToDollars(idea.cpcHighMicros);
    const cpc =
      cpcLow != null && cpcHigh != null
        ? (cpcLow + cpcHigh) / 2
        : (cpcHigh ?? cpcLow);
    return {
      phrase,
      phraseKey,
      searchVolume: idea.avgMonthlySearches,
      competition: idea.competition,
      cpc,
      tracked: tracked.has(phraseKey),
      selected: false,
    };
  }

  private toGscRow(q: ProtopipeDiscoverGscQuery, tracked: Set<string>): SelectableRow {
    const phrase = (q.query ?? '').trim();
    const phraseKey = normalizePhraseKey(phrase);
    return {
      phrase,
      phraseKey,
      impressions: q.impressions,
      clicks: q.clicks,
      position: q.position,
      tracked: tracked.has(phraseKey),
      selected: false,
    };
  }

  toggleRow(
    section: 'ranked' | 'ads' | 'gsc',
    phraseKey: string,
    next: boolean,
  ): void {
    const target = this.sectionSignal(section);
    target.update((rows) =>
      rows.map((r) =>
        r.phraseKey === phraseKey && !r.tracked
          ? { ...r, selected: next }
          : r,
      ),
    );
  }

  toggleAll(section: 'ranked' | 'ads' | 'gsc', next: boolean): void {
    const target = this.sectionSignal(section);
    target.update((rows) =>
      rows.map((r) => (r.tracked ? r : { ...r, selected: next })),
    );
  }

  allSelected(section: 'ranked' | 'ads' | 'gsc'): boolean {
    const rows = this.sectionSignal(section)();
    const selectable = rows.filter((r) => !r.tracked);
    return selectable.length > 0 && selectable.every((r) => r.selected);
  }

  private sectionSignal(section: 'ranked' | 'ads' | 'gsc') {
    if (section === 'ranked') return this.rankedRows;
    if (section === 'ads') return this.adsRows;
    return this.gscRows;
  }

  async addSelected(): Promise<void> {
    if (this.adding()) return;
    const picks = [
      ...this.rankedRows().filter((r) => r.selected),
      ...this.adsRows().filter((r) => r.selected),
      ...this.gscRows().filter((r) => r.selected),
    ];
    if (picks.length === 0) return;

    this.adding.set(true);
    try {
      const dedupedKeys = new Set<string>();
      for (const row of picks) {
        if (dedupedKeys.has(row.phraseKey)) continue;
        dedupedKeys.add(row.phraseKey);
        this.strategy.addKeyword({
          phrase: row.phrase,
          intent: 'commercial',
          priority: 'medium',
          notes: 'Added from Find keywords',
        });
      }
      const ok = await this.strategy.saveKeywords();
      if (ok) {
        this.messages.add({
          severity: 'success',
          summary: 'Added to plan',
          detail: `${dedupedKeys.size} keyword${dedupedKeys.size === 1 ? '' : 's'} now on your plan.`,
          life: 4000,
        });
        await this.load();
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
    return `${(value * 100).toFixed(0)}%`;
  }

  formatCpc(value: number | undefined): string {
    if (value == null || Number.isNaN(value)) return '—';
    return `$${value.toFixed(2)}`;
  }

  formatPosition(value: number | undefined): string {
    if (value == null || Number.isNaN(value)) return '—';
    return value.toFixed(1);
  }
}
