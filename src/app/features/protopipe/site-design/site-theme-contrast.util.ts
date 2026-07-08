const LIGHT_TEXT = '#ffffff';
const DARK_TEXT = '#171a20';

function parseHexColor(input: string): { r: number; g: number; b: number } | null {
  const hex = input.trim().replace(/^#/, '');
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(hex)) return null;

  const normalized =
    hex.length === 3
      ? hex
          .split('')
          .map((char) => char + char)
          .join('')
      : hex;

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function channel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance (WCAG 2.x). */
export function relativeLuminance(color: string): number | null {
  const rgb = parseHexColor(color);
  if (!rgb) return null;

  const r = channel(rgb.r);
  const g = channel(rgb.g);
  const b = channel(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Pick light or dark readable text for a solid background color. */
export function contrastTextOn(
  background: string,
  lightText = LIGHT_TEXT,
  darkText = DARK_TEXT,
): string {
  const luminance = relativeLuminance(background);
  if (luminance == null) return lightText;
  return luminance > 0.179 ? darkText : lightText;
}
