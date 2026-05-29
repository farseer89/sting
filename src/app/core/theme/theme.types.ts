/**
 * Theme catalog mirrored from PRIME_BLOCKS' alpha-layout palette menu.
 *
 * PRIME_BLOCKS uses the legacy CSS-file theme system (`lara-light-teal/theme.css`).
 * Sting/Protopipe runs the modern `@primeuix/themes` runtime system, so each
 * legacy id is bridged to a `(preset, scheme, primary)` tuple that produces an
 * equivalent look via `usePreset` + `updatePrimaryPalette`.
 *
 * See: `/Users/miked/SoftwareDevelopment/Mothership/PRIME_BLOCKS/src/app/mycomponents/alpha/alpha-layout/alpha-layout.component.ts`
 */

import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import Lara from '@primeuix/themes/lara';
import Material from '@primeuix/themes/material';
import Nora from '@primeuix/themes/nora';

/** Shape accepted by `definePreset` — re-derived to keep the types honest. */
export type PresetBase = Parameters<typeof definePreset>[0];

export type ColorScheme = 'light' | 'dark';
export type PresetBaseId = 'aura' | 'lara' | 'material' | 'nora';

export interface ThemeMeta {
  /** Legacy id from PRIME_BLOCKS — kept stable for localStorage compatibility. */
  id: string;
  /** Branded label shown in the menu (e.g. "Turtle Shell"). */
  label: string;
  /** PrimeIcons class for the menu item — sun / moon / palette. */
  icon: string;
  preset: PresetBaseId;
  scheme: ColorScheme;
  /** Primitive color name (`teal`, `indigo`, `blue`, …). */
  primary: string;
}

export interface ThemeGroup {
  label: string;
  themes: readonly ThemeMeta[];
}

/**
 * Preset base modules, indexed by id.
 * Surface-aware lookup happens at apply time inside `ThemeService`.
 */
export const PRESET_BASES: Readonly<Record<PresetBaseId, PresetBase>> = Object.freeze({
  aura: Aura as PresetBase,
  lara: Lara as PresetBase,
  material: Material as PresetBase,
  nora: Nora as PresetBase,
});

/** Palette shades reused when materializing primary colors. */
export const PALETTE_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

/**
 * Custom primary palettes that don't exist in @primeuix/themes' built-in
 * primitives. The `ThemeService.buildPalette()` consults this map first;
 * if a name isn't here it falls back to a `{name.shade}` token reference
 * (which resolves against PrimeUIX's built-in palettes like `teal`, `indigo`).
 */
export const CUSTOM_PALETTES: Readonly<Record<string, Readonly<Record<string, string>>>> = Object.freeze({
  ocean: Object.freeze({
    50: '#effbfb',
    100: '#cef3f4',
    200: '#a4e8ea',
    300: '#6cd1d4',
    400: '#34b3b8',
    500: '#0a9396',
    600: '#0a7e80',
    700: '#0d6a6c',
    800: '#0f5557',
    900: '#114447',
    950: '#072a2c',
  }),
});

/**
 * The 14 themes from `alpha-layout.themeMenuItems`, faithfully preserving:
 *  - the legacy id (so persisted choices roundtrip)
 *  - the branded label
 *  - the sun/moon/palette icon
 *  - the visual grouping (separator rows)
 *
 * Legacy bridge notes:
 *  - `bootstrap4-*` → Nora preset (the closest modern equivalent in @primeuix/themes)
 *  - `fluent-light` → Nora light (Fluent has no modern preset; Nora is sharper/flatter)
 *  - `saga-blue` / `vela-blue` / `arya-blue` → Aura family (saga was Aura's predecessor)
 *  - `md-*-indigo` → Material preset
 *  - `lara-*-*` → Lara preset (1:1)
 */
export const THEME_GROUPS: readonly ThemeGroup[] = [
  {
    label: 'Protopipe',
    themes: [
      {
        id: 'protopipe-ocean',
        label: 'Protopipe Ocean',
        icon: 'pi pi-palette',
        preset: 'lara',
        scheme: 'light',
        primary: 'ocean',
      },
    ],
  },
  {
    label: 'Lara — Light',
    themes: [
      { id: 'lara-light-indigo', label: 'Violet Light', icon: 'pi pi-sun', preset: 'lara', scheme: 'light', primary: 'indigo' },
      { id: 'lara-light-teal', label: 'Turtle Shell', icon: 'pi pi-sun', preset: 'lara', scheme: 'light', primary: 'teal' },
      { id: 'lara-light-blue', label: 'Lara Light Blue', icon: 'pi pi-sun', preset: 'lara', scheme: 'light', primary: 'blue' },
    ],
  },
  {
    label: 'Lara — Dark',
    themes: [
      { id: 'lara-dark-indigo', label: 'Violet Dark', icon: 'pi pi-moon', preset: 'lara', scheme: 'dark', primary: 'indigo' },
      { id: 'lara-dark-teal', label: 'Daquiri', icon: 'pi pi-moon', preset: 'lara', scheme: 'dark', primary: 'teal' },
      { id: 'lara-dark-blue', label: 'Deep Sea', icon: 'pi pi-moon', preset: 'lara', scheme: 'dark', primary: 'blue' },
    ],
  },
  {
    label: 'Bootstrap',
    themes: [
      { id: 'bootstrap4-light-blue', label: 'Bright Blue', icon: 'pi pi-sun', preset: 'nora', scheme: 'light', primary: 'blue' },
      { id: 'bootstrap4-dark-blue', label: 'Dark Coral', icon: 'pi pi-moon', preset: 'nora', scheme: 'dark', primary: 'blue' },
    ],
  },
  {
    label: 'Material',
    themes: [
      { id: 'md-light-indigo', label: 'Indigo Light', icon: 'pi pi-sun', preset: 'material', scheme: 'light', primary: 'indigo' },
      { id: 'md-dark-indigo', label: 'Night Swim', icon: 'pi pi-moon', preset: 'material', scheme: 'dark', primary: 'indigo' },
    ],
  },
  {
    label: 'Classic / Saga',
    themes: [
      { id: 'fluent-light', label: 'Homebreak', icon: 'pi pi-sun', preset: 'nora', scheme: 'light', primary: 'blue' },
      { id: 'saga-blue', label: 'Marlin', icon: 'pi pi-palette', preset: 'aura', scheme: 'light', primary: 'blue' },
      { id: 'vela-blue', label: 'Vela Blue', icon: 'pi pi-palette', preset: 'aura', scheme: 'dark', primary: 'blue' },
      { id: 'arya-blue', label: 'Night Light', icon: 'pi pi-moon', preset: 'aura', scheme: 'dark', primary: 'blue' },
    ],
  },
];

/** Flat list of all themes — useful for lookups. */
export const THEMES: readonly ThemeMeta[] = THEME_GROUPS.flatMap((g) => g.themes);

/** Default brands Protopipe with the deep ocean teal (#0a9396) used in
 *  the onboarding mockups and across product surfaces. */
export const DEFAULT_THEME_ID = 'protopipe-ocean';

/** localStorage key — bumped to v2 so persisted Lara/Indigo/etc. choices
 *  from before the Protopipe Ocean default reset and pick up the new brand. */
export const STORAGE_KEY = 'sting.theme.v2';

export function findTheme(id: string): ThemeMeta {
  return THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME_ID)!;
}
