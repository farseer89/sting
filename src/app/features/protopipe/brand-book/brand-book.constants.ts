import type {
  BrandBookImageStylePresetId,
  BrandBookInfographVariant,
} from '@hive/contracts';

export const BRAND_BOOK_IMAGE_PRESETS: {
  id: BrandBookImageStylePresetId;
  label: string;
  description: string;
  previewImage?: string;
}[] = [
  {
    id: 'protopipe-editorial-v1',
    label: 'Editorial photography',
    description: 'Warm, natural editorial photos — default Protopipe look.',
    previewImage: '/brand-book/photo-editorial.jpg',
  },
  {
    id: 'warm-documentary',
    label: 'Warm documentary',
    description: 'Golden-hour, candid documentary feel.',
    previewImage: '/brand-book/photo-warm-documentary.jpg',
  },
  {
    id: 'industrial-clean',
    label: 'Industrial clean',
    description: 'Sharp, neutral lighting for trades and technical brands.',
    previewImage: '/brand-book/photo-industrial-clean.jpg',
  },
  {
    id: 'custom',
    label: 'Custom prompt',
    description: 'Write your own image style suffix for fal.ai.',
  },
];

export const BRAND_BOOK_INFOGRAPH_VARIANTS: {
  id: BrandBookInfographVariant;
  label: string;
  description: string;
  previewImage: string;
}[] = [
  {
    id: 'flat-vector',
    label: 'Flat vector',
    description: 'Clean SVG-style infographics with brand palette.',
    previewImage: '/brand-book/infograph-flat-vector.png',
  },
  {
    id: 'chalkboard-svg',
    label: 'Chalkboard SVG',
    description: 'Textured slate background with chalk-style icons.',
    previewImage: '/brand-book/infograph-chalkboard.png',
  },
  {
    id: 'photo-texture',
    label: 'Photo texture',
    description: 'Photographic background with overlaid stats.',
    previewImage: '/brand-book/infograph-photo-texture.png',
  },
  {
    id: 'minimal-light',
    label: 'Minimal light',
    description: 'Light background, simple typography-led stats.',
    previewImage: '/brand-book/infograph-minimal-light.png',
  },
];

export function brandBookImagePresetLabel(id: BrandBookImageStylePresetId): string {
  return BRAND_BOOK_IMAGE_PRESETS.find((p) => p.id === id)?.label ?? id;
}

export function brandBookInfographVariantLabel(id: BrandBookInfographVariant): string {
  return BRAND_BOOK_INFOGRAPH_VARIANTS.find((v) => v.id === id)?.label ?? id;
}
