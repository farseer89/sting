import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Card } from 'primeng/card';
import { Button } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ProtopipeApiService } from '../protopipe-api.service';
import { parseProtopipeApiError } from '../protopipe-http.util';

@Component({
  selector: 'app-site-builder-template-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, Button, ProgressSpinner],
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
            @if (previewDemoUrl()) {
              <a
                [routerLink]="['/protopipe/site-builder/templates', t.id, 'preview']"
                pButton
                label="Live preview"
                icon="pi pi-eye"
                severity="secondary"
              ></a>
            }
            <a
              [routerLink]="['/protopipe/site-builder/add-site']"
              [queryParams]="{ templateId: t.id }"
              pButton
              label="Use this template"
              icon="pi pi-plus"
            ></a>
          </div>
        </header>

        <h2>Sections</h2>
        <ul class="section-list">
          @for (section of sections(); track section.id) {
            <li>
              <strong>{{ section.label }}</strong>
              <span class="component-id">{{ section.componentId }}</span>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    .detail-page {
      max-width: 48rem;
    }
    .detail-header {
      margin: 1rem 0 1.5rem;
    }
    .detail-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1rem;
    }
    .section-list {
      list-style: none;
      padding: 0;
      margin: 0;
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
  private readonly api = inject(ProtopipeApiService);

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
      this.previewDemoUrl.set((t.previewDemoUrl || t.previewImageUrl || '').trim());
      this.sections.set(t.pages?.[0]?.sections ?? []);
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Could not load template.'));
    } finally {
      this.loading.set(false);
    }
  }
}
