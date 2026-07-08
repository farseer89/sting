import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { BuildMediaSlot } from '../build-book-media-slots.util';

@Component({
  selector: 'app-protopipe-build-media-slots-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-build-media-slots-panel.component.html',
  styleUrl: './protopipe-build-media-slots-panel.component.scss',
})
export class ProtopipeBuildMediaSlotsPanelComponent {
  readonly slots = input<BuildMediaSlot[]>([]);
  readonly activePropPath = input<string | null>(null);
  readonly blockLabel = input('');

  readonly slotSelect = output<string>();

  chooseSlot(propPath: string): void {
    this.slotSelect.emit(propPath);
  }
}
