import { Injectable, computed, effect, signal } from '@angular/core';
import { definePreset, usePreset } from '@primeuix/themes';
import {
  CUSTOM_PALETTES,
  DEFAULT_THEME_ID,
  PALETTE_SHADES,
  PRESET_BASES,
  STORAGE_KEY,
  THEMES,
  type ThemeMeta,
  findTheme,
} from './theme.types';

const DARK_CLASS = 'app-dark';

/** Root font-size (px) drives rem-based scaling of the whole UI. */
export const DEFAULT_ROOT_FONT_PX = 14;
export const MIN_ROOT_FONT_PX = 11;
export const MAX_ROOT_FONT_PX = 18;
const SCALE_STORAGE_KEY = 'sting.scale.v1';

/**
 * Owns the active theme and exposes a tiny imperative API.
 *
 * - `themeId` signal — current legacy id (e.g. `lara-light-teal`)
 * - `current` computed — resolved `ThemeMeta`
 * - `setTheme(id)` — apply + persist
 * - `configuratorOpen` signal — used by the topbar palette button menu
 *
 * Theme is applied via an internal effect that runs whenever `themeId`
 * changes, so callers never invoke the @primeuix runtime directly.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly themeId = signal<string>(loadPersistedId() ?? DEFAULT_THEME_ID);
  readonly current = computed<ThemeMeta>(() => findTheme(this.themeId()));
  readonly configuratorOpen = signal(false);

  /** Root font-size in px — scales the entire UI via rem-based sizing. */
  readonly rootFontPx = signal<number>(loadPersistedScale() ?? DEFAULT_ROOT_FONT_PX);

  constructor() {
    effect(() => {
      const theme = this.current();
      this.applyTheme(theme);
      try {
        localStorage.setItem(STORAGE_KEY, theme.id);
      } catch {
        /* storage unavailable — fail silently */
      }
    });

    effect(() => {
      const px = this.rootFontPx();
      if (typeof document !== 'undefined') {
        document.documentElement.style.fontSize = `${px}px`;
      }
      try {
        localStorage.setItem(SCALE_STORAGE_KEY, String(px));
      } catch {
        /* storage unavailable — fail silently */
      }
    });
  }

  setTheme(id: string): void {
    if (!THEMES.some((t) => t.id === id)) return;
    this.themeId.set(id);
  }

  /** Set the root font size (px), clamped to the supported range. */
  setRootFontPx(px: number): void {
    const clamped = Math.min(MAX_ROOT_FONT_PX, Math.max(MIN_ROOT_FONT_PX, Math.round(px)));
    this.rootFontPx.set(clamped);
  }

  increaseScale(): void {
    this.setRootFontPx(this.rootFontPx() + 1);
  }

  decreaseScale(): void {
    this.setRootFontPx(this.rootFontPx() - 1);
  }

  resetScale(): void {
    this.setRootFontPx(DEFAULT_ROOT_FONT_PX);
  }

  openConfigurator(): void {
    this.configuratorOpen.set(true);
  }

  closeConfigurator(): void {
    this.configuratorOpen.set(false);
  }

  isDark(): boolean {
    return this.current().scheme === 'dark';
  }

  private applyTheme(theme: ThemeMeta): void {
    const base = PRESET_BASES[theme.preset];
    const preset = definePreset(base, {
      semantic: {
        primary: buildPalette(theme.primary),
      },
    });
    usePreset(preset);

    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.classList.toggle(DARK_CLASS, theme.scheme === 'dark');
      // Mirror the existing light-theme/dark-theme class pair used elsewhere
      // in the shell so legacy SCSS that targets those classes keeps working.
      root.classList.toggle('light-theme', theme.scheme === 'light');
      root.classList.toggle('dark-theme', theme.scheme === 'dark');
    }
  }
}

/**
 * Build a primary palette. If `name` matches a CUSTOM_PALETTES entry, return
 * its explicit hex shades verbatim (so e.g. `ocean` resolves to #0a9396 at 500).
 * Otherwise emit token references like `{teal.500}` which @primeuix resolves
 * against its built-in primitive palettes.
 */
function buildPalette(name: string): Record<string, string> {
  const custom = CUSTOM_PALETTES[name];
  if (custom) {
    return { ...custom };
  }
  const out: Record<string, string> = {};
  for (const shade of PALETTE_SHADES) {
    out[String(shade)] = `{${name}.${shade}}`;
  }
  return out;
}

function loadPersistedId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    return id && THEMES.some((t) => t.id === id) ? id : null;
  } catch {
    return null;
  }
}

function loadPersistedScale(): number | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SCALE_STORAGE_KEY);
    if (!raw) return null;
    const px = Number(raw);
    if (!Number.isFinite(px)) return null;
    return Math.min(MAX_ROOT_FONT_PX, Math.max(MIN_ROOT_FONT_PX, px));
  } catch {
    return null;
  }
}
