import { describe, expect, it } from 'vitest';
import {
  generateHarmonyPalette,
  hexToHsl,
  hslToHex,
  mapPaletteChipsToColorOverride,
  normalizeHexColor,
  pickColorFromWheel,
} from './site-theme-palette.util';

describe('site-theme-palette', () => {
  it('normalizes short and long hex colors', () => {
    expect(normalizeHexColor('#abc')).toBe('#aabbcc');
    expect(normalizeHexColor('112233')).toBe('#112233');
  });

  it('round-trips hsl conversion', () => {
    const hsl = hexToHsl('#0e7490');
    expect(hsl).not.toBeNull();
    expect(hslToHex(hsl!.h, hsl!.s, hsl!.l).toLowerCase()).toBe('#0e7490');
  });

  it('generates five palette chips for each harmony mode', () => {
    for (const mode of [
      'analogous',
      'monochromatic',
      'complementary',
      'triad',
      'split-complementary',
    ] as const) {
      const chips = generateHarmonyPalette(200, 70, 48, mode);
      expect(chips).toHaveLength(5);
      expect(chips.map((chip) => chip.role)).toEqual([
        'background',
        'surface',
        'ink',
        'accent',
        'accentSoft',
      ]);
    }
  });

  it('maps palette chips to site theme color override', () => {
    const chips = generateHarmonyPalette(24, 68, 50, 'analogous');
    const override = mapPaletteChipsToColorOverride(chips);
    expect(override.background).toBe(chips[0].hex);
    expect(override.ink).toBe(chips[2].hex);
    expect(override.text).toBe(override.ink);
    expect(override.muted).toMatch(/^#/);
    expect(override.border).toMatch(/^#/);
  });

  it('derives hue and saturation from wheel coordinates', () => {
    const rect = {
      left: 0,
      top: 0,
      width: 200,
      height: 200,
      right: 200,
      bottom: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;

    const pick = pickColorFromWheel(200, 100, rect, 50);
    expect(pick.hue).toBeGreaterThanOrEqual(0);
    expect(pick.hue).toBeLessThan(360);
    expect(pick.saturation).toBeGreaterThan(0);
    expect(pick.hex).toMatch(/^#[0-9a-f]{6}$/);
  });
});
