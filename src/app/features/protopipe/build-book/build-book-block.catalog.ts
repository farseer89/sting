import {
  BUILD_BOOK_OPTIONS,
  BUILD_BOOK_SECTION_ORDER,
  type BuildBookSection,
} from './build-book.constants';
import { WRI_BASELINE_BLOCK_DEFINITIONS } from './build-book-baseline-block.catalog';
import { BUILD_BOOK_COMPONENT_DEFAULTS } from './build-book.defaults';
import type { BuildBookBlockDefinition, BuildBookOption } from './build-book.types';

const SECTION_ROLES: Record<BuildBookSection, { seoRole: string; conversionRole: string }> = {
  hero: {
    seoRole: 'Clarifies primary service, market, and topical relevance above the fold.',
    conversionRole: 'Creates the first CTA path and sets trust expectations.',
  },
  fold: {
    seoRole: 'Adds crawlable proof, credentials, and service context near the top of the page.',
    conversionRole: 'Reduces anxiety before visitors compare service options.',
  },
  services: {
    seoRole: 'Exposes service entities and internal page targets for local search coverage.',
    conversionRole: 'Helps visitors self-select the offer that matches their need.',
  },
  proof: {
    seoRole: 'Supports authority with reviews, outcomes, testimonials, or proof points.',
    conversionRole: 'Builds confidence before the final inquiry decision.',
  },
  areas: {
    seoRole: 'Adds local coverage, process, and FAQ language for long-tail search intent.',
    conversionRole: 'Answers logistics questions that otherwise delay contact.',
  },
  close: {
    seoRole: 'Connects the page topic to a clear contact destination and final action.',
    conversionRole: 'Captures the lead with a focused CTA or form.',
  },
};

function sourceTemplateId(option: BuildBookOption): string | undefined {
  if (option.id.startsWith('sp-')) return 'sparky-electric-trades-v1';
  if (option.id.startsWith('wri-')) return 'wri-field-authority-v1';
  if (option.id.startsWith('co-')) return 'wilco-consulting-v1';
  return undefined;
}

function toBlockDefinition(section: BuildBookSection, option: BuildBookOption): BuildBookBlockDefinition {
  const defaults = BUILD_BOOK_COMPONENT_DEFAULTS[option.componentId];
  const roles = SECTION_ROLES[section];
  return {
    id: option.id,
    section,
    label: option.label,
    description: option.desc,
    sourceTemplateId: sourceTemplateId(option),
    componentId: option.componentId,
    astroComponent: option.demo?.astroUnit,
    layout: option.layout,
    editableFields: [...(defaults?.editableFields ?? [])],
    defaultProps: structuredClone(defaults?.defaultProps ?? {}),
    seoRole: roles.seoRole,
    conversionRole: roles.conversionRole,
    previewPath: option.previewPath,
    previewImage: option.previewImage,
    demo: option.demo,
  };
}

export const BUILD_BOOK_BLOCK_DEFINITIONS: BuildBookBlockDefinition[] = BUILD_BOOK_SECTION_ORDER.flatMap(
  (section) => BUILD_BOOK_OPTIONS[section].map((option) => toBlockDefinition(section, option)),
).concat(WRI_BASELINE_BLOCK_DEFINITIONS);

export function findBuildBookBlockDefinition(blockId: string): BuildBookBlockDefinition | undefined {
  return BUILD_BOOK_BLOCK_DEFINITIONS.find((block) => block.id === blockId);
}

export function findBuildBookBlockDefinitionForSection(
  section: BuildBookSection,
  blockId: string,
): BuildBookBlockDefinition | undefined {
  return BUILD_BOOK_OPTIONS[section].some((option) => option.id === blockId)
    ? findBuildBookBlockDefinition(blockId)
    : undefined;
}
