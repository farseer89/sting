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

type SerpTab = 'results' | 'local' | 'features';

interface UnifiedResultRow {
  kind: 'organic' | 'local';
  position: number;
  title: string;
  subtitle?: string;
  url?: string;
  domain?: string;
  isYourSite?: boolean;
  localIndex?: number;
}

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
  readonly siteDefaultLocationCode = input<number | null>(null);
  readonly visible = model<boolean>(false);

  readonly loading = signal(false);
  readonly refreshing = signal(false);
  readonly data = signal<ProtopipeKeywordSerpResponse | null>(null);
  readonly error = signal<string | null>(null);
  readonly quotaError = signal<ProtopipeKeywordSerpQuotaError | null>(null);
  readonly activeTab = signal<SerpTab>('results');

  readonly locationOptions = LOCATION_OPTIONS;
  readonly selectedLocationCode = signal<number>(LOCATION_OPTIONS[0].code);

  readonly snapshot = computed<ProtopipeSerpSnapshot | null>(() => this.data()?.snapshot ?? null);
  readonly source = computed<'cache' | 'live' | null>(() => this.data()?.source ?? null);

  readonly localPackCount = computed(() => this.snapshot()?.localPack.length ?? 0);
  readonly organicCount = computed(() => this.snapshot()?.organicResults.length ?? 0);

  readonly unifiedResults = computed<UnifiedResultRow[]>(() => {
    const s = this.snapshot();
    if (!s) return [];
    const rows: UnifiedResultRow[] = [];
    for (const o of s.organicResults) {
      rows.push({
        kind: 'organic',
        position: o.position,
        title: o.title,
        subtitle: o.displayedUrl ?? o.url,
        url: o.url,
        domain: o.domain,
        isYourSite: o.isYourSite,
      });
    }
    s.localPack.forEach((l, idx) => {
      rows.push({
        kind: 'local',
        position: l.position,
        title: l.title,
        subtitle: l.address ?? l.categories?.join(', '),
        localIndex: idx,
      });
    });
    rows.sort((a, b) => a.position - b.position);
    return rows;
  });

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

  /** Local pack rows that have geocoded coordinates — drives map markers. */
  readonly mappableLocalRows = computed(() => {
    const s = this.snapshot();
    if (!s) return [];
    return s.localPack
      .map((row) => {
        const lat = row.placeEnrichment?.lat;
        const lng = row.placeEnrichment?.lng;
        if (lat == null || lng == null) return null;
        return { row, lat, lng };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  });

  readonly mapEl = viewChild<ElementRef<HTMLDivElement>>('mapEl');
  private map: L.Map | null = null;
  private markersLayer: L.LayerGroup | null = null;

  private lastFetchedKey: string | null = null;

  constructor() {
    effect(() => {
      const visible = this.visible();
      const keyword = this.keyword();
      const siteId = this.siteId();
      if (!visible || !keyword || !siteId) return;
      const key = `${siteId}::${keyword.id}`;
      if (this.lastFetchedKey === key) return;
      this.lastFetchedKey = key;
      this.activeTab.set('results');
      const defaultLoc = this.siteDefaultLocationCode();
      const initial =
        defaultLoc != null && LOCATION_OPTIONS.some((o) => o.code === defaultLoc)
          ? defaultLoc
          : LOCATION_OPTIONS[0].code;
      this.selectedLocationCode.set(initial);
      void this.load(siteId, keyword.id, initial);
    });

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
        L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 19,
            attribution:
              'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
          },
        ).addTo(this.map);
        L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 19, opacity: 0.8 },
        ).addTo(this.map);
        this.markersLayer = L.layerGroup().addTo(this.map);
      }
      this.map.setView([view.lat, view.lng], view.zoom, { animate: false });
      setTimeout(() => this.map?.invalidateSize(), 0);
      this.renderMarkers();
    });

    effect(() => {
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
      const rating =
        item.row.rating != null
          ? `★ ${item.row.rating.toFixed(1)}${
              item.row.reviewCount != null ? ` (${item.row.reviewCount})` : ''
            }`
          : '';
      const address = item.row.address ?? '';
      marker.bindPopup(
        `<strong>#${item.row.position} · ${escapeHtml(item.row.title)}</strong><br/>` +
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
