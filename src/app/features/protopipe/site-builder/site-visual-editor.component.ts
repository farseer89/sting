import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { Button } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Tag } from 'primeng/tag';
import type { ProtopipeSite, SiteBuilderComponentEntry } from '@hive/contracts';
import { ProtopipeApiService } from '../protopipe-api.service';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { SiteBlockPickerComponent } from './site-block-picker.component';

interface PreviewMessage {
  source?: string;
  type?: string;
  sectionId?: string;
  componentId?: string;
  label?: string;
  field?: string;
  value?: string;
  editableFields?: string[];
}

@Component({
  selector: 'app-site-visual-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Button, ProgressSpinner, Tag, SiteBlockPickerComponent],
  template: `
    <div class="visual-editor">
      @if (loading()) {
        <div class="visual-editor__loading">
          <p-progressSpinner ariaLabel="Loading preview" />
          <p class="loading-msg">{{ loadingMessage() }}</p>
        </div>
      } @else if (error(); as err) {
        <div class="visual-editor__error">
          <p class="error">{{ err }}</p>
          @if (errorAction() === 'form-editor') {
            <p-button
              label="Open form editor"
              icon="pi pi-list"
              (onClick)="openFormEditor()"
            />
          }
          <a routerLink="/protopipe/site-builder/sites">← Back to sites</a>
        </div>
      } @else {
        <header class="visual-editor__header">
          <div>
            <a routerLink="/protopipe/site-builder/sites">← My sites</a>
            <h1>{{ site()?.displayName ?? 'Site' }} — visual editor</h1>
            <p class="hint">Click a section to select it. Double-click text to edit inline.</p>
            @if (selectedSectionLabel()) {
              <p-tag [value]="'Editing: ' + selectedSectionLabel()" severity="info" />
            }
            @if (saveMessage()) {
              <p class="save-msg">{{ saveMessage() }}</p>
            }
          </div>
          <div class="visual-editor__actions">
            <p-button
              label="Add section"
              icon="pi pi-plus"
              (onClick)="openBlockPicker()"
            />
            <p-button
              label="Refresh preview"
              icon="pi pi-refresh"
              [outlined]="true"
              (onClick)="reloadPreview()"
            />
            <p-button
              label="Form editor"
              icon="pi pi-list"
              [outlined]="true"
              (onClick)="openFormEditor()"
            />
          </div>
        </header>

        <iframe
          class="visual-editor__frame"
          [src]="previewUrlSafe()"
          title="Draft preview"
          (load)="onFrameLoad()"
        ></iframe>

        <app-site-block-picker
          [visible]="blockPickerOpen()"
          (visibleChange)="blockPickerOpen.set($event)"
          (blockSelected)="onBlockSelected($event)"
        />
      }
    </div>
  `,
  styles: `
    .visual-editor {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      height: calc(100vh - 6rem);
      min-height: 32rem;
    }
    .visual-editor__loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 3rem 0;
    }
    .loading-msg {
      color: var(--text-color-secondary);
      margin: 0;
    }
    .visual-editor__error {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .visual-editor__header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
    }
    .visual-editor__actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .visual-editor__frame {
      flex: 1;
      width: 100%;
      border: 1px solid var(--surface-border);
      border-radius: 8px;
      background: #fff;
      min-height: 24rem;
    }
    .hint,
    .save-msg {
      color: var(--text-color-secondary);
      font-size: 0.9rem;
      margin: 0.35rem 0 0;
    }
    .error {
      color: var(--red-500);
    }
  `,
})
export class SiteVisualEditorComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ProtopipeApiService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly loading = signal(true);
  protected readonly loadingMessage = signal('Opening draft preview…');
  protected readonly error = signal<string | null>(null);
  protected readonly errorAction = signal<'form-editor' | null>(null);
  protected readonly site = signal<ProtopipeSite | null>(null);
  protected readonly previewUrlSafe = signal<SafeResourceUrl | null>(null);
  protected readonly selectedSectionLabel = signal<string | null>(null);
  protected readonly saveMessage = signal<string | null>(null);
  protected readonly blockPickerOpen = signal(false);

  protected siteId = '';
  private previewUrl = '';
  private selectedSectionId: string | null = null;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private saving = false;

  ngOnInit(): void {
    this.siteId = this.route.snapshot.paramMap.get('siteId') ?? '';
    if (!this.siteId) {
      this.error.set('Missing site id');
      this.loading.set(false);
      return;
    }

    this.messageHandler = (event: MessageEvent) => this.onPreviewMessage(event);
    window.addEventListener('message', this.messageHandler);
    void this.load();
  }

  ngOnDestroy(): void {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
    }
  }

  protected openFormEditor(): void {
    void this.router.navigate(['/protopipe/site-builder/sites', this.siteId, 'edit']);
  }

  protected openBlockPicker(): void {
    this.blockPickerOpen.set(true);
  }

  protected async onBlockSelected(entry: SiteBuilderComponentEntry): Promise<void> {
    this.saveMessage.set('Adding section…');
    try {
      await this.api.insertSitePageSection(this.siteId, {
        componentId: entry.id,
        afterSectionId: this.selectedSectionId ?? undefined,
      });
      this.saveMessage.set(`Added ${entry.label}`);
      await this.refreshPreviewToken();
      window.setTimeout(() => this.saveMessage.set(null), 2000);
    } catch (err) {
      this.saveMessage.set(parseProtopipeApiError(err, 'Could not add section'));
    }
  }

  protected reloadPreview(): void {
    if (!this.previewUrl) return;
    const sep = this.previewUrl.includes('?') ? '&' : '?';
    const url = `${this.previewUrl}${sep}editor=1&_=${Date.now()}`;
    this.previewUrlSafe.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
    this.saveMessage.set(null);
  }

  protected onFrameLoad(): void {
    /* iframe loaded */
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.loadingMessage.set('Opening draft preview…');
    this.error.set(null);
    this.errorAction.set(null);
    try {
      this.loadingMessage.set('Loading site…');
      const site = await this.api.getSite(this.siteId);
      this.site.set(site);

      this.loadingMessage.set('Requesting preview token…');
      const tokenRes = await this.api.createDraftPreviewToken(this.siteId);
      this.previewUrl = tokenRes.previewUrl;
      const url = `${tokenRes.previewUrl}${tokenRes.previewUrl.includes('?') ? '&' : '?'}editor=1`;
      this.previewUrlSafe.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
    } catch (err) {
      const { message, action } = this.describeLoadError(err);
      this.error.set(message);
      this.errorAction.set(action);
    } finally {
      this.loading.set(false);
    }
  }

  private describeLoadError(err: unknown): {
    message: string;
    action: 'form-editor' | null;
  } {
    if (err instanceof HttpErrorResponse) {
      const bodyMsg =
        typeof (err.error as { message?: string } | null)?.message === 'string'
          ? (err.error as { message: string }).message
          : '';

      if (err.status === 400 && bodyMsg.toLowerCase().includes('no page draft')) {
        return {
          message: 'No draft content yet. Open the form editor to create or load page content first.',
          action: 'form-editor',
        };
      }
      if (err.status === 503 && bodyMsg.toLowerCase().includes('draft preview not configured')) {
        return {
          message: 'Draft preview is not configured on the server (missing PROTOPIPE_PROVISION_SECRET).',
          action: null,
        };
      }
      if (err.status === 404) {
        return { message: 'Site not found.', action: null };
      }
      if (err.status === 401) {
        return { message: 'Session expired. Sign in again.', action: null };
      }
    }

    return {
      message: parseProtopipeApiError(err, 'Could not load visual editor.'),
      action: null,
    };
  }

  private onPreviewMessage(event: MessageEvent): void {
    const data = event.data as PreviewMessage;
    if (!data || data.source !== 'draft-preview') return;

    if (data.type === 'section:select') {
      this.selectedSectionId = data.sectionId ?? null;
      this.selectedSectionLabel.set(data.label ?? data.sectionId ?? null);
      return;
    }

    if (data.type === 'field:edit-end' && data.sectionId && data.field && !this.saving) {
      void this.saveField(data.sectionId, data.field, data.value ?? '');
    }
  }

  private async saveField(sectionId: string, field: string, value: string): Promise<void> {
    this.saving = true;
    this.saveMessage.set('Saving…');
    try {
      await this.api.patchSitePageField(this.siteId, { sectionId, field, value });
      this.saveMessage.set(`Saved ${field}`);
      window.setTimeout(() => this.saveMessage.set(null), 2000);
    } catch (err) {
      this.saveMessage.set(parseProtopipeApiError(err, 'Save failed'));
    } finally {
      this.saving = false;
    }
  }

  private async refreshPreviewToken(): Promise<void> {
    const tokenRes = await this.api.createDraftPreviewToken(this.siteId);
    this.previewUrl = tokenRes.previewUrl;
    const url = `${tokenRes.previewUrl}${tokenRes.previewUrl.includes('?') ? '&' : '?'}editor=1&_=${Date.now()}`;
    this.previewUrlSafe.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
  }
}
