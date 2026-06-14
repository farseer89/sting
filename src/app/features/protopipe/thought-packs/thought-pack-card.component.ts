import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  formatPackCost,
  packStatusLabel,
} from './cognitive-pack-catalog';
import type { CognitivePackCatalogItem } from './cognitive-pack.model';
import { ThoughtPackCoverComponent } from './thought-pack-cover.component';

@Component({
  selector: 'app-thought-pack-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThoughtPackCoverComponent],
  templateUrl: './thought-pack-card.component.html',
  styleUrl: './thought-pack-card.component.scss',
})
export class ThoughtPackCardComponent {
  readonly pack = input.required<CognitivePackCatalogItem>();
  readonly compact = input(false);
  readonly isSiteDefault = input(false);

  readonly select = output<CognitivePackCatalogItem>();

  protected costLabel(pack: CognitivePackCatalogItem): string {
    return formatPackCost(pack);
  }

  protected statusLabel(pack: CognitivePackCatalogItem): string {
    return packStatusLabel(pack.status);
  }

  protected onCardClick(): void {
    this.select.emit(this.pack());
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onCardClick();
    }
  }
}
