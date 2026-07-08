import type { ShirePublishSitePagePublished } from '@hive/contracts';
import { findBuildBookBlockDefinition } from './build-book-block.catalog';
import type { BuildBookBlockInstance, BuildBookPage } from './build-book.types';

const EDITOR_ONLY_PROP_KEYS = new Set([
  'baselineRenderer',
  'baselinePreviewUrl',
  'labUnit',
  'labBrand',
  'labCatalog',
  'labLayout',
]);

export function stripEditorOnlyProps(props: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!EDITOR_ONLY_PROP_KEYS.has(key)) {
      next[key] = value;
    }
  }
  return next;
}

export interface CompileBuildBookHomepageInput {
  homepage: BuildBookPage;
  sourceTemplateId?: string;
  theme?: string;
  siteTheme?: Record<string, unknown> | null;
}

export function compileBuildBookHomepage(
  input: CompileBuildBookHomepageInput,
): ShirePublishSitePagePublished {
  const sections = [...input.homepage.blocks]
    .sort((a, b) => a.order - b.order)
    .map((block) => compileBlockSection(block));

  return {
    pages: [
      {
        id: input.homepage.id || 'home',
        label: input.homepage.label || 'Home',
        sections,
      },
    ],
    siteTheme: input.siteTheme ?? undefined,
    sourceTemplateId: input.sourceTemplateId,
    theme: input.theme,
    updatedAt: new Date().toISOString(),
  };
}

function compileBlockSection(block: BuildBookBlockInstance): ShirePublishSitePagePublished['pages'][0]['sections'][0] {
  const definition = findBuildBookBlockDefinition(block.blockId);
  const section: ShirePublishSitePagePublished['pages'][0]['sections'][0] = {
    componentId: block.componentId,
    props: stripEditorOnlyProps(structuredClone(block.props)),
  };
  if (definition?.astroComponent) {
    section.astroComponent = definition.astroComponent;
  }
  return section;
}
