import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { BuildBookSection, BuildBookWireLayout } from '../build-book.types';
import { ProtopipeBuildFoldBlockComponent } from '../blocks/build-fold-block.component';
import { ProtopipeBuildServicesBlockComponent } from '../blocks/build-services-block.component';
import { ProtopipeBuildProofBlockComponent } from '../blocks/build-proof-block.component';
import { ProtopipeBuildAreasBlockComponent } from '../blocks/build-areas-block.component';
import { ProtopipeBuildCloseBlockComponent } from '../blocks/build-close-block.component';
import { ProtopipeBuildHeroPreviewComponent } from '../build-hero-preview/protopipe-build-hero-preview.component';
import type { BuildWilcoImageEditRequest } from '../baseline/wilco/build-wilco-baseline-block.component';
import { ProtopipeBuildWilcoBaselineBlockComponent } from '../baseline/wilco/build-wilco-baseline-block.component';
import type { BuildSparkyImageEditRequest } from '../baseline/sparky/build-sparky-baseline-block.component';
import { ProtopipeBuildSparkyBaselineBlockComponent } from '../baseline/sparky/build-sparky-baseline-block.component';
import { ProtopipeBuildWriBaselineBlockComponent } from '../baseline/wri/build-wri-baseline-block.component';
import type { BuildVeilImageEditRequest } from '../baseline/veil/build-veil-baseline-block.component';
import { ProtopipeBuildVeilBaselineBlockComponent } from '../baseline/veil/build-veil-baseline-block.component';
import {
  isBaselineBlock,
  isBaselineBlockProps,
  isVeilBaselineBlockId,
  resolveBaselineBlockRenderer,
} from '../build-book-baseline.util';
import {
  isBaselineApprovedHeroLayout,
  resolveBaselineHeroLayoutId,
} from '../build-book-baseline-hero.catalog';
import {
  baselineFoldRendererBrand,
  isBaselineApprovedFoldLayout,
  resolveBaselineFoldLayoutId,
} from '../build-book-baseline-fold.catalog';
import {
  effectiveBaselineBlockIdForLayout,
} from '../option-preview/build-book-option-preview.util';
import {
  foldLabPreviewProps,
  resolveFoldWireLayout,
} from '../build-fold-block.util';
import {
  DEFAULT_HERO_PREVIEW_COPY,
  type BuildHeroPreviewCopy,
} from '../build-hero-preview.types';
import { resolveHeroPreviewWireLayout } from '../build-book-demo.catalog';
import {
  isVeilHeroLabLayout,
  resolveVeilHeroPreviewBlockId,
} from '../build-book-veil-hero.catalog';
import { readHeroCopy, readHeroImageUrl, resolveHeroPreviewLayoutId } from '../build-hero-block.util';
import { buildBookSectionLabel } from '../build-book.constants';
import type { BuildWriImageEditRequest } from '../baseline/wri/build-wri-baseline-block.component';
import { enrichedBlockDefinition } from '../build-book-block-registry.util';
import { ProtopipeBuildInteractiveStubComponent } from '../baseline/hil/build-interactive-stub.component';
import { ProtopipeBuildHilBaselineBlockComponent } from '../baseline/hil/build-hil-baseline-block.component';
import {
  ProtopipeBuildUniversalBaselineBlockComponent,
  type BuildUniversalImageEditRequest,
} from '../baseline/universal/build-universal-baseline-block.component';
import { isUniversalBaselineBlockId } from '../build-book-universal-block.catalog';

export interface BuildBlockImageEditEvent {
  propPath?: string;
}

export type BuildBlockInspectorTab = 'content' | 'layout' | 'media' | 'links';

const HERO_PREVIEW_PLACEHOLDER_IMAGE =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000"%3E%3Cdefs%3E%3ClinearGradient id="g" x1="0" x2="1" y1="0" y2="1"%3E%3Cstop offset="0" stop-color="%230f766e"/%3E%3Cstop offset="0.52" stop-color="%23164e63"/%3E%3Cstop offset="1" stop-color="%230f172a"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="1600" height="1000" fill="url(%23g)"/%3E%3C/svg%3E';

@Component({
  selector: 'app-protopipe-build-block-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-section]': 'section()',
    '[attr.data-block-id]': 'blockInstanceId() || null',
    '[class.is-baseline-block]': 'isBaselineRenderer()',
    '[class.is-lab-fold-preview]': 'isBaselineFoldLabPreview()',
    '[class.is-pending-preview]': 'pendingPreview()',
  },
  imports: [
    ProtopipeBuildHeroPreviewComponent,
    ProtopipeBuildFoldBlockComponent,
    ProtopipeBuildServicesBlockComponent,
    ProtopipeBuildProofBlockComponent,
    ProtopipeBuildAreasBlockComponent,
    ProtopipeBuildCloseBlockComponent,
    ProtopipeBuildWriBaselineBlockComponent,
    ProtopipeBuildSparkyBaselineBlockComponent,
    ProtopipeBuildWilcoBaselineBlockComponent,
    ProtopipeBuildVeilBaselineBlockComponent,
    ProtopipeBuildInteractiveStubComponent,
    ProtopipeBuildHilBaselineBlockComponent,
    ProtopipeBuildUniversalBaselineBlockComponent,
  ],
  templateUrl: './build-block-section.component.html',
  styleUrl: './build-block-section.component.scss',
})
export class ProtopipeBuildBlockSectionComponent {
  readonly section = input.required<BuildBookSection>();
  readonly blockId = input<string | null>(null);
  readonly blockInstanceId = input<string | null>(null);
  readonly baselineBlockId = input<string | null>(null);
  readonly layout = input<BuildBookWireLayout>('grid');
  readonly props = input<Record<string, unknown>>({});
  readonly editable = input(true);
  readonly active = input(false);
  readonly configured = input(false);
  readonly heroLayoutId = input('sp-callout');
  readonly heroImageUrl = input<string | null>(null);
  readonly blockLabel = input('');
  readonly showBlockChrome = input(false);
  readonly heroPhotoDrifted = input(false);
  readonly pendingPreview = input(false);

  readonly sectionClick = output<BuildBookSection>();
  readonly propsChange = output<Record<string, unknown>>();
  readonly propPathChange = output<{ path: string; value: unknown }>();
  readonly imageEdit = output<BuildBlockImageEditEvent>();
  readonly copyChange = output<BuildHeroPreviewCopy>();
  readonly inspectorNavigate = output<BuildBlockInspectorTab>();
  readonly resetHeroPhoto = output<void>();

  sectionLabel(): string {
    return buildBookSectionLabel(this.section());
  }

  isBaselineRenderer(): boolean {
    return isBaselineBlock(this.resolvedBaselineBlockId(), this.props());
  }

  isInteractiveStubBlock(): boolean {
    const blockId = this.resolvedBaselineBlockId();
    return enrichedBlockDefinition(blockId)?.renderMode === 'interactive-stub';
  }

  isUniversalBaselineBlock(): boolean {
    return isUniversalBaselineBlockId(this.resolvedBaselineBlockId());
  }

  isHilBaselineBlock(): boolean {
    return this.baselineRenderer() === 'hil-site' && !this.isInteractiveStubBlock();
  }

  baselineRenderer(): 'wri-site' | 'sparky-site' | 'wilco-site' | 'veil-site' | 'hil-site' | null {
    return resolveBaselineBlockRenderer(this.resolvedBaselineBlockId(), this.props());
  }

  resolvedBaselineBlockId(): string {
    return this.baselineBlockId() ?? this.blockId() ?? '';
  }

  effectiveFoldBlockId(): string {
    if (this.section() !== 'fold' || !this.isBaselineRenderer()) {
      return this.resolvedBaselineBlockId();
    }
    return effectiveBaselineBlockIdForLayout(
      'fold',
      this.resolvedFoldLayoutId(),
      this.resolvedBaselineBlockId(),
    );
  }

  effectiveFoldRenderer(): 'sparky' | 'wri' | 'wilco' | 'veil' | null {
    if (this.section() !== 'fold' || !this.isBaselineRenderer()) return null;
    if (!isBaselineApprovedFoldLayout(this.resolvedFoldLayoutId())) return null;
    return baselineFoldRendererBrand(this.resolvedFoldLayoutId());
  }

  usesEffectiveFoldRenderer(): boolean {
    return Boolean(this.effectiveFoldRenderer());
  }

  heroCopy(): BuildHeroPreviewCopy {
    return this.configured() ? readHeroCopy(this.props()) : DEFAULT_HERO_PREVIEW_COPY;
  }

  heroPreviewImageUrl(): string {
    return (
      readHeroImageUrl(this.props(), this.resolvedHeroLayoutId()) ??
      this.heroImageUrl() ??
      HERO_PREVIEW_PLACEHOLDER_IMAGE
    );
  }

  isBaselineHeroLabPreview(): boolean {
    if (!this.isBaselineRenderer() || this.section() !== 'hero') return false;
    if (this.baselineRenderer() === 'hil-site' || this.isInteractiveStubBlock()) return false;
    if (isVeilHeroLabLayout(this.resolvedHeroLayoutId())) return false;
    return !isBaselineApprovedHeroLayout(this.resolvedHeroLayoutId());
  }

  isBaselineVeilHeroLabPreview(): boolean {
    if (!this.isBaselineRenderer() || this.section() !== 'hero') return false;
    return isVeilHeroLabLayout(this.resolvedHeroLayoutId());
  }

  resolvedVeilHeroPreviewBlockId(): string {
    return (
      resolveVeilHeroPreviewBlockId(this.resolvedHeroLayoutId(), this.resolvedBaselineBlockId()) ??
      this.resolvedBaselineBlockId()
    );
  }

  isBaselineFoldLabPreview(): boolean {
    if (!this.isBaselineRenderer() || this.section() !== 'fold') return false;
    if (this.baselineRenderer() === 'hil-site') return false;
    if (isVeilBaselineBlockId(this.resolvedBaselineBlockId())) return false;
    return !isBaselineApprovedFoldLayout(this.resolvedFoldLayoutId());
  }

  resolvedFoldLayoutId(): string {
    if (this.section() === 'fold' && this.isBaselineRenderer()) {
      return resolveBaselineFoldLayoutId(this.resolvedBaselineBlockId(), this.props());
    }
    const labLayout = this.props()['labLayout'];
    return typeof labLayout === 'string' ? labLayout : this.layout();
  }

  resolvedFoldWireLayout(): BuildBookWireLayout {
    return resolveFoldWireLayout(this.resolvedFoldLayoutId());
  }

  foldLabPreviewProps(): Record<string, unknown> {
    return foldLabPreviewProps(this.resolvedFoldLayoutId(), this.props());
  }

  resolvedHeroLayoutId(): string {
    if (this.section() === 'hero' && this.isBaselineRenderer()) {
      return resolveBaselineHeroLayoutId(this.resolvedBaselineBlockId(), this.props());
    }
    if (this.section() === 'hero') {
      return resolveHeroPreviewLayoutId(null, {
        componentId: this.blockId() ?? '',
        props: this.props(),
      });
    }
    return this.heroLayoutId();
  }

  resolvedHeroPreviewWireLayoutId(): string {
    return resolveHeroPreviewWireLayout(this.resolvedHeroLayoutId());
  }

  onSectionClick(event: MouseEvent): void {
    if (this.pendingPreview()) {
      event.stopPropagation();
      return;
    }
    event.stopPropagation();
    this.sectionClick.emit(this.section());
  }

  onPropsChange(next: Record<string, unknown>): void {
    this.propsChange.emit(next);
  }

  onPropPath(path: string, value: unknown): void {
    this.propPathChange.emit({ path, value });
  }

  onCopyChange(copy: BuildHeroPreviewCopy): void {
    this.copyChange.emit(copy);
  }

  onBaselineImageEdit(
    request:
      | BuildWriImageEditRequest
      | BuildSparkyImageEditRequest
      | BuildWilcoImageEditRequest
      | BuildVeilImageEditRequest
      | BuildUniversalImageEditRequest,
  ): void {
    this.imageEdit.emit({ propPath: request.propPath });
  }

  onChromeNavigate(tab: BuildBlockInspectorTab, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.inspectorNavigate.emit(tab);
  }

  onChromeResetPhoto(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.resetHeroPhoto.emit();
  }
}
