import type { CognitivePackCatalogItem } from './cognitive-pack.model';

export function getPackById(
  catalog: CognitivePackCatalogItem[],
  id: string,
): CognitivePackCatalogItem | undefined {
  return catalog.find((p) => p.id === id);
}

export function getPacksByIds(
  catalog: CognitivePackCatalogItem[],
  ids: string[],
): CognitivePackCatalogItem[] {
  return ids
    .map((id) => getPackById(catalog, id))
    .filter((p): p is CognitivePackCatalogItem => p !== undefined);
}

export function formatPackCost(pack: CognitivePackCatalogItem): string {
  if (pack.tier === 'included') return 'Included';
  const range = pack.estimatedCostUsd;
  if (!range) return 'Pro';
  if (range.min === range.max) return `~$${range.min.toFixed(2)} / article`;
  return `~$${range.min.toFixed(2)}–${range.max.toFixed(2)} / article`;
}

export function packStatusLabel(status: CognitivePackCatalogItem['status']): string {
  switch (status) {
    case 'available':
      return 'Available';
    case 'coming_soon':
      return 'Coming soon';
    case 'beta':
      return 'Beta';
  }
}

/** Packs a user can select, set as default, or start writing with. */
export function isPackSelectable(pack: CognitivePackCatalogItem): boolean {
  return pack.status === 'available' || pack.status === 'beta';
}
