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
  @ViewChild('seriesSvg') seriesSvg?: ElementRef<SVGSVGElement>;

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

  private heatmapPaintKey = '';
  private seriesPaintKey = '';

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

  ngOnInit(): void {
    void this.reload();
  }

  ngAfterViewChecked(): void {
    if (this.activeSection() === 'pulse') this.paintSeries();
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
      sessions: res.sessions,
      playlists: res.playlists,
      heatmaps: res.heatmaps.map((heatmap) => ({
        ...heatmap,
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
    this.seriesPaintKey = '';
    this.heatmapPaintKey = '';
  }

  setSection(section: AnalyticsSection): void {
    this.activeSection.set(section);
    this.seriesPaintKey = '';
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

  private paintSeries(): void {
    const svg = this.seriesSvg?.nativeElement;
    const series = this.snapshot()?.series ?? [];
    if (!svg || !series.length) return;
    const key = series.map((p) => `${p.date}:${p.sessions}:${p.pageviews}:${p.leads}`).join('|');
    if (key === this.seriesPaintKey) return;
    this.seriesPaintKey = key;

    const w = 640;
    const h = 160;
    const pad = 16;
    const maxY = Math.max(1, ...series.map((p) => Math.max(p.pageviews, p.sessions, p.leads)));
    const x = (i: number) => pad + (i / Math.max(series.length - 1, 1)) * (w - pad * 2);
    const y = (v: number) => h - pad - (v / maxY) * (h - pad * 2);

    const pathFor = (values: number[]) =>
      values
        .map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
        .join(' ');

    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.innerHTML = `
      <defs>
        <linearGradient id="pvFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(10,147,150,0.28)"/>
          <stop offset="100%" stop-color="rgba(10,147,150,0)"/>
        </linearGradient>
      </defs>
      <path d="${pathFor(series.map((p) => p.pageviews))} L ${x(series.length - 1)} ${h - pad} L ${x(0)} ${h - pad} Z" fill="url(#pvFill)"/>
      <path d="${pathFor(series.map((p) => p.pageviews))}" fill="none" stroke="#0a9396" stroke-width="2.5"/>
      <path d="${pathFor(series.map((p) => p.sessions))}" fill="none" stroke="#005f73" stroke-width="2" stroke-dasharray="4 3"/>
      <path d="${pathFor(series.map((p) => p.leads))}" fill="none" stroke="#ee9b00" stroke-width="2.5"/>
    `;
  }

  private paintHeatmap(): void {
    const canvas = this.heatmapCanvas?.nativeElement;
    const heatmap = this.activeHeatmap();
    if (!canvas || !heatmap) return;

    const key = `${heatmap.id}:${this.heatmapType()}:${heatmap.points.length}:${heatmap.scrollBuckets.length}`;
    if (key === this.heatmapPaintKey) return;
    this.heatmapPaintKey = key;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 720;
    const height = 420;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(0, (i / 8) * height, width, 1);
    }

    if (this.heatmapType() === 'scroll') {
      const buckets = heatmap.scrollBuckets;
      buckets.forEach((bucket, i) => {
        const y0 = (i / Math.max(buckets.length, 1)) * height;
        const h = height / Math.max(buckets.length, 1);
        const alpha = Math.min(0.85, 0.15 + bucket.reachPct / 120);
        ctx.fillStyle = `rgba(10, 147, 150, ${alpha})`;
        ctx.fillRect(0, y0, width, h - 1);
      });
      return;
    }

    const maxCount = Math.max(1, ...heatmap.points.map((p) => p.count));
    const maxY = Math.max(800, ...heatmap.points.map((p) => p.y), 1);
    for (const point of heatmap.points) {
      const px = point.x * width;
      const py = (point.y / maxY) * height;
      const radius = 10 + (point.count / maxCount) * 28;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
      const hot = point.count / maxCount;
      grad.addColorStop(0, `rgba(255, ${Math.round(80 + 100 * (1 - hot))}, 20, ${0.55 + hot * 0.35})`);
      grad.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
