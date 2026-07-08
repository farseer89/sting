import type { SiteThemeTypographyTokens } from './site-design.types';
import {
  SITE_THEME_FONT_STACK_OPTIONS,
  matchSiteThemeFontOptionId,
  siteThemeFontStackForOptionId,
} from './site-theme-fonts.catalog';

export interface SiteThemeFontPairing {
  id: string;
  label: string;
  mood: string;
  sansId: string;
  serifId: string;
}

/** Curated sans + serif combinations for local service and trade sites. */
export const SITE_THEME_FONT_PAIRINGS: SiteThemeFontPairing[] = [
  {
    id: 'system-classic',
    label: 'System Classic',
    mood: 'Timeless default',
    sansId: 'system-sans',
    serifId: 'georgia-serif',
  },
  {
    id: 'trades-bold',
    label: 'Trades Bold',
    mood: 'Service & trades',
    sansId: 'dm-sans',
    serifId: 'georgia-serif',
  },
  {
    id: 'editorial-grace',
    label: 'Editorial Grace',
    mood: 'Luxury & craft',
    sansId: 'source-sans-3',
    serifId: 'cormorant-garamond',
  },
  {
    id: 'modern-display',
    label: 'Modern Display',
    mood: 'Editorial contrast',
    sansId: 'inter',
    serifId: 'playfair-display',
  },
  {
    id: 'authority-source',
    label: 'Authority Source',
    mood: 'Professional trust',
    sansId: 'plus-jakarta-sans',
    serifId: 'source-serif-4',
  },
  {
    id: 'friendly-local',
    label: 'Friendly Local',
    mood: 'Warm & approachable',
    sansId: 'nunito-sans',
    serifId: 'lora',
  },
  {
    id: 'trusted-service',
    label: 'Trusted Service',
    mood: 'Steady & reliable',
    sansId: 'manrope',
    serifId: 'merriweather',
  },
  {
    id: 'creative-studio',
    label: 'Creative Studio',
    mood: 'Distinctive brand',
    sansId: 'outfit',
    serifId: 'fraunces',
  },
  {
    id: 'corporate-calm',
    label: 'Corporate Calm',
    mood: 'Clear & formal',
    sansId: 'open-sans',
    serifId: 'libre-baskerville',
  },
  {
    id: 'tech-minimal',
    label: 'Tech Minimal',
    mood: 'Clean & modern',
    sansId: 'sora',
    serifId: 'dm-serif-display',
  },
  {
    id: 'craft-workshop',
    label: 'Craft Workshop',
    mood: 'Grounded & honest',
    sansId: 'work-sans',
    serifId: 'bitter',
  },
  {
    id: 'premium-refined',
    label: 'Premium Refined',
    mood: 'Upscale service',
    sansId: 'figtree',
    serifId: 'crimson-pro',
  },
  {
    id: 'urban-energy',
    label: 'Urban Energy',
    mood: 'Bold contrast',
    sansId: 'rubik',
    serifId: 'playfair-display',
  },
  {
    id: 'consulting-sharp',
    label: 'Consulting Sharp',
    mood: 'Consulting polish',
    sansId: 'montserrat',
    serifId: 'merriweather',
  },
];

export interface ResolvedSiteThemeFontPairing extends SiteThemeFontPairing {
  sansLabel: string;
  serifLabel: string;
  fontSans: string;
  fontSerif: string;
}

export function resolveSiteThemeFontPairing(
  pairing: SiteThemeFontPairing,
): ResolvedSiteThemeFontPairing | null {
  const sansOption = SITE_THEME_FONT_STACK_OPTIONS.find((option) => option.id === pairing.sansId);
  const serifOption = SITE_THEME_FONT_STACK_OPTIONS.find((option) => option.id === pairing.serifId);
  const fontSans = siteThemeFontStackForOptionId(pairing.sansId);
  const fontSerif = siteThemeFontStackForOptionId(pairing.serifId);
  if (!sansOption || !serifOption || !fontSans || !fontSerif) return null;

  return {
    ...pairing,
    sansLabel: sansOption.label,
    serifLabel: serifOption.label,
    fontSans,
    fontSerif,
  };
}

export function resolvedSiteThemeFontPairings(): ResolvedSiteThemeFontPairing[] {
  return SITE_THEME_FONT_PAIRINGS.map(resolveSiteThemeFontPairing).filter(
    (pairing): pairing is ResolvedSiteThemeFontPairing => pairing !== null,
  );
}

export function matchSiteThemeFontPairingId(
  typography: Pick<SiteThemeTypographyTokens, 'fontSans' | 'fontSerif'> | null | undefined,
): string | null {
  if (!typography) return null;

  const sansId = matchSiteThemeFontOptionId(typography.fontSans);
  const serifId = matchSiteThemeFontOptionId(typography.fontSerif);
  if (!sansId || !serifId) return null;

  return (
    SITE_THEME_FONT_PAIRINGS.find(
      (pairing) => pairing.sansId === sansId && pairing.serifId === serifId,
    )?.id ?? null
  );
}

export function googleFontSpecsForPairingsCatalog(): string[] {
  const optionIds = new Set<string>();
  for (const pairing of SITE_THEME_FONT_PAIRINGS) {
    optionIds.add(pairing.sansId);
    optionIds.add(pairing.serifId);
  }

  return [
    ...new Set(
      [...optionIds]
        .map((id) => SITE_THEME_FONT_STACK_OPTIONS.find((option) => option.id === id)?.googleSpec)
        .filter((spec): spec is string => Boolean(spec)),
    ),
  ];
}

export function typographyOverrideForPairingId(
  pairingId: string,
): Pick<SiteThemeTypographyTokens, 'fontSans' | 'fontSerif'> | null {
  const pairing = SITE_THEME_FONT_PAIRINGS.find((entry) => entry.id === pairingId);
  if (!pairing) return null;

  const fontSans = siteThemeFontStackForOptionId(pairing.sansId);
  const fontSerif = siteThemeFontStackForOptionId(pairing.serifId);
  if (!fontSans || !fontSerif) return null;

  return { fontSans, fontSerif };
}
