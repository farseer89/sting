import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Tag } from 'primeng/tag';
import { ProgressSpinner } from 'primeng/progressspinner';
import type { SitePageDraft, SitePageSectionDraft, ProtopipeSite } from '@hive/contracts';
import { ProtopipeApiService } from '../protopipe-api.service';
import { parseProtopipeApiError } from '../protopipe-http.util';

@Component({
  selector: 'app-site-page-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, Button, InputText, Textarea, Tag, ProgressSpinner],
  template: `
    <div class="editor-page">
      @if (loading()) {
        <p-progressSpinner ariaLabel="Loading" />
      } @else if (error(); as err) {
        <p class="error">{{ err }}</p>
      } @else {
        <header class="editor-header">
          <div>
            <a routerLink="/protopipe/site-builder/sites">← My sites</a>
            <h1>{{ site()?.displayName ?? 'Site' }} — page editor</h1>
            @if (publishStatus(); as ps) {
              <p-tag [value]="ps" [severity]="statusSeverity(ps)" />
            }
            @if (site()?.previewBaseUrl && publishStatus() === 'live') {
              <p>
                <a [href]="site()!.previewBaseUrl" target="_blank" rel="noopener">{{ site()!.previewBaseUrl }}</a>
              </p>
            }
            @if (provisionMessage()) {
              <p class="provision-msg">{{ provisionMessage() }}</p>
            }
          </div>
          <div class="editor-actions">
            <p-button label="Save draft" icon="pi pi-save" [loading]="saving()" (onClick)="save()" />
            <p-button
              label="Publish"
              icon="pi pi-cloud-upload"
              severity="success"
              [loading]="publishing()"
              (onClick)="publish()"
            />
          </div>
        </header>

        <div class="editor-layout">
          <nav class="section-rail">
            @for (s of sections(); track s.id; let i = $index) {
              <button
                type="button"
                class="section-rail__btn"
                [class.is-active]="selectedIndex() === i"
                (click)="selectSection(i)"
              >
                {{ s.label }}
              </button>
            }
          </nav>

          @if (selectedSection(); as sec) {
          <section class="section-form">
            <h2>{{ sec.label }} <span class="muted">({{ sec.componentId }})</span></h2>
            @for (field of sec.editableFields; track field) {
              <label class="field">
                <span>{{ field }}</span>
                @if (isJsonField(sec, field)) {
                  <textarea
                    pTextarea
                    [ngModel]="fieldJson(sec, field)"
                    (ngModelChange)="setFieldJson(sec, field, $event)"
                    rows="6"
                    class="w-full"
                  ></textarea>
                } @else {
                  <input
                    pInputText
                    [ngModel]="fieldValue(sec, field)"
                    (ngModelChange)="setField(sec, field, $event)"
                    class="w-full"
                  />
                }
              </label>
            }
          </section>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .editor-page {
      max-width: 90rem;
    }
    .editor-header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .editor-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .editor-layout {
      display: grid;
      gap: 1.5rem;
      grid-template-columns: 12rem minmax(0, 1fr);
    }
    @media (max-width: 48rem) {
      .editor-layout {
        grid-template-columns: 1fr;
      }
    }
    .section-rail {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .section-rail__btn {
      text-align: left;
      padding: 0.6rem 0.75rem;
      border: 1px solid var(--surface-border);
      border-radius: 6px;
      background: var(--surface-card);
      cursor: pointer;
      min-height: 44px;
    }
    .section-rail__btn.is-active {
      border-color: var(--primary-color);
      background: var(--primary-50, var(--surface-100));
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-bottom: 1rem;
    }
    .muted {
      font-weight: normal;
      color: var(--text-color-secondary);
      font-size: 0.85rem;
    }
    .provision-msg {
      font-size: 0.9rem;
      color: var(--text-color-secondary);
      max-width: 36rem;
    }
    .error {
      color: var(--red-500);
    }
  `,
})
export class SitePageEditorComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ProtopipeApiService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly publishing = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly site = signal<ProtopipeSite | null>(null);
  protected readonly draft = signal<SitePageDraft | null>(null);
  protected readonly selectedIndex = signal(0);
  protected readonly publishStatus = signal<string>('draft');
  protected readonly provisionMessage = signal<string | null>(null);

  private siteId = '';
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.siteId = this.route.snapshot.paramMap.get('siteId') ?? '';
    if (!this.siteId) {
      this.error.set('Missing site id');
      this.loading.set(false);
      return;
    }
    void this.load();
  }

  protected sections(): SitePageSectionDraft[] {
    return this.draft()?.pages[0]?.sections ?? [];
  }

  protected selectedSection(): SitePageSectionDraft | null {
    const list = this.sections();
    return list[this.selectedIndex()] ?? null;
  }

  protected selectSection(index: number): void {
    this.selectedIndex.set(index);
  }

  protected fieldValue(sec: SitePageSectionDraft, field: string): string {
    const v = sec.props[field];
    return v == null ? '' : String(v);
  }

  protected setField(sec: SitePageSectionDraft, field: string, value: string): void {
    sec.props[field] = value;
    this.touchDraft();
  }

  protected isJsonField(sec: SitePageSectionDraft, field: string): boolean {
    const v = sec.props[field];
    return typeof v === 'object' && v !== null;
  }

  protected fieldJson(sec: SitePageSectionDraft, field: string): string {
    try {
      return JSON.stringify(sec.props[field], null, 2);
    } catch {
      return '';
    }
  }

  protected setFieldJson(sec: SitePageSectionDraft, field: string, raw: string): void {
    try {
      sec.props[field] = JSON.parse(raw) as unknown;
      this.touchDraft();
    } catch {
      /* ignore invalid JSON while typing */
    }
  }

  protected statusSeverity(
    ps: string,
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
    if (ps === 'live') return 'success';
    if (ps === 'provisioning') return 'info';
    if (ps === 'failed') return 'danger';
    return 'secondary';
  }

  private touchDraft(): void {
    const d = this.draft();
    if (d) {
      d.updatedAt = new Date().toISOString();
      this.draft.set({ ...d, pages: [...d.pages] });
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [site, page] = await Promise.all([
        this.api.getSite(this.siteId),
        this.api.getSitePage(this.siteId),
      ]);
      this.site.set(site);
      this.publishStatus.set(page.publishStatus);
      if (page.publishStatus === 'provisioning') {
        this.startPublishPolling();
      }
      if (page.pageDraft) {
        this.draft.set(JSON.parse(JSON.stringify(page.pageDraft)) as SitePageDraft);
      } else {
        this.error.set('No page draft on this site.');
      }
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Could not load page.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async save(): Promise<void> {
    const d = this.draft();
    if (!d) return;
    this.saving.set(true);
    try {
      await this.api.updateSitePage(this.siteId, { pageDraft: d });
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Save failed.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async publish(): Promise<void> {
    await this.save();
    this.publishing.set(true);
    this.provisionMessage.set(null);
    try {
      const res = await this.api.publishSite(this.siteId);
      this.publishStatus.set('provisioning');
      this.provisionMessage.set(
        res.message ??
          `Run: cd client-sites && node scripts/provision-from-template.mjs --site-id ${this.siteId}`,
      );
      if (res.deployTriggered ?? res.message?.includes('GitHub Actions')) {
        this.startPublishPolling();
      }
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Publish failed.'));
    } finally {
      this.publishing.set(false);
    }
  }

  private startPublishPolling(): void {
    this.stopPublishPolling();
    const started = Date.now();
    const maxMs = 12 * 60 * 1000;
    this.pollTimer = setInterval(() => {
      void this.pollPublishOnce(started, maxMs);
    }, 8000);
    void this.pollPublishOnce(started, maxMs);
  }

  private stopPublishPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async pollPublishOnce(started: number, maxMs: number): Promise<void> {
    if (Date.now() - started > maxMs) {
      this.stopPublishPolling();
      this.provisionMessage.set('Deploy is taking longer than expected. Refresh the page in a few minutes.');
      return;
    }
    try {
      const site = await this.api.getSite(this.siteId);
      this.site.set(site);
      const ps = site.publishStatus ?? 'draft';
      this.publishStatus.set(ps);
      if (ps === 'live') {
        this.stopPublishPolling();
        this.provisionMessage.set(null);
        this.error.set(null);
      } else if (ps === 'failed') {
        this.stopPublishPolling();
        this.provisionMessage.set(site.provisioningError ?? 'Deploy failed.');
        this.error.set(site.provisioningError ?? 'Deploy failed.');
      }
    } catch {
      /* keep polling */
    }
  }
}
