export type SiteThemeFontCategory = 'sans' | 'serif';

export interface SiteThemeFontStackOption {
  id: string;
  label: string;
  category: SiteThemeFontCategory;
  stack: string;
  /** Google Fonts CSS2 family spec, e.g. `Inter:wght@400;500;600;700`. */
  googleSpec?: string;
}

/** Curated stacks for baseline templates and Google Fonts. */
export const SITE_THEME_FONT_STACK_OPTIONS: SiteThemeFontStackOption[] = [
  {
    id: 'system-sans',
    label: 'System UI',
    category: 'sans',
    stack: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  {
    id: 'inter',
    label: 'Inter',
    category: 'sans',
    stack: "'Inter', system-ui, sans-serif",
    googleSpec: 'Inter:wght@400;500;600;700',
  },
  {
    id: 'dm-sans',
    label: 'DM Sans',
    category: 'sans',
    stack: "'DM Sans', system-ui, sans-serif",
    googleSpec: 'DM+Sans:wght@400;500;600;700',
  },
  {
    id: 'source-sans-3',
    label: 'Source Sans 3',
    category: 'sans',
    stack: "'Source Sans 3', system-ui, sans-serif",
    googleSpec: 'Source+Sans+3:wght@400;500;600;700',
  },
  {
    id: 'plus-jakarta-sans',
    label: 'Plus Jakarta Sans',
    category: 'sans',
    stack: "'Plus Jakarta Sans', system-ui, sans-serif",
    googleSpec: 'Plus+Jakarta+Sans:wght@400;500;600;700',
  },
  {
    id: 'manrope',
    label: 'Manrope',
    category: 'sans',
    stack: "'Manrope', system-ui, sans-serif",
    googleSpec: 'Manrope:wght@400;500;600;700',
  },
  {
    id: 'outfit',
    label: 'Outfit',
    category: 'sans',
    stack: "'Outfit', system-ui, sans-serif",
    googleSpec: 'Outfit:wght@400;500;600;700',
  },
  {
    id: 'nunito-sans',
    label: 'Nunito Sans',
    category: 'sans',
    stack: "'Nunito Sans', system-ui, sans-serif",
    googleSpec: 'Nunito+Sans:wght@400;500;600;700',
  },
  {
    id: 'lato',
    label: 'Lato',
    category: 'sans',
    stack: "'Lato', system-ui, sans-serif",
    googleSpec: 'Lato:wght@400;700',
  },
  {
    id: 'open-sans',
    label: 'Open Sans',
    category: 'sans',
    stack: "'Open Sans', system-ui, sans-serif",
    googleSpec: 'Open+Sans:wght@400;500;600;700',
  },
  {
    id: 'work-sans',
    label: 'Work Sans',
    category: 'sans',
    stack: "'Work Sans', system-ui, sans-serif",
    googleSpec: 'Work+Sans:wght@400;500;600;700',
  },
  {
    id: 'figtree',
    label: 'Figtree',
    category: 'sans',
    stack: "'Figtree', system-ui, sans-serif",
    googleSpec: 'Figtree:wght@400;500;600;700',
  },
  {
    id: 'sora',
    label: 'Sora',
    category: 'sans',
    stack: "'Sora', system-ui, sans-serif",
    googleSpec: 'Sora:wght@400;500;600;700',
  },
  {
    id: 'rubik',
    label: 'Rubik',
    category: 'sans',
    stack: "'Rubik', system-ui, sans-serif",
    googleSpec: 'Rubik:wght@400;500;600;700',
  },
  {
    id: 'montserrat',
    label: 'Montserrat',
    category: 'sans',
    stack: "'Montserrat', system-ui, sans-serif",
    googleSpec: 'Montserrat:wght@400;500;600;700',
  },
  {
    id: 'georgia-serif',
    label: 'Georgia',
    category: 'serif',
    stack: "Georgia, 'Times New Roman', serif",
  },
  {
    id: 'cormorant-garamond',
    label: 'Cormorant Garamond',
    category: 'serif',
    stack: "'Cormorant Garamond', Georgia, serif",
    googleSpec: 'Cormorant+Garamond:wght@400;500;600;700',
  },
  {
    id: 'playfair-display',
    label: 'Playfair Display',
    category: 'serif',
    stack: "'Playfair Display', Georgia, serif",
    googleSpec: 'Playfair+Display:wght@400;500;600;700',
  },
  {
    id: 'lora',
    label: 'Lora',
    category: 'serif',
    stack: "'Lora', Georgia, serif",
    googleSpec: 'Lora:wght@400;500;600;700',
  },
  {
    id: 'merriweather',
    label: 'Merriweather',
    category: 'serif',
    stack: "'Merriweather', Georgia, serif",
    googleSpec: 'Merriweather:wght@400;700',
  },
  {
    id: 'libre-baskerville',
    label: 'Libre Baskerville',
    category: 'serif',
    stack: "'Libre Baskerville', Georgia, serif",
    googleSpec: 'Libre+Baskerville:wght@400;700',
  },
  {
    id: 'source-serif-4',
    label: 'Source Serif 4',
    category: 'serif',
    stack: "'Source Serif 4', Georgia, serif",
    googleSpec: 'Source+Serif+4:wght@400;500;600;700',
  },
  {
    id: 'fraunces',
    label: 'Fraunces',
    category: 'serif',
    stack: "'Fraunces', Georgia, serif",
    googleSpec: 'Fraunces:wght@400;500;600;700',
  },
  {
    id: 'dm-serif-display',
    label: 'DM Serif Display',
    category: 'serif',
    stack: "'DM Serif Display', Georgia, serif",
    googleSpec: 'DM+Serif+Display:wght@400',
  },
  {
    id: 'bitter',
    label: 'Bitter',
    category: 'serif',
    stack: "'Bitter', Georgia, serif",
    googleSpec: 'Bitter:wght@400;500;600;700',
  },
  {
    id: 'crimson-pro',
    label: 'Crimson Pro',
    category: 'serif',
    stack: "'Crimson Pro', Georgia, serif",
    googleSpec: 'Crimson+Pro:wght@400;500;600;700',
  },
];

export function siteThemeFontOptionsForCategory(
  category: SiteThemeFontCategory,
): SiteThemeFontStackOption[] {
  return SITE_THEME_FONT_STACK_OPTIONS.filter((option) => option.category === category);
}

export function extractPrimaryFontFamily(stack: string | undefined): string | null {
  if (!stack) return null;
  const first = stack.split(',')[0]?.trim();
  if (!first) return null;
  return first.replace(/^['"]|['"]$/g, '') || null;
}

export function matchSiteThemeFontOptionId(stack: string | undefined): string | null {
  if (!stack) return null;

  const normalized = stack.trim().toLowerCase();
  const exact = SITE_THEME_FONT_STACK_OPTIONS.find(
    (option) => option.stack.trim().toLowerCase() === normalized,
  );
  if (exact) return exact.id;

  const primary = extractPrimaryFontFamily(stack)?.toLowerCase();
  if (!primary) return null;

  const byPrimary = SITE_THEME_FONT_STACK_OPTIONS.find(
    (option) => extractPrimaryFontFamily(option.stack)?.toLowerCase() === primary,
  );
  return byPrimary?.id ?? null;
}

export function siteThemeFontStackForOptionId(optionId: string): string | null {
  return SITE_THEME_FONT_STACK_OPTIONS.find((option) => option.id === optionId)?.stack ?? null;
}
