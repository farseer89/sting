import type { SiteThemeColorOverride } from './site-design.types';

export type SiteThemeHarmonyMode =
  | 'analogous'
  | 'monochromatic'
  | 'complementary'
  | 'triad'
  | 'split-complementary';

export type SiteThemePaletteChipRole =
  | 'background'
  | 'surface'
  | 'ink'
  | 'accent'
  | 'accentSoft';

export interface SiteThemePaletteChip {
  role: SiteThemePaletteChipRole;
  label: string;
  hex: string;
}

export const SITE_THEME_PALETTE_CHIP_LABELS: Record<SiteThemePaletteChipRole, string> = {
  background: 'Background',
  surface: 'Surface',
  ink: 'Ink',
  accent: 'Accent',
  accentSoft: 'Accent soft',
};

export const SITE_THEME_HARMONY_MODES: { id: SiteThemeHarmonyMode; label: string }[] = [
  { id: 'analogous', label: 'Analogous' },
  { id: 'monochromatic', label: 'Monochromatic' },
  { id: 'complementary', label: 'Complementary' },
  { id: 'triad', label: 'Triad' },
  { id: 'split-complementary', label: 'Split' },
];

export function normalizeHexColor(input: string): string | null {
  const hex = input.trim().replace(/^#/, '');
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(hex)) return null;
  if (hex.length === 3) {
    return `#${hex
      .split('')
      .map((char) => char + char)
      .join('')
      .toLowerCase()}`;
  }
  return `#${hex.toLowerCase()}`;
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;

  const r = Number.parseInt(normalized.slice(1, 3), 16) / 255;
  const g = Number.parseInt(normalized.slice(3, 5), 16) / 255;
  const b = Number.parseInt(normalized.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) return { h: 0, s: 0, l: l * 100 };

  const s = delta / (1 - Math.abs(2 * l - 1));

  let h = 0;
  if (max === r) h = ((g - b) / delta) % 6;
  else if (max === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  return { h, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

export function mixHex(colorA: string, colorB: string, weightB: number): string {
  const a = normalizeHexColor(colorA);
  const b = normalizeHexColor(colorB);
  if (!a || !b) return colorA;

  const weight = clamp(weightB, 0, 1);
  const ar = Number.parseInt(a.slice(1, 3), 16);
  const ag = Number.parseInt(a.slice(3, 5), 16);
  const ab = Number.parseInt(a.slice(5, 7), 16);
  const br = Number.parseInt(b.slice(1, 3), 16);
  const bg = Number.parseInt(b.slice(3, 5), 16);
  const bb = Number.parseInt(b.slice(5, 7), 16);

  return rgbToHex(
    ar + (br - ar) * weight,
    ag + (bg - ag) * weight,
    ab + (bb - ab) * weight,
  );
}

export function pickColorFromWheel(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  lightness = 50,
): { hue: number; saturation: number; hex: string } {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const radius = Math.min(rect.width, rect.height) / 2;
  const distance = Math.min(Math.hypot(dx, dy), radius);
  const angle = Math.atan2(dy, dx);
  const hue = ((angle * 180) / Math.PI + 360) % 360;
  const saturation = (distance / radius) * 100;
  const hex = hslToHex(hue, saturation, lightness);
  return { hue, saturation, hex };
}

export function generateHarmonyPalette(
  hue: number,
  saturation: number,
  lightness: number,
  mode: SiteThemeHarmonyMode,
): SiteThemePaletteChip[] {
  const roles: SiteThemePaletteChipRole[] = [
    'background',
    'surface',
    'ink',
    'accent',
    'accentSoft',
  ];
  const specs = harmonySpecs(mode, hue, saturation, lightness);
  return roles.map((role, index) => ({
    role,
    label: SITE_THEME_PALETTE_CHIP_LABELS[role],
    hex: hslToHex(specs[index].h, specs[index].s, specs[index].l),
  }));
}

export function mapPaletteChipsToColorOverride(
  chips: SiteThemePaletteChip[],
): SiteThemeColorOverride {
  const byRole = Object.fromEntries(chips.map((chip) => [chip.role, chip.hex])) as Record<
    SiteThemePaletteChipRole,
    string
  >;

  const background = byRole.background;
  const surface = byRole.surface;
  const ink = byRole.ink;
  const accent = byRole.accent;
  const accentSoft = byRole.accentSoft;

  return {
    background,
    surface,
    ink,
    text: ink,
    muted: mixHex(ink, surface, 0.55),
    accent,
    accentSoft,
    border: mixHex(ink, surface, 0.14),
  };
}

function harmonySpecs(
  mode: SiteThemeHarmonyMode,
  hue: number,
  saturation: number,
  lightness: number,
): { h: number; s: number; l: number }[] {
  const s = clamp(saturation, 18, 92);
  const base = { h: hue, s, l: clamp(lightness, 35, 65) };

  switch (mode) {
    case 'monochromatic':
      return [
        { h: hue, s: s * 0.18, l: 97 },
        { h: hue, s: s * 0.28, l: 91 },
        { h: hue, s: Math.min(s * 1.05, 95), l: 16 },
        { h: hue, s, l: base.l },
        { h: hue, s: s * 0.42, l: 84 },
      ];
    case 'complementary':
      return [
        { h: hue, s: s * 0.2, l: 97 },
        { h: hue, s: s * 0.32, l: 90 },
        { h: hue, s: Math.min(s * 1.05, 95), l: 17 },
        { h: rotateHue(hue, 180), s, l: base.l },
        { h: rotateHue(hue, 180), s: s * 0.45, l: 86 },
      ];
    case 'triad':
      return [
        { h: hue, s: s * 0.2, l: 97 },
        { h: rotateHue(hue, 120), s: s * 0.34, l: 90 },
        { h: hue, s: Math.min(s * 1.05, 95), l: 17 },
        { h: rotateHue(hue, 240), s, l: base.l },
        { h: rotateHue(hue, 120), s: s * 0.42, l: 85 },
      ];
    case 'split-complementary':
      return [
        { h: hue, s: s * 0.2, l: 97 },
        { h: rotateHue(hue, 150), s: s * 0.34, l: 90 },
        { h: hue, s: Math.min(s * 1.05, 95), l: 17 },
        { h: rotateHue(hue, 150), s, l: base.l },
        { h: rotateHue(hue, 210), s: s * 0.45, l: 86 },
      ];
    case 'analogous':
    default:
      return [
        { h: rotateHue(hue, -24), s: s * 0.22, l: 97 },
        { h: rotateHue(hue, -12), s: s * 0.34, l: 91 },
        { h: rotateHue(hue, 12), s: Math.min(s * 1.05, 95), l: 17 },
        { h: hue, s, l: base.l },
        { h: rotateHue(hue, 18), s: s * 0.42, l: 85 },
      ];
  }
}

function rotateHue(hue: number, delta: number): number {
  return ((hue + delta) % 360 + 360) % 360;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function rgbToHex(r: number, g: number, b: number): string {
  const toChannel = (value: number) =>
    Math.round(clamp(value, 0, 255))
      .toString(16)
      .padStart(2, '0');
  return `#${toChannel(r)}${toChannel(g)}${toChannel(b)}`;
}
