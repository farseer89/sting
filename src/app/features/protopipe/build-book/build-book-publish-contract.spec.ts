import { describe, expect, it } from 'vitest';
import { BUILD_BOOK_BASELINE_PAGE_ASSEMBLIES } from './build-book-baseline-assemblies';
import { findBuildBookBlockDefinition } from './build-book-block.catalog';
import { UNIVERSAL_BASELINE_BLOCK_DEFINITIONS } from './build-book-universal-block.catalog';
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
});
