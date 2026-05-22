import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Tag } from 'primeng/tag';
import type { ProtopipePublishStatus, ProtopipeSite } from '@hive/contracts';
import { ProtopipeApiService } from '../protopipe-api.service';
import { parseProtopipeApiError } from '../protopipe-http.util';

@Component({
  selector: 'app-my-sites-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, Tag, ProgressSpinner, Button],
  template: `
    <div class="sites-page">
      <header class="page-header">
        <div class="page-header__row">
          <div>
            <h1>My landing sites</h1>
            <p class="lead">Edit a site and use Publish to deploy to Cloudflare Pages.</p>
          </div>
          <a routerLink="/protopipe/site-builder/add-site" pButton label="Add site" icon="pi pi-plus"></a>
        </div>
      </header>

      @if (loading()) {
        <p-progressSpinner ariaLabel="Loading sites" />
      } @else if (error(); as err) {
        <p class="error">{{ err }}</p>
      } @else if (sites().length === 0) {
        <p-card>
          <p>No sites yet.</p>
          <a routerLink="/protopipe/site-builder/templates" pButton label="Browse templates" class="mt-2"></a>
        </p-card>
      } @else {
        <div class="site-grid">
          @for (site of sites(); track site.id) {
            <p-card class="site-card">
              <div class="site-card__head">
                <h2>{{ site.displayName }}</h2>
                <p-tag [value]="statusLabel(site)" [severity]="statusSeverity(site.publishStatus)" />
              </div>
              <p class="slug">{{ site.clientSitesSlug ?? site.hostname }}</p>
              @if (site.previewBaseUrl && site.publishStatus === 'live') {
                <p>
                  <a [href]="site.previewBaseUrl" target="_blank" rel="noopener">{{ site.previewBaseUrl }}</a>
                </p>
              }
              @if (site.publishStatus === 'failed' && site.provisioningError) {
                <p class="error">{{ site.provisioningError }}</p>
              }
              <div class="site-card__actions">
                <a
                  [routerLink]="['/protopipe/site-builder/sites', site.id, 'edit']"
                  pButton
                  label="Edit & publish"
                  icon="pi pi-pencil"
                  size="small"
                ></a>
              </div>
            </p-card>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .sites-page {
      max-width: 56rem;
    }
    .page-header__row {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .lead {
      color: var(--text-color-secondary);
      margin: 0.25rem 0 0;
    }
    .site-grid {
      display: grid;
      gap: 1rem;
    }
    .site-card__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .site-card__head h2 {
      margin: 0;
      font-size: 1.125rem;
    }
    .slug {
      color: var(--text-color-secondary);
      font-size: 0.875rem;
      margin: 0.5rem 0;
    }
    .site-card__actions {
      margin-top: 1rem;
    }
    .error {
      color: var(--red-500);
      font-size: 0.875rem;
    }
    .mt-2 {
      margin-top: 0.5rem;
    }
  `,
})
export class MySitesListComponent implements OnInit {
  private readonly api = inject(ProtopipeApiService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly sites = signal<ProtopipeSite[]>([]);

  ngOnInit(): void {
    void this.load();
  }

  protected statusLabel(site: ProtopipeSite): string {
    return site.publishStatus ?? 'draft';
  }

  protected statusSeverity(
    ps?: ProtopipePublishStatus,
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
    if (ps === 'live') return 'success';
    if (ps === 'provisioning') return 'info';
    if (ps === 'failed') return 'danger';
    return 'secondary';
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const boot = await this.api.bootstrap();
      this.sites.set(boot.sites as ProtopipeSite[]);
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Could not load sites.'));
    } finally {
      this.loading.set(false);
    }
  }
}
