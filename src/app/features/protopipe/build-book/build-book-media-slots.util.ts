import { findBuildBookBlockDefinition } from './build-book-block.catalog';
import { resolveBaselineHeroLayoutId } from './build-book-baseline-hero.catalog';
import { readProp } from './fields/build-field.util';
import { isVeilHeroLabLayout } from './build-book-veil-hero.catalog';

export interface BuildMediaSlot {
  id: string;
  propPath: string;
  label: string;
  imageUrl: string | null;
}

const IMAGE_FIELD_LABELS: Record<string, string> = {
  backgroundImageSrc: 'Background photo',
  paintingImageSrc: 'Painting photo',
  imageSrc: 'Featured photo',
  textureImageSrc: 'Texture photo',
  leftImageSrc: 'Left photo',
  rightImageSrc: 'Right photo',
  insetImageSrc: 'Inset photo',
  visualSrc: 'Visual photo',
};

function imageUrlFromProp(props: Record<string, unknown>, path: string): string | null {
  const value = readProp(props, path);
  return typeof value === 'string' && value.trim() ? value : null;
}

function labelForPath(propPath: string): string {
  if (IMAGE_FIELD_LABELS[propPath]) return IMAGE_FIELD_LABELS[propPath];
  const salon = propPath.match(/^salonPanels\.(\d+)\.image$/);
  if (salon) return `Salon panel ${Number(salon[1]) + 1}`;
  const process = propPath.match(/^processSteps\.(\d+)\.image$/);
  if (process) return `Process step ${Number(process[1]) + 1}`;
  const cap = propPath.match(/^capabilities\.(\d+)\.image$/);
  if (cap) return `Capability photo ${Number(cap[1]) + 1}`;
  const gallery = propPath.match(/^gallery\.(\d+)\.image$/);
  if (gallery) return `Gallery photo ${Number(gallery[1]) + 1}`;
  const service = propPath.match(/^services\.(\d+)\.image$/);
  if (service) return `Service photo ${Number(service[1]) + 1}`;
  const item = propPath.match(/^items\.(\d+)\.image$/);
  if (item) return `Portfolio item ${Number(item[1]) + 1}`;
  return propPath.replace(/\./g, ' · ');
}

function pushSlot(slots: BuildMediaSlot[], props: Record<string, unknown>, propPath: string): void {
  if (slots.some((slot) => slot.propPath === propPath)) return;
  slots.push({
    id: propPath.replace(/\./g, '-'),
    propPath,
    label: labelForPath(propPath),
    imageUrl: imageUrlFromProp(props, propPath),
  });
}

function veilHeroLayoutKey(layoutId: string): string {
  if (layoutId === 'veil-baseline-easel-witness') return 'veil-easel-witness';
  if (layoutId === 'veil-baseline-canvas-frame') return 'veil-canvas-frame';
  return layoutId;
}

function veilHeroSlotPaths(layoutId: string, props: Record<string, unknown>): string[] {
  const layout = veilHeroLayoutKey(layoutId);
  const paths: string[] = [];

  switch (layout) {
    case 'veil-canvas-frame':
      paths.push('paintingImageSrc');
      break;
    case 'veil-salon-wall': {
      const panels = props['salonPanels'];
      if (Array.isArray(panels)) {
        panels.forEach((_, index) => paths.push(`salonPanels.${index}.image`));
      }
      break;
    }
    case 'veil-stationery-monogram':
    case 'veil-quote-veil':
      paths.push('textureImageSrc');
      break;
    case 'veil-brushstroke-split':
      paths.push('leftImageSrc', 'rightImageSrc');
      break;
    case 'veil-vow-inset':
      paths.push('backgroundImageSrc', 'insetImageSrc');
      break;
    case 'veil-process-ribbon': {
      paths.push('backgroundImageSrc');
      const steps = props['processSteps'];
      if (Array.isArray(steps)) {
        steps.forEach((_, index) => paths.push(`processSteps.${index}.image`));
      }
      break;
    }
    default:
      paths.push(
        'backgroundImageSrc',
        'paintingImageSrc',
        'textureImageSrc',
        'leftImageSrc',
        'rightImageSrc',
        'insetImageSrc',
      );
      break;
  }

  return paths;
}

function slotsFromEditableFields(props: Record<string, unknown>, editableFields: string[]): BuildMediaSlot[] {
  const slots: BuildMediaSlot[] = [];

  for (const field of editableFields) {
    if (field.endsWith('ImageSrc') || field === 'imageSrc' || field === 'visualSrc') {
      pushSlot(slots, props, field);
      continue;
    }

    const arrayRoot = field.replace(/\.\*$/, '');
    const value = props[arrayRoot];
    if (!Array.isArray(value)) continue;

    value.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') return;
      const record = entry as Record<string, unknown>;
      if ('image' in record || 'imageSrc' in record) {
        pushSlot(slots, props, `${arrayRoot}.${index}.image`);
      }
      if ('imageSrc' in record) {
        pushSlot(slots, props, `${arrayRoot}.${index}.imageSrc`);
      }
    });
  }

  for (const key of ['capabilities', 'gallery', 'services', 'items', 'steps', 'logos']) {
    const value = props[key];
    if (!Array.isArray(value)) continue;
    value.forEach((entry, index) => {
      if (entry && typeof entry === 'object' && 'image' in (entry as object)) {
        pushSlot(slots, props, `${key}.${index}.image`);
      }
      if (entry && typeof entry === 'object' && 'imageSrc' in (entry as object)) {
        pushSlot(slots, props, `${key}.${index}.imageSrc`);
      }
    });
  }

  for (const field of ['before', 'after']) {
    if (!editableFields.includes(field)) continue;
    const value = props[field];
    if (value && typeof value === 'object' && 'image' in (value as object)) {
      pushSlot(slots, props, `${field}.image`);
    }
  }

  return slots;
}

export function resolveMediaSlotsForBlock(
  blockId: string,
  props: Record<string, unknown>,
): BuildMediaSlot[] {
  const def = findBuildBookBlockDefinition(blockId);
  if (!def) return [];

  const slots: BuildMediaSlot[] = [];

  if (def.section === 'hero') {
    const layoutId = resolveBaselineHeroLayoutId(blockId, props);
    if (isVeilHeroLabLayout(layoutId) || blockId.startsWith('veil-baseline-hero')) {
      for (const path of veilHeroSlotPaths(layoutId, props)) {
        pushSlot(slots, props, path);
      }
      return slots.filter((slot) => slot.propPath);
    }
  }

  const fromFields = slotsFromEditableFields(props, def.editableFields);
  for (const slot of fromFields) {
    pushSlot(slots, props, slot.propPath);
  }

  return slots;
}
