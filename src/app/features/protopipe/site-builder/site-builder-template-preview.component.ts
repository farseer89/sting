import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Button } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import { SelectButton } from 'primeng/selectbutton';
import type { SiteTemplateSummary } from '@hive/contracts';
import { ProtopipeApiService } from '../protopipe-api.service';
import { ProtopipeSiteBuilderService } from './protopipe-site-builder.service';
import { parseProtopipeApiError } from '../protopipe-http.util';

type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

const DEVICE_OPTIONS: { label: string; value: PreviewDevice }[] = [
  { label: 'Desktop', value: 'desktop' },
  { label: 'Tablet', value: 'tablet' },
  { label: 'Mobile', value: 'mobile' },
];

const DEVICE_WIDTH: Record<PreviewDevice, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

function previewUrlFor(t: SiteTemplateSummary | null): string {
  if (!t) return '';
  return (t.previewDemoUrl || t.previewImageUrl || '').trim();
}

@Component({
  selector: 'app-site-builder-template-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, Button, ProgressSpinner, SelectButton],
  template: `
    <div class="preview-shell">
      <header class="preview-chrome">
        <div class="preview-chrome__left">
          <a routerLink="/protopipe/site-builder/templates" class="back-link">← Templates</a>
          @if (template(); as t) {
            <h1 class="preview-title">{{ t.label }}</h1>
          }
        </div>
        <div class="preview-chrome__center">
          <p-selectButton
            [options]="deviceOptions"
            [(ngModel)]="device"
            optionLabel="label"
            optionValue="value"
            [allowEmpty]="false"
          />
        </div>
        <div class="preview-chrome__right">
          @if (demoUrl()) {
            <a [href]="demoUrl()" target="_blank" rel="noopener" pButton label="Open in new tab" icon="pi pi-external-link" severity="secondary" size="small"></a>
          }
          @if (templateId()) {
            <a
              [routerLink]="['/protopipe/site-builder/add-site']"
              [queryParams]="{ templateId: templateId() }"
              pButton
              label="Use this template"
              icon="pi pi-plus"
              size="small"
            ></a>
          }
        </div>
      </header>

      @if (loading()) {
        <div class="preview-loading">
          <p-progressSpinner ariaLabel="Loading preview" />
        </div>
      } @else if (error(); as err) {
        <p class="preview-error">{{ err }}</p>
      } @else if (!demoUrl()) {
        <p class="preview-error">No live preview URL for this template.</p>
      } @else {
        <div class="preview-stage">
          <div class="preview-frame-wrap" [style.maxWidth]="frameWidth()">
            <iframe
              class="preview-frame"
              [src]="safeDemoUrl()"
              title="Template live preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            ></iframe>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .preview-shell {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 4rem);
      min-height: 24rem;
      margin: -1rem -1.5rem 0;
    }
    .preview-chrome {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--surface-border);
      background: var(--surface-card);
      flex-shrink: 0;
    }
    .preview-chrome__left,
    .preview-chrome__center,
    .preview-chrome__right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .back-link {
      text-decoration: none;
      color: var(--text-color-secondary);
      font-size: 0.9rem;
    }
    .preview-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
    }
    .preview-stage {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 1rem;
      background: var(--surface-ground);
      overflow: auto;
    }
    .preview-frame-wrap {
      width: 100%;
      margin: 0 auto;
      background: #111;
      border-radius: 6px;
      box-shadow: 0 8px 32px rgb(0 0 0 / 0.2);
      overflow: hidden;
      min-height: 100%;
    }
    .preview-frame {
      display: block;
      width: 100%;
      height: calc(100vh - 8rem);
      min-height: 480px;
      border: 0;
      background: #fff;
    }
    .preview-loading,
    .preview-error {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .preview-error {
      color: var(--red-500);
    }
  `,
})
export class SiteBuilderTemplatePreviewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ProtopipeApiService);
  private readonly sb = inject(ProtopipeSiteBuilderService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly deviceOptions = DEVICE_OPTIONS;
  protected readonly device = signal<PreviewDevice>('desktop');
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly template = signal<SiteTemplateSummary | null>(null);
  protected readonly templateId = signal<string | null>(null);

  protected readonly demoUrl = computed(() => previewUrlFor(this.template()));
  protected readonly frameWidth = computed(() => DEVICE_WIDTH[this.device()]);
  protected readonly safeDemoUrl = computed((): SafeResourceUrl | null => {
    const url = this.demoUrl();
    if (!url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  ngOnInit(): void {
    const templateId = this.route.snapshot.paramMap.get('templateId');
    if (!templateId) {
      this.error.set('Missing template id');
      this.loading.set(false);
      return;
    }
    this.templateId.set(templateId);
    void this.load(templateId);
  }

  private async load(templateId: string): Promise<void> {
    this.loading.set(true);
    try {
      await this.sb.ensureTemplatesLoaded();
      const cached = this.sb.getTemplateById(templateId);
      if (cached) {
        this.template.set(cached);
        return;
      }
      const res = await this.api.getSiteBuilderTemplate(templateId);
      this.template.set(res.template as SiteTemplateSummary);
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Could not load template preview.'));
    } finally {
      this.loading.set(false);
    }
  }
}
