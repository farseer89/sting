import { findBuildBookBlockDefinition } from './build-book-block.catalog';
import type { BuildBookBlockInstance, BuildBookPage } from './build-book.types';
import { isHilBaselineBlockId } from './build-book-baseline.util';

const HIL_ARRAY_KEYS = ['services', 'images', 'items'] as const;
const HIL_OBJECT_KEYS = ['before', 'after'] as const;

export function mergeHilBlockProps(
  blockId: string,
  props: Record<string, unknown>,
): Record<string, unknown> {
  const def = findBuildBookBlockDefinition(blockId);
  if (!def) return props;

  const defaults = structuredClone(def.defaultProps);
  const next: Record<string, unknown> = { ...defaults, ...structuredClone(props) };

  for (const key of HIL_ARRAY_KEYS) {
    if (!Array.isArray(next[key]) && Array.isArray(defaults[key])) {
      next[key] = defaults[key];
    }
  }

  for (const key of HIL_OBJECT_KEYS) {
    if ((!next[key] || typeof next[key] !== 'object') && defaults[key]) {
      next[key] = defaults[key];
    }
  }

  if (typeof next['backgroundImageSrc'] !== 'string' && typeof defaults['backgroundImageSrc'] === 'string') {
    next['backgroundImageSrc'] = defaults['backgroundImageSrc'];
  }

  return next;
}

export function enrichHilBlockInstance(block: BuildBookBlockInstance): BuildBookBlockInstance {
  if (!isHilBaselineBlockId(block.blockId)) return block;
  return {
    ...block,
    props: mergeHilBlockProps(block.blockId, block.props),
  };
}

export function enrichHilPages(pages: BuildBookPage[]): BuildBookPage[] {
  return pages.map((page) => ({
    ...page,
    blocks: page.blocks.map((block) => enrichHilBlockInstance(block)),
  }));
}
