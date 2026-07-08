import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { AddBlockCatalogFilter, PatternGroup } from '../build-book-block-registry.util';
import { enrichedBlockDefinition } from '../build-book-block-registry.util';
import type { BuildBookBlockIntent } from '../build-book-block-patterns.catalog';
import { intentDisplayLabel } from '../build-book-pattern-skeletons';
import { ProtopipeBuildBlockNavThumbComponent } from '../nav-thumb/build-block-nav-thumb.component';

@Component({
  selector: 'app-build-book-pattern-library-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style]': 'panelStyle() ?? {}',
  },
  imports: [ProtopipeBuildBlockNavThumbComponent],
  templateUrl: './build-book-pattern-library-panel.component.html',
  styleUrl: './build-book-pattern-library-panel.component.scss',
})
export class BuildBookPatternLibraryPanelComponent {
  readonly patternGroups = input.required<PatternGroup[]>();
  readonly catalogFilter = input<AddBlockCatalogFilter>('compatible');
  readonly catalogSession = input(0);
  readonly selectedPatternId = input<string | null>(null);
  readonly panelStyle = input<Record<string, string> | null>(null);

  readonly catalogFilterChange = output<AddBlockCatalogFilter>();
  readonly patternSelected = output<string>();

  setFilter(filter: AddBlockCatalogFilter): void {
    if (this.catalogFilter() !== filter) {
      this.catalogFilterChange.emit(filter);
    }
  }

  onPatternClick(patternId: string): void {
    this.patternSelected.emit(patternId);
  }

  patternIntentLabels(patternId: string): string[] {
    const variant = this.patternGroups()
      .find((group) => group.patternId === patternId)
      ?.variants[0];
    const intents = variant ? enrichedBlockDefinition(variant.id)?.intents ?? [] : [];
    return intents.map((intent: BuildBookBlockIntent) => intentDisplayLabel(intent));
  }

  defaultVariantBlockId(group: PatternGroup): string | null {
    return group.variants[0]?.id ?? null;
  }
}
