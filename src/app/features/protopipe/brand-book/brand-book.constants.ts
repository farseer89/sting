import type {
  BrandBookImageStylePresetId,
  BrandBookInfographVariant,
} from '@hive/contracts';

export const BRAND_BOOK_IMAGE_PRESETS: {
  id: BrandBookImageStylePresetId;
  label: string;
  description: string;
}[] = [
  {
    id: 'protopipe-editorial-v1',
    label: 'Editorial photography',
    description: 'Warm, natural editorial photos — default Protopipe look.',
  },
  {
    id: 'warm-documentary',
    label: 'Warm documentary',
    description: 'Golden-hour, candid documentary feel.',
  },
  {
    id: 'industrial-clean',
    label: 'Industrial clean',
    description: 'Sharp, neutral lighting for trades and technical brands.',
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
}[] = [
  {
    id: 'flat-vector',
    label: 'Flat vector',
    description: 'Clean SVG-style infographics with brand palette.',
  },
  {
    id: 'chalkboard-svg',
    label: 'Chalkboard SVG',
    description: 'Textured slate background with chalk-style icons.',
  },
  {
    id: 'photo-texture',
    label: 'Photo texture',
    description: 'Photographic background with overlaid stats.',
  },
  {
    id: 'minimal-light',
    label: 'Minimal light',
    description: 'Light background, simple typography-led stats.',
  },
];
