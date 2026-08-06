import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import type {
  ShireAnalyticsReplayShareResponse,
  ShireSiteAnalyticsResponse,
} from '@hive/contracts';
import { isShireHostedSite } from '@hive/contracts';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import type {
  AnalyticsFunnel,
  AnalyticsHeatmapPage,
  AnalyticsSection,
  AnalyticsSessionRow,
  HomeAnalyticsSnapshot,
} from './protopipe-home-analytics.model';

type SeriesChartModel = {
  pvArea: string;
  pv: string;
  sess: string;
  leads: string;
  dots: { x: number; pvY: number; sessY: number; leadsY: number; label: string }[];
  labels: { x: number; text: string }[];
};

@Component({
  selector: 'app-protopipe-home-analytics',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-home-analytics.component.html',
  styleUrl: './protopipe-home-analytics.component.scss',
})
export class ProtopipeHomeAnalyticsComponent implements OnInit, AfterViewChecked {
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly api = inject(ProtopipeApiService);
  private readonly sanitizer = inject(DomSanitizer);

  @ViewChild('heatmapCanvas') heatmapCanvas?: ElementRef<HTMLCanvasElement>;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly hostedSite = signal(false);
  readonly siteSlug = signal<string | null>(null);
  readonly siteHostname = signal<string | null>(null);
  readonly snapshot = signal<HomeAnalyticsSnapshot | null>(null);
  readonly live = signal(false);
  readonly unavailableMessage = signal<string | null>(null);
  readonly activeSection = signal<AnalyticsSection>('pulse');
  readonly activeFunnelId = signal<string>('content-to-lead');
  readonly activeHeatmapId = signal<string>('home');
  readonly selectedSession = signal<AnalyticsSessionRow | null>(null);
  readonly replayLoading = signal(false);
  readonly replayError = signal<string | null>(null);
  readonly replayEmbedUrl = signal<string | null>(null);
  readonly heatmapType = signal<'clicks' | 'scroll'>('clicks');

  readonly replayEmbedSafe = computed<SafeResourceUrl | null>(() => {
    const url = this.replayEmbedUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  readonly heatmapPageSafe = computed<SafeResourceUrl | null>(() => {
    const url = this.activeHeatmap()?.url;
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  readonly heatmapPageHeight = computed(() => {
    const heatmap = this.activeHeatmap();
    if (!heatmap) return 1400;
    const maxPointY = Math.max(0, ...heatmap.points.map((p) => p.y));
    const viewport = heatmap.medianViewportHeight ?? 900;
    return Math.max(1200, Math.round(maxPointY + viewport), Math.round(viewport * 2.2));
  });

  private heatmapPaintKey = '';

  readonly sections: { id: AnalyticsSection; label: string }[] = [
    { id: 'pulse', label: 'Web analytics' },
    { id: 'content', label: 'Pages' },
    { id: 'funnels', label: 'Funnels' },
    { id: 'sessions', label: 'Replays' },
    { id: 'heatmaps', label: 'Heatmaps' },
    { id: 'experiments', label: 'Experiments' },
    { id: 'signals', label: 'Insights' },
  ];

  readonly activeFunnel = computed<AnalyticsFunnel | null>(() => {
    const snap = this.snapshot();
    if (!snap) return null;
    return snap.funnels.find((funnel) => funnel.id === this.activeFunnelId()) ?? snap.funnels[0] ?? null;
  });

  readonly activeHeatmap = computed<AnalyticsHeatmapPage | null>(() => {
    const snap = this.snapshot();
    if (!snap) return null;
    return (
      snap.heatmaps.find((heatmap) => heatmap.id === this.activeHeatmapId()) ?? snap.heatmaps[0] ?? null
    );
  });

  readonly signalCount = computed(() => this.snapshot()?.signals.length ?? 0);
  readonly sessionCount = computed(() => this.snapshot()?.sessions.length ?? 0);

  readonly maxSourceSessions = computed(() => {
    const sources = this.snapshot()?.trafficSources ?? [];
    return Math.max(1, ...sources.map((s) => s.sessions));
  });

  readonly seriesChart = computed<SeriesChartModel | null>(() => {
    const series = this.snapshot()?.series ?? [];
    if (!series.length) return null;

    const w = 640;
    const h = 180;
    const padX = 18;
    const padTop = 16;
    const padBottom = 28;
    const maxY = Math.max(1, ...series.map((p) => Math.max(p.pageviews, p.sessions, p.leads)));
    const x = (i: number) => padX + (i / Math.max(series.length - 1, 1)) * (w - padX * 2);
    const y = (v: number) => h - padBottom - (v / maxY) * (h - padTop - padBottom);

    const pathFor = (values: number[]) =>
      values
        .map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
        .join(' ');

    const pvValues = series.map((p) => p.pageviews);
    const lastX = x(series.length - 1);
    const firstX = x(0);
    const baseY = h - padBottom;

    return {
      pvArea: `${pathFor(pvValues)} L ${lastX.toFixed(1)} ${baseY} L ${firstX.toFixed(1)} ${baseY} Z`,
      pv: pathFor(pvValues),
      sess: pathFor(series.map((p) => p.sessions)),
      leads: pathFor(series.map((p) => p.leads)),
      dots: series.map((p, i) => ({
        x: x(i),
        pvY: y(p.pageviews),
        sessY: y(p.sessions),
        leadsY: y(p.leads),
        label: p.date.slice(5),
      })),
      labels: series.map((p, i) => ({
        x: x(i),
        text: p.date.slice(5),
      })),
    };
  });

  ngOnInit(): void {
    void this.reload();
  }

  ngAfterViewChecked(): void {
    if (this.activeSection() === 'heatmaps') this.paintHeatmap();
  }

  async reload(): Promise<void> {
    const site = this.strategy.site();
    const hosted = isShireHostedSite(site ?? {});
    const slug = site?.clientSitesSlug?.trim().toLowerCase() || null;
    const hostname = site?.hostname?.trim().toLowerCase() || null;
    const siteId = this.strategy.siteId();

    this.hostedSite.set(hosted);
    this.siteSlug.set(slug);
    this.siteHostname.set(hostname);
    this.error.set(null);
    this.unavailableMessage.set(null);
    this.closeReplay();

    if (!hosted || !siteId) {
      this.snapshot.set(null);
      this.live.set(false);
      return;
    }

    this.loading.set(true);
    try {
      const res = await this.api.getHostedSiteAnalytics(siteId);
      this.applyResponse(res);
    } catch (err) {
      this.snapshot.set(null);
      this.live.set(false);
      this.error.set(parseProtopipeApiError(err, 'Could not load analytics.'));
    } finally {
      this.loading.set(false);
    }
  }

  private applyResponse(res: ShireSiteAnalyticsResponse): void {
    if (!res.available) {
      this.snapshot.set(null);
      this.live.set(false);
      this.unavailableMessage.set(res.message ?? 'Analytics are not available for this site yet.');
      return;
    }

    const snap: HomeAnalyticsSnapshot = {
      siteSlug: res.siteSlug,
      siteLabel: res.siteLabel,
      hostname: res.hostname,
      rangeLabel: res.rangeLabel,
      filterNote: res.filterNote,
      pulse: res.pulse,
      series: res.series ?? [],
      trafficSources: res.trafficSources ?? [],
      contentRows: res.contentRows,
      funnels: res.funnels,
      sessions: res.sessions.map((session) => ({
        ...session,
        startedAt: session.startedAt || '',
        endedAt: session.endedAt,
      })),
      playlists: res.playlists,
      heatmaps: res.heatmaps.map((heatmap) => ({
        ...heatmap,
        rangeLabel: heatmap.rangeLabel || res.rangeLabel,
        dateFrom: heatmap.dateFrom || '',
        dateTo: heatmap.dateTo || '',
        points: heatmap.points ?? [],
        scrollBuckets: heatmap.scrollBuckets ?? [],
        sections: heatmap.sections ?? [],
      })),
      experiments: res.experiments,
      signals: res.signals,
    };
    this.snapshot.set(snap);
    this.live.set(res.source === 'posthog');
    this.activeFunnelId.set(snap.funnels[0]?.id ?? 'content-to-lead');
    this.activeHeatmapId.set(snap.heatmaps[0]?.id ?? 'home');
    this.heatmapPaintKey = '';
  }

  setSection(section: AnalyticsSection): void {
    this.activeSection.set(section);
    this.heatmapPaintKey = '';
  }

  setFunnel(id: string): void {
    this.activeFunnelId.set(id);
  }

  setHeatmap(id: string): void {
    this.activeHeatmapId.set(id);
    this.heatmapPaintKey = '';
  }

  setHeatmapType(type: 'clicks' | 'scroll'): void {
    this.heatmapType.set(type);
    this.heatmapPaintKey = '';
  }

  async openReplay(session: AnalyticsSessionRow): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;

    this.selectedSession.set(session);
    this.replayEmbedUrl.set(session.embedUrl ?? null);
    this.replayError.set(null);

    if (session.embedUrl) return;

    this.replayLoading.set(true);
    try {
      const res: ShireAnalyticsReplayShareResponse = await this.api.shareHostedReplay(
        siteId,
        session.id,
      );
      if (res.embedUrl) {
        this.replayEmbedUrl.set(res.embedUrl);
        this.snapshot.update((snap) => {
          if (!snap) return snap;
          return {
            ...snap,
            sessions: snap.sessions.map((row) =>
              row.id === session.id ? { ...row, embedUrl: res.embedUrl } : row,
            ),
          };
        });
      } else {
        this.replayError.set(
          res.message ??
            'Embeddable replay needs sharing_configuration:write on the PostHog API key.',
        );
      }
    } catch (err) {
      this.replayError.set(parseProtopipeApiError(err, 'Could not open replay.'));
    } finally {
      this.replayLoading.set(false);
    }
  }

  closeReplay(): void {
    this.selectedSession.set(null);
    this.replayEmbedUrl.set(null);
    this.replayError.set(null);
    this.replayLoading.set(false);
  }

  barWidth(count: number, max: number): number {
    if (max <= 0) return 0;
    return Math.round((count / max) * 100);
  }

  formatDateTime(iso: string | undefined | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(d);
  }

  formatDate(isoDate: string | undefined | null): string {
    if (!isoDate) return '—';
    const d = new Date(`${isoDate.slice(0, 10)}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) return isoDate;
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  }

  trendClass(trend: 'up' | 'down' | 'flat'): string {
    return `analytics-trend analytics-trend--${trend}`;
  }

  severityClass(severity: string): string {
    return `signal-card signal-card--${severity}`;
  }

  statusClass(status: string): string {
    return `analytics-pill analytics-pill--${status}`;
  }

  valueClass(value: 'high' | 'medium' | 'low'): string {
    return `analytics-pill analytics-pill--${value}`;
  }

  private paintHeatmap(): void {
    const canvas = this.heatmapCanvas?.nativeElement;
    const heatmap = this.activeHeatmap();
    if (!canvas || !heatmap) return;

    const pageHeight = this.heatmapPageHeight();
    const key = `${heatmap.id}:${this.heatmapType()}:${heatmap.points.length}:${heatmap.scrollBuckets.length}:${pageHeight}:${canvas.clientWidth}`;
    if (key === this.heatmapPaintKey) return;
    this.heatmapPaintKey = key;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 720;
    const height = pageHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (this.heatmapType() === 'scroll') {
      const buckets = heatmap.scrollBuckets;
      buckets.forEach((bucket, i) => {
        const y0 = (i / Math.max(buckets.length, 1)) * height;
        const h = height / Math.max(buckets.length, 1);
        const alpha = Math.min(0.55, 0.08 + bucket.reachPct / 180);
        ctx.fillStyle = `rgba(10, 147, 150, ${alpha})`;
        ctx.fillRect(0, y0, width, h);
      });
      return;
    }

    if (!heatmap.points.length) return;

    const maxCount = Math.max(1, ...heatmap.points.map((p) => p.count));
    for (const point of heatmap.points) {
      const px = Math.min(1, Math.max(0, point.x)) * width;
      const py = Math.min(height - 8, Math.max(8, point.y));
      const radius = 14 + (point.count / maxCount) * 36;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
      const hot = point.count / maxCount;
      grad.addColorStop(0, `rgba(255, ${Math.round(60 + 80 * (1 - hot))}, 10, ${0.65 + hot * 0.3})`);
      grad.addColorStop(0.45, `rgba(255, 120, 20, ${0.28 + hot * 0.2})`);
      grad.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
