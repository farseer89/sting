import { BUILD_BOOK_BLOCK_DEFINITIONS, findBuildBookBlockDefinition } from './build-book-block.catalog';
import {
  BUILD_BOOK_BLOCK_PATTERNS,
  findBuildBookBlockPattern,
  patternLabel,
  type BuildBookBlockIntent,
  type BuildBookBlockRenderMode,
} from './build-book-block-patterns.catalog';
import { BUILD_BOOK_VARIANT_REGISTRY, variantRegistryEntry } from './build-book-variant-registry';
import type { BuildBookBlockDefinition, BuildBookBlockInstance, BuildBookPageKind } from './build-book.types';
import { isPatternAllowedForPageKind } from './build-book-page-pattern-policy';
import { baselineHeroBlockIdForLayout } from './option-preview/build-book-option-preview.util';

export type EnrichedBuildBookBlockDefinition = BuildBookBlockDefinition & {
  patternId: string;
  patternLabel: string;
  intents: BuildBookBlockIntent[];
  variantLabel?: string;
  renderMode: BuildBookBlockRenderMode;
  brandLabel?: string;
};

export interface PatternGroup {
  patternId: string;
  patternLabel: string;
  sortOrder: number;
  variants: EnrichedBuildBookBlockDefinition[];
}

export type AddBlockCatalogFilter = 'compatible' | 'all';

export function enrichBlockDefinition(def: BuildBookBlockDefinition): EnrichedBuildBookBlockDefinition {
  const entry = variantRegistryEntry(def.id);
  const patternId = entry?.patternId ?? inferPatternFromLayout(def);
  const pattern = findBuildBookBlockPattern(patternId);
  return {
    ...def,
    patternId,
    patternLabel: pattern?.label ?? patternLabel(patternId),
    intents: entry?.intents ?? pattern?.intents ?? [],
    variantLabel: entry?.variantLabel,
    renderMode: entry?.renderMode ?? (pattern?.interactive ? 'interactive-stub' : 'baseline-angular'),
    brandLabel: brandLabelFromTemplateId(def.sourceTemplateId),
  };
}

function inferPatternFromLayout(def: BuildBookBlockDefinition): string {
  switch (def.layout) {
    case 'contract-bar':
    case 'stats':
    case 'metrics':
      return 'stats-band';
    case 'capabilities':
    case 'grid':
    case 'cards':
      return def.section === 'services' ? 'service-grid' : 'work-gallery';
    case 'reviews':
      return 'testimonial-grid';
    case 'featured':
      return 'case-study';
    case 'close-form':
      return 'inquiry-close';
    case 'map':
      return 'coverage-map';
    case 'fullbleed':
    case 'split':
    case 'bento':
    case 'dual-path':
      return def.section === 'hero' ? 'hero' : 'content-split';
    default:
      return def.section === 'hero' ? 'hero' : 'section-intro';
  }
}

function brandLabelFromTemplateId(templateId: string | undefined): string | undefined {
  if (!templateId) return undefined;
  if (templateId.includes('sparky')) return 'Sparky';
  if (templateId.includes('wri')) return 'WRI';
  if (templateId.includes('wilco')) return 'Wilco';
  if (templateId.includes('veil')) return 'Veil';
  if (templateId.includes('blackstone')) return 'Blackstone';
  return undefined;
}

export function allEnrichedBlockDefinitions(): EnrichedBuildBookBlockDefinition[] {
  return BUILD_BOOK_BLOCK_DEFINITIONS.map(enrichBlockDefinition);
}

export function enrichedBlockDefinition(blockId: string): EnrichedBuildBookBlockDefinition | undefined {
  const def = findBuildBookBlockDefinition(blockId);
  return def ? enrichBlockDefinition(def) : undefined;
}

export function resolvePatternIdForBlock(blockId: string): string {
  return enrichedBlockDefinition(blockId)?.patternId ?? 'section-intro';
}

export function variantsForTemplate(
  templateId: string | null | undefined,
  filter: AddBlockCatalogFilter = 'compatible',
): EnrichedBuildBookBlockDefinition[] {
  const all = allEnrichedBlockDefinitions().filter((def) => {
    if (filter === 'all') return Boolean(variantRegistryEntry(def.id));
    if (!templateId) return true;
    const entry = variantRegistryEntry(def.id);
    if (!entry?.compatibleTemplateIds?.length) return def.sourceTemplateId === templateId;
    return entry.compatibleTemplateIds.includes(templateId);
  });
  return all.sort((a, b) => a.patternLabel.localeCompare(b.patternLabel) || a.label.localeCompare(b.label));
}

export function patternsGroupedForTemplate(
  templateId: string | null | undefined,
  filter: AddBlockCatalogFilter = 'compatible',
): PatternGroup[] {
  const variants = variantsForTemplate(templateId, filter);
  return groupVariantsIntoPatterns(variants);
}

/** Phase 6 — pattern catalog is authoritative; template ingest only filters compatible variants. */
export function patternsGroupedFromPatternRegistry(pageKind: BuildBookPageKind): PatternGroup[] {
  const allVariants = allEnrichedBlockDefinitions().filter((def) => variantRegistryEntry(def.id));
  const allowed = allVariants.filter((variant) => isPatternAllowedForPageKind(variant.patternId, pageKind));
  return groupVariantsIntoPatterns(allowed);
}

function groupVariantsIntoPatterns(variants: EnrichedBuildBookBlockDefinition[]): PatternGroup[] {
  const groups = new Map<string, PatternGroup>();

  for (const variant of variants) {
    const pattern = findBuildBookBlockPattern(variant.patternId);
    const existing = groups.get(variant.patternId);
    if (existing) {
      existing.variants.push(variant);
    } else {
      groups.set(variant.patternId, {
        patternId: variant.patternId,
        patternLabel: variant.patternLabel,
        sortOrder: pattern?.sortOrder ?? 999,
        variants: [variant],
      });
    }
  }

  return [...groups.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function patternsGroupedForPageKind(
  pageKind: BuildBookPageKind,
  templateId: string | null | undefined,
  filter: AddBlockCatalogFilter = 'compatible',
): PatternGroup[] {
  if (filter === 'all') {
    return patternsGroupedFromPatternRegistry(pageKind);
  }
  return patternsGroupedForTemplate(templateId, filter).filter((group) =>
    isPatternAllowedForPageKind(group.patternId, pageKind),
  );
}

export function findPatternGroup(
  patternId: string,
  pageKind: BuildBookPageKind,
  templateId: string | null | undefined,
  filter: AddBlockCatalogFilter = 'compatible',
): PatternGroup | undefined {
  return patternsGroupedForPageKind(pageKind, templateId, filter).find(
    (group) => group.patternId === patternId,
  );
}

export function variantsForPattern(
  patternId: string,
  pageKind: BuildBookPageKind,
  templateId: string | null | undefined,
  filter: AddBlockCatalogFilter = 'compatible',
): EnrichedBuildBookBlockDefinition[] {
  return findPatternGroup(patternId, pageKind, templateId, filter)?.variants ?? [];
}

export function resolveBlockIdForHeroLayoutOption(optionId: string): string | null {
  return baselineHeroBlockIdForLayout(optionId);
}

export function patternLabelForId(patternId: string): string {
  return findBuildBookBlockPattern(patternId)?.label ?? patternLabel(patternId);
}

export function defaultPropsForBlockId(blockId: string): Record<string, unknown> {
  const def = findBuildBookBlockDefinition(blockId);
  return def ? structuredClone(def.defaultProps) : {};
}

export function navDisplayLabel(blockId: string, instanceLabel?: string): string {
  const enriched = enrichedBlockDefinition(blockId);
  if (!enriched) return instanceLabel ?? blockId;
  return enriched.patternLabel;
}

export function navDisplaySubtitle(blockId: string, instanceLabel?: string): string | null {
  const enriched = enrichedBlockDefinition(blockId);
  if (!enriched) return null;
  const flavor = enriched.variantLabel ?? instanceLabel ?? enriched.label;
  if (flavor === enriched.patternLabel) return enriched.brandLabel ?? null;
  return flavor;
}

const STACK_TITLE_PROP_PRIORITY = [
  'heading',
  'headline',
  'title',
  'kicker',
  'lede',
  'subhead',
  'intro',
  'body',
  'eyebrow',
] as const;

const STACK_LIST_PROP_KEYS = ['services', 'items', 'steps', 'features', 'testimonials', 'cards'] as const;

const STACK_NESTED_TEXT_KEYS = ['heading', 'headline', 'title', 'name', 'label', 'text'] as const;

function truncateStackLabel(text: string, max = 52): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function textFromPropValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (trimmed) return trimmed;
      }
      if (item && typeof item === 'object') {
        for (const key of STACK_NESTED_TEXT_KEYS) {
          const nested = textFromPropValue((item as Record<string, unknown>)[key]);
          if (nested) return nested;
        }
      }
    }
  }
  return null;
}

/** First meaningful on-page text for stack rows — Shopify-style sidebar title. */
export function stackContentSnippet(block: BuildBookBlockInstance): string | null {
  const props = block.props ?? {};
  const def = findBuildBookBlockDefinition(block.blockId);
  const fields = new Set(def?.editableFields ?? []);

  for (const key of STACK_TITLE_PROP_PRIORITY) {
    if (fields.has(key) || key in props) {
      const text = textFromPropValue(props[key]);
      if (text) return text;
    }
  }

  if ('titleLines' in props) {
    const text = textFromPropValue(props['titleLines']);
    if (text) return text;
  }

  for (const key of STACK_LIST_PROP_KEYS) {
    if (key in props) {
      const text = textFromPropValue(props[key]);
      if (text) return text;
    }
  }

  return null;
}

/** Primary stack row label — live content when available, else pattern type. */
export function stackDisplayLabel(block: BuildBookBlockInstance): string {
  const content = stackContentSnippet(block);
  if (content) return truncateStackLabel(content);

  const enriched = enrichedBlockDefinition(block.blockId);
  if (enriched) return enriched.patternLabel;
  return block.label ?? block.blockId;
}

/** Muted stack subtitle — pattern type when primary is content; variant when primary is type. */
export function stackDisplayType(block: BuildBookBlockInstance): string | null {
  const enriched = enrichedBlockDefinition(block.blockId);
  if (!enriched) return null;

  const content = stackContentSnippet(block);
  if (content) {
    const parts = [enriched.patternLabel];
    if (enriched.brandLabel) parts.push(enriched.brandLabel);
    return parts.join(' · ');
  }

  return navDisplaySubtitle(block.blockId, block.label);
}
