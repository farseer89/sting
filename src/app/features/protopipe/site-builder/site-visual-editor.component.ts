import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Button } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Tag } from 'primeng/tag';
import type { ProtopipeSite } from '@hive/contracts';
import { ProtopipeApiService } from '../protopipe-api.service';
import { parseProtopipeApiError } from '../protopipe-http.util';

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
  imports: [RouterLink, Button, ProgressSpinner, Tag],
  template: `
    <div class="visual-editor">
      @if (loading()) {
        <p-progressSpinner ariaLabel="Loading preview" />
      } @else if (error(); as err) {
        <p class="error">{{ err }}</p>
        <a routerLink="/protopipe/site-builder/sites">← Back to sites</a>
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
              label="Refresh preview"
              icon="pi pi-refresh"
              [outlined]="true"
              (onClick)="reloadPreview()"
            />
            <a
              pButton
              class="p-button-outlined"
              [routerLink]="['/protopipe/site-builder/sites', siteId, 'edit']"
              label="Form editor"
              icon="pi pi-list"
            ></a>
          </div>
        </header>

        <iframe
          class="visual-editor__frame"
          [src]="previewUrlSafe()"
          title="Draft preview"
          (load)="onFrameLoad()"
        ></iframe>
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
  private readonly api = inject(ProtopipeApiService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly site = signal<ProtopipeSite | null>(null);
  protected readonly previewUrlSafe = signal<SafeResourceUrl | null>(null);
  protected readonly selectedSectionLabel = signal<string | null>(null);
  protected readonly saveMessage = signal<string | null>(null);

  protected siteId = '';
  private previewUrl = '';
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
    this.error.set(null);
    try {
      const [site, tokenRes] = await Promise.all([
        this.api.getSite(this.siteId),
        this.api.createDraftPreviewToken(this.siteId),
      ]);
      this.site.set(site);
      this.previewUrl = tokenRes.previewUrl;
      const url = `${tokenRes.previewUrl}${tokenRes.previewUrl.includes('?') ? '&' : '?'}editor=1`;
      this.previewUrlSafe.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Could not load visual editor.'));
    } finally {
      this.loading.set(false);
    }
  }

  private onPreviewMessage(event: MessageEvent): void {
    const data = event.data as PreviewMessage;
    if (!data || data.source !== 'draft-preview') return;

    if (data.type === 'section:select') {
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
}
