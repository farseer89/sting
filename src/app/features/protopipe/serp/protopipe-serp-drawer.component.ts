import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  ProtopipeKeywordSerpQuotaError,
  ProtopipeKeywordSerpResponse,
  ProtopipePlaceDetails,
  ProtopipeSerpSnapshot,
} from '@hive/contracts';
import * as L from 'leaflet';
import { Badge } from 'primeng/badge';
import { Button } from 'primeng/button';
import { Drawer } from 'primeng/drawer';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { Tag } from 'primeng/tag';
import type { ProtopipeKeywordDto } from '../protopipe.models';
import { ProtopipeApiService } from '../protopipe-api.service';
import { protopipePlacePhotoUrl } from '../protopipe-http.util';

type SerpTab = 'organic' | 'local' | 'features';

interface LocationOption {
  code: number;
  name: string;
}

/** Mirror of bagend SERP_LOCATION_OPTIONS; kept in sync manually for now. */
const LOCATION_OPTIONS: LocationOption[] = [
  { code: 2840, name: 'United States' },
  { code: 21144, name: 'Hawaii' },
  { code: 1015603, name: 'Maui' },
];

/** Map view per location code — drives Leaflet center + zoom on the local pack tab. */
const MAP_VIEW_BY_LOCATION: Record<number, { lat: number; lng: number; zoom: number }> = {
  2840: { lat: 39.5, lng: -98.35, zoom: 4 },
  21144: { lat: 20.7984, lng: -156.3319, zoom: 8 },
  1015603: { lat: 20.8783, lng: -156.6825, zoom: 11 },
};

const DEFAULT_MAP_VIEW = MAP_VIEW_BY_LOCATION[2840];

@Component({
  selector: 'app-protopipe-serp-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    Badge,
    Button,
    Drawer,
    ProgressSpinner,
    Select,
    TableModule,
    TabsModule,
    Tag,
  ],
  templateUrl: './protopipe-serp-drawer.component.html',
  styleUrl: './protopipe-serp-drawer.component.scss',
})
export class ProtopipeSerpDrawerComponent {
  private readonly api = inject(ProtopipeApiService);

  readonly siteId = input<string | null>(null);
  readonly keyword = input<ProtopipeKeywordDto | null>(null);
  /** Site's default geo target — used as the initial selection. */
  readonly siteDefaultLocationCode = input<number | null>(null);
  readonly visible = model<boolean>(false);

  readonly loading = signal(false);
  readonly refreshing = signal(false);
  readonly data = signal<ProtopipeKeywordSerpResponse | null>(null);
  readonly error = signal<string | null>(null);
  readonly quotaError = signal<ProtopipeKeywordSerpQuotaError | null>(null);
  readonly activeTab = signal<SerpTab>('organic');

  readonly locationOptions = LOCATION_OPTIONS;
  readonly selectedLocationCode = signal<number>(LOCATION_OPTIONS[0].code);

  /** Per-placeId Place Details, populated lazily as enrichment requests settle. */
  readonly placeDetails = signal<Record<string, ProtopipePlaceDetails>>({});
  readonly placeDetailsLoading = signal<Record<string, boolean>>({});

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

  /** Local pack rows that have at least one coord — drives map marker count. */
  readonly mappableLocalRows = computed(() => {
    const s = this.snapshot();
    if (!s) return [];
    const details = this.placeDetails();
    return s.localPack
      .map((row) => {
        const enriched = row.placeId ? details[row.placeId] : undefined;
        const lat = enriched?.location?.latitude;
        const lng = enriched?.location?.longitude;
        if (lat == null || lng == null) return null;
        return { row, enriched, lat, lng };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  });

  readonly mapEl = viewChild<ElementRef<HTMLDivElement>>('mapEl');
  private map: L.Map | null = null;
  private markersLayer: L.LayerGroup | null = null;

  private lastFetchedKey: string | null = null;

  constructor() {
    // Reset selection to site default whenever a new keyword/site combo opens.
    effect(() => {
      const visible = this.visible();
      const keyword = this.keyword();
      const siteId = this.siteId();
      if (!visible || !keyword || !siteId) return;
      const key = `${siteId}::${keyword.id}`;
      if (this.lastFetchedKey === key) return;
      this.lastFetchedKey = key;
      this.activeTab.set('organic');
      const defaultLoc = this.siteDefaultLocationCode();
      const initial =
        defaultLoc != null && LOCATION_OPTIONS.some((o) => o.code === defaultLoc)
          ? defaultLoc
          : LOCATION_OPTIONS[0].code;
      this.selectedLocationCode.set(initial);
      void this.load(siteId, keyword.id, initial);
    });

    // Auto-enrich each local pack row with Google Places details as the snapshot lands.
    effect(() => {
      const snap = this.snapshot();
      if (!snap) return;
      const siteId = this.siteId();
      if (!siteId) return;
      const have = this.placeDetails();
      const inflight = this.placeDetailsLoading();
      for (const row of snap.localPack) {
        if (!row.placeId) continue;
        if (have[row.placeId] || inflight[row.placeId]) continue;
        void this.enrich(row.placeId);
      }
    });

    // Leaflet map: create/update when local tab active + we have mappable rows.
    afterRenderEffect(() => {
      const el = this.mapEl()?.nativeElement;
      if (!el) {
        this.destroyMap();
        return;
      }
      if (this.activeTab() !== 'local') return;
      const view = MAP_VIEW_BY_LOCATION[this.selectedLocationCode()] ?? DEFAULT_MAP_VIEW;
      if (!this.map) {
        this.map = L.map(el, { zoomControl: true, attributionControl: true });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(this.map);
        this.markersLayer = L.layerGroup().addTo(this.map);
      }
      this.map.setView([view.lat, view.lng], view.zoom, { animate: false });
      // Containers laid out inside hidden tabs start with 0 dimensions —
      // force a recalc once the panel becomes visible.
      setTimeout(() => this.map?.invalidateSize(), 0);
      this.renderMarkers();
    });

    // Re-render markers when enrichment data lands.
    effect(() => {
      this.placeDetails();
      this.mappableLocalRows();
      if (this.map && this.activeTab() === 'local') {
        this.renderMarkers();
      }
    });
  }

  private renderMarkers(): void {
    if (!this.map || !this.markersLayer) return;
    this.markersLayer.clearLayers();
    for (const item of this.mappableLocalRows()) {
      const marker = L.marker([item.lat, item.lng]);
      const title = item.enriched?.displayName ?? item.row.title;
      const subtitle =
        item.enriched?.primaryTypeDisplayName ??
        item.row.categories?.join(', ') ??
        '';
      const rating =
        item.enriched?.rating != null
          ? `★ ${item.enriched.rating.toFixed(1)} (${item.enriched.userRatingCount ?? '?'})`
          : item.row.rating != null
          ? `★ ${item.row.rating.toFixed(1)}${
              item.row.reviewCount != null ? ` (${item.row.reviewCount})` : ''
            }`
          : '';
      const address = item.enriched?.formattedAddress ?? item.row.address ?? '';
      marker.bindPopup(
        `<strong>#${item.row.position} · ${escapeHtml(title)}</strong><br/>` +
          (subtitle ? `<small>${escapeHtml(subtitle)}</small><br/>` : '') +
          (rating ? `${escapeHtml(rating)}<br/>` : '') +
          (address ? `<small>${escapeHtml(address)}</small>` : ''),
      );
      marker.addTo(this.markersLayer);
    }
  }

  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.markersLayer = null;
    }
  }

  private async load(siteId: string, keywordId: string, locationCode: number): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.quotaError.set(null);
    this.data.set(null);
    this.placeDetails.set({});
    this.placeDetailsLoading.set({});
    try {
      const res = await this.api.getKeywordSerp(siteId, keywordId, { locationCode });
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
      const res = await this.api.refreshKeywordSerp(siteId, keyword.id, {
        locationCode: this.selectedLocationCode(),
      });
      this.data.set(res);
      this.placeDetails.set({});
      this.placeDetailsLoading.set({});
    } catch (err) {
      this.handleError(err);
    } finally {
      this.refreshing.set(false);
    }
  }

  onLocationChange(code: number): void {
    if (code === this.selectedLocationCode()) return;
    this.selectedLocationCode.set(code);
    const siteId = this.siteId();
    const keyword = this.keyword();
    if (!siteId || !keyword) return;
    void this.load(siteId, keyword.id, code);
  }

  private async enrich(placeId: string): Promise<void> {
    this.placeDetailsLoading.update((m) => ({ ...m, [placeId]: true }));
    try {
      const res = await this.api.getPlaceDetails(placeId);
      this.placeDetails.update((m) => ({ ...m, [placeId]: res.details }));
    } catch {
      // Swallow — the row falls back to SERP-side fields. No global error.
    } finally {
      this.placeDetailsLoading.update((m) => {
        const copy = { ...m };
        delete copy[placeId];
        return copy;
      });
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
    this.destroyMap();
  }

  detailsFor(placeId: string | undefined): ProtopipePlaceDetails | undefined {
    if (!placeId) return undefined;
    return this.placeDetails()[placeId];
  }

  isEnriching(placeId: string | undefined): boolean {
    if (!placeId) return false;
    return Boolean(this.placeDetailsLoading()[placeId]);
  }

  photoUrl(name: string, maxHeightPx = 160): string {
    return protopipePlacePhotoUrl(name, maxHeightPx);
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

  formatCost(usd: number): string {
    if (!usd) return '';
    if (usd < 0.01) return '<$0.01';
    return `$${usd.toFixed(3)}`;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
