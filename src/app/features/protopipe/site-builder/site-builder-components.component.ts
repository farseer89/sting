import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from 'primeng/card';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Tag } from 'primeng/tag';
import type { SiteBuilderComponentEntry } from '@hive/contracts';
import { ProtopipeSiteBuilderService } from './protopipe-site-builder.service';

@Component({
  selector: 'app-site-builder-components',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, Tag, ProgressSpinner],
  template: `
    <div class="site-builder-page">
      <header class="page-header">
        <h1>Site Builder — Components</h1>
        @if (sb.stats(); as s) {
          <p class="stats">
            {{ s.total }} components — {{ s.interactive }} interactive,
            {{ s.adminTabled }} admin-tabled
          </p>
        }
      </header>

      @if (sb.loading()) {
        <p-progressSpinner ariaLabel="Loading" />
      } @else if (sb.error(); as err) {
        <p class="error">{{ err }}</p>
      } @else {
        <div class="component-grid">
          @for (c of sb.components(); track c.id) {
            <p-card class="component-card">
              <a [routerLink]="['/protopipe/site-builder/components', c.id]" class="card-link">
                <h2>{{ c.label }}</h2>
                <p-tag [value]="c.category" />
                @if (c.interactive) {
                  <p-tag value="interactive" severity="info" />
                }
                @if (c.hasAdminTable) {
                  <p-tag value="inbox" severity="success" />
                }
                <p class="desc">{{ c.description }}</p>
              </a>
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
    .page-header {
      margin-bottom: 1.5rem;
    }
    .stats {
      color: var(--text-color-secondary);
    }
    .component-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: 1fr;
    }
    @media (min-width: 48rem) {
      .component-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (min-width: 72rem) {
      .component-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    .card-link {
      text-decoration: none;
      color: inherit;
      display: block;
      min-height: 44px;
    }
    .desc {
      margin-top: 0.5rem;
      font-size: 0.9rem;
      color: var(--text-color-secondary);
    }
    .error {
      color: var(--red-500);
    }
  `,
})
export class SiteBuilderComponentsComponent implements OnInit {
  protected readonly sb = inject(ProtopipeSiteBuilderService);

  ngOnInit(): void {
    void this.sb.ensureLoaded();
  }
}
