import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { resolveBlockNavThumbAspect, resolveBlockNavThumbKind } from '../build-book-block.catalog';
import type { BuildBookBlockNavThumbKind } from '../build-book.types';

@Component({
  selector: 'app-protopipe-build-block-nav-thumb',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './build-block-nav-thumb.component.html',
  styleUrl: './build-block-nav-thumb.component.scss',
})
export class ProtopipeBuildBlockNavThumbComponent {
  readonly blockId = input.required<string>();

  readonly kind = computed((): BuildBookBlockNavThumbKind => resolveBlockNavThumbKind(this.blockId()));

  readonly aspectRatio = computed(() => {
    const aspect = resolveBlockNavThumbAspect(this.blockId());
    return `${aspect.width} / ${aspect.height}`;
  });
}
