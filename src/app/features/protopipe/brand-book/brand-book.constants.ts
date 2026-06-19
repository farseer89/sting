import type {
  BrandBookImageStylePresetId,
  BrandBookInfographVariant,
} from '@hive/contracts';

export const BRAND_BOOK_IMAGE_PRESETS: {
  id: BrandBookImageStylePresetId;
  label: string;
  description: string;
  tag?: string;
  previewImage?: string;
  previewImages?: [string, string, string, string];
}[] = [
  {
    id: 'industrial-clean',
    label: 'Industrial Clean',
    description: 'Sharp, neutral light. Confident expertise, no clutter.',
    tag: 'Best for trades',
    previewImages: [
      '/assets/brand-book/photo-ic-1.jpg',
      '/assets/brand-book/photo-ic-2.jpg',
      '/assets/brand-book/photo-ic-3.jpg',
      '/assets/brand-book/photo-ic-4.jpg',
    ],
  },
  {
    id: 'warm-documentary',
    label: 'Warm Documentary',
    description: 'Golden-hour candid. Human and approachable.',
    previewImages: [
      '/assets/brand-book/photo-wd-1.jpg',
      '/assets/brand-book/photo-wd-2.jpg',
      '/assets/brand-book/photo-wd-3.jpg',
      '/assets/brand-book/photo-wd-4.jpg',
    ],
  },
  {
    id: 'protopipe-editorial-v1',
    label: 'Editorial',
    description: 'Clean neutral. Works for hero, blog, and social.',
    previewImages: [
      '/assets/brand-book/photo-ed-1.jpg',
      '/assets/brand-book/photo-ed-2.jpg',
      '/assets/brand-book/photo-ed-3.jpg',
      '/assets/brand-book/photo-ed-4.jpg',
    ],
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
