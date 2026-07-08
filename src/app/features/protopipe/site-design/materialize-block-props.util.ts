import { findBuildBookBlockDefinition } from '../build-book/build-book-block.catalog';
import { baselineRendererFromProps } from '../build-book/build-book-baseline.util';
import { resolveMediaSlotsForBlock } from '../build-book/build-book-media-slots.util';
import { readProp } from '../build-book/fields/build-field.util';
import { patchProp } from '../build-book/fields/build-field.util';
import { looksLikeSiteMediaUrl } from './site-media-image-url.util';
import {
  mediaSlotRoleForPath,
  pickMediaForSlot,
} from './site-media.util';
import { themedPlaceholderImageUrl } from './site-design-placeholder.util';
import type {
  MaterializeBlockPropsOptions,
  SiteDesignContext,
} from './site-design.types';

const LAB_BRAND_BY_RENDERER: Record<string, string> = {
  'sparky-site': 'sparky',
  'wri-site': 'wri',
  'wilco-site': 'consult',
  'veil-site': 'veil',
  'hil-site': 'wri',
};

function isTemplateStockUrl(url: string, ctx: SiteDesignContext): boolean {
  return ctx.media.templateStock.some((item) => item.url === url);
}

function stripTemplateStockImages(props: Record<string, unknown>, ctx: SiteDesignContext): void {
  for (const slot of Object.keys(props)) {
    const value = props[slot];
    if (typeof value === 'string' && isTemplateStockUrl(value, ctx)) {
      delete props[slot];
    }
  }
}

function normalizeRendererProps(
  props: Record<string, unknown>,
  ctx: SiteDesignContext,
  blockDef: ReturnType<typeof findBuildBookBlockDefinition>,
): void {
  const catalogRenderer = blockDef ? baselineRendererFromProps(blockDef.defaultProps) : null;
  const renderer = catalogRenderer ?? ctx.baselineRenderer;
  if (!renderer) return;
  props['baselineRenderer'] = renderer;
  const labBrand = LAB_BRAND_BY_RENDERER[renderer];
  if (labBrand) props['labBrand'] = labBrand;
}

function applyExampleCopy(props: Record<string, unknown>, ctx: SiteDesignContext): void {
  const { voice } = ctx;
  if ('eyebrow' in props) props['eyebrow'] = voice.exampleEyebrow;
  if ('primaryCtaLabel' in props) props['primaryCtaLabel'] = voice.primaryCtaLabel;
  if ('secondaryCtaLabel' in props) props['secondaryCtaLabel'] = voice.secondaryCtaLabel;
}

function assignMediaSlots(
  props: Record<string, unknown>,
  blockId: string,
  ctx: SiteDesignContext,
  usedUrls: Set<string>,
): void {
  const slots = resolveMediaSlotsForBlock(blockId, props);
  const placeholder = themedPlaceholderImageUrl(ctx.theme, 'Preview');

  for (const slot of slots) {
    const current = readProp(props, slot.propPath);
    if (typeof current === 'string' && looksLikeSiteMediaUrl(current) && !isTemplateStockUrl(current, ctx)) {
      usedUrls.add(current);
      continue;
    }

    const picked =
      pickMediaForSlot(
        { propPath: slot.propPath, role: mediaSlotRoleForPath(slot.propPath) },
        ctx.media,
        usedUrls,
      ) ?? placeholder;

    const updated = patchProp(props, slot.propPath, picked);
    Object.assign(props, updated);
  }
}

export function materializeBlockProps(
  blockId: string,
  ctx: SiteDesignContext,
  options: MaterializeBlockPropsOptions = {},
): Record<string, unknown> {
  const def = findBuildBookBlockDefinition(blockId);
  if (!def) return {};

  const props = structuredClone(def.defaultProps);
  stripTemplateStockImages(props, ctx);
  normalizeRendererProps(props, ctx, def);
  applyExampleCopy(props, ctx);

  const usedUrls = new Set<string>(options.usedUrls ?? []);
  assignMediaSlots(props, blockId, ctx, usedUrls);

  if (options.preserveCopy) {
    for (const [key, value] of Object.entries(options.preserveCopy)) {
      if (value != null && value !== '') props[key] = value;
    }
  }

  return props;
}

/** Stable materialization for ghost preview and commit — same inputs produce same props. */
export function materializeBlockPropsForInsert(
  blockId: string,
  ctx: SiteDesignContext,
): Record<string, unknown> {
  return materializeBlockProps(blockId, ctx);
}
