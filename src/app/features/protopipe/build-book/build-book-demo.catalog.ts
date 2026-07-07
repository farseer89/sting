import type { BuildBookDemoBrand, BuildBookOption, BuildBookSection, BuildBookWireLayout } from './build-book.types';

/** Futureproof style lab — hero & fold catalogs with real Astro units. */
export const BUILD_BOOK_LAB_BASE = 'https://cs-futureproof.pages.dev';
export const BUILD_BOOK_CONSULT_DEMO_BASE = 'https://cs-consult-demo.pages.dev';

const SPARKY_ASSETS = `${BUILD_BOOK_LAB_BASE}/sparky/site`;
const WRI_GENERATED = `${BUILD_BOOK_LAB_BASE}/wri/generated`;
const DWP_CDN = 'https://destinationweddingpainter.com';
const VEIL_GENERATED = `${BUILD_BOOK_LAB_BASE}/lab/veil/generated`;

/** Card thumbnails — same fal / lab photography as pitch build demo hero preview. */
const HERO_PREVIEW_IMAGES: Record<string, string> = {
  'sp-callout': `${SPARKY_ASSETS}/hero-aerial.jpg`,
  'sp-bento': `${SPARKY_ASSETS}/service-solar.jpg`,
  'sp-asymmetric': `${SPARKY_ASSETS}/about-jake.jpg`,
  'sp-horizon': `${SPARKY_ASSETS}/project-commercial.jpg`,
  'sp-teal': `${SPARKY_ASSETS}/about-team.jpg`,
  'sp-dispatch': `${SPARKY_ASSETS}/service-residential.jpg`,
  'wri-fullbleed': `${WRI_GENERATED}/hero-drill-fullbleed.jpg`,
  'wri-split': `${WRI_GENERATED}/hero-life-fields.jpg`,
  'wri-bento': `${WRI_GENERATED}/hero-life-coast.jpg`,
  'wri-metrics': `${WRI_GENERATED}/hero-reservoir.jpg`,
  'wri-coastal': `${WRI_GENERATED}/hero-life-coast.jpg`,
  'co-split': `${WRI_GENERATED}/hero-life-fields.jpg`,
  'co-fullbleed': `${WRI_GENERATED}/hero-life-valley.jpg`,
  'veil-canvas-frame': `${DWP_CDN}/images/gallery/04.png`,
  'veil-easel-witness': `${DWP_CDN}/images/hero-stash.jpg`,
  'veil-salon-wall': `${DWP_CDN}/images/gallery/01.jpg`,
  'veil-stationery-monogram': `${DWP_CDN}/images/gallery/02.jpg`,
  'veil-process-ribbon': `${DWP_CDN}/images/gallery/05.jpg`,
  'veil-over-shoulder': `${DWP_CDN}/images/gallery/05.jpg`,
  'veil-brushstroke-split': `${DWP_CDN}/images/gallery/04.png`,
  'veil-vow-inset': `${DWP_CDN}/images/gallery/01.jpg`,
  'veil-heirloom-mantel': `${DWP_CDN}/images/hero.jpg`,
  'veil-curtain-reveal': `${DWP_CDN}/images/hero-stash.jpg`,
  'veil-quote-veil': `${DWP_CDN}/images/gallery/02.jpg`,
  'veil-date-ribbon': `${DWP_CDN}/images/gallery/05.jpg`,
};

export const FOLD_PREVIEW_IMAGES: Record<string, string> = {
  'sp-fold-trust-stats': `${SPARKY_ASSETS}/project-panel.jpg`,
  'sp-fold-services-grid': `${SPARKY_ASSETS}/service-solar.jpg`,
  'sp-fold-process': `${SPARKY_ASSETS}/project-residential.jpg`,
  'sp-fold-reviews': `${SPARKY_ASSETS}/about-team.jpg`,
  'sp-fold-project': `${SPARKY_ASSETS}/project-commercial.jpg`,
  'wri-fold-contract': `${WRI_GENERATED}/infographic-stats.png`,
  'wri-fold-capabilities': `${WRI_GENERATED}/hero-life-watershed.jpg`,
  'wri-fold-featured-well': `${WRI_GENERATED}/hero-life-valley.jpg`,
  'wri-fold-lifecycle': `${WRI_GENERATED}/infographic-process.png`,
  'wri-fold-rig-gallery': `${WRI_GENERATED}/section-mobilization.jpg`,
};

export interface BuildBookDemoOption extends BuildBookOption {
  demo: NonNullable<BuildBookOption['demo']>;
  previewPath: string;
}

/** Shared with pitch build demo — 13 hero layout directions. */
export interface BuildDemoHeroVariant {
  id: string;
  label: string;
  brand: BuildBookDemoBrand;
  layout: string;
  url: string;
}

export const BUILD_DEMO_HERO_VARIANTS: BuildDemoHeroVariant[] = [
  { id: 'sp-callout', label: 'Fullbleed Callout', brand: 'sparky', layout: 'sp-callout', url: 'sparkyelectrichawaii.com' },
  { id: 'sp-bento', label: 'Bento Grid', brand: 'sparky', layout: 'sp-bento', url: 'sparkyelectrichawaii.com' },
  { id: 'sp-asymmetric', label: 'Asymmetric', brand: 'sparky', layout: 'sp-asymmetric', url: 'sparkyelectrichawaii.com' },
  { id: 'sp-horizon', label: 'Horizon Band', brand: 'sparky', layout: 'sp-horizon', url: 'sparkyelectrichawaii.com' },
  { id: 'sp-teal', label: 'Teal Brand', brand: 'sparky', layout: 'sp-teal', url: 'sparkyelectrichawaii.com' },
  { id: 'sp-dispatch', label: 'Dispatch CTA', brand: 'sparky', layout: 'sp-dispatch', url: 'sparkyelectrichawaii.com' },
  { id: 'wri-fullbleed', label: 'Fullbleed Rig', brand: 'wri', layout: 'wri-fullbleed', url: 'waterresourcesinternational.com' },
  { id: 'wri-split', label: 'Split Field', brand: 'wri', layout: 'wri-split', url: 'waterresourcesinternational.com' },
  { id: 'wri-bento', label: 'Photo Bento', brand: 'wri', layout: 'wri-bento', url: 'waterresourcesinternational.com' },
  { id: 'wri-metrics', label: 'Metrics', brand: 'wri', layout: 'wri-metrics', url: 'waterresourcesinternational.com' },
  { id: 'wri-coastal', label: 'Coastal Band', brand: 'wri', layout: 'wri-coastal', url: 'waterresourcesinternational.com' },
  { id: 'co-split', label: 'Split Layout', brand: 'consult', layout: 'co-split', url: 'wilcoconsulting.com' },
  { id: 'co-fullbleed', label: 'Fullbleed', brand: 'consult', layout: 'co-fullbleed', url: 'wilcoconsulting.com' },
  { id: 'veil-canvas-frame', label: 'Canvas Frame', brand: 'veil', layout: 'veil-canvas-frame', url: 'destinationweddingpainter.com' },
  { id: 'veil-easel-witness', label: 'Easel Witness', brand: 'veil', layout: 'veil-easel-witness', url: 'destinationweddingpainter.com' },
  { id: 'veil-salon-wall', label: 'Salon Wall', brand: 'veil', layout: 'veil-salon-wall', url: 'destinationweddingpainter.com' },
  { id: 'veil-stationery-monogram', label: 'Stationery Monogram', brand: 'veil', layout: 'veil-stationery-monogram', url: 'destinationweddingpainter.com' },
  { id: 'veil-process-ribbon', label: 'Process Ribbon', brand: 'veil', layout: 'veil-process-ribbon', url: 'destinationweddingpainter.com' },
  { id: 'veil-over-shoulder', label: 'Over Shoulder', brand: 'veil', layout: 'veil-over-shoulder', url: 'destinationweddingpainter.com' },
  { id: 'veil-brushstroke-split', label: 'Brushstroke Split', brand: 'veil', layout: 'veil-brushstroke-split', url: 'destinationweddingpainter.com' },
  { id: 'veil-vow-inset', label: 'Vow Inset', brand: 'veil', layout: 'veil-vow-inset', url: 'destinationweddingpainter.com' },
  { id: 'veil-heirloom-mantel', label: 'Heirloom Mantel', brand: 'veil', layout: 'veil-heirloom-mantel', url: 'destinationweddingpainter.com' },
  { id: 'veil-curtain-reveal', label: 'Curtain Reveal', brand: 'veil', layout: 'veil-curtain-reveal', url: 'destinationweddingpainter.com' },
  { id: 'veil-quote-veil', label: 'Quote Veil', brand: 'veil', layout: 'veil-quote-veil', url: 'destinationweddingpainter.com' },
  { id: 'veil-date-ribbon', label: 'Date Ribbon', brand: 'veil', layout: 'veil-date-ribbon', url: 'destinationweddingpainter.com' },
];

const SPARKY_HERO_LAB: Record<string, { labId: string; astroUnit: string; componentId: string; layout: BuildBookWireLayout; desc: string }> = {
  'sp-callout': {
    labId: 'callout',
    astroUnit: 'components/sparky/heroes/SparkyHeroCallout.astro',
    componentId: 'hero-overlay',
    layout: 'fullbleed',
    desc: 'Fullbleed photo, dark scrim, centered copy and proof stats — Sparky Electric pattern.',
  },
  'sp-bento': {
    labId: 'bento',
    astroUnit: 'components/sparky/heroes/SparkyHeroBento.astro',
    componentId: 'saas-hero-gradient',
    layout: 'bento',
    desc: 'Copy left, photo right, stat row — modular bento hero for trades.',
  },
  'sp-asymmetric': {
    labId: 'asymmetric',
    astroUnit: 'components/sparky/heroes/SparkyHeroAsymmetric.astro',
    componentId: 'hero-split',
    layout: 'split',
    desc: 'Oversized headline beside a portrait frame — editorial asymmetric split.',
  },
  'sp-horizon': {
    labId: 'horizon',
    astroUnit: 'components/sparky/heroes/SparkyHeroHorizon.astro',
    componentId: 'image-band',
    layout: 'band',
    desc: 'Copy on white, photography as a wide horizon band below the fold line.',
  },
  'sp-teal': {
    labId: 'teal',
    astroUnit: 'components/sparky/heroes/SparkyHeroTeal.astro',
    componentId: 'consult-hero-split',
    layout: 'dual-path',
    desc: 'Typography-first on brand teal — no hero photo, strong local identity.',
  },
  'sp-dispatch': {
    labId: 'dispatch',
    astroUnit: 'components/sparky/heroes/SparkyHeroDispatch.astro',
    componentId: 'consult-hero-split',
    layout: 'dual-path',
    desc: 'Emergency vs planned work — dual dispatch paths for 24/7 trades.',
  },
};

const WRI_HERO_LAB: Record<string, { labId: string; astroUnit: string; componentId: string; layout: BuildBookWireLayout; desc: string }> = {
  'wri-fullbleed': {
    labId: 'fullbleed-rig',
    astroUnit: 'components/wri/heroes/WriHeroFullbleedRig.astro',
    componentId: 'consult-hero-fullbleed',
    layout: 'fullbleed',
    desc: 'Rig photo full bleed with left gradient panel — WRI field authority.',
  },
  'wri-split': {
    labId: 'split-field',
    astroUnit: 'components/wri/heroes/WriHeroSplitField.astro',
    componentId: 'hero-split',
    layout: 'split',
    desc: 'Half field photo, half copy — rural site tag and dual CTAs.',
  },
  'wri-bento': {
    labId: 'photo-bento',
    astroUnit: 'components/wri/heroes/WriHeroPhotoBento.astro',
    componentId: 'saas-hero-gradient',
    layout: 'bento',
    desc: 'Copy plus 2×2 photo bento — Pacific hydrogeology editorial grid.',
  },
  'wri-metrics': {
    labId: 'metrics',
    astroUnit: 'components/wri/heroes/WriHeroMetrics.astro',
    componentId: 'consult-hero-fullbleed',
    layout: 'metrics',
    desc: 'Headline with outcome metric tiles — decades of Pacific hydrogeology.',
  },
  'wri-coastal': {
    labId: 'coastal-band',
    astroUnit: 'components/wri/heroes/WriHeroCoastalBand.astro',
    componentId: 'image-band',
    layout: 'band',
    desc: 'Coastal band hero — copy block above a full-width shoreline photo strip.',
  },
};

const VEIL_HERO_LAB: Record<string, { labId: string; astroUnit: string; componentId: string; layout: BuildBookWireLayout; desc: string }> = {
  'veil-canvas-frame': {
    labId: 'canvas-frame',
    astroUnit: 'components/veil/heroes/VeilHeroCanvasFrame.astro',
    componentId: 'baseline-veil-hero-canvas-frame',
    layout: 'split',
    desc: 'Finished painting in gilt frame on gallery wall — copy beside the artifact.',
  },
  'veil-easel-witness': {
    labId: 'easel-witness',
    astroUnit: 'components/veil/heroes/VeilHeroEaselWitness.astro',
    componentId: 'baseline-veil-hero-easel',
    layout: 'fullbleed',
    desc: 'Ceremony easel anchored right with copy on left scrim — default live painter hero.',
  },
  'veil-salon-wall': {
    labId: 'salon-wall',
    astroUnit: 'components/veil/heroes/VeilHeroSalonWall.astro',
    componentId: 'baseline-veil-hero-salon',
    layout: 'fullbleed',
    desc: 'Six finished paintings in salon grid with dark scrim and centered headline.',
  },
  'veil-stationery-monogram': {
    labId: 'stationery-monogram',
    astroUnit: 'components/veil/heroes/VeilHeroStationeryMonogram.astro',
    componentId: 'baseline-veil-hero-stationery',
    layout: 'fullbleed',
    desc: 'Invitation-style monogram hero with linen texture — typography-first.',
  },
  'veil-process-ribbon': {
    labId: 'process-ribbon',
    astroUnit: 'components/veil/heroes/VeilHeroProcessRibbon.astro',
    componentId: 'baseline-veil-hero-process-ribbon',
    layout: 'band',
    desc: 'Four-step process ribbon above main hero photo.',
  },
  'veil-over-shoulder': {
    labId: 'over-shoulder',
    astroUnit: 'components/veil/heroes/VeilHeroOverShoulder.astro',
    componentId: 'baseline-veil-hero-over-shoulder',
    layout: 'fullbleed',
    desc: 'Artist POV — immersive over-the-shoulder composition.',
  },
  'veil-brushstroke-split': {
    labId: 'brushstroke-split',
    astroUnit: 'components/veil/heroes/VeilHeroBrushstrokeSplit.astro',
    componentId: 'baseline-veil-hero-brushstroke',
    layout: 'split',
    desc: 'Diagonal split — live moment vs finished painting.',
  },
  'veil-vow-inset': {
    labId: 'vow-inset',
    astroUnit: 'components/veil/heroes/VeilHeroVowInset.astro',
    componentId: 'baseline-veil-hero-vow-inset',
    layout: 'fullbleed',
    desc: 'Ceremony wide shot with circular canvas preview inset.',
  },
  'veil-heirloom-mantel': {
    labId: 'heirloom-mantel',
    astroUnit: 'components/veil/heroes/VeilHeroHeirloomMantel.astro',
    componentId: 'baseline-veil-hero-heirloom',
    layout: 'split',
    desc: 'Split layout — copy and painting on home mantel.',
  },
  'veil-curtain-reveal': {
    labId: 'curtain-reveal',
    astroUnit: 'components/veil/heroes/VeilHeroCurtainReveal.astro',
    componentId: 'baseline-veil-hero-curtain',
    layout: 'fullbleed',
    desc: 'Theatre curtain partial reveal over emotional presentation.',
  },
  'veil-quote-veil': {
    labId: 'quote-veil',
    astroUnit: 'components/veil/heroes/VeilHeroQuoteVeil.astro',
    componentId: 'baseline-veil-hero-quote',
    layout: 'fullbleed',
    desc: 'Paint texture background with couple testimonial as headline.',
  },
  'veil-date-ribbon': {
    labId: 'date-ribbon',
    astroUnit: 'components/veil/heroes/VeilHeroDateRibbon.astro',
    componentId: 'baseline-veil-hero-date-ribbon',
    layout: 'fullbleed',
    desc: 'Cinematic reception with integrated availability ribbon.',
  },
};

const CONSULT_HERO_LAB: Record<string, { labId: string; astroUnit: string; componentId: string; layout: BuildBookWireLayout; desc: string }> = {
  'co-split': {
    labId: 'split',
    astroUnit: '@client-sites/theme/components/landing/ConsultHeroSplit.astro',
    componentId: 'consult-hero-split',
    layout: 'split',
    desc: 'Split hero with photo blade and dual CTAs — Wilco / rural consulting pattern.',
  },
  'co-fullbleed': {
    labId: 'fullbleed',
    astroUnit: '@client-sites/theme/components/landing/ConsultHeroFullbleed.astro',
    componentId: 'consult-hero-fullbleed',
    layout: 'fullbleed',
    desc: 'Fullbleed field photo with scrim and stacked headline — engineering authority.',
  },
};

function labCatalogPreviewUrl(
  brand: BuildBookDemoBrand,
  catalog: NonNullable<BuildBookOption['demo']>['catalog'],
  labId: string,
): string {
  if (brand === 'consult' && catalog === 'heroes') {
    return BUILD_BOOK_CONSULT_DEMO_BASE;
  }
  const prefix = catalog === 'heroes' ? 'hero' : 'fold';
  return `${BUILD_BOOK_LAB_BASE}/lab/${brand}/${catalog}#${prefix}-${labId}`;
}

function mkHeroOption(v: BuildDemoHeroVariant, tag?: string): BuildBookDemoOption {
  const meta =
    v.brand === 'sparky'
      ? SPARKY_HERO_LAB[v.id]
      : v.brand === 'wri'
        ? WRI_HERO_LAB[v.id]
        : v.brand === 'veil'
          ? VEIL_HERO_LAB[v.id]
          : CONSULT_HERO_LAB[v.id];

  const demo: NonNullable<BuildBookOption['demo']> = {
    brand: v.brand,
    catalog: 'heroes',
    labId: meta.labId,
    astroUnit: meta.astroUnit,
  };

  return {
    id: v.id,
    label: v.label,
    desc: meta.desc,
    componentId: meta.componentId,
    layout: meta.layout,
    tag,
    demo,
    previewPath: labCatalogPreviewUrl(demo.brand, demo.catalog, demo.labId),
    previewImage: HERO_PREVIEW_IMAGES[v.id],
  };
}

export const BUILD_BOOK_DEMO_HERO_OPTIONS: BuildBookDemoOption[] = [
  mkHeroOption(BUILD_DEMO_HERO_VARIANTS[0], 'Popular'),
  ...BUILD_DEMO_HERO_VARIANTS.slice(1).map((v) => mkHeroOption(v)),
];

interface FoldLabRow {
  id: string;
  brand: 'sparky' | 'wri';
  label: string;
  desc: string;
  labId: string;
  astroUnit: string;
  componentId: string;
  layout: BuildBookWireLayout;
  tag?: string;
}

const FOLD_LAB_ROWS: FoldLabRow[] = [
  {
    id: 'sp-fold-trust-stats',
    brand: 'sparky',
    label: 'Trust + stats strip',
    desc: 'Credential bar then stat band — the default post-hero stack for contractors.',
    labId: 'trust-stats',
    astroUnit: 'components/sparky/fold/SparkyFoldTrustStats.astro',
    componentId: 'stats-bar',
    layout: 'stats',
  },
  {
    id: 'sp-fold-services-grid',
    brand: 'sparky',
    label: 'Services self-sort',
    desc: 'Four photo cards — panel, EV, solar, or emergency service lines.',
    labId: 'services-grid',
    astroUnit: 'components/sparky/fold/SparkyFoldServicesGrid.astro',
    componentId: 'services-grid',
    layout: 'grid',
  },
  {
    id: 'sp-fold-process',
    brand: 'sparky',
    label: 'Process timeline',
    desc: 'Permit → HECO → install → inspect — reduces “what happens next?” anxiety.',
    labId: 'process-steps',
    astroUnit: 'components/sparky/fold/SparkyFoldProcess.astro',
    componentId: 'process-steps',
    layout: 'list',
  },
  {
    id: 'sp-fold-reviews',
    brand: 'sparky',
    label: 'Reviews strip',
    desc: 'Google-style review row with stars and excerpts near the top half.',
    labId: 'reviews-strip',
    astroUnit: 'components/sparky/fold/SparkyFoldReviews.astro',
    componentId: 'testimonial-grid',
    layout: 'reviews',
  },
  {
    id: 'sp-fold-project',
    brand: 'sparky',
    label: 'Featured project',
    desc: 'Split panel with labeled job photo and outcome metrics.',
    labId: 'project-feature',
    astroUnit: 'components/sparky/fold/SparkyFoldProjectFeature.astro',
    componentId: 'gallery-showcase',
    layout: 'featured',
  },
  {
    id: 'wri-fold-contract',
    brand: 'wri',
    label: 'Contract credibility bar',
    desc: '$150M+, years, sector labels — post-hero stack for municipal buyers.',
    labId: 'contract-bar',
    astroUnit: 'components/wri/fold/WriFoldContractBar.astro',
    componentId: 'logo-strip',
    layout: 'contract-bar',
    tag: 'Trades',
  },
  {
    id: 'wri-fold-capabilities',
    brand: 'wri',
    label: 'Capabilities grid',
    desc: 'Four photo cards for exploration, drilling, pumping, and monitoring.',
    labId: 'capabilities-grid',
    astroUnit: 'components/wri/fold/WriFoldCapabilitiesGrid.astro',
    componentId: 'feature-grid',
    layout: 'capabilities',
  },
  {
    id: 'wri-fold-featured-well',
    brand: 'wri',
    label: 'Featured well',
    desc: 'Labeled deep well with depth, gpm, formation — depth-proof before gallery.',
    labId: 'featured-well',
    astroUnit: 'components/wri/fold/WriFoldFeaturedWell.astro',
    componentId: 'gallery-showcase',
    layout: 'featured',
  },
  {
    id: 'wri-fold-lifecycle',
    brand: 'wri',
    label: 'Project lifecycle',
    desc: 'Five-step permit-to-production timeline for procurement anxiety.',
    labId: 'project-lifecycle',
    astroUnit: 'components/wri/fold/WriFoldProjectLifecycle.astro',
    componentId: 'process-steps',
    layout: 'list',
  },
  {
    id: 'wri-fold-rig-gallery',
    brand: 'wri',
    label: 'Rig gallery + quote CTA',
    desc: 'Field photography grid into navy quote band — ends on project intake.',
    labId: 'rig-gallery-cta',
    astroUnit: 'components/wri/fold/WriFoldRigGalleryCta.astro',
    componentId: 'cta-banner',
    layout: 'close-form',
  },
];

function mkFoldOption(row: FoldLabRow): BuildBookDemoOption {
  const demo: NonNullable<BuildBookOption['demo']> = {
    brand: row.brand,
    catalog: 'fold',
    labId: row.labId,
    astroUnit: row.astroUnit,
  };
  return {
    id: row.id,
    label: row.label,
    desc: row.desc,
    componentId: row.componentId,
    layout: row.layout,
    tag: row.tag,
    demo,
    previewPath: labCatalogPreviewUrl(demo.brand, demo.catalog, demo.labId),
    previewImage: FOLD_PREVIEW_IMAGES[row.id],
  };
}

export const BUILD_BOOK_DEMO_FOLD_OPTIONS: BuildBookDemoOption[] = FOLD_LAB_ROWS.map(mkFoldOption);

/** Sections that use lab demo catalogs instead of generic component previews. */
export const BUILD_BOOK_DEMO_SECTIONS: BuildBookSection[] = ['hero', 'fold'];

export function isDemoSection(section: BuildBookSection): boolean {
  return BUILD_BOOK_DEMO_SECTIONS.includes(section);
}

export function demoBrandLabel(brand: BuildBookDemoBrand): string {
  return { sparky: 'Sparky Electric', wri: 'WRI', consult: 'Wilco Consulting', veil: 'Destination Wedding Painter' }[brand];
}

export function demoBrandDot(brand: BuildBookDemoBrand): string {
  return { sparky: '#f59e0b', wri: '#0ea5e9', consult: '#64748b', veil: '#c9a962' }[brand];
}

export function brandsForDemoSection(section: BuildBookSection): BuildBookDemoBrand[] {
  if (section === 'hero') return ['sparky', 'wri', 'consult', 'veil'];
  if (section === 'fold') return ['sparky', 'wri'];
  return [];
}

export function filterDemoOptions(
  section: BuildBookSection,
  options: BuildBookOption[],
  brand: BuildBookDemoBrand | 'all',
): BuildBookOption[] {
  if (!isDemoSection(section)) return options;
  if (brand === 'all') return options;
  return options.filter((o) => o.demo?.brand === brand);
}
