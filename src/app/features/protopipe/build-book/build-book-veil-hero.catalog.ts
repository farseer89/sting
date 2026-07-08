const DWP_CDN = 'https://destinationweddingpainter.com';

const VEIL_HERO_IMAGE = `${DWP_CDN}/images/hero-stash.jpg`;
const VEIL_CANVAS_IMAGE = `${DWP_CDN}/images/gallery/04.png`;

const mkVeilHeroBase = (extra: Record<string, unknown> = {}) => ({
  baselineRenderer: 'veil-site',
  eyebrow: 'Live wedding paintings by Aubrey Long',
  heading: 'Your special day, captured on canvas',
  subhead: 'Fine art painted live at your destination wedding — Maui, Hawaii, and worldwide.',
  primaryCtaLabel: 'Book your date',
  primaryCtaHref: '#inquire',
  secondaryCtaLabel: 'View gallery',
  secondaryCtaHref: '#portfolio',
  ...extra,
});

const SALON_PANELS = [
  { image: `${DWP_CDN}/images/gallery/01.jpg`, span: 'tall' },
  { image: `${DWP_CDN}/images/hero.jpg`, span: 'wide' },
  { image: `${DWP_CDN}/images/gallery/02.jpg`, span: 'normal' },
  { image: `${DWP_CDN}/images/gallery/04.png`, span: 'normal' },
  { image: `${DWP_CDN}/images/gallery/05.jpg`, span: 'tall' },
  { image: `${DWP_CDN}/images/gallery/06.jpg`, span: 'wide' },
];

const PROCESS_STEPS = [
  { image: `${DWP_CDN}/images/gallery/01.jpg`, label: 'Ceremony' },
  { image: `${DWP_CDN}/images/gallery/02.jpg`, label: 'Detail' },
  { image: `${DWP_CDN}/images/gallery/05.jpg`, label: 'Reception' },
  { image: `${DWP_CDN}/images/gallery/04.png`, label: 'Finished' },
];

/** Maps demo / approved layout ids to Angular baseline hero block ids. */
export const VEIL_HERO_LAYOUT_TO_BLOCK_ID: Record<string, string> = {
  'veil-canvas-frame': 'veil-baseline-hero-canvas-frame',
  'veil-easel-witness': 'veil-baseline-hero-easel-witness',
  'veil-baseline-easel-witness': 'veil-baseline-hero-easel-witness',
  'veil-baseline-canvas-frame': 'veil-baseline-hero-canvas-frame',
  'veil-salon-wall': 'veil-baseline-hero-salon-wall',
  'veil-stationery-monogram': 'veil-baseline-hero-stationery',
  'veil-process-ribbon': 'veil-baseline-hero-process-ribbon',
  'veil-over-shoulder': 'veil-baseline-hero-over-shoulder',
  'veil-brushstroke-split': 'veil-baseline-hero-brushstroke',
  'veil-vow-inset': 'veil-baseline-hero-vow-inset',
  'veil-heirloom-mantel': 'veil-baseline-hero-heirloom',
  'veil-curtain-reveal': 'veil-baseline-hero-curtain',
  'veil-quote-veil': 'veil-baseline-hero-quote',
  'veil-date-ribbon': 'veil-baseline-hero-date-ribbon',
};

export const VEIL_HERO_LAB_DEFAULTS: Record<string, Record<string, unknown>> = {
  'veil-canvas-frame': mkVeilHeroBase({
    labLayout: 'veil-canvas-frame',
    heading: 'A heirloom from the day you said yes.',
    subhead: 'Original live paintings — one canvas, your story, ready to hang.',
    paintingImageSrc: VEIL_CANVAS_IMAGE,
  }),
  'veil-easel-witness': mkVeilHeroBase({
    labLayout: 'veil-easel-witness',
    backgroundImageSrc: VEIL_HERO_IMAGE,
  }),
  'veil-salon-wall': mkVeilHeroBase({
    labLayout: 'veil-salon-wall',
    heading: 'Every wedding deserves a painting.',
    subhead: 'Finished works from garden ceremonies to candlelit ballrooms.',
    salonPanels: SALON_PANELS,
  }),
  'veil-stationery-monogram': mkVeilHeroBase({
    labLayout: 'veil-stationery-monogram',
    eyebrow: 'Aubrey Long · Live wedding painter',
    heading: 'Art that happens while you celebrate.',
    monogram: 'AL',
    textureImageSrc: `${DWP_CDN}/images/gallery/02.jpg`,
  }),
  'veil-process-ribbon': mkVeilHeroBase({
    labLayout: 'veil-process-ribbon',
    processSteps: PROCESS_STEPS,
    backgroundImageSrc: `${DWP_CDN}/images/gallery/05.jpg`,
  }),
  'veil-over-shoulder': mkVeilHeroBase({
    labLayout: 'veil-over-shoulder',
    heading: "See your day through the artist's eyes.",
    subhead: 'Live wedding painting — ceremony through reception on one original canvas.',
    backgroundImageSrc: `${DWP_CDN}/images/gallery/05.jpg`,
  }),
  'veil-brushstroke-split': mkVeilHeroBase({
    labLayout: 'veil-brushstroke-split',
    leftImageSrc: `${DWP_CDN}/images/gallery/05.jpg`,
    rightImageSrc: `${DWP_CDN}/images/gallery/04.png`,
  }),
  'veil-vow-inset': mkVeilHeroBase({
    labLayout: 'veil-vow-inset',
    heading: 'Your vows. Your painting. One moment.',
    subhead: 'Live wedding art that captures the feeling — not just the photo.',
    backgroundImageSrc: `${DWP_CDN}/images/gallery/01.jpg`,
    insetImageSrc: `${DWP_CDN}/images/gallery/04.png`,
  }),
  'veil-heirloom-mantel': mkVeilHeroBase({
    labLayout: 'veil-heirloom-mantel',
    eyebrow: 'Heirloom art',
    heading: 'Hang your wedding day on the wall.',
    subhead: 'The painting lives with you long after the last dance — a daily reminder of your yes.',
    backgroundImageSrc: `${DWP_CDN}/images/hero.jpg`,
  }),
  'veil-curtain-reveal': mkVeilHeroBase({
    labLayout: 'veil-curtain-reveal',
    heading: 'The moment you see your painting for the first time.',
    subhead: 'A reveal before your last dance — guests gather, you cry, you take it home.',
    backgroundImageSrc: VEIL_HERO_IMAGE,
  }),
  'veil-quote-veil': mkVeilHeroBase({
    labLayout: 'veil-quote-veil',
    textureImageSrc: `${DWP_CDN}/images/gallery/02.jpg`,
    quote:
      "Aubrey painted my husband and I perfectly — the lace on my dress, the light on our faces, the way she captured our personality.",
    quoteAuthor: 'Chloe & Jay',
    quoteDetail: 'Maui · 120 guests · planner-led',
  }),
  'veil-date-ribbon': mkVeilHeroBase({
    labLayout: 'veil-date-ribbon',
    backgroundImageSrc: `${DWP_CDN}/images/gallery/05.jpg`,
    ribbonSeason: 'Twelve commissions · 2026 season',
    ribbonDetail: 'Maui studio base · destination travel by inquiry · Peak season fills first',
  }),
};

const COPY_FIELDS = [
  'eyebrow',
  'heading',
  'subhead',
  'primaryCtaLabel',
  'secondaryCtaLabel',
] as const;

export function isVeilHeroLabLayout(layoutId: string | null | undefined): boolean {
  return typeof layoutId === 'string' && layoutId in VEIL_HERO_LAYOUT_TO_BLOCK_ID;
}

export function resolveVeilHeroPreviewBlockId(
  layoutId: string,
  fallbackBlockId?: string | null,
): string | null {
  return VEIL_HERO_LAYOUT_TO_BLOCK_ID[layoutId] ?? fallbackBlockId ?? null;
}

export function veilHeroLabPreviewProps(
  layoutId: string,
  existing: Record<string, unknown> = {},
): Record<string, unknown> {
  const defaults = VEIL_HERO_LAB_DEFAULTS[layoutId];
  if (!defaults) return {};

  const next = structuredClone(defaults);
  for (const key of COPY_FIELDS) {
    if (typeof existing[key] === 'string' && existing[key]) {
      next[key] = existing[key];
    }
  }
  return next;
}

function pickString(props: Record<string, unknown>, key: string): string | null {
  const value = props[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function firstArrayImage(props: Record<string, unknown>, key: string): string | null {
  const raw = props[key];
  if (!Array.isArray(raw) || !raw.length) return null;
  const first = raw[0];
  if (!first || typeof first !== 'object') return null;
  const image = (first as { image?: unknown }).image;
  return typeof image === 'string' && image.trim() ? image : null;
}

function veilHeroLayoutKey(layoutId: string): string {
  if (layoutId === 'veil-baseline-easel-witness') return 'veil-easel-witness';
  if (layoutId === 'veil-baseline-canvas-frame') return 'veil-canvas-frame';
  return layoutId;
}

/** Primary display image for a Veil hero layout — used by rail preview, image picker, and fallbacks. */
export function readVeilHeroPrimaryImageUrl(
  layoutId: string,
  props: Record<string, unknown>,
): string | null {
  const layout = veilHeroLayoutKey(layoutId);

  switch (layout) {
    case 'veil-canvas-frame':
      return pickString(props, 'paintingImageSrc') ?? pickString(props, 'backgroundImageSrc');
    case 'veil-salon-wall':
      return firstArrayImage(props, 'salonPanels') ?? pickString(props, 'backgroundImageSrc');
    case 'veil-stationery-monogram':
    case 'veil-quote-veil':
      return pickString(props, 'textureImageSrc') ?? pickString(props, 'backgroundImageSrc');
    case 'veil-brushstroke-split':
      return pickString(props, 'leftImageSrc') ?? pickString(props, 'rightImageSrc');
    case 'veil-vow-inset':
      return pickString(props, 'backgroundImageSrc') ?? pickString(props, 'insetImageSrc');
    case 'veil-process-ribbon':
      return pickString(props, 'backgroundImageSrc') ?? firstArrayImage(props, 'processSteps');
    default:
      return (
        pickString(props, 'backgroundImageSrc') ??
        pickString(props, 'paintingImageSrc') ??
        pickString(props, 'textureImageSrc') ??
        pickString(props, 'leftImageSrc')
      );
  }
}
