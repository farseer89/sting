import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import {
  formatPackCost,
  getPackById,
  getPacksByIds,
  isPackSelectable,
  packStatusLabel,
} from './cognitive-pack-catalog';
import type { CognitivePackCatalogItem } from './cognitive-pack.model';
import { ThoughtPackCardComponent } from './thought-pack-card.component';
import { ThoughtPackCoverComponent } from './thought-pack-cover.component';
import { ThoughtPackTrainJourneyComponent } from './thought-pack-train-journey.component';
import { ThoughtPackTrainAccordionComponent } from './thought-pack-train-accordion.component';

@Component({
  selector: 'app-thought-pack-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ThoughtPackCoverComponent,
    ThoughtPackCardComponent,
    ThoughtPackTrainJourneyComponent,
    ThoughtPackTrainAccordionComponent,
  ],
  templateUrl: './thought-pack-detail.component.html',
  styleUrl: './thought-pack-detail.component.scss',
})
export class ThoughtPackDetailComponent {
  readonly catalog = input.required<CognitivePackCatalogItem[]>();
  readonly packId = input.required<string>();
  readonly isSiteDefault = input(false);
  readonly savingDefault = input(false);
  readonly statusMessage = input<string | null>(null);

  readonly back = output<void>();
  readonly startWriting = output<CognitivePackCatalogItem>();
  readonly setSiteDefault = output<CognitivePackCatalogItem>();
  readonly selectPack = output<CognitivePackCatalogItem>();

  protected readonly pack = computed(() => getPackById(this.catalog(), this.packId()));

  protected readonly pairedPacks = computed(() => {
    const p = this.pack();
    if (!p) return [];
    return getPacksByIds(this.catalog(), p.pairsWithPackIds);
  });

  protected readonly stubMessage = signal<string | null>(null);

  protected costLabel(p: CognitivePackCatalogItem): string {
    return formatPackCost(p);
  }

  protected statusLabel(p: CognitivePackCatalogItem): string {
    return packStatusLabel(p.status);
  }

  protected isPackSelectable = isPackSelectable;

  protected onStartWriting(): void {
    const p = this.pack();
    if (!p) return;
    if (!isPackSelectable(p)) {
      this.stubMessage.set('This pack is not runnable yet — engine coming soon.');
      return;
    }
    this.startWriting.emit(p);
  }

  protected onSetSiteDefault(): void {
    const p = this.pack();
    if (!p) return;
    this.setSiteDefault.emit(p);
  }

  protected onViewThinker(): void {
    this.stubMessage.set('Sample Thinker run — coming soon.');
  }
}
