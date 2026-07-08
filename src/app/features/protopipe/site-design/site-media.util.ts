import type { BuildBookBlockInstance, BuildBookPage } from '../build-book/build-book.types';
import { collectBuildBookTemplateCoreImages } from '../build-book/build-book-template-images.util';
import {
  collectImageUrlsFromBlockProps,
  slugFromMediaUrl,
} from './site-media-image-url.util';
import type {
  MediaSlotPickRequest,
  MediaSlotRole,
  SiteMediaAsset,
  SiteMediaLibrary,
} from './site-design.types';

function assetFromUrl(
  url: string,
  label: string,
  source: SiteMediaAsset['source'],
  index: number,
): SiteMediaAsset {
  return {
    id: `${source}-${index}-${slugFromMediaUrl(url)}`,
    url,
    label,
    source,
  };
}

function assetsFromUrlMap(
  urls: Map<string, string>,
  source: SiteMediaAsset['source'],
): SiteMediaAsset[] {
  return Array.from(urls.entries()).map(([url, label], index) =>
    assetFromUrl(url, label, source, index),
  );
}

export function collectPageInUseImages(
  blocks: ReadonlyArray<BuildBookBlockInstance>,
): SiteMediaAsset[] {
  const urls = new Map<string, string>();
  for (const block of blocks) {
    const blockUrls = collectImageUrlsFromBlockProps(
      block.props ?? {},
      block.label ?? block.blockId,
    );
    for (const [url, label] of blockUrls) {
      if (!urls.has(url)) urls.set(url, label);
    }
  }
  return assetsFromUrlMap(urls, 'page');
}

export function collectSiteWideInUseImages(
  pages: ReadonlyArray<BuildBookPage>,
): SiteMediaAsset[] {
  const urls = new Map<string, string>();
  for (const page of pages) {
    for (const block of page.blocks) {
      const blockUrls = collectImageUrlsFromBlockProps(
        block.props ?? {},
        `${page.label}: ${block.label ?? block.blockId}`,
      );
      for (const [url, label] of blockUrls) {
        if (!urls.has(url)) urls.set(url, label);
      }
    }
  }
  return assetsFromUrlMap(urls, 'site');
}

export interface CollectSiteMediaLibraryInput {
  templateId: string | null;
  pages: ReadonlyArray<BuildBookPage>;
  currentPageId: string | null;
  studioAssets?: ReadonlyArray<{
    id: string;
    url: string;
    label?: string | null;
    originalFilename?: string | null;
    source?: string;
  }>;
}

export function collectSiteMediaLibrary(input: CollectSiteMediaLibraryInput): SiteMediaLibrary {
  const currentPage = input.pages.find((page) => page.id === input.currentPageId) ?? null;
  const pageInUse = collectPageInUseImages(currentPage?.blocks ?? []);
  const siteWideInUse = collectSiteWideInUseImages(input.pages);

  const templateStock: SiteMediaAsset[] = collectBuildBookTemplateCoreImages(input.templateId).map(
    (item) => ({
      id: item.id,
      url: item.url,
      label: item.label,
      source: 'template' as const,
    }),
  );

  const uploaded: SiteMediaAsset[] = [];
  const generated: SiteMediaAsset[] = [];
  const seen = new Set<string>();

  for (const asset of input.studioAssets ?? []) {
    if (!asset.url || seen.has(asset.url)) continue;
    seen.add(asset.url);
    const item: SiteMediaAsset = {
      id: asset.id,
      url: asset.url,
      label: asset.label || asset.originalFilename || 'Site image',
      source: asset.source === 'generated' ? 'generated' : 'uploaded',
    };
    if (item.source === 'generated') generated.push(item);
    else uploaded.push(item);
  }

  const allByUrl = new Map<string, SiteMediaAsset>();
  const tiers: SiteMediaAsset[][] = [
    pageInUse,
    siteWideInUse.filter((item) => !pageInUse.some((p) => p.url === item.url)),
    uploaded,
    generated,
    templateStock,
  ];

  for (const tier of tiers) {
    for (const item of tier) {
      if (!allByUrl.has(item.url)) allByUrl.set(item.url, item);
    }
  }

  return {
    all: Array.from(allByUrl.values()),
    pageInUse,
    siteWideInUse,
    uploaded,
    generated,
    templateStock,
  };
}

function inferMediaSlotRole(propPath: string): MediaSlotRole {
  if (propPath === 'backgroundImageSrc' || propPath === 'visualSrc') return 'hero-background';
  if (propPath === 'leftImageSrc' || propPath === 'rightImageSrc') return 'split';
  if (/\.image$/.test(propPath) && /gallery|items|capabilities|services/.test(propPath)) {
    return 'gallery';
  }
  if (propPath === 'imageSrc' || propPath === 'paintingImageSrc') return 'featured';
  return 'generic';
}

function pickFromPool(
  pool: SiteMediaAsset[],
  usedUrls: Set<string>,
): SiteMediaAsset | null {
  for (const asset of pool) {
    if (!usedUrls.has(asset.url)) return asset;
  }
  return null;
}

export function pickMediaForSlot(
  request: MediaSlotPickRequest,
  library: SiteMediaLibrary,
  usedUrls: Set<string>,
): string | null {
  const role = request.role ?? inferMediaSlotRole(request.propPath);
  void role;

  const priorityPools: SiteMediaAsset[][] = [
    library.pageInUse,
    library.siteWideInUse.filter((item) => !library.pageInUse.some((p) => p.url === item.url)),
    library.uploaded,
    library.generated,
    library.templateStock,
  ];

  for (const pool of priorityPools) {
    const picked = pickFromPool(pool, usedUrls);
    if (picked) {
      usedUrls.add(picked.url);
      return picked.url;
    }
  }

  return null;
}

export function mediaSlotRoleForPath(propPath: string): MediaSlotRole {
  return inferMediaSlotRole(propPath);
}
