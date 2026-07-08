import { readProp } from './build-field.util';
import { HREF_LABELS } from './build-href-field.util';

const CONTENT_LABELS: Record<string, string> = {
  eyebrow: 'Eyebrow',
  heading: 'Heading',
  subhead: 'Subhead',
  subheading: 'Subheading',
  body: 'Body',
  intro: 'Intro',
  subtitle: 'Subtitle',
  ctaLabel: 'CTA label',
  primaryCtaLabel: 'Primary CTA label',
  secondaryCtaLabel: 'Secondary CTA label',
  phoneLabel: 'Phone label',
  submitLabel: 'Submit label',
  quote: 'Quote',
  attribution: 'Attribution',
  role: 'Role',
  title: 'Title',
  lede: 'Lede',
  kicker: 'Kicker',
  sectorsLine: 'Sectors line',
  moreLabel: 'More link label',
  successMessage: 'Success message',
  demoStatus: 'Status note',
};

const IMAGE_FIELD_KEYS = new Set([
  'backgroundImageSrc',
  'imageSrc',
  'visualSrc',
  'paintingImageSrc',
  'insetImageSrc',
  'leftImageSrc',
  'rightImageSrc',
  'textureImageSrc',
  'backgroundImageAlt',
  'imageAlt',
]);

const HREF_FIELD_KEYS = new Set(Object.keys(HREF_LABELS));

const ARRAY_ROOT_KEYS = new Set([
  'stats',
  'capabilities',
  'gallery',
  'salonPanels',
  'processSteps',
  'items',
  'services',
  'testimonials',
  'steps',
  'facts',
  'credentials',
  'offices',
  'islands',
  'packages',
  'reviews',
  'images',
  'paragraphs',
  'serviceOptions',
  'stepLabels',
]);

export interface BuildContentField {
  key: string;
  label: string;
  value: string;
  multiline?: boolean;
}

function isCopyFieldKey(key: string): boolean {
  if (HREF_FIELD_KEYS.has(key)) return false;
  if (IMAGE_FIELD_KEYS.has(key)) return false;
  if (ARRAY_ROOT_KEYS.has(key)) return false;
  if (key.endsWith('Href') || key.endsWith('Src') || key.endsWith('Alt')) return false;
  if (key.includes('.')) return false;
  return key in CONTENT_LABELS;
}

export function contentFieldsFromProps(
  props: Record<string, unknown>,
  editableFields: string[],
): BuildContentField[] {
  return editableFields
    .filter(isCopyFieldKey)
    .map((key) => ({
      key,
      label: CONTENT_LABELS[key] ?? key,
      value: typeof props[key] === 'string' ? String(props[key]) : '',
      multiline: key === 'body' || key === 'intro' || key === 'subhead' || key === 'lede',
    }));
}

export function contentFieldsFromEditablePaths(
  props: Record<string, unknown>,
  editableFields: string[],
): BuildContentField[] {
  const direct = contentFieldsFromProps(props, editableFields);
  const nested: BuildContentField[] = [];

  for (const key of editableFields) {
    if (!key.includes('.')) continue;
    const root = key.split('.')[0] ?? '';
    if (ARRAY_ROOT_KEYS.has(root) || HREF_FIELD_KEYS.has(key) || key.endsWith('Alt') || key.endsWith('Src')) {
      continue;
    }
    const value = readProp(props, key);
    nested.push({
      key,
      label: formatNestedLabel(key),
      value: typeof value === 'string' ? value : '',
    });
  }

  return [...direct, ...nested];
}

function formatNestedLabel(path: string): string {
  const segments = path.split('.');
  const field = segments[segments.length - 1] ?? path;
  const parent = segments.length > 1 ? segments[segments.length - 2] : '';
  const fieldLabel = CONTENT_LABELS[field] ?? field;
  if (parent && /^\d+$/.test(parent)) {
    const index = Number(parent) + 1;
    const root = segments[0] ?? '';
    return `${root} ${index} · ${fieldLabel}`;
  }
  return fieldLabel;
}
