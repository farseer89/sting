import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type { ThoughtArtifact } from './thought.model';

interface TableData {
  columns: string[];
  rows: string[][];
}

interface MetricData {
  value: string | number;
  unit?: string;
  delta?: string;
}

interface ImageData {
  url: string;
  alt?: string;
  prompt?: string;
}

/** Renders a single Thought artifact by `kind`. Copyable raw for json. */
@Component({
  selector: 'app-thought-artifact-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <article class="art" [attr.data-kind]="artifact().kind">
      <header class="art__head">
        <span class="art__label">{{ artifact().label }}</span>
        <span class="art__kind">{{ artifact().kind }}</span>
      </header>

      @if (artifact().summary) {
        <p class="art__summary">{{ artifact().summary }}</p>
      }

      @switch (artifact().kind) {
        @case ('metric') {
          <div class="art__metric">
            <span class="art__metric-value">{{ metric().value }}</span>
            @if (metric().unit) {
              <span class="art__metric-unit">{{ metric().unit }}</span>
            }
            @if (metric().delta) {
              <span class="art__metric-delta">{{ metric().delta }}</span>
            }
          </div>
        }
        @case ('table') {
          <table class="art__table">
            <thead>
              <tr>
                @for (col of table().columns; track col) {
                  <th>{{ col }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of table().rows; track $index) {
                <tr>
                  @for (cell of row; track $index) {
                    <td>{{ cell }}</td>
                  }
                </tr>
              }
            </tbody>
          </table>
        }
        @case ('json') {
          <pre class="art__pre">{{ pretty() }}</pre>
        }
        @case ('image') {
          <figure class="art__figure">
            <img class="art__img" [src]="image().url" [alt]="image().alt" loading="lazy" />
            @if (image().prompt) {
              <figcaption class="art__caption">
                <span class="art__caption-label">Prompt</span>
                {{ image().prompt }}
              </figcaption>
            }
          </figure>
        }
        @default {
          <pre class="art__prose">{{ asText() }}</pre>
        }
      }
    </article>
  `,
  styles: [
    `
      :host { display: block; }
      .art {
        border: 0.5px solid var(--void-glass-border);
        background: var(--void-tile-bg);
        border-radius: 7px;
        padding: 0.5rem 0.6rem;
      }
      .art__head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.5rem;
        margin-bottom: 0.3rem;
      }
      .art__label {
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.04em;
        color: var(--void-ink-body);
      }
      .art__kind {
        font-size: 8px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--void-ocean-muted);
      }
      .art__summary {
        margin: 0 0 0.4rem;
        font-size: 11px;
        line-height: 1.45;
        color: var(--void-ink-soft);
      }
      .art__pre,
      .art__prose {
        margin: 0;
        font-family: 'SFMono-Regular', ui-monospace, Menlo, monospace;
        font-size: 10.5px;
        line-height: 1.5;
        color: var(--void-ink-dim);
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 320px;
        overflow: auto;
      }
      .art__prose {
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 12px;
        color: var(--void-ink-soft);
      }
      .art__metric {
        display: flex;
        align-items: baseline;
        gap: 0.35rem;
      }
      .art__metric-value {
        font-size: 22px;
        font-weight: 600;
        color: var(--void-ink-strong);
        font-variant-numeric: tabular-nums;
      }
      .art__metric-unit { font-size: 11px; color: var(--void-ink-muted); }
      .art__metric-delta { font-size: 11px; color: var(--void-ocean); }
      .art__figure { margin: 0; }
      .art__img {
        display: block;
        width: 100%;
        max-height: 280px;
        object-fit: cover;
        border-radius: 6px;
        border: 0.5px solid var(--void-glass-border);
      }
      .art__caption {
        margin: 0.45rem 0 0;
        font-size: 11px;
        line-height: 1.45;
        color: var(--void-ink-soft);
      }
      .art__caption-label {
        display: block;
        font-size: 8px;
        font-weight: 500;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--void-ocean-muted);
        margin-bottom: 0.15rem;
      }
      .art__table {
        width: 100%;
        border-collapse: collapse;
        font-size: 10.5px;
      }
      .art__table th {
        text-align: left;
        font-weight: 500;
        color: var(--void-ink-label);
        text-transform: uppercase;
        font-size: 8px;
        letter-spacing: 0.06em;
        padding: 0.2rem 0.4rem 0.2rem 0;
        border-bottom: 0.5px solid var(--void-row-border);
      }
      .art__table td {
        padding: 0.22rem 0.4rem 0.22rem 0;
        color: var(--void-ink-body);
        border-bottom: 0.5px solid var(--void-row-border);
      }
    `,
  ],
})
export class ThoughtArtifactCardComponent {
  readonly artifact = input.required<ThoughtArtifact>();

  readonly metric = computed<MetricData>(() => {
    const d = this.artifact().data;
    return (d && typeof d === 'object' ? (d as MetricData) : { value: String(d) });
  });

  readonly table = computed<TableData>(() => {
    const d = this.artifact().data as TableData;
    return d?.columns ? d : { columns: [], rows: [] };
  });

  readonly image = computed<ImageData>(() => {
    const d = this.artifact().data as ImageData;
    return d?.url ? d : { url: '', alt: '', prompt: '' };
  });

  readonly pretty = computed<string>(() => {
    try {
      return JSON.stringify(this.artifact().data, null, 2);
    } catch {
      return String(this.artifact().data);
    }
  });

  readonly asText = computed<string>(() => {
    const d = this.artifact().data;
    return typeof d === 'string' ? d : this.pretty();
  });
}
