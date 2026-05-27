import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import type {
  ProtopipeKeywordSerpQuotaError,
  ProtopipeKeywordSerpResponse,
  ProtopipeSerpSnapshot,
} from '@hive/contracts';
import { Badge } from 'primeng/badge';
import { Button } from 'primeng/button';
import { Drawer } from 'primeng/drawer';
import { ProgressSpinner } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { Tag } from 'primeng/tag';
import type { ProtopipeKeywordDto } from '../protopipe.models';
import { ProtopipeApiService } from '../protopipe-api.service';

type SerpTab = 'organic' | 'local' | 'features';

@Component({
  selector: 'app-protopipe-serp-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, Badge, Button, Drawer, ProgressSpinner, TableModule, TabsModule, Tag],
  templateUrl: './protopipe-serp-drawer.component.html',
  styleUrl: './protopipe-serp-drawer.component.scss',
})
export class ProtopipeSerpDrawerComponent {
  private readonly api = inject(ProtopipeApiService);

  readonly siteId = input<string | null>(null);
  readonly keyword = input<ProtopipeKeywordDto | null>(null);
  readonly visible = model<boolean>(false);

  readonly loading = signal(false);
  readonly refreshing = signal(false);
  readonly data = signal<ProtopipeKeywordSerpResponse | null>(null);
  readonly error = signal<string | null>(null);
  readonly quotaError = signal<ProtopipeKeywordSerpQuotaError | null>(null);
  readonly activeTab = signal<SerpTab>('organic');

  readonly snapshot = computed<ProtopipeSerpSnapshot | null>(() => this.data()?.snapshot ?? null);
  readonly source = computed<'cache' | 'live' | null>(() => this.data()?.source ?? null);

  readonly localPackCount = computed(() => this.snapshot()?.localPack.length ?? 0);
  readonly organicCount = computed(() => this.snapshot()?.organicResults.length ?? 0);

  readonly featurePresenceCount = computed(() => {
    const s = this.snapshot();
    if (!s) return 0;
    const f = s.serpFeatures;
    let n = 0;
    if (f.featuredSnippet) n += 1;
    if (f.peopleAlsoAsk?.length) n += 1;
    if (f.aiOverviewPresent) n += 1;
    if (f.imagePackPresent) n += 1;
    if (f.videoPackPresent) n += 1;
    if (f.knowledgeGraphPresent) n += 1;
    return n;
  });

  private lastFetchedKey: string | null = null;

  constructor() {
    effect(() => {
      const visible = this.visible();
      const keyword = this.keyword();
      const siteId = this.siteId();
      if (!visible || !keyword || !siteId) {
        return;
      }
      const key = `${siteId}::${keyword.id}`;
      if (this.lastFetchedKey === key) return;
      this.lastFetchedKey = key;
      this.activeTab.set('organic');
      void this.load(siteId, keyword.id);
    });
  }

  private async load(siteId: string, keywordId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.quotaError.set(null);
    this.data.set(null);
    try {
      const res = await this.api.getKeywordSerp(siteId, keywordId);
      this.data.set(res);
    } catch (err) {
      this.handleError(err);
    } finally {
      this.loading.set(false);
    }
  }

  async refresh(): Promise<void> {
    const siteId = this.siteId();
    const keyword = this.keyword();
    if (!siteId || !keyword) return;
    this.refreshing.set(true);
    this.error.set(null);
    this.quotaError.set(null);
    try {
      const res = await this.api.refreshKeywordSerp(siteId, keyword.id);
      this.data.set(res);
    } catch (err) {
      this.handleError(err);
    } finally {
      this.refreshing.set(false);
    }
  }

  private handleError(err: unknown): void {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 429 && err.error && typeof err.error === 'object') {
        this.quotaError.set(err.error as ProtopipeKeywordSerpQuotaError);
        return;
      }
      const msg = (err.error?.message as string | undefined) ?? err.message;
      this.error.set(msg ?? 'Could not load SERP.');
      return;
    }
    this.error.set('Could not load SERP.');
  }

  onHide(): void {
    this.lastFetchedKey = null;
  }

  formatFetchedAt(iso: string): string {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.round(diffMs / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  formatResetAt(iso: string): string {
    const date = new Date(iso);
    const diffMs = date.getTime() - Date.now();
    if (diffMs <= 0) return 'now';
    const hours = Math.round(diffMs / (1000 * 60 * 60));
    if (hours >= 1) return `in ${hours} hr${hours === 1 ? '' : 's'}`;
    const minutes = Math.max(1, Math.round(diffMs / 60000));
    return `in ${minutes} min`;
  }

  formatRating(rating?: number): string {
    if (rating == null) return '';
    return rating.toFixed(1);
  }

  /** Compact display of cost for the snapshot header (live fetches only). */
  formatCost(usd: number): string {
    if (!usd) return '';
    if (usd < 0.01) return '<$0.01';
    return `$${usd.toFixed(3)}`;
  }
}
