export type CognitivePackStatus = 'available' | 'coming_soon' | 'beta';

export type CognitivePackTier = 'included' | 'pro' | 'addon';

export interface CognitivePackTrainRef {
  slug: string;
  label: string;
  mechanism: string;
}

export interface CognitivePackCatalogItem {
  id: string;
  slug: string;
  label: string;
  tagline: string;
  description: string;
  coverImageAlt: string;
  accentColor: string;
  trainRefs: CognitivePackTrainRef[];
  bestFor: string[];
  whenToUse: string;
  pairsWithPackIds: string[];
  status: CognitivePackStatus;
  tier: CognitivePackTier;
  estimatedCostUsd?: { min: number; max: number };
  stepCount?: number;
  version: string;
}

export type PackStoreFilter = 'all' | 'available' | 'coming_soon';
