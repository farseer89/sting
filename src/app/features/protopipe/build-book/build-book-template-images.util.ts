import { findBuildBookBaselineAssembly } from './build-book-baseline-assemblies';
import { VEIL_HERO_LAB_DEFAULTS } from './build-book-veil-hero.catalog';
import {
  collectImageUrlsFromValue,
  slugFromMediaUrl,
} from '../site-design/site-media-image-url.util';

export interface BuildBookTemplateImageAsset {
  id: string;
  url: string;
  label: string;
  source: 'template';
}

/** Stock images bundled with the selected template baseline — shown in the media library. */
export function collectBuildBookTemplateCoreImages(
  templateId: string | null | undefined,
): BuildBookTemplateImageAsset[] {
  if (!templateId) return [];

  const urls = new Map<string, string>();
  const pages = findBuildBookBaselineAssembly(templateId);

  if (pages) {
    for (const page of pages) {
      for (const block of page.blocks) {
        collectImageUrlsFromValue(block.props, urls, block.label ?? block.blockId);
      }
    }
  }

  if (templateId === 'veil-live-painter-v1') {
    for (const [layoutId, props] of Object.entries(VEIL_HERO_LAB_DEFAULTS)) {
      const label = layoutId.replace(/^veil-/, '').replace(/-/g, ' ');
      collectImageUrlsFromValue(props, urls, label);
    }
  }

  return Array.from(urls.entries()).map(([url, label], index) => ({
    id: `template-${index}-${slugFromMediaUrl(url)}`,
    url,
    label,
    source: 'template' as const,
  }));
}
