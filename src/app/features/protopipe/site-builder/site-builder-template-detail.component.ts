import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ProtopipeApiService } from '../protopipe-api.service';
import { parseProtopipeApiError } from '../protopipe-http.util';

const TEMPLATE_PREVIEW_URLS: Record<string, string> = {
  'tech-agency-v1': 'https://cs-tech-agency-demo.pages.dev',
  'construction-trades-v1': 'https://cs-trades-construction-demo.pages.dev',
  'service-business-landing-v1': 'https://dwp-v2.pages.dev',
  'artist-landing-v1': 'https://dwp-v2.pages.dev',
};

@Component({
  selector: 'app-site-builder-template-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Button, ProgressSpinner],
  template: `
    <div class="detail-page">
      <a routerLink="/protopipe/site-builder/templates">← Templates</a>

      @if (loading()) {
        <p-progressSpinner ariaLabel="Loading" />
      } @else if (error(); as err) {
        <p class="error">{{ err }}</p>
      } @else if (template(); as t) {
        <header class="detail-header">
          <h1>{{ t.label }}</h1>
          <p>{{ t.description }}</p>
          <div class="detail-actions">
            @if (previewDemoUrl(); as demoUrl) {
              <p-button
                label="Open Live Demo"
                icon="pi pi-external-link"
                (onClick)="openExternal(demoUrl)"
              />
              <p-button
                label="Full-screen preview"
                icon="pi pi-eye"
                severity="secondary"
                (onClick)="openTemplatePreview(t.id)"
              />
            }
            <p-button
              label="Use this template"
              icon="pi pi-plus"
              (onClick)="openAddSiteWithTemplate(t.id)"
            />
          </div>
        </header>

        @if (previewDemoUrl()) {
          <div class="detail-preview">
            <iframe
              [src]="previewFrameUrl()"
              [title]="t.label + ' live site preview'"
              loading="lazy"
            ></iframe>
          </div>
        }

        <details class="sections-details">
          <summary>Section breakdown ({{ sections().length }})</summary>
          <ul class="section-list">
            @for (section of sections(); track section.id) {
              <li>
                <strong>{{ section.label }}</strong>
                <span class="component-id">{{ section.componentId }}</span>
              </li>
            }
          </ul>
        </details>
      }
    </div>
  `,
  styles: `
    .detail-page {
      max-width: 56rem;
    }
    .detail-header {
      margin: 1rem 0 1rem;
    }
    .detail-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1rem;
    }
    .detail-preview {
      position: relative;
      height: min(70vh, 32rem);
      overflow: hidden;
      border: 1px solid var(--surface-border);
      border-radius: 8px;
      margin-bottom: 1.5rem;
      background: #0b0f19;
    }
    .detail-preview iframe {
      width: 100%;
      height: 100%;
      border: 0;
    }
    .sections-details {
      margin-top: 1rem;
    }
    .sections-details summary {
      cursor: pointer;
      font-weight: 600;
      padding: 0.5rem 0;
      color: var(--text-color-secondary);
    }
    .section-list {
      list-style: none;
      padding: 0;
      margin: 0.5rem 0 0;
    }
    .section-list li {
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--surface-border);
    }
    .component-id {
      display: block;
      font-size: 0.85rem;
      color: var(--text-color-secondary);
    }
    .error {
      color: var(--red-500);
    }
  `,
})
export class SiteBuilderTemplateDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ProtopipeApiService);
  private readonly sanitizer = inject(DomSanitizer);

  protected openExternal(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  protected openTemplatePreview(templateId: string): void {
    void this.router.navigate(['/protopipe/site-builder/templates', templateId, 'preview']);
  }

  protected openAddSiteWithTemplate(templateId: string): void {
    void this.router.navigate(['/protopipe/site-builder/add-site'], {
      queryParams: { templateId },
    });
  }

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly template = signal<{
    id: string;
    label: string;
    description: string;
    previewDemoUrl?: string;
    previewImageUrl?: string;
  } | null>(null);
  protected readonly previewDemoUrl = signal('');
  protected readonly sections = signal<
    { id: string; label: string; componentId: string }[]
  >([]);

  protected previewFrameUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.previewDemoUrl());
  }

  ngOnInit(): void {
    const templateId = this.route.snapshot.paramMap.get('templateId');
    if (!templateId) {
      this.error.set('Missing template id');
      this.loading.set(false);
      return;
    }
    void this.load(templateId);
  }

  private async load(templateId: string): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.api.getSiteBuilderTemplate(templateId);
      const t = res.template as {
        id: string;
        label: string;
        description: string;
        previewDemoUrl?: string;
        previewImageUrl?: string;
        pages?: { sections: { id: string; label: string; componentId: string }[] }[];
      };
      this.template.set({
        id: t.id,
        label: t.label,
        description: t.description,
        previewDemoUrl: t.previewDemoUrl,
        previewImageUrl: t.previewImageUrl,
      });
      const fromApi = (t.previewDemoUrl || t.previewImageUrl || '').trim();
      this.previewDemoUrl.set(fromApi || TEMPLATE_PREVIEW_URLS[t.id] || '');
      this.sections.set(t.pages?.[0]?.sections ?? []);
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Could not load template.'));
    } finally {
      this.loading.set(false);
    }
  }
}
