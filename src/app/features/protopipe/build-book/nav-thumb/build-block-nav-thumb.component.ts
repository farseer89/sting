import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { resolvePatternIdForBlock } from '../build-book-block-registry.util';
import { resolveBlockNavThumbAspect, resolveBlockNavThumbKind } from '../build-book-block.catalog';
import {
  resolvePatternSkeleton,
  type BuildBookPatternSkeletonKind,
} from '../build-book-pattern-skeletons';
import type { BuildBookBlockNavThumbKind } from '../build-book.types';

export type BuildBookNavThumbDensity = 'stack' | 'catalog';

@Component({
  selector: 'app-protopipe-build-block-nav-thumb',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './build-block-nav-thumb.component.html',
  styleUrl: './build-block-nav-thumb.component.scss',
  host: {
    '[class.bk-bt-host--catalog]': 'density() === "catalog"',
  },
})
export class ProtopipeBuildBlockNavThumbComponent {
  readonly blockId = input.required<string>();
  readonly density = input<BuildBookNavThumbDensity>('stack');

  readonly legacyKind = computed((): BuildBookBlockNavThumbKind => resolveBlockNavThumbKind(this.blockId()));

  readonly patternSkeletonKind = computed((): BuildBookPatternSkeletonKind | null => {
    if (this.legacyKind() !== 'generic') return null;
    return resolvePatternSkeleton(resolvePatternIdForBlock(this.blockId())).kind;
  });

  readonly kind = computed((): BuildBookBlockNavThumbKind | BuildBookPatternSkeletonKind => {
    const legacy = this.legacyKind();
    if (legacy !== 'generic') return legacy;
    return this.patternSkeletonKind() ?? 'pattern-generic';
  });

  readonly aspectRatio = computed((): string | null => {
    if (this.density() === 'catalog') {
      return null;
    }
    const legacy = this.legacyKind();
    if (legacy !== 'generic') {
      const aspect = resolveBlockNavThumbAspect(this.blockId());
      return `${aspect.width} / ${aspect.height}`;
    }
    const aspect = resolvePatternSkeleton(resolvePatternIdForBlock(this.blockId())).aspect;
    return `${aspect.width} / ${aspect.height}`;
  });
}
