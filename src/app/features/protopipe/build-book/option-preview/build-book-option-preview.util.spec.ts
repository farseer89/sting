import { describe, expect, it } from 'vitest';
import { BASELINE_APPROVED_HERO_LIBRARY } from '../build-book-baseline-hero.catalog';
import { readHeroImageUrl } from '../build-hero-block.util';
import { resolveOptionPreviewTarget } from './build-book-option-preview.util';
import type { SiteDesignContext } from '../../site-design/public';

function fakeDesignContext(): SiteDesignContext {
  return {
    theme: {
      id: 'ocean',
      label: 'Ocean',
      tokens: {},
    } as SiteDesignContext['theme'],
    voice: {
      exampleEyebrow: 'Test Co',
      primaryCtaLabel: 'Call',
      secondaryCtaLabel: 'Learn more',
    } as SiteDesignContext['voice'],
    media: {
      templateStock: [
        { url: 'https://example.com/stock-a.jpg', label: 'a' },
        { url: 'https://example.com/stock-b.jpg', label: 'b' },
      ],
      generated: [{ url: 'https://example.com/shared-site-media.jpg', label: 'shared' }],
      uploaded: [],
    },
    baselineRenderer: 'wri-site',
  } as SiteDesignContext;
}

describe('resolveOptionPreviewTarget hero rail images', () => {
  it('keeps distinct catalog images per approved hero even with designContext', () => {
    const ctx = fakeDesignContext();
    const urls = BASELINE_APPROVED_HERO_LIBRARY.map((option) => {
      const target = resolveOptionPreviewTarget(option, 'hero', ctx);
      return readHeroImageUrl(target.props, option.id) ?? target.heroImageUrl ?? null;
    });

    expect(urls.every((url) => typeof url === 'string' && url.length > 0)).toBe(true);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.every((url) => url !== 'https://example.com/shared-site-media.jpg')).toBe(true);
  });

  it('overlays live canvas image only on the selected card', () => {
    const option = BASELINE_APPROVED_HERO_LIBRARY[0]!;
    const live = 'https://example.com/live-hero.jpg';

    const selected = resolveOptionPreviewTarget(option, 'hero', null, {
      selected: true,
      liveHeroImageUrl: live,
    });
    const unselected = resolveOptionPreviewTarget(option, 'hero', null, {
      selected: false,
      liveHeroImageUrl: live,
    });

    expect(readHeroImageUrl(selected.props, option.id)).toBe(live);
    expect(readHeroImageUrl(unselected.props, option.id)).not.toBe(live);
  });
});
