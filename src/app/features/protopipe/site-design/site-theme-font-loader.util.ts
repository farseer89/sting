import { googleFontSpecsForCatalog } from './site-theme-google-fonts.util';
import { extractPrimaryFontFamily, SITE_THEME_FONT_STACK_OPTIONS } from './site-theme-fonts.catalog';

const LOADED_FAMILIES = new Set<string>();

function primaryFamiliesFromCatalog(): string[] {
  const fromSpecs = googleFontSpecsForCatalog()
    .map((spec) => spec.split(':')[0]?.replace(/\+/g, ' ')?.trim())
    .filter((name): name is string => Boolean(name));

  const fromStacks = SITE_THEME_FONT_STACK_OPTIONS.filter((option) => option.googleSpec)
    .map((option) => extractPrimaryFontFamily(option.stack))
    .filter((name): name is string => Boolean(name));

  return [...new Set([...fromSpecs, ...fromStacks])];
}

/** Warm document.fonts for every catalog family used in pairing previews. */
export function ensureSiteThemeCatalogFontsReady(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.load) {
    return Promise.resolve();
  }

  const pending = primaryFamiliesFromCatalog()
    .filter((family) => !LOADED_FAMILIES.has(family))
    .map((family) => {
      LOADED_FAMILIES.add(family);
      return Promise.all([
        document.fonts.load(`400 1rem "${family}"`),
        document.fonts.load(`500 1rem "${family}"`),
        document.fonts.load(`600 1.75rem "${family}"`),
      ]);
    });

  return Promise.all(pending.flat()).then(() => undefined);
}
