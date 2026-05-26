import { Injectable, computed, effect, signal } from '@angular/core';
import { definePreset, usePreset } from '@primeuix/themes';
import {
  DEFAULT_THEME_ID,
  PALETTE_SHADES,
  PRESET_BASES,
  STORAGE_KEY,
  THEMES,
  type ThemeMeta,
  findTheme,
} from './theme.types';

const DARK_CLASS = 'app-dark';

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
  }

  setTheme(id: string): void {
    if (!THEMES.some((t) => t.id === id)) return;
    this.themeId.set(id);
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

/** Build a primary palette as token references — works for any primitive name. */
function buildPalette(name: string): Record<string, string> {
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
