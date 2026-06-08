import type {
  DiscoveryCandidate,
  DiscoveryContext,
  DiscoveryProfileSnapshot,
  DiscoverySerpSignal,
  DiscoverySiteSnapshot,
  DiscoveryStepEvent,
  DiscoverySuggestedAvatar,
  KeywordDiscoveryRunDto,
} from './keyword-discovery-run.types';

/**
 * Hardcoded discovery-run fixtures for the Keyword Discovery Lab. These let us
 * iterate on the Thinker view + adapter without a backend or a live account.
 * The canonical test profile is a destination-wedding live painter so the data
 * exercises geo expansion, commercial vs informational intent, and gap mining.
 */

const NOW = Date.parse('2026-06-04T20:00:00.000Z');
const iso = (offsetMs: number): string => new Date(NOW + offsetMs).toISOString();

export const CANONICAL_PROFILE: DiscoveryProfileSnapshot = {
  businessName: 'Brushstroke & Vow',
  services: ['live wedding painting', 'destination wedding art', 'event live painting'],
  customerAvatars: [
    'engaged couples planning a luxury destination wedding who want a live painter as entertainment',
  ],
  competitors: ['liveweddingpainter.com', 'wedpaint.co'],
  marketScope: 'national',
  serpLocationName: 'United States',
  hostname: 'brushstrokeandvow.com',
};

const SITE_SNAPSHOT: DiscoverySiteSnapshot = {
  url: 'https://brushstrokeandvow.com',
  title: 'Brushstroke & Vow | Live Wedding Painting',
  h1: 'Live wedding painting for destination celebrations',
  h2s: ['Destination wedding packages', 'How live painting works', 'Book your painter'],
  available: true,
};

const DISCOVERY_CONTEXT: DiscoveryContext = {
  profileQuality: 'strong',
  seedPhrases: [
    'live wedding painting',
    'destination wedding art',
    'destination wedding painter',
    'live wedding painter',
  ],
  fitPhrases: [
    'live wedding painting',
    'destination wedding art',
    'destination wedding painter',
    'engaged couples planning a luxury destination wedding who want a live painter as entertainment',
  ],
  sources: [
    { phrase: 'live wedding painting', from: 'profile' },
    { phrase: 'destination wedding art', from: 'profile' },
    { phrase: 'destination wedding painter', from: 'spyfu_gap' },
    { phrase: 'live wedding painter', from: 'ranked' },
  ],
  resolvedBy: 'deterministic',
};

function c(
  phrase: string,
  source: DiscoveryCandidate['source'],
  o: Partial<DiscoveryCandidate> = {},
): DiscoveryCandidate {
  return { phrase, source, ...o };
}

const GSC: DiscoveryCandidate[] = [
  c('live wedding painter', 'gsc', { searchVolume: 2400, fit: 96, intent: 'commercial', cpc: 4.1, difficulty: 38 }),
  c('wedding live painting cost', 'gsc', { searchVolume: 880, fit: 92, intent: 'commercial', cpc: 3.2, difficulty: 24 }),
  c('what is live wedding painting', 'gsc', { searchVolume: 720, fit: 84, intent: 'informational', cpc: 1.1, difficulty: 12 }),
];

const RANKED: DiscoveryCandidate[] = [
  ...GSC,
  c('live event painter', 'ranked', { searchVolume: 1300, fit: 78, intent: 'commercial', cpc: 3.0, difficulty: 31 }),
  c('wedding entertainment ideas', 'ranked', { searchVolume: 5400, fit: 54, intent: 'informational', cpc: 1.8, difficulty: 47 }),
];

const ADS: DiscoveryCandidate[] = [
  c('hire wedding painter', 'ads_ideas', { searchVolume: 1900, fit: 94, intent: 'transactional', cpc: 5.6, difficulty: 41 }),
  c('live painting artist for events', 'ads_ideas', { searchVolume: 1100, fit: 80, intent: 'commercial', cpc: 4.4, difficulty: 36 }),
  c('wedding painting packages', 'ads_ideas', { searchVolume: 590, fit: 90, intent: 'commercial', cpc: 4.9, difficulty: 22 }),
];

const SPYFU_GAPS: DiscoveryCandidate[] = [
  c('destination wedding painter', 'spyfu_gap', { searchVolume: 1600, fit: 95, intent: 'commercial', cpc: 5.1, difficulty: 28, isGap: true }),
  c('beach wedding live painting', 'spyfu_gap', { searchVolume: 480, fit: 88, intent: 'commercial', cpc: 3.7, difficulty: 18, isGap: true }),
  c('live painting for elopement', 'spyfu_gap', { searchVolume: 320, fit: 82, intent: 'commercial', cpc: 3.3, difficulty: 14, isGap: true }),
];

const GEO: DiscoveryCandidate[] = [
  c('wedding painter near me', 'geo', { searchVolume: 2100, fit: 91, intent: 'transactional', cpc: 5.0, difficulty: 33 }),
  c('napa valley wedding painter', 'geo', { searchVolume: 210, fit: 86, intent: 'transactional', cpc: 4.2, difficulty: 9 }),
  c('charleston live wedding painter', 'geo', { searchVolume: 170, fit: 85, intent: 'transactional', cpc: 4.0, difficulty: 8 }),
];

const RELATED: DiscoveryCandidate[] = [
  c('how long does live wedding painting take', 'ads_related', { searchVolume: 260, fit: 80, intent: 'informational', cpc: 0.9, difficulty: 7 }),
  c('live wedding painting vs photography', 'ads_related', { searchVolume: 390, fit: 76, intent: 'informational', cpc: 1.4, difficulty: 15 }),
  c('best live wedding painters 2026', 'ads_related', { searchVolume: 540, fit: 83, intent: 'commercial', cpc: 2.6, difficulty: 26 }),
];

function dedupeByPhrase(...lists: DiscoveryCandidate[][]): DiscoveryCandidate[] {
  const map = new Map<string, DiscoveryCandidate>();
  for (const list of lists) {
    for (const cand of list) {
      const existing = map.get(cand.phrase);
      if (!existing || (cand.searchVolume ?? 0) > (existing.searchVolume ?? 0)) {
        map.set(cand.phrase, cand);
      }
    }
  }
  return [...map.values()];
}

/**
 * Structured SERP signals as captured by DataForSEO `serp/.../live/advanced`
 * (mirrors serpLive.ts → SerpSnapshot.serpFeatures with click depth 2). PAA
 * keeps the full Q&A; these questions also seed informational candidates and
 * the researcher avatar — so SERP enrichment runs *before* avatar inference.
 */
const SERP_SIGNALS: DiscoverySerpSignal[] = [
  {
    phrase: 'wedding live painting cost',
    features: ['people_also_ask', 'featured_snippet'],
    featuredSnippet: {
      title: 'Live wedding painting typically costs $1,500–$6,000 depending on canvas size and hours.',
      url: 'https://liveweddingpainter.com/pricing',
    },
    peopleAlsoAsk: [
      { question: 'How much does a live wedding painter cost?', answer: 'Most live wedding painters charge $1,500 to $6,000, set by canvas size, number of figures, and event hours.' },
      { question: 'Is live wedding painting worth it?', answer: 'Couples value it as both live entertainment and a keepsake artwork delivered after the wedding.' },
      { question: 'How long does a live wedding painting take?', answer: 'The painter blocks in the scene during the event over 3–5 hours, then finishes details in-studio.' },
      { question: 'Do you tip a live wedding painter?', answer: 'A 10–20% gratuity is customary for exceptional service, though not required.' },
    ],
    relatedSearches: ['live wedding painter near me', 'live wedding painting packages', 'wedding painter vs photographer'],
  },
  {
    phrase: 'what is live wedding painting',
    features: ['people_also_ask'],
    peopleAlsoAsk: [
      { question: 'What is a live wedding painter?', answer: 'An artist who paints a scene from your wedding in real time as guests watch, finishing the piece on-site or shortly after.' },
      { question: 'What do live wedding painters paint?', answer: 'Most commonly the ceremony, first dance, or a sweeping reception scene chosen with the couple beforehand.' },
      { question: 'When does the live painter start painting?', answer: 'They usually sketch during the ceremony and build color through cocktail hour and the reception.' },
    ],
    relatedSearches: ['live wedding painting vs photography', 'live event painter', 'wedding entertainment ideas'],
  },
  {
    phrase: 'destination wedding painter',
    features: ['local_pack', 'images'],
    peopleAlsoAsk: [
      { question: 'Do live wedding painters travel?', answer: 'Many offer destination packages covering travel, lodging, and shipping the finished canvas home.' },
      { question: 'How do destination wedding painters ship the artwork?', answer: 'The canvas is finished in-studio after the trip and shipped insured, or hand-delivered for nearby events.' },
    ],
    relatedSearches: ['beach wedding live painting', 'live painting for elopement', 'napa valley wedding painter'],
  },
];

/** Flatten every captured PAA question across signals (dedup, keep order). */
const PAA_QUESTIONS: string[] = Array.from(
  new Set(SERP_SIGNALS.flatMap((s) => s.peopleAlsoAsk.map((p) => p.question))),
);

/**
 * Informational keyword candidates derived from PAA questions. These are a
 * first-class discovery source (`source: 'paa'`) and map to the researcher
 * avatar — demonstrating PAA → candidate pool → avatar reuse.
 */
const PAA_CANDIDATES: DiscoveryCandidate[] = PAA_QUESTIONS.map((q) => ({
  phrase: q.toLowerCase().replace(/[?]/g, '').trim(),
  source: 'paa',
  searchVolume: 140 + Math.round(q.length % 5) * 30,
  difficulty: 9,
  cpc: 0.8,
  fit: 79,
  intent: 'informational',
  funnelStage: 'awareness',
  avatarId: 'av-researcher',
}));

/**
 * Cheap, pool-wide SERP feature flags as they'd arrive from DFS Labs
 * `serp_info.serp_item_types` (with `include_serp_info`). Heuristic by intent so
 * the whole table shows which features fire before any full scrape is paid for.
 */
function cheapSerpItemTypes(cand: DiscoveryCandidate): string[] {
  switch (cand.intent) {
    case 'informational':
      return ['people_also_ask', 'featured_snippet'];
    case 'transactional':
      return ['local_pack', 'images'];
    case 'commercial':
    default:
      return cand.isGap ? ['local_pack', 'people_also_ask'] : ['people_also_ask'];
  }
}

const SCORED: DiscoveryCandidate[] = dedupeByPhrase(
  GSC,
  RANKED,
  ADS,
  SPYFU_GAPS,
  GEO,
  RELATED,
  PAA_CANDIDATES,
).map((cand) => ({
  ...cand,
  serpItemTypes: cheapSerpItemTypes(cand),
  opportunity: Math.round(
    ((cand.fit ?? 50) / 100) * (cand.searchVolume ?? 0) * (1 - (cand.difficulty ?? 50) / 200),
  ),
}));

const SERP_ENRICHED: DiscoveryCandidate[] = SCORED.map((cand, i) =>
  i < 6
    ? {
        ...cand,
        serpFeatures:
          cand.intent === 'informational'
            ? ['people_also_ask', 'featured_snippet']
            : ['local_pack', 'images'],
      }
    : cand,
);

const AVATARS: DiscoverySuggestedAvatar[] = [
  {
    id: 'av-destination',
    description: 'Couples planning a luxury destination wedding seeking a live painter as memorable entertainment',
    exampleQueries: ['destination wedding painter', 'beach wedding live painting', 'live painting for elopement'],
    intentCluster: 'destination / commercial',
    clusterVolume: 2400,
    matchedOnboarding: true,
    preselected: true,
  },
  {
    id: 'av-local-booker',
    description: 'Local brides comparing and booking a wedding painter in their metro area',
    exampleQueries: ['wedding painter near me', 'napa valley wedding painter', 'hire wedding painter'],
    intentCluster: 'local / transactional',
    clusterVolume: 2480,
    preselected: true,
  },
  {
    // Seeded directly from captured PAA questions — the researcher avatar's
    // example queries ARE the People-Also-Ask box for this niche.
    id: 'av-researcher',
    description: 'Early-stage couples researching whether live wedding painting is worth it and how it works',
    exampleQueries: PAA_QUESTIONS.slice(0, 4),
    intentCluster: 'awareness / informational (PAA-seeded)',
    clusterVolume: 1600,
    preselected: false,
  },
];

const COST_SUMMARY: KeywordDiscoveryRunDto['costSummary'] = {
  totalUsd: 0.4517,
  byProvider: [
    // ranked .07 + geo .07 + related .07 + serp advanced (PAA depth 2) .039
    { provider: 'dataforseo', costUsd: 0.249, calls: 4 },
    { provider: 'spyfu', costUsd: 0.08, calls: 1 },
    { provider: 'google_ads', costUsd: 0, calls: 2 },
    { provider: 'google_gsc', costUsd: 0, calls: 1 },
    { provider: 'anthropic', costUsd: 0.1227, calls: 1 },
  ],
};

function ev(
  step: DiscoveryStepEvent['step'],
  startMs: number,
  durMs: number,
  extra: Partial<DiscoveryStepEvent> = {},
): DiscoveryStepEvent[] {
  return [
    { step, status: 'started', startedAt: iso(startMs) },
    {
      step,
      status: 'completed',
      startedAt: iso(startMs),
      finishedAt: iso(startMs + durMs),
      durationMs: durMs,
      ...extra,
    },
  ];
}

const FULL_EVENTS: DiscoveryStepEvent[] = [
  ...ev('load_profile', 0, 120, { note: '3 services · national scope' }),
  ...ev('fetch_gsc', 200, 640, {
    costUsd: 0,
    note: '142 queries → 3 relevant',
    apiCall: { provider: 'google_gsc', endpoint: 'searchanalytics.query', costUsd: 0, rowCount: 142 },
  }),
  ...ev('fetch_site_snapshot', 900, 420, { note: 'Homepage snapshot (3 h2s)' }),
  ...ev('fetch_ranked', 1400, 1200, {
    costUsd: 0.07,
    apiCall: { provider: 'dataforseo', endpoint: 'dataforseo_labs/ranked_keywords', costUsd: 0.07, rowCount: 88 },
  }),
  ...ev('spyfu_gaps', 2700, 1400, {
    costUsd: 0.08,
    note: '2 competitors · 31 gap keywords',
    apiCall: { provider: 'spyfu', endpoint: 'competitor/keyword_gaps', costUsd: 0.08, rowCount: 31 },
  }),
  ...ev('resolve_discovery_seeds', 4200, 180, {
    note: '4 seed(s) · strong profile · resolved by deterministic',
  }),
  ...ev('fetch_ads_ideas', 4500, 980, {
    costUsd: 0,
    apiCall: { provider: 'google_ads', endpoint: 'KeywordPlanIdeaService', costUsd: 0, rowCount: 64 },
  }),
  ...ev('geo_expansion', 5600, 760, {
    costUsd: 0.07,
    apiCall: { provider: 'dataforseo', endpoint: 'keywords_data/google_ads/search_volume', costUsd: 0.07, rowCount: 24 },
  }),
  ...ev('seed_expansion', 6500, 690, {
    costUsd: 0.07,
    apiCall: { provider: 'dataforseo', endpoint: 'dataforseo_labs/related_keywords', costUsd: 0.07, rowCount: 40 },
  }),
  ...ev('merge_score', 7300, 210, { note: `${SCORED.length} unique candidates scored` }),
  ...ev('serp_enrichment', 7600, 2400, {
    costUsd: 0.039,
    note: `Top informational candidates enriched · ${PAA_QUESTIONS.length} PAA questions captured (click depth 2)`,
    apiCall: {
      provider: 'dataforseo',
      endpoint: 'serp/google/organic/live/advanced (people_also_ask_click_depth=2)',
      costUsd: 0.039,
      rowCount: SERP_SIGNALS.length,
    },
  }),
  ...ev('infer_avatars', 10100, 2100, {
    costUsd: 0.1227,
    note: `3 intent clusters → 3 avatars · researcher avatar seeded from ${PAA_QUESTIONS.length} PAA questions`,
    llm: {
      model: 'claude-sonnet-4',
      inputTokens: 3820,
      outputTokens: 640,
      costUsd: 0.1227,
      promptVersion: 'avatar-infer@v1',
      promptPreview:
        'Cluster the following keyword pool (incl. People-Also-Ask questions) by searcher intent and propose customer avatars…',
      responsePreview: '{ "avatars": [ { "description": "Couples planning a luxury destination wedding…" } ] }',
    },
  }),
  ...ev('extract_context_questions', 12400, 900, {
    costUsd: 0.0412,
    note: '3 context question(s) from discovery',
    llm: {
      model: 'claude-sonnet-4',
      inputTokens: 1200,
      outputTokens: 280,
      costUsd: 0.0412,
      promptVersion: 'discovery-context-questions@v1',
    },
  }),
];

/** Fully-completed run, ready for avatar/keyword confirmation. */
export const FIXTURE_READY: KeywordDiscoveryRunDto = {
  id: 'kd-fixture-ready',
  siteId: 'lab-site',
  status: 'ready',
  currentStep: 'confirm',
  events: FULL_EVENTS,
  artifacts: {
    profile: CANONICAL_PROFILE,
    siteSnapshot: SITE_SNAPSHOT,
    discoveryContext: DISCOVERY_CONTEXT,
    gscQueries: GSC,
    rankedKeywords: RANKED,
    adsIdeas: ADS,
    spyfuGaps: SPYFU_GAPS,
    geoCandidates: GEO,
    relatedKeywords: RELATED,
    scoredCandidates: SERP_ENRICHED,
    serpSignals: SERP_SIGNALS,
    suggestedAvatars: AVATARS,
  },
  costSummary: COST_SUMMARY,
  createdAt: iso(0),
  updatedAt: iso(13400),
};

/**
 * Mid-flight run: SERP enrichment is done (PAA captured) and avatar inference
 * is in flight — drives the live pulse + polling. Because SERP precedes
 * avatars, the captured PAA is already available to seed them.
 */
export const FIXTURE_MID: KeywordDiscoveryRunDto = {
  id: 'kd-fixture-mid',
  siteId: 'lab-site',
  status: 'discovering',
  currentStep: 'infer_avatars',
  events: [
    // Everything through serp_enrichment completed, plus infer_avatars started.
    ...FULL_EVENTS.filter((e) => e.step !== 'infer_avatars' && e.step !== 'extract_context_questions'),
    { step: 'infer_avatars', status: 'started', startedAt: iso(10100) },
  ],
  artifacts: {
    profile: CANONICAL_PROFILE,
    siteSnapshot: SITE_SNAPSHOT,
    discoveryContext: DISCOVERY_CONTEXT,
    gscQueries: GSC,
    rankedKeywords: RANKED,
    adsIdeas: ADS,
    spyfuGaps: SPYFU_GAPS,
    geoCandidates: GEO,
    relatedKeywords: RELATED,
    scoredCandidates: SERP_ENRICHED,
    serpSignals: SERP_SIGNALS,
  },
  costSummary: { ...COST_SUMMARY, totalUsd: 0.329, byProvider: COST_SUMMARY!.byProvider.slice(0, 4) },
  createdAt: iso(0),
  updatedAt: iso(10100),
};

/** Failed run — SpyFu not connected, so the gap step errored. */
export const FIXTURE_FAILED: KeywordDiscoveryRunDto = {
  id: 'kd-fixture-failed',
  siteId: 'lab-site',
  status: 'failed',
  currentStep: 'spyfu_gaps',
  events: [
    ...ev('load_profile', 0, 120),
    ...ev('fetch_gsc', 200, 640, { costUsd: 0 }),
    ...ev('fetch_site_snapshot', 900, 420),
    ...ev('fetch_ranked', 1400, 1200, { costUsd: 0.07 }),
    { step: 'spyfu_gaps', status: 'started', startedAt: iso(2700) },
    {
      step: 'spyfu_gaps',
      status: 'failed',
      startedAt: iso(2700),
      finishedAt: iso(3100),
      durationMs: 400,
      error: 'SpyFu API key not configured for this site',
    },
  ],
  artifacts: {
    profile: CANONICAL_PROFILE,
    siteSnapshot: SITE_SNAPSHOT,
    gscQueries: GSC,
    rankedKeywords: RANKED,
  },
  costSummary: {
    totalUsd: 0.07,
    byProvider: [
      { provider: 'dataforseo', costUsd: 0.07, calls: 1 },
      { provider: 'google_ads', costUsd: 0, calls: 1 },
      { provider: 'google_gsc', costUsd: 0, calls: 1 },
    ],
  },
  error: { step: 'spyfu_gaps', message: 'SpyFu API key not configured for this site' },
  createdAt: iso(0),
  updatedAt: iso(3700),
};

/** Confirmed run — user picked 2 avatars + a keyword shortlist. */
export const FIXTURE_CONFIRMED: KeywordDiscoveryRunDto = {
  id: 'kd-fixture-confirmed',
  siteId: 'lab-site',
  status: 'confirmed',
  currentStep: 'done',
  events: [
    ...FULL_EVENTS,
    ...ev('confirm', 10800, 320, { note: '12 keywords · 2 avatars persisted' }),
  ],
  artifacts: {
    profile: CANONICAL_PROFILE,
    gscQueries: GSC,
    rankedKeywords: RANKED,
    adsIdeas: ADS,
    spyfuGaps: SPYFU_GAPS,
    geoCandidates: GEO,
    relatedKeywords: RELATED,
    scoredCandidates: SERP_ENRICHED,
    serpSignals: SERP_SIGNALS,
    suggestedAvatars: AVATARS,
    confirmedSnapshot: {
      confirmedKeywords: SERP_ENRICHED.filter((k) => (k.fit ?? 0) >= 84).slice(0, 12),
      confirmedAvatars: AVATARS.filter((a) => a.preselected),
    },
  },
  costSummary: COST_SUMMARY,
  createdAt: iso(0),
  updatedAt: iso(11200),
};

export interface DiscoveryFixture {
  id: string;
  label: string;
  description: string;
  run: KeywordDiscoveryRunDto;
}

export const DISCOVERY_FIXTURES: DiscoveryFixture[] = [
  {
    id: 'ready',
    label: 'Ready for confirmation',
    description: 'Full pipeline complete — all sources, scored pool, 3 suggested avatars.',
    run: FIXTURE_READY,
  },
  {
    id: 'mid',
    label: 'Mid-flight (avatars)',
    description: 'Discovering — paused on avatar inference, drives the live pulse.',
    run: FIXTURE_MID,
  },
  {
    id: 'failed',
    label: 'Failed (SpyFu)',
    description: 'Gap mining failed because SpyFu is not connected.',
    run: FIXTURE_FAILED,
  },
  {
    id: 'confirmed',
    label: 'Confirmed',
    description: 'User confirmed 12 keywords + 2 avatars; snapshot persisted.',
    run: FIXTURE_CONFIRMED,
  },
];

export function discoveryFixtureById(id: string | null): DiscoveryFixture {
  return DISCOVERY_FIXTURES.find((f) => f.id === id) ?? DISCOVERY_FIXTURES[0];
}
