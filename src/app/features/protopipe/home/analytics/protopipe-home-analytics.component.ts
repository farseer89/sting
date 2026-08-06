import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { ShireSiteAnalyticsResponse } from '@hive/contracts';
import { isShireHostedSite } from '@hive/contracts';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import type {
  AnalyticsFunnel,
  AnalyticsSection,
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
export class ProtopipeHomeAnalyticsComponent implements OnInit {
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly api = inject(ProtopipeApiService);

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

  readonly sections: { id: AnalyticsSection; label: string }[] = [
    { id: 'pulse', label: 'Pulse' },
    { id: 'content', label: 'Content' },
    { id: 'funnels', label: 'Funnels' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'heatmaps', label: 'Heatmaps' },
    { id: 'experiments', label: 'Experiments' },
    { id: 'signals', label: 'AI signals' },
  ];

  readonly activeFunnel = computed<AnalyticsFunnel | null>(() => {
    const snap = this.snapshot();
    if (!snap) return null;
    return snap.funnels.find((funnel) => funnel.id === this.activeFunnelId()) ?? snap.funnels[0] ?? null;
  });

  readonly activeHeatmap = computed(() => {
    const snap = this.snapshot();
    if (!snap) return null;
    return (
      snap.heatmaps.find((heatmap) => heatmap.id === this.activeHeatmapId()) ?? snap.heatmaps[0] ?? null
    );
  });

  readonly signalCount = computed(() => this.snapshot()?.signals.length ?? 0);

  ngOnInit(): void {
    void this.reload();
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

    if (!hosted || !siteId) {
      this.snapshot.set(null);
      this.live.set(false);
      return;
    }

    this.loading.set(true);
    try {
      const res = await this.api.getSiteAnalytics(siteId);
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
      contentRows: res.contentRows,
      funnels: res.funnels,
      sessions: res.sessions,
      playlists: res.playlists,
      heatmaps: res.heatmaps,
      experiments: res.experiments,
      signals: res.signals,
    };
    this.snapshot.set(snap);
    this.live.set(res.source === 'posthog');
    this.activeFunnelId.set(snap.funnels[0]?.id ?? 'content-to-lead');
    this.activeHeatmapId.set(snap.heatmaps[0]?.id ?? 'home');
  }

  setSection(section: AnalyticsSection): void {
    this.activeSection.set(section);
  }

  setFunnel(id: string): void {
    this.activeFunnelId.set(id);
  }

  setHeatmap(id: string): void {
    this.activeHeatmapId.set(id);
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
}
