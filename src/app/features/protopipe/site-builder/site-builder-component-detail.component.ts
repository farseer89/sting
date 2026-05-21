import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Card } from 'primeng/card';
import { ProtopipeSiteBuilderService } from './protopipe-site-builder.service';

@Component({
  selector: 'app-site-builder-component-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card],
  template: `
    <p>
      <a routerLink="/protopipe/site-builder/components">← Components</a>
    </p>
    @if (component(); as c) {
      <h1>{{ c.label }}</h1>
      <p>{{ c.description }}</p>
      <p-card header="Props schema">
        <pre>{{ propsJson() }}</pre>
      </p-card>
      @if (c.submissionSchema) {
        <p-card header="Submission schema">
          <pre>{{ submissionJson() }}</pre>
        </p-card>
      }
      @if (c.adminSpec) {
        <p-card header="Admin table">
          <pre>{{ adminJson() }}</pre>
        </p-card>
      }
    } @else {
      <p>Component not found.</p>
    }
  `,
  styles: `
    pre {
      overflow-x: auto;
      font-size: 0.85rem;
      white-space: pre-wrap;
    }
  `,
})
export class SiteBuilderComponentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly sb = inject(ProtopipeSiteBuilderService);

  private componentId = '';

  ngOnInit(): void {
    this.componentId = this.route.snapshot.paramMap.get('componentId') ?? '';
    void this.sb.ensureLoaded();
  }

  component() {
    return this.sb.getComponentById(this.componentId);
  }

  propsJson(): string {
    const c = this.component();
    return c ? JSON.stringify(c.propsSchema, null, 2) : '';
  }

  submissionJson(): string {
    const c = this.component();
    return c?.submissionSchema ? JSON.stringify(c.submissionSchema, null, 2) : '';
  }

  adminJson(): string {
    const c = this.component();
    return c?.adminSpec ? JSON.stringify(c.adminSpec, null, 2) : '';
  }
}
