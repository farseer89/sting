import { describe, expect, it } from 'vitest';
import { variantRegistryEntry } from '../build-book-variant-registry';
import {
  BUILD_BOOK_ALL_TEMPLATE_IDS,
  UNIVERSAL_BASELINE_BLOCK_DEFINITIONS,
  isUniversalBaselineBlockId,
} from '../build-book-universal-block.catalog';
import { findBuildBookBlockDefinition, BUILD_BOOK_BLOCK_DEFINITIONS } from '../build-book-block.catalog';
import {
  baselineRendererBrandFromBlockId,
  isBaselineBlockProps,
  resolveBaselineBlockRenderer,
} from '../build-book-baseline.util';
import { materializeBlockPropsForInsert } from '../../site-design/materialize-block-props.util';
import { resolveSiteDesignContext } from '../../site-design/site-design-context.util';
import type { BuildBookPage } from '../build-book.types';

const STALE_SPARKY_PROPS = { baselineRenderer: 'sparky-site' as const };

function samplePage(): BuildBookPage {
  return { id: 'home', kind: 'homepage', label: 'Home', slug: '/', blocks: [] };
}

describe('baseline block routing', () => {
  it('resolves every catalog block to its own renderer even when props say sparky-site', () => {
    const baselineDefs = BUILD_BOOK_BLOCK_DEFINITIONS.filter(
      (def) =>
        def.id.includes('-baseline-') ||
        isBaselineBlockProps(def.defaultProps),
    );

    expect(baselineDefs.length).toBeGreaterThan(40);

    for (const def of baselineDefs) {
      const expected = resolveBaselineBlockRenderer(def.id, def.defaultProps);
      expect(expected, def.id).toBeTruthy();

      const resolved = resolveBaselineBlockRenderer(def.id, STALE_SPARKY_PROPS);
      expect(resolved, def.id).toBe(expected);

      const brand = baselineRendererBrandFromBlockId(def.id, STALE_SPARKY_PROPS);
      expect(brand, def.id).toBeTruthy();
    }
  });

  it('materializes cross-template blocks with catalog renderer, not site renderer', () => {
    const ctx = resolveSiteDesignContext(
      {
        siteId: 'site-1',
        templateId: 'sparky-electric-trades-v1',
        pageId: 'home',
        pageKind: 'homepage',
        siteDisplayName: 'Sparky Electric',
      },
      [samplePage()],
    );

    const crossTemplateBlocks = [
      'wri-baseline-sidebar-facts',
      'wri-baseline-regulatory-trust',
      'wri-baseline-contract-bar',
      'wilco-baseline-stats-band',
      'veil-baseline-fold-process',
    ];

    for (const blockId of crossTemplateBlocks) {
      const props = materializeBlockPropsForInsert(blockId, ctx);
      expect(props['baselineRenderer'], blockId).toBe(resolveBaselineBlockRenderer(blockId, {}));
    }
  });

  it('registers all universal variants for every template', () => {
    expect(UNIVERSAL_BASELINE_BLOCK_DEFINITIONS.length).toBe(24);

    for (const def of UNIVERSAL_BASELINE_BLOCK_DEFINITIONS) {
      expect(isUniversalBaselineBlockId(def.id)).toBe(true);
      expect(findBuildBookBlockDefinition(def.id)).toBeTruthy();

      const entry = variantRegistryEntry(def.id);
      expect(entry?.patternId, def.id).toBeTruthy();
      expect(entry?.compatibleTemplateIds, def.id).toEqual([...BUILD_BOOK_ALL_TEMPLATE_IDS]);
    }
  });

  it('materializes universal visual process steps with themed placeholder images', () => {
    const ctx = resolveSiteDesignContext(
      {
        siteId: 'site-1',
        templateId: 'wilco-consulting-v1',
        pageId: 'home',
        pageKind: 'homepage',
        siteDisplayName: 'Wilco Consulting',
      },
      [samplePage()],
    );

    const props = materializeBlockPropsForInsert('universal-process-visual', ctx);
    const steps = props['steps'];
    expect(Array.isArray(steps)).toBe(true);
    expect((steps as { image?: string }[]).every((step) => typeof step.image === 'string' && step.image.length > 0)).toBe(
      true,
    );
  });
});
