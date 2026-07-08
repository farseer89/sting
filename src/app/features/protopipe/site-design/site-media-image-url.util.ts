export const SITE_MEDIA_IMAGE_URL_KEYS = new Set([
  'backgroundImageSrc',
  'paintingImageSrc',
  'imageSrc',
  'visualSrc',
  'textureImageSrc',
  'leftImageSrc',
  'rightImageSrc',
  'insetImageSrc',
  'previewImage',
  'image',
  'photoSrc',
  'src',
]);

const SITE_MEDIA_IMAGE_ITEM_KEYS = ['image', 'photoSrc', 'src', 'backgroundImageSrc'];

export function looksLikeSiteMediaUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('data:')) return false;
  return (
    /^https?:\/\//.test(trimmed) || /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(trimmed)
  );
}

export function slugFromMediaUrl(url: string): string {
  const tail = url.split('/').pop() ?? 'image';
  return tail.replace(/\?.*$/, '').replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
}

export function collectImageUrlsFromValue(
  value: unknown,
  urls: Map<string, string>,
  label: string,
): void {
  if (typeof value === 'string') {
    if (looksLikeSiteMediaUrl(value) && !urls.has(value)) {
      urls.set(value, label);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (typeof item === 'string') {
        if (looksLikeSiteMediaUrl(item) && !urls.has(item)) {
          urls.set(item, `${label} ${index + 1}`);
        }
        return;
      }
      if (!item || typeof item !== 'object') return;
      for (const key of SITE_MEDIA_IMAGE_ITEM_KEYS) {
        const nested = (item as Record<string, unknown>)[key];
        if (typeof nested === 'string' && looksLikeSiteMediaUrl(nested) && !urls.has(nested)) {
          urls.set(nested, `${label} ${index + 1}`);
        }
      }
    });
    return;
  }

  if (!value || typeof value !== 'object') return;

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (SITE_MEDIA_IMAGE_URL_KEYS.has(key) && typeof nested === 'string') {
      if (looksLikeSiteMediaUrl(nested) && !urls.has(nested)) {
        urls.set(nested, label || key);
      }
      continue;
    }
    if (Array.isArray(nested) || (nested && typeof nested === 'object')) {
      collectImageUrlsFromValue(nested, urls, label);
    }
  }
}

export function collectImageUrlsFromBlockProps(
  props: Record<string, unknown>,
  label: string,
): Map<string, string> {
  const urls = new Map<string, string>();
  collectImageUrlsFromValue(props, urls, label);
  return urls;
}
