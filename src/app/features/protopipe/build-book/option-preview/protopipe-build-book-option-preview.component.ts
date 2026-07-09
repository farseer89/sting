import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewEncapsulation,
  computed,
  effect,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type { BuildBookOption, BuildBookSection } from '../build-book.types';
import type { SiteDesignContext } from '../../site-design/public';
import { siteThemeTokensToCssVars } from '../../site-design/site-theme.util';
import { DEFAULT_HERO_PREVIEW_COPY } from '../build-hero-preview.types';
import { readHeroCopy } from '../build-hero-block.util';
import { ProtopipeBuildHeroPreviewComponent } from '../build-hero-preview/protopipe-build-hero-preview.component';
import { ProtopipeBuildFoldBlockComponent } from '../blocks/build-fold-block.component';
import { ProtopipeBuildSparkyBaselineBlockComponent } from '../baseline/sparky/build-sparky-baseline-block.component';
import { ProtopipeBuildWriBaselineBlockComponent } from '../baseline/wri/build-wri-baseline-block.component';
import { ProtopipeBuildWilcoBaselineBlockComponent } from '../baseline/wilco/build-wilco-baseline-block.component';
import { ProtopipeBuildVeilBaselineBlockComponent } from '../baseline/veil/build-veil-baseline-block.component';
import { ProtopipeBuildHilBaselineBlockComponent } from '../baseline/hil/build-hil-baseline-block.component';
import {
  optionPreviewViewportWidth,
  resolveOptionPreviewTarget,
} from './build-book-option-preview.util';
import { resolveHeroPreviewWireLayout } from '../build-book-demo.catalog';

const HERO_PREVIEW_PLACEHOLDER_IMAGE =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000"%3E%3Cdefs%3E%3ClinearGradient id="g" x1="0" x2="1" y1="0" y2="1"%3E%3Cstop offset="0" stop-color="%230f766e"/%3E%3Cstop offset="0.52" stop-color="%23164e63"/%3E%3Cstop offset="1" stop-color="%230f172a"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="1600" height="1000" fill="url(%23g)"/%3E%3C/svg%3E';

@Component({
  selector: 'app-protopipe-build-book-option-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[style]': 'previewThemeStyle()',
  },
  imports: [
    ProtopipeBuildHeroPreviewComponent,
    ProtopipeBuildFoldBlockComponent,
    ProtopipeBuildSparkyBaselineBlockComponent,
    ProtopipeBuildWriBaselineBlockComponent,
    ProtopipeBuildWilcoBaselineBlockComponent,
    ProtopipeBuildVeilBaselineBlockComponent,
    ProtopipeBuildHilBaselineBlockComponent,
  ],
  templateUrl: './protopipe-build-book-option-preview.component.html',
  styleUrl: './protopipe-build-book-option-preview.component.scss',
})
export class ProtopipeBuildBookOptionPreviewComponent implements AfterViewInit, OnDestroy {
  readonly option = input.required<BuildBookOption>();
  readonly section = input.required<BuildBookSection>();
  readonly selected = input(false);
  readonly designContext = input<SiteDesignContext | null>(null);
  /** Live canvas hero image — applied only when this card is selected. */
  readonly liveHeroImageUrl = input<string | null>(null);

  readonly previewThemeStyle = computed(() => {
    const ctx = this.designContext();
    return ctx ? siteThemeTokensToCssVars(ctx.theme) : {};
  });

  readonly frameRef = viewChild.required<ElementRef<HTMLElement>>('frame');
  readonly viewportRef = viewChild<ElementRef<HTMLElement>>('viewport');

  readonly target = computed(() => {
    const section = this.section();
    if (section !== 'hero' && section !== 'fold') return null;
    return resolveOptionPreviewTarget(this.option(), section, this.designContext(), {
      selected: this.selected(),
      liveHeroImageUrl: this.liveHeroImageUrl(),
    });
  });
  readonly heroCopy = computed(() => {
    const target = this.target();
    const props = target?.props;
    return props && Object.keys(props).length ? readHeroCopy(props) : DEFAULT_HERO_PREVIEW_COPY;
  });
  readonly heroImageUrl = computed(
    () => this.target()?.heroImageUrl ?? HERO_PREVIEW_PLACEHOLDER_IMAGE,
  );
  readonly heroLayoutId = computed(() => {
    const layoutId = this.target()?.heroLayoutId ?? 'sp-callout';
    return resolveHeroPreviewWireLayout(layoutId);
  });
  readonly viewportWidth = computed(() => optionPreviewViewportWidth(this.section()));

  readonly scale = signal(0.3);
  readonly offsetX = signal(0);
  readonly offsetY = signal(0);
  readonly viewportTransform = computed(
    () =>
      `translate(${this.offsetX()}px, ${this.offsetY()}px) scale(${this.scale()})`,
  );

  private resizeObserver?: ResizeObserver;
  private observedViewport?: Element;

  constructor() {
    effect(() => {
      this.target();
      this.option();
      this.section();
      queueMicrotask(() => this.updateScale());
    });
  }

  ngAfterViewInit(): void {
    this.resizeObserver = new ResizeObserver(() => this.updateScale());
    this.resizeObserver.observe(this.frameRef().nativeElement);

    const viewport = this.viewportRef()?.nativeElement;
    if (viewport) this.resizeObserver.observe(viewport);
    this.updateScale();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private updateScale(): void {
    const frame = this.frameRef().nativeElement;
    const viewport = this.viewportRef()?.nativeElement;
    const frameW = frame.clientWidth;
    const frameH = frame.clientHeight;
    if (!frameW || !frameH || !viewport) return;

    if (viewport !== this.observedViewport && this.resizeObserver) {
      this.resizeObserver.observe(viewport);
      this.observedViewport = viewport;
    }

    const designW = this.viewportWidth();
    const contentW = designW;
    const contentH = Math.max(viewport.scrollHeight, viewport.offsetHeight, 1);

    const scaleW = frameW / contentW;
    const scaleH = frameH / contentH;
    const nextScale = Math.min(scaleW, scaleH);

    this.scale.set(nextScale);
    this.offsetX.set(Math.max(0, (frameW - contentW * nextScale) / 2));
    this.offsetY.set(Math.max(0, (frameH - contentH * nextScale) / 2));
  }
}
