import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Button } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import type { ProtopipePublishStatus, ProtopipeSite } from '@hive/contracts';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';

@Component({
  selector: 'app-build-book-sites-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, ProgressSpinner],
  templateUrl: './build-book-sites-panel.component.html',
  styleUrl: './build-book-sites-panel.component.scss',
})
export class BuildBookSitesPanelComponent {
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly api = inject(ProtopipeApiService);

  readonly activeSiteId = input<string | null>(null);
  readonly switchingSiteId = input<string | null>(null);

  readonly editSite = output<string>();
  readonly openLive = output<string>();
  readonly refreshed = output<void>();

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);

  readonly sites = computed(() => this.strategy.sites());
  readonly switching = computed(() => Boolean(this.switchingSiteId()));

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.strategy.refreshSitesList();
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

  onEdit(siteId: string): void {
    this.editSite.emit(siteId);
  }

  onOpenLive(url: string): void {
    this.openLive.emit(url);
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
}
