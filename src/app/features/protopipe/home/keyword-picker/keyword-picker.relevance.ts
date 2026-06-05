import { normalizePhraseKey } from './keyword-picker.types';
import type { ProtopipeOnboardingProfile } from '@hive/contracts';

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'for',
  'to',
  'of',
  'in',
  'on',
  'at',
  'by',
  'with',
  'from',
  'your',
  'our',
  'we',
  'you',
  'is',
  'are',
  'was',
  'be',
  'as',
  'that',
  'this',
  'what',
  'who',
  'how',
  'when',
  'where',
  'best',
  'top',
  'near',
  'me',
  'local',
  'services',
  'service',
  'company',
  'business',
  'website',
  'websites',
  'site',
  'online',
]);

/** Tokens so broad they rarely indicate topical fit on their own. */
const GENERIC_TOKENS = new Set([
  'art',
  'fine',
  'artwork',
  'artist',
  'artists',
  'painting',
  'paintings',
  'painter',
  'paint',
  'print',
  'printing',
  'pieces',
  'piece',
  'mural',
  'miniature',
  'draw',
  'drawing',
  'photo',
  'photos',
  'photography',
  'design',
  'creative',
  'work',
  'works',
  'gallery',
  'studio',
]);

export interface KeywordRelevanceContext {
  anchorPhrases: string[];
  distinctiveTokens: string[];
  genericTokens: string[];
}

export function buildRelevanceContext(input: {
  strategySummary?: string;
  onboardingProfile?: ProtopipeOnboardingProfile;
  displayName?: string;
  hostname?: string;
}): KeywordRelevanceContext {
  const anchorPhrases: string[] = [];
  const tokenCounts = new Map<string, number>();

  const addPhrase = (raw: string | undefined): void => {
    const phrase = (raw ?? '').trim();
    if (phrase.length >= 3) {
      anchorPhrases.push(normalizePhraseKey(phrase));
    }
  };

  const addText = (raw: string | undefined): void => {
    for (const token of tokenize(raw)) {
      tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
    }
  };

  const profile = input.onboardingProfile;
  if (profile) {
    for (const service of profile.services ?? []) {
      addPhrase(service);
      addText(service);
    }
    for (const avatar of profile.customerAvatars ?? []) {
      addText(avatar);
    }
  } else {
    const summary = (input.strategySummary ?? '').trim();
    if (summary) {
      addText(summary);
      const seedMatch = summary.match(/Primary goal: rank for "([^"]+)"/i);
      if (seedMatch?.[1]) addPhrase(seedMatch[1]);
      const tradeMatch = summary.match(/Trade:\s*([^.]+)/i);
      if (tradeMatch?.[1]) addPhrase(tradeMatch[1]);
    }
  }

  addText(input.displayName);
  addText(decomposeHostname(input.hostname));

  const distinctiveTokens: string[] = [];
  const genericTokens: string[] = [];
  for (const [token, count] of tokenCounts) {
    if (count >= 1) {
      (GENERIC_TOKENS.has(token) ? genericTokens : distinctiveTokens).push(token);
    }
  }

  return {
    anchorPhrases: [...new Set(anchorPhrases)],
    distinctiveTokens: [...new Set(distinctiveTokens)],
    genericTokens: [...new Set(genericTokens)],
  };
}

export function computeRelevanceScore(phrase: string, ctx: KeywordRelevanceContext): number {
  const key = normalizePhraseKey(phrase);
  if (!key) return 0;

  for (const anchor of ctx.anchorPhrases) {
    if (key === anchor || key.includes(anchor) || anchor.includes(key)) {
      return 100;
    }
  }

  const phraseTokens = tokenize(key);
  if (phraseTokens.length === 0) return 0;

  const distinctiveHits = phraseTokens.filter((t) => ctx.distinctiveTokens.includes(t));
  const genericHits = phraseTokens.filter((t) => ctx.genericTokens.includes(t));

  if (distinctiveHits.length === 0) {
    if (genericHits.length > 0 && ctx.distinctiveTokens.length > 0) {
      return Math.max(0, 12 - genericHits.length * 4);
    }
    if (ctx.distinctiveTokens.length === 0 && genericHits.length > 0) {
      return 35;
    }
    return 0;
  }

  let score = 28 + distinctiveHits.length * 22;
  if (distinctiveHits.length >= 2) score += 12;
  if (genericHits.length > 0) score += Math.min(8, genericHits.length * 3);
  if (phraseTokens.length <= 2 && distinctiveHits.length >= 1) score += 8;

  return Math.min(100, score);
}

export function isRelevantForPicker(
  phrase: string,
  ctx: KeywordRelevanceContext,
  source: 'ranked' | 'ads' | 'ads_related' | 'research' | 'custom' | 'gsc',
): boolean {
  if (source === 'custom' || source === 'research') return true;
  const score = computeRelevanceScore(phrase, ctx);
  if (source === 'ranked' || source === 'gsc') return score >= 15;
  if (source === 'ads') return score >= 28;
  return score >= 38;
}

function tokenize(raw: string | undefined): string[] {
  return (raw ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

function decomposeHostname(hostname: string | undefined): string {
  const host = (hostname ?? '')
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/\.(com|net|org|io|co|app|dev)$/, '');
  if (!host) return '';

  const spaced = host
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();

  const parts = spaced.split(/\s+/).filter(Boolean);
  if (parts.length > 1) return parts.join(' ');

  return host
    .replace(/(tion|ment|ness|ship|ing|ed|er|ly|ist|ism|ity|ous|ive|ful|less|able|ible)$/g, ' ')
    .replace(/(wedding|painter|painting|artist|photo|design|studio|creative|destination|service|services)/g, ' $1 ')
    .replace(/\s+/g, ' ')
    .trim();
}
