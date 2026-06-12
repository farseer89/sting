import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Tag } from 'primeng/tag';
import type { SiteBuilderComponentEntry } from '@hive/contracts';
import { ProtopipeSiteBuilderService } from './protopipe-site-builder.service';
import { TemplatePreviewFrameComponent } from './template-preview-frame.component';

const COMPONENT_PREVIEW_BASE = 'https://cs-component-previews.pages.dev';

const CATEGORY_ORDER = ['hero', 'content', 'social', 'cta', 'interactive'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  hero: 'Hero',
  content: 'Content',
  social: 'Social proof',
  cta: 'CTA',
  interactive: 'Interactive',
};

@Component({
  selector: 'app-site-block-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Dialog, Button, Tag, ProgressSpinner, TemplatePreviewFrameComponent],
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="onVisibleChange($event)"
      header="Add section"
      [modal]="true"
      [style]="{ width: 'min(56rem, 96vw)' }"
      [draggable]="false"
      [resizable]="false"
    >
      @if (sb.loading()) {
        <div class="picker-loading">
          <p-progressSpinner ariaLabel="Loading blocks" />
        </div>
      } @else if (sb.error(); as err) {
        <p class="error">{{ err }}</p>
      } @else {
        <div class="picker-filters">
          <p-button
            label="All"
            [outlined]="activeCategory() !== 'all'"
            (onClick)="setCategory('all')"
          />
          @for (cat of categories(); track cat) {
            <p-button
              [label]="categoryLabel(cat)"
              [outlined]="activeCategory() !== cat"
              (onClick)="setCategory(cat)"
            />
          }
        </div>

        <div class="picker-grid">
          @for (c of filteredComponents(); track c.id) {
            <button type="button" class="picker-card" (click)="select(c)">
              <div class="picker-card__preview" aria-hidden="true">
                <app-template-preview-frame
                  [src]="previewFrameUrl(c)"
                  [title]="c.label + ' preview'"
                />
              </div>
              <div class="picker-card__meta">
                <strong>{{ c.label }}</strong>
                <div class="picker-card__tags">
                  <p-tag [value]="categoryLabel(c.category)" />
                  <p-tag value="Mobile-ready" severity="success" />
                </div>
                <p class="picker-card__desc">{{ c.description }}</p>
              </div>
            </button>
          }
        </div>
      }
    </p-dialog>
  `,
  styles: `
    .picker-loading {
      display: flex;
      justify-content: center;
      padding: 2rem;
    }
    .picker-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .picker-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: 1fr;
      max-height: 60vh;
      overflow-y: auto;
    }
    @media (min-width: 40rem) {
      .picker-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (min-width: 56rem) {
      .picker-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    .picker-card {
      display: flex;
      flex-direction: column;
      text-align: left;
      border: 1px solid var(--surface-border);
      border-radius: 8px;
      background: var(--surface-card);
      padding: 0;
      cursor: pointer;
      overflow: hidden;
      min-height: 44px;
    }
    .picker-card:hover {
      border-color: var(--primary-color);
    }
    .picker-card__preview {
      border-bottom: 1px solid var(--surface-border);
      height: 8rem;
    }
    .picker-card__meta {
      padding: 0.75rem;
    }
    .picker-card__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin: 0.35rem 0;
    }
    .picker-card__desc {
      margin: 0;
      font-size: 0.85rem;
      color: var(--text-color-secondary);
      line-height: 1.4;
    }
    .error {
      color: var(--red-500);
    }
  `,
})
export class SiteBlockPickerComponent implements OnInit {
  readonly visible = input(false);
  readonly visibleChange = output<boolean>();
  readonly blockSelected = output<SiteBuilderComponentEntry>();

  protected readonly sb = inject(ProtopipeSiteBuilderService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly activeCategory = signal<string>('all');

  ngOnInit(): void {
    void this.sb.ensureLoaded();
  }

  protected categories(): string[] {
    const ids = new Set(this.sb.components().map((c) => c.category));
    return CATEGORY_ORDER.filter((c) => ids.has(c));
  }

  protected categoryLabel(cat: string): string {
    return CATEGORY_LABELS[cat] ?? cat;
  }

  protected filteredComponents(): SiteBuilderComponentEntry[] {
    const cat = this.activeCategory();
    const list = this.sb.components();
    if (cat === 'all') return list;
    return list.filter((c) => c.category === cat);
  }

  protected setCategory(cat: string): void {
    this.activeCategory.set(cat);
  }

  protected previewFrameUrl(c: SiteBuilderComponentEntry): SafeResourceUrl {
    const url = (c.previewPath || '').trim() || `${COMPONENT_PREVIEW_BASE}/${c.id}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  protected select(c: SiteBuilderComponentEntry): void {
    this.blockSelected.emit(c);
    this.onVisibleChange(false);
  }

  protected onVisibleChange(open: boolean): void {
    this.visibleChange.emit(open);
  }
}
