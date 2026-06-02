/**
 * Normalize prose for substring matching between reviewer claims and editor text.
 * Handles whitespace, dash variants, and curly quotes — not markdown syntax.
 */
export function normalizeClaimText(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .trim()
    .toLowerCase();
}

/** Whether `claim` appears as a substring of `haystack` (plain text). */
export function claimAppearsInText(claim: string, haystack: string): boolean {
  const needle = claim.trim();
  if (!needle || !haystack) return false;
  if (haystack.includes(needle)) return true;
  const n = normalizeClaimText(needle);
  const h = normalizeClaimText(haystack);
  return n.length > 0 && h.includes(n);
}
