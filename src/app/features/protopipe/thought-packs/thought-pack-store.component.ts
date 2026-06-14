import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { CognitivePackCatalogItem, PackStoreFilter } from './cognitive-pack.model';
import { ThoughtPackCardComponent } from './thought-pack-card.component';

@Component({
  selector: 'app-thought-pack-store',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThoughtPackCardComponent],
  templateUrl: './thought-pack-store.component.html',
  styleUrl: './thought-pack-store.component.scss',
})
export class ThoughtPackStoreComponent {
  readonly catalog = input.required<CognitivePackCatalogItem[]>();
  readonly siteDefaultPackId = input<string | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);

  readonly selectPack = output<CognitivePackCatalogItem>();

  protected readonly filter = signal<PackStoreFilter>('all');

  protected readonly filters: { id: PackStoreFilter; label: string }[] = [
    { id: 'all', label: 'All packs' },
    { id: 'available', label: 'Available' },
    { id: 'coming_soon', label: 'Coming soon' },
  ];

  protected readonly standardPack = computed(() =>
    this.catalog().find((p) => p.id === 'none'),
  );

  protected readonly filteredPacks = computed(() => {
    const f = this.filter();
    const premium = this.catalog().filter((p) => p.id !== 'none');
    if (f === 'all') return premium;
    if (f === 'available') return premium.filter((p) => p.status === 'available');
    return premium.filter((p) => p.status === 'coming_soon' || p.status === 'beta');
  });

  protected readonly siteDefaultLabel = computed(() => {
    const id = this.siteDefaultPackId();
    if (!id || id === 'none') return null;
    return this.catalog().find((p) => p.id === id)?.label ?? null;
  });

  protected setFilter(id: PackStoreFilter): void {
    this.filter.set(id);
  }

  protected isSiteDefault(pack: CognitivePackCatalogItem): boolean {
    const id = this.siteDefaultPackId();
    return Boolean(id && id === pack.id);
  }
}
