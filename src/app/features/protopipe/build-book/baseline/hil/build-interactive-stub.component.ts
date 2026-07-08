import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { BuildBookBlockRenderMode } from '../../build-book-block-patterns.catalog';
import { enrichedBlockDefinition } from '../../build-book-block-registry.util';

@Component({
  selector: 'app-protopipe-build-interactive-stub',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bb-interactive-stub">
      <div class="bb-interactive-stub__badge">Interactive preview</div>
      <h3>{{ heading() }}</h3>
      @if (subhead()) {
        <p>{{ subhead() }}</p>
      }
      <dl class="bb-interactive-stub__props">
        @for (row of previewRows(); track row.label) {
          <div>
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          </div>
        }
      </dl>
      <p class="bb-interactive-stub__note">
        Full {{ patternLabel() }} runs on the published site (Preact island). Edit copy here or in the Content tab.
      </p>
    </div>
  `,
  styles: [
    `
      .bb-interactive-stub {
        padding: 1.5rem;
        border: 2px dashed #cbd5e1;
        border-radius: 0.75rem;
        background: linear-gradient(135deg, rgb(248 250 252) 0%, rgb(241 245 249) 100%);
        color: #0f172a;
      }
      .bb-interactive-stub__badge {
        display: inline-block;
        margin-bottom: 0.75rem;
        padding: 0.2rem 0.5rem;
        border-radius: 999px;
        background: #0d9488;
        color: #fff;
        font-size: 0.625rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .bb-interactive-stub h3 {
        margin: 0 0 0.35rem;
        font-size: 1.125rem;
        letter-spacing: -0.02em;
      }
      .bb-interactive-stub p {
        margin: 0 0 0.85rem;
        color: #475569;
        font-size: 0.8125rem;
        line-height: 1.5;
      }
      .bb-interactive-stub__props {
        display: grid;
        gap: 0.45rem;
        margin: 0 0 0.85rem;
      }
      .bb-interactive-stub__props div {
        display: grid;
        grid-template-columns: 7rem minmax(0, 1fr);
        gap: 0.5rem;
        font-size: 0.75rem;
      }
      .bb-interactive-stub__props dt {
        margin: 0;
        color: #64748b;
        font-weight: 700;
      }
      .bb-interactive-stub__props dd {
        margin: 0;
        color: #0f172a;
        word-break: break-word;
      }
      .bb-interactive-stub__note {
        margin: 0;
        font-size: 0.6875rem;
        color: #64748b;
      }
    `,
  ],
})
export class ProtopipeBuildInteractiveStubComponent {
  readonly blockId = input.required<string>();
  readonly props = input<Record<string, unknown>>({});

  heading(): string {
    const props = this.props();
    return (
      (typeof props['heading'] === 'string' && props['heading']) ||
      (typeof props['title'] === 'string' && props['title']) ||
      this.patternLabel()
    );
  }

  subhead(): string {
    const props = this.props();
    return (
      (typeof props['subhead'] === 'string' && props['subhead']) ||
      (typeof props['lede'] === 'string' && props['lede']) ||
      ''
    );
  }

  patternLabel(): string {
    return enrichedBlockDefinition(this.blockId())?.patternLabel ?? 'Interactive block';
  }

  renderMode(): BuildBookBlockRenderMode {
    return enrichedBlockDefinition(this.blockId())?.renderMode ?? 'interactive-stub';
  }

  previewRows(): { label: string; value: string }[] {
    const props = this.props();
    const patternId = enrichedBlockDefinition(this.blockId())?.patternId;

    if (patternId === 'scheduler-embed') {
      return [
        { label: 'Calendly URL', value: stringProp(props, 'url') },
        { label: 'Embed height', value: String(props['embedHeight'] ?? '580') },
        { label: 'Connected', value: props['connected'] ? 'Yes' : 'Preview only' },
      ];
    }

    if (patternId === 'quote-request-form') {
      return [
        { label: 'Layout', value: stringProp(props, 'layout', 'wizard') },
        { label: 'Submit label', value: stringProp(props, 'submitLabel') },
        { label: 'Site slug', value: stringProp(props, 'siteSlug') },
      ];
    }

    return [{ label: 'Mode', value: this.renderMode() }];
  }
}

function stringProp(props: Record<string, unknown>, key: string, fallback = ''): string {
  const value = props[key];
  return typeof value === 'string' ? value : fallback;
}
