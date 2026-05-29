import { definePreset } from '@primeuix/themes';
import Lara from '@primeuix/themes/lara';

/**
 * Bootstrap preset registered in `providePrimeNG()` — this is the FIRST
 * primary palette PrimeNG paints with, before `ThemeService.effect()` runs.
 *
 * On the `protopipe` branch we rebrand to the Protopipe Ocean palette
 * (#0a9396) so the very first frame is on-brand. After the runtime theme
 * service mounts, the picker can still swap to other themes via `usePreset`.
 *
 * The Lara base + ocean primary mirrors the `protopipe-ocean` ThemeMeta in
 * `theme.types.ts`. Kept in lockstep so static + dynamic palettes match.
 *
 * (Filename stays `fieldwave-preset` for now to avoid churn — the export
 * symbol is what `app.config.ts` references.)
 */
export const FieldwavePreset = definePreset(Lara, {
  semantic: {
    primary: {
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
    },
  },
});
