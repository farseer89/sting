import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import type { ProtopipePublishStatus, ProtopipeSite } from '@hive/contracts';
import { ProtopipeApiService } from '../protopipe-api.service';
import { parseProtopipeApiError } from '../protopipe-http.util';

@Component({
  selector: 'app-my-sites-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, Tag, ProgressSpinner, Button, ConfirmDialog, Toast],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-confirmDialog />
    <p-toast />
    <div class="sites-page">
      <header class="page-header">
        <div class="page-header__row">
          <div>
            <h1>My landing sites</h1>
            <p class="lead">Create, edit, publish, or remove landing sites.</p>
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
              <p class="slug">slug: {{ site.clientSitesSlug ?? '—' }}</p>
              @if (site.previewBaseUrl) {
                <p>
                  <a [href]="site.previewBaseUrl" target="_blank" rel="noopener">{{ site.previewBaseUrl }}</a>
                </p>
              }
              @if (site.publishStatus === 'failed' && site.provisioningError) {
                <p class="error">{{ site.provisioningError }}</p>
              }
              <div class="site-card__actions">
                @if (site.previewBaseUrl) {
                  <a
                    [href]="site.previewBaseUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    pButton
                    label="Open site"
                    icon="pi pi-external-link"
                    size="small"
                  ></a>
                } @else {
                  <a
                    [routerLink]="['/protopipe/site-builder/sites', site.id, 'visual']"
                    pButton
                    label="Open editor"
                    icon="pi pi-eye"
                    size="small"
                  ></a>
                }
                <a
                  [routerLink]="['/protopipe/site-builder/sites', site.id, 'visual']"
                  pButton
                  label="Visual editor"
                  icon="pi pi-eye"
                  size="small"
                  class="p-button-outlined"
                ></a>
                <a
                  [routerLink]="['/protopipe/site-builder/sites', site.id, 'edit']"
                  pButton
                  label="Edit & publish"
                  icon="pi pi-pencil"
                  size="small"
                  class="p-button-outlined"
                ></a>
                <p-button
                  label="Delete"
                  icon="pi pi-trash"
                  severity="danger"
                  [outlined]="true"
                  size="small"
                  [loading]="deletingId() === site.id"
                  [disabled]="site.publishStatus === 'provisioning' || deletingId() !== null"
                  (onClick)="confirmDelete($event, site)"
                />
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
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
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
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly sites = signal<ProtopipeSite[]>([]);
  protected readonly deletingId = signal<string | null>(null);

  ngOnInit(): void {
    void this.load();
  }

  protected statusLabel(site: ProtopipeSite): string {
    const ps = site.publishStatus ?? 'draft';
    if (ps === 'draft') return 'Unpublished';
    if (ps === 'provisioning') return 'Publishing…';
    if (ps === 'live') return 'Live';
    if (ps === 'failed') return 'Failed';
    return ps;
  }

  protected statusSeverity(
    ps?: ProtopipePublishStatus,
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
    if (ps === 'live') return 'success';
    if (ps === 'provisioning') return 'info';
    if (ps === 'failed') return 'danger';
    return 'secondary';
  }

  protected confirmDelete(event: Event, site: ProtopipeSite): void {
    const slug = site.clientSitesSlug ?? site.id;
    const cfProject = site.cloudflareProject;
    const cfNote =
      cfProject?.startsWith('cs-') ||
      (cfProject && site.clientSitesSlug && cfProject === site.clientSitesSlug)
        ? ' The Cloudflare Pages project will be removed when configured on the server.'
        : '';

    this.confirm.confirm({
      target: event.target as EventTarget,
      header: 'Delete site',
      message: `Delete "${site.displayName}" (${slug})? This removes the site record and related data.${cfNote}`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => void this.deleteSite(site),
    });
  }

  private async deleteSite(site: ProtopipeSite): Promise<void> {
    this.deletingId.set(site.id);
    try {
      const res = await this.api.deleteSite(site.id);
      this.sites.update((list) => list.filter((s) => s.id !== site.id));
      let detail = `${site.displayName} was removed.`;
      if (res.cloudflare.removed) {
        detail += ' Cloudflare Pages project deleted.';
      } else if (res.cloudflare.error) {
        detail += ` Cloudflare project was not removed: ${res.cloudflare.error}`;
      } else if (res.cloudflare.skippedReason === 'not_configured') {
        detail += ' Cloudflare cleanup skipped (API not configured on server).';
      }
      this.messages.add({
        severity: res.cloudflare.error ? 'warn' : 'success',
        summary: 'Site deleted',
        detail,
      });
    } catch (err) {
      this.messages.add({
        severity: 'error',
        summary: 'Delete failed',
        detail: parseProtopipeApiError(err, 'Could not delete site.'),
      });
    } finally {
      this.deletingId.set(null);
    }
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
