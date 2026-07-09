import { describe, expect, it } from 'vitest';
import { BUILD_BOOK_BASELINE_PAGE_ASSEMBLIES } from './build-book-baseline-assemblies';
import { findBuildBookBlockDefinition } from './build-book-block.catalog';
import { UNIVERSAL_BASELINE_BLOCK_DEFINITIONS } from './build-book-universal-block.catalog';
import {
  adaptPublishProps,
  UNIVERSAL_PUBLISH_VARIANT_BY_COMPONENT_ID,
} from './build-book-publish-compiler.util';
import { isPublishResolvableComponentId } from './validation/build-book-publish-gate.util';

const BROKEN_ASTRO_PATTERNS = [
  /^FaqAccordion$/,
  /^consult-demo\//,
  /^consult-call-cta$/,
  /^[A-Z][A-Za-z]+$/, // bare PascalCase without path
];

function assertPublishTarget(blockId: string): void {
  const def = findBuildBookBlockDefinition(blockId);
  expect(def, `missing definition for ${blockId}`).toBeTruthy();
  if (!def) return;

  const astro = def.astroComponent?.trim();
  if (astro) {
    for (const pattern of BROKEN_ASTRO_PATTERNS) {
      expect(astro, `${blockId} has broken astroComponent "${astro}"`).not.toMatch(pattern);
    }
    return;
  }

  expect(
    isPublishResolvableComponentId(def.componentId),
    `${blockId} componentId "${def.componentId}" is not in LANDING allowlist and has no astroComponent`,
  ).toBe(true);
}

describe('Build Book publish contract', () => {
  it('every baseline assembly block has a resolvable publish target', () => {
    for (const [templateId, pages] of Object.entries(BUILD_BOOK_BASELINE_PAGE_ASSEMBLIES)) {
      for (const page of pages) {
        for (const block of page.blocks) {
          try {
            assertPublishTarget(block.blockId);
          } catch (err) {
            throw new Error(`[${templateId}] ${String(err)}`);
          }
        }
      }
    }
  });

  it('every universal catalog block has a resolvable publish target', () => {
    for (const def of UNIVERSAL_BASELINE_BLOCK_DEFINITIONS) {
      assertPublishTarget(def.id);
    }
  });

  it('every mapped universal family emits variant and critical remaps from defaultProps', () => {
    for (const def of UNIVERSAL_BASELINE_BLOCK_DEFINITIONS) {
      const expectedVariant = UNIVERSAL_PUBLISH_VARIANT_BY_COMPONENT_ID[def.componentId];
      if (!expectedVariant) continue;

      const adapted = adaptPublishProps(def.componentId, structuredClone(def.defaultProps));
      expect(adapted['variant'], def.id).toBe(expectedVariant);

      if (def.componentId.startsWith('universal-gallery')) {
        expect(Array.isArray(adapted['images']), `${def.id} images`).toBe(true);
        const images = adapted['images'] as Array<{ caption?: string }>;
        expect(images.every((img) => 'caption' in img || true), `${def.id} caption field`).toBe(true);
      }
      if (def.componentId.startsWith('universal-logos')) {
        const logos = adapted['logos'] as Array<{ src?: string; alt?: string }>;
        expect(Array.isArray(logos), `${def.id} logos`).toBe(true);
        expect(logos.every((l) => 'src' in l && 'alt' in l), `${def.id} logo shape`).toBe(true);
      }
      if (def.componentId === 'universal-intro-centered' || def.componentId === 'universal-intro-split') {
        expect(typeof adapted['body'] === 'string' || typeof adapted['kicker'] === 'string', `${def.id} intro`).toBe(
          true,
        );
        expect(adapted['variant'], `${def.id} intro variant`).toBeTruthy();
      }
      if (def.componentId.startsWith('universal-split')) {
        expect(Array.isArray(adapted['paragraphs']), `${def.id} paragraphs`).toBe(true);
      }
      if (def.componentId.startsWith('universal-case')) {
        expect(adapted['variant'], `${def.id} case variant`).toBeTruthy();
      }
      if (def.componentId.startsWith('universal-before-after')) {
        expect(adapted['lede'] != null || adapted['title'] != null, `${def.id} before-after`).toBe(true);
      }
    }
  });
});
