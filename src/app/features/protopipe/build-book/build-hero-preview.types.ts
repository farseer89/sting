import type { BuildBookDemoBrand } from './build-book.types';

export interface BuildHeroPreviewCopy {
  eyebrow: string;
  headline: string;
  subhead: string;
  primaryCta: string;
  secondaryCta: string;
}

export const DEFAULT_HERO_PREVIEW_COPY: BuildHeroPreviewCopy = {
  eyebrow: 'Your business · Your area',
  headline: 'Headline that converts local buyers.',
  subhead: 'Licensed · insured · trusted in your market',
  primaryCta: 'Call now',
  secondaryCta: 'View services',
};

export type BuildHeroPreviewBrand = BuildBookDemoBrand;
