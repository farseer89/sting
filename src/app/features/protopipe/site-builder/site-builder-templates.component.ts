import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Tag } from 'primeng/tag';
import type { SiteTemplateSummary } from '@hive/contracts';
import { ProtopipeSiteBuilderService } from './protopipe-site-builder.service';

/** Fallback when API manifest is stale — matches bagend `templates.ts` demo URLs. */
const TEMPLATE_PREVIEW_URLS: Record<string, string> = {
  'tech-agency-v1': 'https://cs-tech-agency-demo.pages.dev',
  'construction-trades-v1': 'https://cs-trades-construction-demo.pages.dev',
  'service-business-landing-v1': 'https://dwp-v2.pages.dev',
  'artist-landing-v1': 'https://dwp-v2.pages.dev',
};

@Component({
  selector: 'app-site-builder-templates',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, Tag, ProgressSpinner, Button],
  template: `
    <div class="site-builder-page">
      <header class="page-header">
        <div class="page-header__row">
          <div>
            <h1>Site Builder — Templates</h1>
            <p class="stats">Pick a template — preview the full site before you add a client.</p>
          </div>
          <a routerLink="/protopipe/site-builder/add-site" pButton label="Add site" icon="pi pi-plus"></a>
        </div>
      </header>

      @if (sb.templatesLoading()) {
        <p-progressSpinner ariaLabel="Loading" />
      } @else if (sb.templatesError(); as err) {
        <p class="error">{{ err }}</p>
      } @else {
        <div class="template-grid">
          @for (t of sb.templates(); track t.id) {
            <p-card class="template-card">
              @if (previewUrl(t); as demoUrl) {
                <div class="template-preview" aria-hidden="true">
                  <iframe
                    [src]="previewFrameUrl(demoUrl)"
                    [title]="t.label + ' site preview'"
                    loading="lazy"
                    tabindex="-1"
                  ></iframe>
                </div>
              } @else {
                <div class="template-preview template-preview--empty">
                  <span>No live demo yet</span>
                </div>
              }
              <a [routerLink]="['/protopipe/site-builder/templates', t.id]" class="card-link">
                <h2>{{ t.label }}</h2>
                <p-tag [value]="t.category" />
                <p class="desc">{{ t.description }}</p>
                <p class="meta">{{ t.sectionCount }} sections · theme {{ t.themeDefault }}</p>
                @if (previewUrl(t); as demoUrl) {
                  <a class="demo-url" [href]="demoUrl" target="_blank" rel="noopener noreferrer">
                    {{ demoUrl }}
                  </a>
                }
              </a>
              <div class="card-actions">
                @if (previewUrl(t); as demoUrl) {
                  <a
                    [href]="demoUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    pButton
                    label="Live Demo"
                    icon="pi pi-external-link"
                    size="small"
                  ></a>
                  <a
                    [routerLink]="['/protopipe/site-builder/templates', t.id, 'preview']"
                    pButton
                    label="Live preview"
                    icon="pi pi-eye"
                    severity="secondary"
                    size="small"
                  ></a>
                }
                <a
                  [routerLink]="['/protopipe/site-builder/add-site']"
                  [queryParams]="{ templateId: t.id }"
                  pButton
                  label="Use template"
                  class="use-btn"
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
    .site-builder-page {
      max-width: 80rem;
    }
    .page-header__row {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .stats {
      color: var(--text-color-secondary);
    }
    .template-grid {
      display: grid;
      gap: 1.25rem;
      grid-template-columns: 1fr;
    }
    @media (min-width: 48rem) {
      .template-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (min-width: 90rem) {
      .template-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    :host ::ng-deep .template-card .p-card-body {
      padding: 0;
    }
    :host ::ng-deep .template-card .p-card-content {
      padding: 0.75rem;
    }
    .template-preview {
      position: relative;
      height: 11rem;
      overflow: hidden;
      border-bottom: 1px solid var(--surface-border);
      background: #0b0f19;
    }
    .template-preview--empty {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-color-secondary);
      font-size: 0.875rem;
      background: var(--surface-100);
    }
    .template-preview iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 1280px;
      height: 720px;
      border: 0;
      transform: scale(0.28);
      transform-origin: 0 0;
      pointer-events: none;
    }
    .card-link {
      text-decoration: none;
      color: inherit;
      display: block;
      margin-bottom: 0.75rem;
    }
    .card-link h2 {
      margin: 0 0 0.35rem;
      font-size: 1.125rem;
    }
    .desc,
    .meta {
      font-size: 0.9rem;
      color: var(--text-color-secondary);
    }
    .meta {
      margin-top: 0.35rem;
    }
    .demo-url {
      display: block;
      margin-top: 0.35rem;
      font-size: 0.8rem;
      color: var(--primary-color);
      text-decoration: underline;
      word-break: break-all;
    }
    .demo-url:hover {
      text-decoration: none;
    }
    .card-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .error {
      color: var(--red-500);
    }
  `,
})
export class SiteBuilderTemplatesComponent implements OnInit {
  protected readonly sb = inject(ProtopipeSiteBuilderService);
  private readonly sanitizer = inject(DomSanitizer);

  protected previewUrl(t: SiteTemplateSummary): string {
    const fromApi = (t.previewDemoUrl || t.previewImageUrl || '').trim();
    return fromApi || TEMPLATE_PREVIEW_URLS[t.id] || '';
  }

  protected previewFrameUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  ngOnInit(): void {
    void this.sb.ensureTemplatesLoaded();
  }
}
