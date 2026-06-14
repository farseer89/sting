import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import {
  formatPackCost,
  getPackById,
  getPacksByIds,
  packStatusLabel,
} from './cognitive-pack-catalog';
import type { CognitivePackCatalogItem } from './cognitive-pack.model';
import { ThoughtPackCardComponent } from './thought-pack-card.component';
import { ThoughtPackCoverComponent } from './thought-pack-cover.component';
import { ThoughtPackTrainAccordionComponent } from './thought-pack-train-accordion.component';

@Component({
  selector: 'app-thought-pack-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ThoughtPackCoverComponent,
    ThoughtPackCardComponent,
    ThoughtPackTrainAccordionComponent,
  ],
  templateUrl: './thought-pack-detail.component.html',
  styleUrl: './thought-pack-detail.component.scss',
})
export class ThoughtPackDetailComponent {
  readonly packId = input.required<string>();
  readonly isSiteDefault = input(false);

  readonly back = output<void>();
  readonly startWriting = output<CognitivePackCatalogItem>();
  readonly setSiteDefault = output<CognitivePackCatalogItem>();
  readonly selectPack = output<CognitivePackCatalogItem>();

  protected readonly pack = computed(() => getPackById(this.packId()));

  protected readonly pairedPacks = computed(() => {
    const p = this.pack();
    if (!p) return [];
    return getPacksByIds(p.pairsWithPackIds);
  });

  protected readonly stubMessage = signal<string | null>(null);

  protected costLabel(p: CognitivePackCatalogItem): string {
    return formatPackCost(p);
  }

  protected statusLabel(p: CognitivePackCatalogItem): string {
    return packStatusLabel(p.status);
  }

  protected onStartWriting(): void {
    const p = this.pack();
    if (!p) return;
    if (p.status !== 'available') {
      this.stubMessage.set('This pack is not runnable yet — engine coming soon.');
      return;
    }
    this.startWriting.emit(p);
  }

  protected onSetSiteDefault(): void {
    const p = this.pack();
    if (!p) return;
    this.stubMessage.set('Setting site default — API coming soon.');
    this.setSiteDefault.emit(p);
  }

  protected onViewThinker(): void {
    this.stubMessage.set('Sample Thinker run — coming soon.');
  }
}
