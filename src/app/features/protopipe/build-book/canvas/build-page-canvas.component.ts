import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import type { BuildBookSection, BuildBookWireLayout } from '../build-book.types';
import { BUILD_BOOK_SECTION_ORDER, buildBookSectionLabel } from '../build-book.constants';
import type { BuildHeroPreviewCopy } from '../build-hero-preview.types';
import { resolveBaselineBlockRenderer } from '../build-book-baseline.util';
import { ProtopipeBuildWilcoSiteFooterComponent } from '../baseline/wilco/build-wilco-site-footer.component';
import { ProtopipeBuildWilcoSiteHeaderComponent } from '../baseline/wilco/build-wilco-site-header.component';
import { ProtopipeBuildSparkySiteFooterComponent } from '../baseline/sparky/build-sparky-site-footer.component';
import { ProtopipeBuildSparkySiteHeaderComponent } from '../baseline/sparky/build-sparky-site-header.component';
import { ProtopipeBuildWriSiteFooterComponent } from '../baseline/wri/build-wri-site-footer.component';
import { ProtopipeBuildWriSiteHeaderComponent } from '../baseline/wri/build-wri-site-header.component';
import { ProtopipeBuildVeilSiteFooterComponent } from '../baseline/veil/build-veil-site-footer.component';
import { ProtopipeBuildVeilSiteHeaderComponent } from '../baseline/veil/build-veil-site-header.component';
import { HIL_ASSETS } from '../baseline/hil/build-book-hil-content.constants';
import { applySiteThemeCssVarsToCanvas } from '../../site-design/site-theme.util';
import { ProtopipeBuildBlockSectionComponent, type BuildBlockImageEditEvent, type BuildBlockInspectorTab } from './build-block-section.component';

export interface BuildPageImageEditEvent {
  blockId?: string;
  propPath?: string;
}

export interface BuildPageSectionState {
  section: BuildBookSection;
  blockId: string | null;
  layout: BuildBookWireLayout;
  props: Record<string, unknown>;
  configured: boolean;
}

export interface BuildPageBlockState {
  id: string;
  blockId: string;
  section: BuildBookSection;
  label: string;
  layout: BuildBookWireLayout;
  props: Record<string, unknown>;
  configured: boolean;
  pendingPreview?: boolean;
}

export interface BuildPageBlockRenderGroup {
  key: string;
  type: 'hero-unit' | 'single';
  blocks: BuildPageBlockState[];
}

export interface BuildPageBlockRenderSegment {
  key: string;
  type: 'hero-unit' | 'fold-stack' | 'single';
  blocks: BuildPageBlockState[];
}

const WRI_HERO_BLOCK_ID = 'wri-baseline-hero-life-proof';
const WRI_CONTRACT_BLOCK_ID = 'wri-baseline-contract-bar';
const SPARKY_HERO_BLOCK_ID = 'sparky-baseline-hero-callout';
const SPARKY_FIELD_NOTES_BLOCK_ID = 'sparky-baseline-field-notes';

@Component({
  selector: 'app-protopipe-build-page-canvas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    ProtopipeBuildBlockSectionComponent,
    ProtopipeBuildWriSiteHeaderComponent,
    ProtopipeBuildWriSiteFooterComponent,
    ProtopipeBuildSparkySiteHeaderComponent,
    ProtopipeBuildSparkySiteFooterComponent,
    ProtopipeBuildWilcoSiteHeaderComponent,
    ProtopipeBuildWilcoSiteFooterComponent,
    ProtopipeBuildVeilSiteHeaderComponent,
    ProtopipeBuildVeilSiteFooterComponent,
  ],
  templateUrl: './build-page-canvas.component.html',
  styleUrl: './build-page-canvas.component.scss',
})
export class ProtopipeBuildPageCanvasComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly baselineMode = input(false);
  readonly sections = input<BuildPageSectionState[]>([]);
  readonly blocks = input<BuildPageBlockState[]>([]);
  readonly activeSection = input<BuildBookSection>('hero');
  readonly activeBlockId = input<string | null>(null);
  readonly editable = input(true);
  readonly heroLayoutId = input('sp-callout');
  readonly heroImageUrl = input<string | null>(null);
  readonly heroPhotoDriftedBlockId = input<string | null>(null);
  readonly scrollToSection = input<BuildBookSection | null>(null);
  readonly scrollToBlockId = input<string | null>(null);
  readonly focusBlockMode = input(false);
  readonly themeCssVars = input<Record<string, string> | null>(null);
  readonly siteBaselineRenderer = input<
    'wri-site' | 'sparky-site' | 'wilco-site' | 'veil-site' | 'hil-site' | null
  >(null);

  readonly sectionClick = output<BuildBookSection>();
  readonly blockClick = output<string>();
  readonly propsChange = output<{ section: BuildBookSection; props: Record<string, unknown> }>();
  readonly propPathChange = output<{ section: BuildBookSection; path: string; value: unknown }>();
  readonly blockPropPathChange = output<{ blockId: string; path: string; value: unknown }>();
  readonly blockPropsChange = output<{ blockId: string; props: Record<string, unknown> }>();
  readonly copyChange = output<BuildHeroPreviewCopy>();
  readonly imageEdit = output<BuildPageImageEditEvent>();
  readonly inspectorNavigate = output<BuildBlockInspectorTab>();
  readonly resetHeroPhoto = output<string>();

  readonly sectionSlots = BUILD_BOOK_SECTION_ORDER;
  readonly hilLogoSrc = HIL_ASSETS.logoHorizontal;

  constructor() {
    effect(() => {
      applySiteThemeCssVarsToCanvas(this.host.nativeElement, this.themeCssVars());
    });

    effect(() => {
      const blockTarget = this.scrollToBlockId();
      if (blockTarget) {
        queueMicrotask(() => {
          const el = this.host.nativeElement.querySelector(`[data-block-id="${blockTarget}"]`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return;
      }

      const target = this.scrollToSection();
      if (!target) return;
      queueMicrotask(() => {
        const el = this.host.nativeElement.querySelector(`[data-section="${target}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  readonly baselineSiteRenderer = computed((): 'wri-site' | 'sparky-site' | 'wilco-site' | 'veil-site' | 'hil-site' | null => {
    const siteRenderer = this.siteBaselineRenderer();
    if (siteRenderer) return siteRenderer;
    for (const block of this.blocks()) {
      const renderer = resolveBaselineBlockRenderer(block.blockId, block.props);
      if (renderer) return renderer;
    }
    return null;
  });

  readonly baselineRenderGroups = computed((): BuildPageBlockRenderGroup[] => {
    const blocks = this.blocks();
    const groups: BuildPageBlockRenderGroup[] = [];
    let index = 0;

    while (index < blocks.length) {
      const block = blocks[index];
      const next = blocks[index + 1];
      if (
        this.baselineSiteRenderer() === 'wri-site' &&
        block.blockId === WRI_HERO_BLOCK_ID &&
        next?.blockId === WRI_CONTRACT_BLOCK_ID
      ) {
        groups.push({ key: block.id, type: 'hero-unit', blocks: [block, next] });
        index += 2;
        continue;
      }

      groups.push({ key: block.id, type: 'single', blocks: [block] });
      index += 1;
    }

    return groups;
  });

  readonly baselineRenderSegments = computed((): BuildPageBlockRenderSegment[] => {
    const renderer = this.baselineSiteRenderer();
    if (renderer === 'sparky-site') return this.sparkyRenderSegments();
    if (renderer === 'veil-site') return this.veilRenderSegments();
    return this.wriRenderSegments();
  });

  stateFor(section: BuildBookSection): BuildPageSectionState {
    return (
      this.sections().find((item) => item.section === section) ?? {
        section,
        blockId: null,
        layout: 'grid',
        props: {},
        configured: false,
      }
    );
  }

  onSectionClick(section: BuildBookSection): void {
    this.sectionClick.emit(section);
  }

  onBlockClick(blockId: string): void {
    this.blockClick.emit(blockId);
  }

  onPropsChange(section: BuildBookSection, props: Record<string, unknown>): void {
    this.propsChange.emit({ section, props });
  }

  onPropPathChange(section: BuildBookSection, path: string, value: unknown): void {
    this.propPathChange.emit({ section, path, value });
  }

  onBlockPropPathChange(blockId: string, path: string, value: unknown): void {
    this.blockPropPathChange.emit({ blockId, path, value });
  }

  onBlockPropsChange(blockId: string, props: Record<string, unknown>): void {
    this.blockPropsChange.emit({ blockId, props });
  }

  onBlockImageEdit(blockId: string, event: BuildBlockImageEditEvent): void {
    this.imageEdit.emit({ blockId, propPath: event.propPath });
  }

  sectionLabel(section: BuildBookSection): string {
    return buildBookSectionLabel(section);
  }

  isFocusBlockActive(blockInstanceId: string): boolean {
    if (!this.focusBlockMode()) return true;
    const active = this.activeBlockId();
    return !active || active === blockInstanceId;
  }

  private wriRenderSegments(): BuildPageBlockRenderSegment[] {
    const segments: BuildPageBlockRenderSegment[] = [];

    for (const group of this.baselineRenderGroups()) {
      if (group.type === 'hero-unit') {
        segments.push({
          key: group.key,
          type: 'hero-unit',
          blocks: group.blocks,
        });
        continue;
      }

      const last = segments[segments.length - 1];
      if (last?.type === 'fold-stack') {
        last.blocks.push(...group.blocks);
        last.key = last.blocks.map((block) => block.id).join(':');
        continue;
      }

      segments.push({
        key: group.blocks.map((block) => block.id).join(':'),
        type: 'fold-stack',
        blocks: [...group.blocks],
      });
    }

    return segments;
  }

  private veilRenderSegments(): BuildPageBlockRenderSegment[] {
    const segments: BuildPageBlockRenderSegment[] = [];

    for (const block of this.blocks()) {
      if (block.section === 'hero') {
        segments.push({ key: block.id, type: 'single', blocks: [block] });
        continue;
      }

      const last = segments[segments.length - 1];
      if (last?.type === 'fold-stack') {
        last.blocks.push(block);
        last.key = last.blocks.map((item) => item.id).join(':');
        continue;
      }

      segments.push({
        key: block.id,
        type: 'fold-stack',
        blocks: [block],
      });
    }

    return segments;
  }

  private sparkyRenderSegments(): BuildPageBlockRenderSegment[] {
    const segments: BuildPageBlockRenderSegment[] = [];

    for (const block of this.blocks()) {
      if (block.blockId === SPARKY_HERO_BLOCK_ID || block.blockId === SPARKY_FIELD_NOTES_BLOCK_ID) {
        segments.push({ key: block.id, type: 'single', blocks: [block] });
        continue;
      }

      const last = segments[segments.length - 1];
      if (last?.type === 'fold-stack') {
        last.blocks.push(block);
        last.key = last.blocks.map((item) => item.id).join(':');
        continue;
      }

      segments.push({
        key: block.id,
        type: 'fold-stack',
        blocks: [block],
      });
    }

    return segments;
  }
}
