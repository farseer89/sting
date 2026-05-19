import { definePreset } from '@primeuix/themes';
import Lara from '@primeuix/themes/lara';

/**
 * FieldWave / probe-aligned preset: Lara base (matches probe lara-light-* themes)
 * with emerald primary (#059669) like alpha tenant config on probe.
 */
export const FieldwavePreset = definePreset(Lara, {
  semantic: {
    primary: {
      50: '{emerald.50}',
      100: '{emerald.100}',
      200: '{emerald.200}',
      300: '{emerald.300}',
      400: '{emerald.400}',
      500: '{emerald.600}',
      600: '{emerald.700}',
      700: '{emerald.800}',
      800: '{emerald.900}',
      900: '{emerald.950}',
      950: '{emerald.950}',
    },
  },
});
