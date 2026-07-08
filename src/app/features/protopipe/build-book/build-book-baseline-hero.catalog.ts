import type { BuildBookDemoBrand, BuildBookOption } from './build-book.types';

const WRI_GENERATED = 'https://cs-futureproof.pages.dev/wri/generated';
const SPARKY_ASSETS = 'https://cs-futureproof.pages.dev/sparky/site';
const VEIL_GENERATED = 'https://destinationweddingpainter.com/images/hero-stash.jpg';
const WILCO_HERO =
  'https://images.unsplash.com/photo-1624469681156-4114efeb85a0?w=1920&q=80&auto=format&fit=crop';

/** Approved baseline hero layouts — one entry per templatized site in the library. */
export const BASELINE_APPROVED_HERO_LAYOUT_IDS = [
  'wri-baseline-life-proof',
  'sparky-baseline-callout',
  'wilco-baseline-split',
  'veil-baseline-easel-witness',
  'hil-baseline-hero-canopy',
] as const;

export type BaselineApprovedHeroLayoutId = (typeof BASELINE_APPROVED_HERO_LAYOUT_IDS)[number];

/** Maps baseline hero block catalog ids to their approved library layout id. */
export const BASELINE_HERO_BLOCK_TO_APPROVED_LAYOUT: Record<string, BaselineApprovedHeroLayoutId> = {
  'wri-baseline-hero-life-proof': 'wri-baseline-life-proof',
  'sparky-baseline-hero-callout': 'sparky-baseline-callout',
  'wilco-baseline-hero-split': 'wilco-baseline-split',
  'veil-baseline-hero-easel-witness': 'veil-baseline-easel-witness',
  'hil-baseline-hero-canopy': 'hil-baseline-hero-canopy',
};

export const BASELINE_APPROVED_HERO_LIBRARY: BuildBookOption[] = [
  {
    id: 'wri-baseline-life-proof',
    label: 'Life + proof (Option 2B)',
    desc: 'Approved WRI Option 2B hero — life-theme full bleed with exact baseline copy and contract bar pairing.',
    componentId: 'baseline-wri-hero',
    layout: 'fullbleed',
    tag: 'Approved baseline',
    demo: {
      brand: 'wri',
      catalog: 'heroes',
      labId: 'life-proof-2b',
      astroUnit: 'sites/futureproof/src/components/wri/WriSite.astro',
    },
    previewImage: `${WRI_GENERATED}/hero-life-coast.jpg`,
  },
  {
    id: 'sparky-baseline-callout',
    label: 'Proof callout hero',
    desc: 'Approved Sparky Electric baseline — full-bleed callout with centered copy and logo mark.',
    componentId: 'baseline-sparky-hero',
    layout: 'fullbleed',
    tag: 'Approved baseline',
    demo: {
      brand: 'sparky',
      catalog: 'heroes',
      labId: 'approved-callout',
      astroUnit: 'components/sparky/heroes/SparkyHeroCallout.astro',
    },
    previewImage: `${SPARKY_ASSETS}/hero-aerial.jpg`,
  },
  {
    id: 'wilco-baseline-split',
    label: 'Split hero',
    desc: 'Approved Wilco Consulting baseline — split layout with photo blade and dual CTAs.',
    componentId: 'baseline-wilco-hero-split',
    layout: 'split',
    tag: 'Approved baseline',
    demo: {
      brand: 'consult',
      catalog: 'heroes',
      labId: 'approved-split',
      astroUnit: '@client-sites/theme/components/landing/ConsultHeroSplit.astro',
    },
    previewImage: WILCO_HERO,
  },
  {
    id: 'veil-baseline-easel-witness',
    label: 'Easel witness hero',
    desc: 'Approved Destination Wedding Painter baseline — ceremony easel with left scrim copy panel.',
    componentId: 'baseline-veil-hero-easel',
    layout: 'fullbleed',
    tag: 'Approved baseline',
    demo: {
      brand: 'veil',
      catalog: 'heroes',
      labId: 'easel-witness',
      astroUnit: 'components/veil/heroes/VeilHeroEaselWitness.astro',
    },
    previewImage: `${VEIL_GENERATED}`,
  },
  {
    id: 'hil-baseline-hero-canopy',
    label: 'Canopy hero',
    desc: 'Approved Blackstone Landscaping baseline — full-bleed canopy hero with estimate CTA.',
    componentId: 'baseline-hil-hero',
    layout: 'fullbleed',
    tag: 'Approved baseline',
    demo: {
      brand: 'wri',
      catalog: 'heroes',
      labId: 'canopy',
      astroUnit: 'sites/futureproof/src/components/hil/HilPitchHero.astro',
    },
    previewImage: 'https://cs-futureproof.pages.dev/hil/generated/hero-canopy.jpg',
  },
];

export function isBaselineApprovedHeroLayout(layoutId: string | null | undefined): boolean {
  return (
    typeof layoutId === 'string' &&
    (BASELINE_APPROVED_HERO_LAYOUT_IDS as readonly string[]).includes(layoutId)
  );
}

export function baselineApprovedHeroLayoutForBlock(blockId: string): BaselineApprovedHeroLayoutId | null {
  return BASELINE_HERO_BLOCK_TO_APPROVED_LAYOUT[blockId] ?? null;
}

export function baselineApprovedHeroOptionsForBrand(brand: BuildBookDemoBrand): BuildBookOption[] {
  return BASELINE_APPROVED_HERO_LIBRARY.filter((option) => option.demo?.brand === brand);
}

export function findBaselineApprovedHeroOption(optionId: string): BuildBookOption | undefined {
  return BASELINE_APPROVED_HERO_LIBRARY.find((option) => option.id === optionId);
}

export function resolveBaselineHeroLayoutId(
  blockId: string,
  props: Record<string, unknown>,
): string {
  const labLayout = typeof props['labLayout'] === 'string' ? props['labLayout'] : undefined;
  if (labLayout && isBaselineApprovedHeroLayout(labLayout)) return labLayout;
  if (labLayout && !isBaselineApprovedHeroLayout(labLayout)) return labLayout;

  return baselineApprovedHeroLayoutForBlock(blockId) ?? labLayout ?? 'sp-callout';
}
