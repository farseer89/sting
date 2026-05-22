import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Tag } from 'primeng/tag';
import { ProtopipeSiteBuilderService } from './protopipe-site-builder.service';

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
            <p class="stats">Pick a template to add a new client site.</p>
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
              <a [routerLink]="['/protopipe/site-builder/templates', t.id]" class="card-link">
                <h2>{{ t.label }}</h2>
                <p-tag [value]="t.category" />
                <p class="desc">{{ t.description }}</p>
                <p class="meta">{{ t.sectionCount }} sections · theme {{ t.themeDefault }}</p>
              </a>
              <a
                [routerLink]="['/protopipe/site-builder/add-site']"
                [queryParams]="{ templateId: t.id }"
                pButton
                label="Use template"
                class="use-btn"
                size="small"
              ></a>
            </p-card>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .site-builder-page {
      max-width: 72rem;
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
      gap: 1rem;
      grid-template-columns: 1fr;
    }
    @media (min-width: 48rem) {
      .template-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (min-width: 72rem) {
      .template-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    .card-link {
      text-decoration: none;
      color: inherit;
      display: block;
      margin-bottom: 0.75rem;
    }
    .desc,
    .meta {
      font-size: 0.9rem;
      color: var(--text-color-secondary);
    }
    .meta {
      margin-top: 0.35rem;
    }
    .error {
      color: var(--red-500);
    }
  `,
})
export class SiteBuilderTemplatesComponent implements OnInit {
  protected readonly sb = inject(ProtopipeSiteBuilderService);

  ngOnInit(): void {
    void this.sb.ensureTemplatesLoaded();
  }
}
