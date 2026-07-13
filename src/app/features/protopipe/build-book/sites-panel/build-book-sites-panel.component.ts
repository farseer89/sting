import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import type { ProtopipePublishStatus, ProtopipeSite } from '@hive/contracts';
import { ContentPlanService } from '../../content-plan/content-plan.service';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import {
  AGENCY_PILOT_SITES,
  isValidClientSitesSlug,
  normalizeClientSitesSlug,
  type AgencyPilotSiteSpec,
} from '../agency-pilot-sites';
import { ProtopipeBuildBookShireApiService } from '../protopipe-build-book-shire-api.service';
import { ProtopipeShireSitesApiService } from '../protopipe-shire-sites-api.service';
import {
  buildAgencySitePortfolioStatus,
  type AgencySitePortfolioStatus,
  type AgencySiteStatusSignals,
} from './agency-portfolio-status.util';

@Component({
  selector: 'app-build-book-sites-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, ProgressSpinner, FormsModule],
  templateUrl: './build-book-sites-panel.component.html',
  styleUrl: './build-book-sites-panel.component.scss',
})
export class BuildBookSitesPanelComponent implements OnInit {
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly api = inject(ProtopipeApiService);
  private readonly shireSites = inject(ProtopipeShireSitesApiService);
  private readonly buildBookApi = inject(ProtopipeBuildBookShireApiService);
  private readonly contentPlanApi = inject(ContentPlanService);

  readonly activeSiteId = input<string | null>(null);
  readonly switchingSiteId = input<string | null>(null);

  readonly editSite = output<string>();
  readonly openLive = output<string>();
  readonly refreshed = output<void>();

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly registering = signal(false);
  readonly registeringPilots = signal(false);
  readonly showRegister = signal(false);
  readonly statusBySiteId = signal<Record<string, AgencySitePortfolioStatus>>({});

  readonly regDisplayName = signal('');
  readonly regUrl = signal('');
  readonly regSlug = signal('');

  readonly sites = computed(() => this.strategy.sites());
  readonly switching = computed(() => Boolean(this.switchingSiteId()));

  readonly missingPilots = computed(() => {
    const existing = new Set(
      this.sites()
        .map((s) => s.clientSitesSlug?.trim().toLowerCase())
        .filter(Boolean),
    );
    return AGENCY_PILOT_SITES.filter((p) => !existing.has(p.clientSitesSlug));
  });

  ngOnInit(): void {
    void this.refreshPortfolioStatuses();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.strategy.refreshSitesList();
      await this.refreshPortfolioStatuses();
      this.refreshed.emit();
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Could not load sites.'));
    } finally {
      this.loading.set(false);
    }
  }

  statusLabel(site: ProtopipeSite): string {
    const ps = site.publishStatus ?? 'draft';
    if (ps === 'draft') return 'Draft';
    if (ps === 'provisioning') return 'Publishing…';
    if (ps === 'live') return 'Live';
    if (ps === 'failed') return 'Failed';
    return ps;
  }

  statusTone(ps?: ProtopipePublishStatus): 'live' | 'draft' | 'busy' | 'failed' {
    if (ps === 'live') return 'live';
    if (ps === 'provisioning') return 'busy';
    if (ps === 'failed') return 'failed';
    return 'draft';
  }

  templateLabel(site: ProtopipeSite): string {
    return site.contentProfile?.templateId ?? '—';
  }

  portfolioFor(siteId: string): AgencySitePortfolioStatus | null {
    return this.statusBySiteId()[siteId] ?? null;
  }

  liveUrl(site: ProtopipeSite): string | null {
    return site.previewBaseUrl?.trim() || site.url?.trim() || null;
  }

  onEdit(siteId: string): void {
    this.editSite.emit(siteId);
  }

  onOpenLive(url: string): void {
    this.openLive.emit(url);
  }

  toggleRegister(): void {
    this.showRegister.update((v) => !v);
    this.error.set(null);
  }

  applyPilotPreset(spec: AgencyPilotSiteSpec): void {
    this.regDisplayName.set(spec.displayName);
    this.regUrl.set(spec.url);
    this.regSlug.set(spec.clientSitesSlug);
    this.showRegister.set(true);
  }

  async registerHostedSite(): Promise<void> {
    const displayName = this.regDisplayName().trim();
    const url = this.regUrl().trim();
    const slug = normalizeClientSitesSlug(this.regSlug());
    if (!displayName || !url) {
      this.error.set('Display name and URL are required.');
      return;
    }
    if (!isValidClientSitesSlug(slug)) {
      this.error.set('Slug must be lowercase letters, numbers, and hyphens (max 48).');
      return;
    }

    this.registering.set(true);
    this.error.set(null);
    try {
      const created = await this.shireSites.create({
        displayName,
        url,
        clientSitesSlug: slug,
        previewBaseUrl: url,
      });
      const pilot = AGENCY_PILOT_SITES.find((p) => p.clientSitesSlug === slug);
      if (pilot) {
        await this.seedPilotKeywords(created.id, pilot.seedKeywords);
      }
      this.api.invalidateBootstrapCache();
      await this.strategy.refreshSitesList();
      await this.refreshPortfolioStatuses();
      this.regDisplayName.set('');
      this.regUrl.set('');
      this.regSlug.set('');
      this.showRegister.set(false);
      this.refreshed.emit();
      this.editSite.emit(created.id);
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Could not register hosted site.'));
    } finally {
      this.registering.set(false);
    }
  }

  async registerMissingPilots(): Promise<void> {
    const missing = this.missingPilots();
    if (missing.length === 0) return;

    this.registeringPilots.set(true);
    this.error.set(null);
    try {
      let lastId: string | null = null;
      for (const spec of missing) {
        const linked = await this.linkOrCreatePilot(spec);
        lastId = linked;
      }
      this.api.invalidateBootstrapCache();
      await this.strategy.refreshSitesList();
      await this.refreshPortfolioStatuses();
      this.refreshed.emit();
      if (lastId) this.editSite.emit(lastId);
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Could not register pilot sites.'));
    } finally {
      this.registeringPilots.set(false);
    }
  }

  /** Create a new hosted row, or patch slug onto an existing row that matches the pilot hostname. */
  private async linkOrCreatePilot(spec: AgencyPilotSiteSpec): Promise<string> {
    const host = (() => {
      try {
        return new URL(spec.url).hostname.toLowerCase();
      } catch {
        return '';
      }
    })();
    const existing = this.sites().find((s) => {
      const slug = s.clientSitesSlug?.trim().toLowerCase();
      if (slug === spec.clientSitesSlug) return true;
      const siteHost = (s.hostname || '').toLowerCase();
      return Boolean(host) && siteHost === host;
    });

    if (existing) {
      if (existing.clientSitesSlug?.trim().toLowerCase() !== spec.clientSitesSlug) {
        await this.shireSites.patch(existing.id, {
          clientSitesSlug: spec.clientSitesSlug,
          previewBaseUrl: spec.previewBaseUrl,
        });
      }
      await this.seedPilotKeywords(existing.id, spec.seedKeywords);
      return existing.id;
    }

    const created = await this.shireSites.create({
      displayName: spec.displayName,
      url: spec.url,
      clientSitesSlug: spec.clientSitesSlug,
      previewBaseUrl: spec.previewBaseUrl,
    });
    await this.seedPilotKeywords(created.id, spec.seedKeywords);
    return created.id;
  }

  private async seedPilotKeywords(siteId: string, phrases: readonly string[]): Promise<void> {
    if (phrases.length === 0) return;
    try {
      await this.api.saveKeywords(siteId, {
        keywords: phrases.map((phrase) => ({
          phrase,
          intent: 'commercial' as const,
          priority: 'high' as const,
          notes: 'Agency pilot seed',
        })),
      });
    } catch {
      // Keywords are best-effort — registration still succeeds without them.
    }
  }

  async confirmDelete(site: ProtopipeSite): Promise<void> {
    const slug = site.clientSitesSlug ?? site.id;
    const ok = window.confirm(
      `Delete "${site.displayName}" (${slug})? This removes the site record and related Build Book data.`,
    );
    if (!ok) return;

    const wasActive = this.activeSiteId() === site.id;
    this.deletingId.set(site.id);
    this.error.set(null);
    try {
      await this.api.deleteSite(site.id);
      this.api.invalidateBootstrapCache();
      await this.strategy.refreshSitesList();
      await this.refreshPortfolioStatuses();
      if (wasActive) {
        const next = this.strategy.sites()[0];
        if (next) {
          this.editSite.emit(next.id);
        }
      }
      this.refreshed.emit();
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Could not delete site.'));
    } finally {
      this.deletingId.set(null);
    }
  }

  private async refreshPortfolioStatuses(): Promise<void> {
    const sites = this.strategy.sites();
    const activeId = this.activeSiteId() ?? this.strategy.siteId();
    const entries = await Promise.all(
      sites.map(async (site) => {
        const signals = await this.loadSignalsForSite(site, activeId === site.id);
        return [site.id, buildAgencySitePortfolioStatus(site, signals)] as const;
      }),
    );
    this.statusBySiteId.set(Object.fromEntries(entries));
  }

  private async loadSignalsForSite(
    site: ProtopipeSite,
    isActive: boolean,
  ): Promise<AgencySiteStatusSignals> {
    const signals: AgencySiteStatusSignals = {};

    if (isActive) {
      signals.keywordCount = this.strategy.keywords().length;
    } else {
      try {
        const plan = await this.api.getPlan(site.id);
        signals.keywordCount = plan.keywords?.length ?? 0;
      } catch {
        signals.keywordCount = null;
      }
    }

    try {
      const latest = await this.contentPlanApi.getLatest(site.id);
      const plan = latest.plan;
      const calendar = plan?.calendar ?? [];
      signals.calendarItemCount = calendar.length;
      signals.contentPlanComplete = plan?.status === 'complete';
    } catch {
      signals.contentPlanComplete = false;
      signals.calendarItemCount = 0;
    }

    try {
      const book = await this.buildBookApi.get(site.id);
      const pages = book.buildBook?.pages ?? [];
      signals.blogPostPageCount = pages.filter((p) => p.kind === 'blog-post').length;
      signals.hasBlogHome = pages.some((p) => p.kind === 'blog-home');
    } catch {
      signals.blogPostPageCount = 0;
      signals.hasBlogHome = false;
    }

    return signals;
  }
}
