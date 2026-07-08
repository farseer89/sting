import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import type { BuildBookBlockInstance } from '../build-book.types';
import { stackDisplayLabel, stackDisplayType } from '../build-book-block-registry.util';
import { isPinnedBaselineBlockId } from '../build-book-pinned-blocks.util';

@Component({
  selector: 'app-build-book-page-stack-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkDropList, CdkDrag],
  templateUrl: './build-book-page-stack-panel.component.html',
  styleUrl: './build-book-page-stack-panel.component.scss',
})
export class BuildBookPageStackPanelComponent {
  readonly blocks = input.required<BuildBookBlockInstance[]>();
  readonly activeBlockId = input<string | null>(null);

  readonly selectBlock = output<string>();
  readonly reorder = output<{ fromIndex: number; toIndex: number }>();
  readonly removeBlock = output<string>();
  readonly addBlock = output<void>();

  blockLabel(block: BuildBookBlockInstance): string {
    return stackDisplayLabel(block);
  }

  blockType(block: BuildBookBlockInstance): string | null {
    return stackDisplayType(block);
  }

  isPinned(blockId: string): boolean {
    return isPinnedBaselineBlockId(blockId);
  }

  onDrop(event: CdkDragDrop<BuildBookBlockInstance[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    this.reorder.emit({ fromIndex: event.previousIndex, toIndex: event.currentIndex });
  }

  onAddBlockClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.addBlock.emit();
  }

  onRemove(blockInstanceId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.removeBlock.emit(blockInstanceId);
  }
}
