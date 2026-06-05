import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { ProtopipeSuggestedAvatar } from '@hive/contracts';

@Component({
  selector: 'app-protopipe-avatar-suggestion-panel',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-avatar-suggestion-panel.component.html',
  styleUrl: './protopipe-avatar-suggestion-panel.component.scss',
})
export class ProtopipeAvatarSuggestionPanelComponent {
  readonly avatars = input.required<ProtopipeSuggestedAvatar[]>();
  readonly selectedIds = input.required<ReadonlySet<string>>();
  readonly hoveredId = input<string | null>(null);
  readonly maxSelected = input(3);

  readonly toggleAvatar = output<string>();
  readonly hoverAvatar = output<string | null>();

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  atMax(): boolean {
    return this.selectedIds().size >= this.maxSelected();
  }

  canSelect(id: string): boolean {
    return this.isSelected(id) || !this.atMax();
  }

  onCardClick(id: string): void {
    if (!this.canSelect(id)) return;
    this.toggleAvatar.emit(id);
  }

  onCardEnter(id: string): void {
    this.hoverAvatar.emit(id);
  }

  onCardLeave(): void {
    this.hoverAvatar.emit(null);
  }
}
