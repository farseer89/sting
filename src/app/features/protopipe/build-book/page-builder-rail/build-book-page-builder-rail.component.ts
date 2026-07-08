import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import type { BuildBookBlockInstance, BuildBookPageKind } from '../build-book.types';
import { BuildBookBuilderRailComponent, type BuildBookPageBuilderView } from '../builder-rail/build-book-builder-rail.component';
import { BuildBookPageStackPanelComponent } from '../page-stack-panel/build-book-page-stack-panel.component';
import { BuildBookPatternLibraryPanelComponent } from '../pattern-library-panel/build-book-pattern-library-panel.component';
import {
  patternsGroupedForPageKind,
  type AddBlockCatalogFilter,
  type PatternGroup,
} from '../build-book-block-registry.util';

export interface BuildBookPatternSelectedEvent {
  patternId: string;
  insertAt: number;
}

@Component({
  selector: 'app-build-book-page-builder-rail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CdkDropListGroup,
    BuildBookBuilderRailComponent,
    BuildBookPageStackPanelComponent,
    BuildBookPatternLibraryPanelComponent,
  ],
  templateUrl: './build-book-page-builder-rail.component.html',
  styleUrl: './build-book-page-builder-rail.component.scss',
})
export class BuildBookPageBuilderRailComponent {
  readonly pageKind = input.required<BuildBookPageKind>();
  readonly pageLabel = input('Homepage');
  readonly templateId = input<string | null>(null);
  readonly blocks = input.required<BuildBookBlockInstance[]>();
  readonly activeBlockId = input<string | null>(null);
  readonly systemLabel = input<string | null>(null);
  readonly selectedPatternId = input<string | null>(null);
  readonly patternPanelStyle = input<Record<string, string> | null>(null);

  readonly selectBlock = output<string>();
  readonly reorder = output<{ fromIndex: number; toIndex: number }>();
  readonly removeBlock = output<string>();
  readonly patternSelected = output<BuildBookPatternSelectedEvent>();
  readonly pendingCancel = output<void>();
  readonly catalogFilterChange = output<AddBlockCatalogFilter>();

  readonly panelView = signal<BuildBookPageBuilderView>('stack');
  readonly catalogFilter = signal<AddBlockCatalogFilter>('compatible');
  readonly insertAtIndex = signal<number | null>(null);
  readonly catalogSession = signal(0);

  readonly patternGroups = computed((): PatternGroup[] =>
    patternsGroupedForPageKind(this.pageKind(), this.templateId(), this.catalogFilter()),
  );

  readonly isAddView = computed(() => this.panelView() === 'add');

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isAddView()) {
      this.backToStack();
    }
  }

  openAddBlock(insertAt?: number): void {
    if (insertAt != null) {
      this.insertAtIndex.set(insertAt);
    } else {
      const activeIndex = this.blocks().findIndex((block) => block.id === this.activeBlockId());
      this.insertAtIndex.set(activeIndex >= 0 ? activeIndex + 1 : this.blocks().length);
    }
    this.catalogSession.update((session) => session + 1);
    this.panelView.set('add');
  }

  dismissAddView(): void {
    this.panelView.set('stack');
    this.insertAtIndex.set(null);
  }

  backToStack(): void {
    const wasAddView = this.isAddView();
    this.panelView.set('stack');
    this.insertAtIndex.set(null);
    if (wasAddView) {
      this.pendingCancel.emit();
    }
  }

  onCatalogFilterChange(filter: AddBlockCatalogFilter): void {
    this.catalogFilter.set(filter);
    this.catalogFilterChange.emit(filter);
  }

  onPatternPick(patternId: string): void {
    const insertAt = this.insertAtIndex() ?? this.defaultInsertIndex();
    this.patternSelected.emit({ patternId, insertAt });
  }

  private defaultInsertIndex(): number {
    const activeIndex = this.blocks().findIndex((block) => block.id === this.activeBlockId());
    return activeIndex >= 0 ? activeIndex + 1 : this.blocks().length;
  }
}
