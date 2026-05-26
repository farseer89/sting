import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';

/** Desktop viewport we render at, then scale down to the card. */
const PREVIEW_WIDTH = 1280;
const PREVIEW_HEIGHT = 720;

@Component({
  selector: 'app-template-preview-frame',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="preview-frame"
      #host
      [style.aspect-ratio]="aspectRatio"
      [style.max-height]="maxHeight"
    >
      <div class="preview-frame__scaler" [style.transform]="transform()">
        <iframe
          [src]="src"
          [title]="title"
          loading="lazy"
          tabindex="-1"
        ></iframe>
      </div>
    </div>
  `,
  styles: `
    .preview-frame {
      position: relative;
      width: 100%;
      overflow: hidden;
      background: #e8eaed;
      contain: layout style paint;
    }
    .preview-frame__scaler {
      position: absolute;
      top: 0;
      left: 0;
      width: 1280px;
      height: 720px;
      transform-origin: 0 0;
      will-change: transform;
      pointer-events: none;
    }
    iframe {
      display: block;
      width: 1280px;
      height: 720px;
      border: 0;
    }
  `,
})
export class TemplatePreviewFrameComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) src!: SafeResourceUrl;
  @Input() title = 'Site preview';
  /** CSS aspect-ratio value, e.g. `16 / 9` */
  @Input() aspectRatio = '16 / 9';
  /** Caps thumbnail height on gallery cards */
  @Input() maxHeight = '11rem';

  private readonly host = viewChild<ElementRef<HTMLElement>>('host');
  private resizeObserver?: ResizeObserver;

  protected readonly transform = signal('scale(0.2)');

  ngAfterViewInit(): void {
    const el = this.host()?.nativeElement;
    if (!el) return;

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      const scale = Math.min(width / PREVIEW_WIDTH, height / PREVIEW_HEIGHT);
      this.transform.set(`scale(${scale})`);
    };

    this.resizeObserver = new ResizeObserver(() => update());
    this.resizeObserver.observe(el);
    update();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }
}
