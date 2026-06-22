export const CUSTOMER_PROFILE_PALETTES = [
  { bg: '#e8f0fe', ink: '#1d4ed8', ring: '#93c5fd' },
  { bg: '#f3eef9', ink: '#6d28d9', ring: '#c4b5fd' },
  { bg: '#ecfdf3', ink: '#15803d', ring: '#86efac' },
  { bg: '#fff7ed', ink: '#c2410c', ring: '#fdba74' },
  { bg: '#fdf2f8', ink: '#be185d', ring: '#f9a8d4' },
  { bg: '#eef2ff', ink: '#4338ca', ring: '#a5b4fc' },
] as const;

const EMPTY_TITLES = [
  'Your primary customer',
  'Another customer type',
  'Third customer type',
] as const;

export function customerProfilePalette(slot: number): (typeof CUSTOMER_PROFILE_PALETTES)[number] {
  return CUSTOMER_PROFILE_PALETTES[slot % CUSTOMER_PROFILE_PALETTES.length];
}

export function customerProfileStyle(slot: number): Record<string, string> {
  const palette = customerProfilePalette(slot);
  return {
    '--kb-person-bg': palette.bg,
    '--kb-person-ink': palette.ink,
    '--kb-person-ring': palette.ring,
  };
}

export function customerProfileInitials(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '??';
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function customerProfileTitle(text: string, slot: number): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return EMPTY_TITLES[slot] ?? `Customer profile ${slot + 1}`;
  }
  const firstClause = trimmed.split(/[.!?]/)[0]?.trim() ?? trimmed;
  if (firstClause.length <= 42) return firstClause;
  const short = firstClause.slice(0, 39).trimEnd();
  return `${short}…`;
}

export function customerProfileSubtitle(text: string, slot: number): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return slot === 0 ? 'Start with who matters most' : 'Optional — another person you serve';
  }
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  return slot === 0
    ? `Primary profile · ${words} word${words === 1 ? '' : 's'}`
    : `Profile ${slot + 1} · ${words} word${words === 1 ? '' : 's'}`;
}
