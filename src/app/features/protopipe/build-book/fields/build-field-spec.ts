export type BuildBookFieldKind =
  | 'text'
  | 'multiline'
  | 'cta'
  | 'statPair'
  | 'listItem'
  | 'image'
  | 'href';

export type BuildBookEditSurface = 'inline' | 'popover' | 'rail';

const MULTILINE_KEYS = new Set([
  'heading',
  'headline',
  'subhead',
  'subheading',
  'body',
  'quote',
  'intro',
  'lede',
]);

const CTA_KEYS = new Set([
  'ctaLabel',
  'primaryCtaLabel',
  'secondaryCtaLabel',
  'submitLabel',
  'phoneLabel',
]);

const IMAGE_KEYS = new Set(['imageSrc', 'backgroundImageSrc', 'visualSrc', 'imageAlt', 'backgroundImageAlt', 'visualAlt']);

const HREF_KEYS = new Set(['ctaHref', 'primaryCtaHref', 'secondaryCtaHref', 'phoneHref', 'moreHref']);

const LIST_KEYS = new Set([
  'stats',
  'services',
  'items',
  'testimonials',
  'features',
  'steps',
  'cards',
  'images',
  'logos',
  'bullets',
]);

export function fieldKindForKey(key: string): BuildBookFieldKind {
  if (LIST_KEYS.has(key)) {
    return key === 'stats' || key === 'cards' ? 'statPair' : 'listItem';
  }
  if (CTA_KEYS.has(key)) return 'cta';
  if (IMAGE_KEYS.has(key)) return 'image';
  if (HREF_KEYS.has(key)) return 'href';
  if (MULTILINE_KEYS.has(key)) return 'multiline';
  return 'text';
}

export function editSurfaceForKind(kind: BuildBookFieldKind): BuildBookEditSurface {
  switch (kind) {
    case 'listItem':
    case 'href':
      return 'rail';
    case 'image':
      return 'popover';
    default:
      return 'inline';
  }
}

export function isInlineEditableField(key: string): boolean {
  const kind = fieldKindForKey(key);
  return editSurfaceForKind(kind) === 'inline';
}
