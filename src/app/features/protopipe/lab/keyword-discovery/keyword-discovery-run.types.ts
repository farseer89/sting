/**
 * Keyword Discovery run DTO — lab-local shape mirroring what the backend
 * `KeywordDiscoveryRun` will return (Phase 1 of the refactor moves these into
 * `@hive/contracts`). Kept here so the dev lab can iterate on the Thinker view
 * with hardcoded fixtures before any backend exists.
 *
 * Mirrors the article-generation run DTO contract so `discoveryRunToThought`
 * can adapt it the same way `articleRunToThought` does.
 */

export type DiscoveryStepId =
  | 'load_profile'
  | 'fetch_gsc'
  | 'fetch_site_snapshot'
  | 'fetch_ranked'
  | 'spyfu_gaps'
  | 'resolve_discovery_seeds'
  | 'fetch_ads_ideas'
  | 'geo_expansion'
  | 'seed_expansion'
  | 'merge_score'
  | 'serp_enrichment'
  | 'infer_avatars'
  | 'extract_context_questions'
  | 'confirm';

export type DiscoveryRunStatus =
  | 'pending'
  | 'discovering'
  | 'ready'
  | 'confirmed'
  | 'failed';

export type DiscoveryCandidateSource =
  | 'gsc'
  | 'ranked'
  | 'ads_ideas'
  | 'ads_related'
  | 'spyfu_gap'
  | 'geo'
  | 'paa';

export type DiscoveryIntent = 'informational' | 'commercial' | 'transactional';

export type DiscoveryFunnelStage = 'awareness' | 'consideration' | 'decision';

/** One external API call or LLM call recorded against a step (operator view). */
export interface DiscoveryApiCall {
  provider: 'dataforseo' | 'spyfu' | 'google_ads' | 'google_gsc' | 'anthropic';
  endpoint: string;
  costUsd: number;
  durationMs?: number;
  cached?: boolean;
  rowCount?: number;
  metadata?: Record<string, unknown>;
}

export interface DiscoveryLlmCall {
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  promptVersion?: string;
  promptPreview?: string;
  responsePreview?: string;
}

export interface DiscoveryStepEvent {
  step: DiscoveryStepId;
  status: 'started' | 'completed' | 'failed';
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  costUsd?: number;
  note?: string;
  error?: string;
  /** Present on API-backed steps (GSC, ranked, ads, spyfu, serp). */
  apiCall?: DiscoveryApiCall;
  /** Present on LLM-backed steps (avatar inference, avatar seed extract). */
  llm?: DiscoveryLlmCall;
}

export interface DiscoveryProfileSnapshot {
  businessName?: string;
  services: string[];
  customerAvatars: string[];
  competitors: string[];
  marketScope: 'local' | 'national' | 'worldwide';
  serpLocationName?: string;
  city?: string;
  state?: string;
  hostname?: string;
}

export interface DiscoveryCandidate {
  phrase: string;
  source: DiscoveryCandidateSource;
  searchVolume?: number;
  difficulty?: number;
  cpc?: number;
  /** Relevance fit 0-100 against the onboarding profile. */
  fit?: number;
  opportunity?: number;
  intent?: DiscoveryIntent;
  funnelStage?: DiscoveryFunnelStage;
  /** Competitor ranks for this, the client does not. */
  isGap?: boolean;
  /**
   * Cheap pool-wide SERP feature flags from DFS Labs `serp_info.serp_item_types`
   * (rides along with ranked keywords via `include_serp_info`, no extra call).
   * Presence only — which features fire, not their content.
   */
  serpItemTypes?: string[];
  /** Full-enrichment SERP feature presence (shortlist only, from the SERP scrape). */
  serpFeatures?: string[];
  /** Which suggested avatar this candidate maps to (provisional). */
  avatarId?: string | null;
}

/**
 * Structured SERP signals captured per enriched candidate. Mirrors the real
 * `ProtopipeSerpFeatures` shape from DataForSEO (serpLive.ts) so the lab proves
 * we keep the full People-Also-Ask Q&A, not just a presence flag. PAA questions
 * double as informational-intent keyword + avatar seeds.
 */
export interface DiscoverySerpSignal {
  phrase: string;
  peopleAlsoAsk: { question: string; answer?: string }[];
  relatedSearches: string[];
  featuredSnippet?: { title: string; url?: string };
  features: string[];
}

export interface DiscoverySuggestedAvatar {
  id: string;
  description: string;
  exampleQueries: string[];
  intentCluster: string;
  /** Volume-weighted strength of the cluster, for pre-selection ordering. */
  clusterVolume?: number;
  /** Matched an avatar the user entered during onboarding. */
  matchedOnboarding?: boolean;
  /** Pre-selected for the user (2 strongest clusters by default). */
  preselected?: boolean;
}

export interface DiscoveryCostSummary {
  totalUsd: number;
  byProvider: { provider: string; costUsd: number; calls: number }[];
}

export type DiscoverySeedSource = 'profile' | 'ranked' | 'spyfu_gap' | 'site' | 'llm';

export interface DiscoveryContextSeedSource {
  phrase: string;
  from: DiscoverySeedSource;
}

export interface DiscoveryContext {
  profileQuality: 'strong' | 'weak';
  seedPhrases: string[];
  fitPhrases: string[];
  inferredTrade?: string;
  sources: DiscoveryContextSeedSource[];
  rationale?: string;
  resolvedBy: 'deterministic' | 'llm';
}

export interface DiscoverySiteSnapshot {
  url: string;
  title?: string;
  h1?: string;
  h2s: string[];
  available: boolean;
  error?: string;
}

export interface DiscoveryArtifacts {
  profile?: DiscoveryProfileSnapshot;
  siteSnapshot?: DiscoverySiteSnapshot;
  discoveryContext?: DiscoveryContext;
  gscQueries?: DiscoveryCandidate[];
  rankedKeywords?: DiscoveryCandidate[];
  adsIdeas?: DiscoveryCandidate[];
  spyfuGaps?: DiscoveryCandidate[];
  geoCandidates?: DiscoveryCandidate[];
  relatedKeywords?: DiscoveryCandidate[];
  /** Merged + scored pool shown in the keyword table. */
  scoredCandidates?: DiscoveryCandidate[];
  /** Full SERP feature capture for the enriched top candidates (incl. PAA Q&A). */
  serpSignals?: DiscoverySerpSignal[];
  suggestedAvatars?: DiscoverySuggestedAvatar[];
  /** Final confirmed payload (Goal 3), present once status is `confirmed`. */
  confirmedSnapshot?: {
    confirmedKeywords: DiscoveryCandidate[];
    confirmedAvatars: DiscoverySuggestedAvatar[];
  };
}

export interface KeywordDiscoveryRunDto {
  id: string;
  siteId: string;
  status: DiscoveryRunStatus;
  currentStep: DiscoveryStepId | 'done';
  events: DiscoveryStepEvent[];
  artifacts: DiscoveryArtifacts;
  costSummary?: DiscoveryCostSummary;
  createdAt: string;
  updatedAt: string;
  error?: { step?: DiscoveryStepId; message: string; stack?: string };
}
