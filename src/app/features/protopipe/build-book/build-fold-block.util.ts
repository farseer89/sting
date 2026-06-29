import type { BuildBookWireLayout } from './build-book.types';
import { findBuildBookOption, findBuildBookOptionByLabLayout } from './build-book.constants';

const IMAGE_PROP_KEYS = new Set([
  'image',
  'imageSrc',
  'imageAlt',
  'backgroundImageSrc',
  'backgroundImageAlt',
  'src',
  'logoSrc',
  'previewImage',
]);

export function resolveFoldWireLayout(layoutId: string): BuildBookWireLayout {
  const option =
    findBuildBookOptionByLabLayout('fold', layoutId) ?? findBuildBookOption('fold', layoutId);
  const layout = option?.layout ?? 'contract-bar';
  return layout === 'metrics' ? 'stats' : layout;
}

function stripImages(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripImages(item));
  }
  if (value != null && typeof value === 'object') {
    const next: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (IMAGE_PROP_KEYS.has(key)) continue;
      next[key] = stripImages(child);
    }
    return next;
  }
  return value;
}

function placeholderStats(): { value: string; label: string }[] {
  return [
    { value: '25+', label: 'Years experience' },
    { value: '500+', label: 'Projects completed' },
    { value: '100%', label: 'Licensed & insured' },
  ];
}

function placeholderTrust(): { label: string; detail: string }[] {
  return [
    { label: 'Licensed', detail: 'Fully credentialed' },
    { label: 'Insured', detail: 'Bonded crews' },
    { label: 'Local', detail: 'Regional coverage' },
    { label: 'Guaranteed', detail: 'Workmanship warranty' },
  ];
}

function placeholderCards(count = 4): { title: string; body: string }[] {
  return Array.from({ length: count }, (_, index) => ({
    title: `Service line ${index + 1}`,
    body: 'Short supporting description for this offer.',
  }));
}

function placeholderSteps(): { step: string; title: string; body: string }[] {
  return [
    { step: '01', title: 'Contact', body: 'Tell us about your project scope and timeline.' },
    { step: '02', title: 'Plan', body: 'We confirm requirements, permits, and mobilization.' },
    { step: '03', title: 'Execute', body: 'Field crews deliver the approved scope of work.' },
    { step: '04', title: 'Closeout', body: 'Documentation, inspection, and handoff.' },
  ];
}

function placeholderReviews(): { quote: string; name: string }[] {
  return [
    {
      quote: 'Professional team, clear communication, and quality results.',
      name: 'Local client',
    },
  ];
}

function placeholderPartners(): { name: string }[] {
  return [{ name: 'Partner one' }, { name: 'Partner two' }, { name: 'Partner three' }];
}

/** Preview-only props for lab fold layouts — never write catalog/demo images into saved block state. */
export function foldLabPreviewProps(
  layoutId: string,
  blockProps: Record<string, unknown>,
): Record<string, unknown> {
  const wireLayout = resolveFoldWireLayout(layoutId);
  const merged = structuredClone(stripImages(blockProps) as Record<string, unknown>);

  if (wireLayout === 'contract-bar' || wireLayout === 'stats') {
    if (!Array.isArray(merged['stats']) || !(merged['stats'] as unknown[]).length) {
      merged['stats'] = placeholderStats();
    }
    if (wireLayout === 'contract-bar' && typeof merged['sectorsLine'] !== 'string') {
      merged['sectorsLine'] = 'Government · Commercial · Private · Regional coverage';
    }
    if (wireLayout === 'stats' && (!Array.isArray(merged['trust']) || !(merged['trust'] as unknown[]).length)) {
      merged['trust'] = placeholderTrust();
    }
  }

  if (wireLayout === 'band') {
    if (typeof merged['heading'] !== 'string' || !merged['heading']) {
      merged['heading'] = 'Trusted by';
    }
    if (!Array.isArray(merged['partners']) || !(merged['partners'] as unknown[]).length) {
      merged['partners'] = placeholderPartners();
    }
  }

  if (wireLayout === 'capabilities' || wireLayout === 'grid') {
    if (typeof merged['heading'] !== 'string' || !merged['heading']) {
      merged['heading'] = wireLayout === 'grid' ? 'Our services' : 'Core capabilities';
    }
    const capabilities = merged['capabilities'];
    const services = merged['services'];
    const features = merged['features'];
    const hasCards =
      (Array.isArray(capabilities) && capabilities.length) ||
      (Array.isArray(services) && services.length) ||
      (Array.isArray(features) && features.length);
    if (!hasCards) {
      merged['capabilities'] = placeholderCards(wireLayout === 'grid' ? 4 : 4);
    } else if (Array.isArray(features) && !Array.isArray(capabilities)) {
      merged['capabilities'] = features;
    }
  }

  if (wireLayout === 'featured') {
    if (typeof merged['heading'] !== 'string' || !merged['heading']) {
      merged['heading'] = 'Featured project';
    }
    if (typeof merged['body'] !== 'string' && typeof merged['intro'] !== 'string') {
      merged['body'] = 'Outcome-focused project highlight with proof metrics and location context.';
    }
  }

  if (wireLayout === 'list') {
    if (typeof merged['title'] !== 'string' && typeof merged['heading'] !== 'string') {
      merged['title'] = 'How it works';
    }
    if (!Array.isArray(merged['steps']) || !(merged['steps'] as unknown[]).length) {
      merged['steps'] = placeholderSteps();
    }
  }

  if (wireLayout === 'reviews') {
    if (!Array.isArray(merged['testimonials']) || !(merged['testimonials'] as unknown[]).length) {
      merged['testimonials'] = placeholderReviews();
    }
  }

  if (wireLayout === 'close-form') {
    if (typeof merged['heading'] !== 'string' || !merged['heading']) {
      merged['heading'] = 'Ready to start your project?';
    }
  }

  return merged;
}
