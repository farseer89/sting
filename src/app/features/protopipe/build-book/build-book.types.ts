export type BuildBookSection = 'hero' | 'fold' | 'services' | 'proof' | 'areas' | 'close';

export type BuildBookWireLayout =
  | 'fullbleed'
  | 'split'
  | 'bento'
  | 'dual-path'
  | 'metrics'
  | 'band'
  | 'contract-bar'
  | 'capabilities'
  | 'featured'
  | 'stats'
  | 'grid'
  | 'list'
  | 'cards'
  | 'tabs'
  | 'reviews'
  | 'map'
  | 'close-form';

export type BuildBookDemoBrand = 'sparky' | 'wri' | 'consult';
export type BuildBookDemoCatalog = 'heroes' | 'fold';

export interface BuildBookDemoMeta {
  brand: BuildBookDemoBrand;
  catalog: BuildBookDemoCatalog;
  labId: string;
  astroUnit: string;
}

export interface BuildBookOption {
  id: string;
  label: string;
  desc: string;
  componentId: string;
  layout: BuildBookWireLayout;
  tag?: string;
  demo?: BuildBookDemoMeta;
  previewPath?: string;
  /** Static thumbnail — fal-generated or lab site photography for card previews. */
  previewImage?: string;
}
