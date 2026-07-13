import type { SiteThemeTokens } from './site-design.types';

/** Palette-themed SVG placeholder when the site media library is empty. */
export function themedPlaceholderImageUrl(theme: SiteThemeTokens, label = 'Photo'): string {
  const bg = theme.color.background.replace('#', '%23');
  const accent = theme.color.accent.replace('#', '%23');
  const ink = theme.color.ink.replace('#', '%23');
  const muted = theme.color.muted.replace('#', '%23');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${bg}"/>
          <stop offset="0.55" stop-color="${accent}" stop-opacity="0.35"/>
          <stop offset="1" stop-color="${ink}" stop-opacity="0.12"/>
        </linearGradient>
      </defs>
      <rect width="1600" height="1000" fill="url(%23g)"/>
      <rect x="620" y="420" width="360" height="160" rx="24" fill="${accent}" fill-opacity="0.18"/>
      <text x="800" y="510" text-anchor="middle" font-family="system-ui,sans-serif" font-size="42" font-weight="700" fill="${ink}">${label}</text>
      <text x="800" y="560" text-anchor="middle" font-family="system-ui,sans-serif" font-size="24" fill="${muted}">Add photos in Media Library</text>
    </svg>
  `.trim();
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function themedPatternThumbStyle(theme: SiteThemeTokens): Record<string, string> {
  return {
    '--bk-thumb-accent': theme.color.accent,
    '--bk-thumb-surface': theme.color.surface,
    '--bk-thumb-ink': theme.color.ink,
  };
}
