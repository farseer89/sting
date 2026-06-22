import type {
  Thought,
  ThoughtArtifact,
  ThoughtEvent,
  ThoughtStatus,
  ThoughtStep,
  ThoughtStepStatus,
} from '../thinker/thought.model';
import { formatThinkerCostUsd, sumCosts } from '../thinker/thinker-cost';
import type {
  DiscoveryCandidate,
  DiscoverySerpSignal,
  DiscoveryStepEvent,
  DiscoveryStepId,
  DiscoverySuggestedAvatar,
  KeywordDiscoveryRunDto,
} from './keyword-discovery-run.types';

/**
 * Adapter: project a KeywordDiscoveryRun onto the generic Thought model so the
 * keyword-discovery pipeline renders in the same Thinker view as the article
 * writer. Pure + synchronous so it can run inside a computed() on every poll
 * tick (or against a hardcoded fixture in the lab).
 */

/** Pipeline steps shown in the grouped discovery runner side nav. */
export const DISCOVERY_NAV_PHASES = [
  {
    id: 'discovery:market',
    navLabel: 'Market',
    label: 'Market signals',
    detail: 'Onboarding profile, ranked keywords, and competitor gaps',
    steps: ['load_profile', 'fetch_ranked', 'spyfu_gaps'] as DiscoveryStepId[],
  },
  {
    id: 'discovery:keywords',
    navLabel: 'Keywords',
    label: 'Keyword pool',
    detail: 'Resolve seeds, expand ideas, score, and enrich top candidates from SERP',
    steps: [
      'resolve_discovery_seeds',
      'expand_keyword_pool',
      'geo_expansion',
      'merge_score',
      'serp_enrichment',
    ] as DiscoveryStepId[],
  },
  {
    id: 'discovery:audience',
    navLabel: 'Audiences',
    label: 'Match audiences',
    detail: 'Map discovered keywords to onboarding customer avatars',
    steps: ['infer_avatars'] as DiscoveryStepId[],
  },
] as const;

export type DiscoveryNavPhaseId = (typeof DISCOVERY_NAV_PHASES)[number]['id'];

export const DISCOVERY_RESULT_STEP_ID = 'discovery_result' as const;

export type DiscoveryResultStepId = typeof DISCOVERY_RESULT_STEP_ID;

export const DISCOVERY_STEP_ORDER: DiscoveryStepId[] = [
  'load_profile',
  'fetch_gsc',
  'fetch_site_snapshot',
  'fetch_ranked',
  'spyfu_gaps',
  'resolve_discovery_seeds',
  'expand_keyword_pool',
  'geo_expansion',
  'merge_score',
  'serp_enrichment',
  'infer_avatars',
  'confirm',
];

export const STEP_META: Record<DiscoveryStepId, { label: string; summary: string }> = {
  load_profile: {
    label: 'Profile',
    summary: 'Load the structured onboarding profile + site context.',
  },
  fetch_gsc: {
    label: 'Search Console',
    summary: 'Pull queries the site already gets impressions for.',
  },
  fetch_site_snapshot: {
    label: 'Site Snapshot',
    summary: 'Fetch homepage title and headings for seed resolution.',
  },
  fetch_ranked: {
    label: 'Ranked',
    summary: 'DataForSEO ranked keywords for the domain.',
  },
  spyfu_gaps: {
    label: 'Competitor Gaps',
    summary: 'SpyFu keywords competitors rank for and the site does not.',
  },
  resolve_discovery_seeds: {
    label: 'Resolve Seeds',
    summary: 'Reconcile onboarding input with ranked and gap signals.',
  },
  expand_keyword_pool: {
    label: 'Expand Pool',
    summary: 'Google Ads keyword ideas from resolved and pool seeds (single call).',
  },
  geo_expansion: {
    label: 'Geo Expansion',
    summary: 'Expand seeds across the target service area.',
  },
  merge_score: {
    label: 'Merge & Score',
    summary: 'Dedupe, score relevance + opportunity, tier the pool.',
  },
  serp_enrichment: {
    label: 'SERP Enrich',
    summary: 'Pull SERP features + PAA Q&A for the top candidates (feeds avatars).',
  },
  infer_avatars: {
    label: 'Match Audiences',
    summary: 'Map keywords to onboarding avatars (or cluster when profile is sparse).',
  },
  confirm: {
    label: 'Confirm',
    summary: 'Persist confirmed keywords + avatars for content planning.',
  },
};

function activeDiscoveryPhaseIndex(run: KeywordDiscoveryRunDto): number {
  const current = run.currentStep;
  if (current === 'done' || run.status === 'ready' || run.status === 'confirmed') {
    return DISCOVERY_NAV_PHASES.length;
  }
  for (let i = 0; i < DISCOVERY_NAV_PHASES.length; i++) {
    if (DISCOVERY_NAV_PHASES[i].steps.includes(current as DiscoveryStepId)) {
      return i;
    }
  }
  if (current === 'confirm') {
    return DISCOVERY_NAV_PHASES.length;
  }
  return 0;
}

/** Side-nav focus while discovery runs or after completion. */
export function resolveDiscoveryNavStepId(run: KeywordDiscoveryRunDto): DiscoveryNavPhaseId | DiscoveryResultStepId {
  if (run.status === 'ready' || run.status === 'confirmed' || run.currentStep === 'done') {
    return DISCOVERY_RESULT_STEP_ID;
  }
  if (run.status === 'pending' || run.status === 'discovering') {
    const idx = activeDiscoveryPhaseIndex(run);
    return DISCOVERY_NAV_PHASES[idx]?.id ?? 'discovery:market';
  }
  return 'discovery:market';
}

function runStatus(run: KeywordDiscoveryRunDto): ThoughtStatus {
  switch (run.status) {
    case 'pending':
      return 'pending';
    case 'discovering':
      return 'running';
    case 'ready':
    case 'confirmed':
      return 'complete';
    case 'failed':
      return 'failed';
    default:
      return 'idle';
  }
}

function json(id: string, label: string, data: unknown, summary?: string): ThoughtArtifact {
  return { id, label, kind: 'json', data, summary };
}

function text(id: string, label: string, data: string, summary?: string): ThoughtArtifact {
  return { id, label, kind: 'text', data, summary };
}

function metric(
  id: string,
  label: string,
  value: string | number,
  unit?: string,
  delta?: string,
  summary?: string,
): ThoughtArtifact {
  return { id, label, kind: 'metric', data: { value, unit, delta }, summary };
}

function num(n: number | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: digits });
}

function usd(n: number | undefined): string {
  return formatThinkerCostUsd(n) ?? '—';
}

/** Short labels for raw DFS serp_item_types, for the compact SERP column. */
const SERP_FEATURE_LABELS: Record<string, string> = {
  people_also_ask: 'PAA',
  featured_snippet: 'snippet',
  answer_box: 'answer',
  local_pack: 'local',
  images: 'images',
  video: 'video',
  knowledge_graph: 'KG',
  ai_overview: 'AI',
  related_searches: 'related',
  shopping: 'shopping',
  top_stories: 'news',
};

/** Compact SERP-feature flags for a candidate (e.g. "PAA · snippet"). */
function serpBadges(features: string[] | undefined): string {
  if (!features?.length) return '—';
  return features.map((f) => SERP_FEATURE_LABELS[f] ?? f).join(' · ');
}

/** Candidate list -> sortable table artifact (volume desc). */
function candidateTable(
  id: string,
  label: string,
  candidates: DiscoveryCandidate[],
  summary?: string,
): ThoughtArtifact {
  const rows = [...candidates]
    .sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0))
    .map((c) => [
      c.phrase,
      num(c.searchVolume),
      c.difficulty != null ? num(c.difficulty) : '—',
      c.cpc != null ? usd(c.cpc) : '—',
      c.fit != null ? num(c.fit) : '—',
      c.intent ?? '—',
      serpBadges(c.serpItemTypes ?? c.serpFeatures),
      c.isGap ? 'gap' : c.source,
    ]);
  return {
    id,
    label,
    kind: 'table',
    summary: summary ?? `${candidates.length} keyword(s)`,
    data: {
      columns: ['Keyword', 'Vol', 'KD', 'CPC', 'Fit', 'Intent', 'SERP', 'Source'],
      rows,
    },
  };
}

function serpSignalsMarkdown(signals: DiscoverySerpSignal[]): string {
  return signals
    .map((s) => {
      const lines = [`### ${s.phrase}`];
      if (s.features.length) lines.push(`_features: ${s.features.join(', ')}_`);
      if (s.featuredSnippet) lines.push(`**Featured snippet:** ${s.featuredSnippet.title}`);
      if (s.peopleAlsoAsk.length) {
        lines.push('People Also Ask:');
        for (const paa of s.peopleAlsoAsk) {
          lines.push(`- **${paa.question}**${paa.answer ? `\n  - ${paa.answer}` : ''}`);
        }
      }
      if (s.relatedSearches.length) {
        lines.push(`Related searches: ${s.relatedSearches.join(' · ')}`);
      }
      return lines.join('\n');
    })
    .join('\n\n');
}

function avatarsMarkdown(avatars: DiscoverySuggestedAvatar[]): string {
  return avatars
    .map((a, i) => {
      const flags = [
        a.preselected ? 'pre-selected' : null,
        a.matchedOnboarding ? 'matched onboarding' : null,
        a.clusterVolume != null ? `${num(a.clusterVolume)} vol/mo` : null,
      ]
        .filter(Boolean)
        .join(' · ');
      const queries = a.exampleQueries.map((q) => `  - ${q}`).join('\n');
      return [
        `### ${i + 1}. ${a.description}`,
        flags ? `_${flags}_` : '',
        `Intent cluster: **${a.intentCluster}**`,
        'Example queries:',
        queries,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}

/** Output artifact(s) a given step produces, if present in the run. */
function stepOutput(step: DiscoveryStepId, run: KeywordDiscoveryRunDto): ThoughtArtifact[] {
  const a = run.artifacts;
  switch (step) {
    case 'load_profile':
      return a.profile
        ? [
            json(
              'profile',
              'Onboarding profile',
              a.profile,
              `${a.profile.services.length} service(s) · ${a.profile.marketScope}`,
            ),
          ]
        : [];
    case 'fetch_gsc':
      return a.gscQueries?.length
        ? [candidateTable('gsc', 'GSC queries', a.gscQueries)]
        : [];
    case 'fetch_site_snapshot':
      return a.siteSnapshot
        ? [
            json(
              'site-snapshot',
              'Homepage snapshot',
              a.siteSnapshot,
              a.siteSnapshot.available
                ? [a.siteSnapshot.title, a.siteSnapshot.h1, ...a.siteSnapshot.h2s]
                    .filter(Boolean)
                    .slice(0, 3)
                    .join(' · ')
                : 'Unavailable',
            ),
          ]
        : [];
    case 'fetch_ranked':
      return a.rankedKeywords?.length
        ? [candidateTable('ranked', 'Ranked keywords', a.rankedKeywords)]
        : [];
    case 'resolve_discovery_seeds':
      return a.discoveryContext
        ? [
            json(
              'discovery-context',
              'Resolved seeds',
              a.discoveryContext,
              `${a.discoveryContext.seedPhrases.length} seed(s) · ${a.discoveryContext.profileQuality} profile · ${a.discoveryContext.resolvedBy}`,
            ),
          ]
        : [];
    case 'expand_keyword_pool': {
      const out: ThoughtArtifact[] = [];
      if (a.adsIdeas?.length) {
        out.push(candidateTable('ads', 'Ad keyword ideas', a.adsIdeas));
      }
      if (a.relatedKeywords?.length) {
        out.push(candidateTable('related', 'Related / long-tail', a.relatedKeywords));
      }
      return out;
    }
    case 'spyfu_gaps':
      return a.spyfuGaps?.length
        ? [
            candidateTable(
              'spyfu',
              'Competitor gaps',
              a.spyfuGaps,
              `${a.spyfuGaps.length} gap keyword(s) competitors rank for`,
            ),
          ]
        : [];
    case 'geo_expansion':
      return a.geoCandidates?.length
        ? [candidateTable('geo', 'Geo-expanded', a.geoCandidates)]
        : [];
    case 'merge_score': {
      if (!a.scoredCandidates?.length) return [];
      const withSerp = a.scoredCandidates.filter((c) => c.serpFeatures?.length).length;
      return [
        candidateTable(
          'scored',
          'Scored pool',
          a.scoredCandidates,
          `${a.scoredCandidates.length} unique · ${withSerp} with SERP data`,
        ),
      ];
    }
    case 'infer_avatars':
      return a.suggestedAvatars?.length
        ? [
            {
              id: 'avatars',
              label: 'Suggested avatars',
              kind: 'markdown',
              summary: `${a.suggestedAvatars.length} avatar(s) suggested`,
              data: avatarsMarkdown(a.suggestedAvatars),
            },
            json('avatars-raw', 'Avatars (raw)', a.suggestedAvatars),
          ]
        : [];
    case 'serp_enrichment': {
      const enriched = (a.scoredCandidates ?? []).filter((c) => c.serpFeatures?.length);
      const out: ThoughtArtifact[] = [];
      if (enriched.length) {
        out.push(
          candidateTable(
            'serp',
            'SERP-enriched candidates',
            enriched,
            `${enriched.length} candidate(s) enriched`,
          ),
        );
      }
      if (a.serpSignals?.length) {
        const paaCount = a.serpSignals.reduce((n, s) => n + s.peopleAlsoAsk.length, 0);
        out.push({
          id: 'serp-signals',
          label: 'SERP signals (PAA + related)',
          kind: 'markdown',
          summary: `${paaCount} People-Also-Ask Q&A captured across ${a.serpSignals.length} keyword(s)`,
          data: serpSignalsMarkdown(a.serpSignals),
        });
        out.push(json('serp-signals-raw', 'SERP signals (raw)', a.serpSignals));
      }
      return out;
    }
    case 'confirm':
      return a.confirmedSnapshot
        ? [
            candidateTable(
              'confirmed-kw',
              'Confirmed keywords',
              a.confirmedSnapshot.confirmedKeywords,
              `${a.confirmedSnapshot.confirmedKeywords.length} confirmed`,
            ),
            json(
              'confirmed-avatars',
              'Confirmed avatars',
              a.confirmedSnapshot.confirmedAvatars,
              `${a.confirmedSnapshot.confirmedAvatars.length} confirmed`,
            ),
          ]
        : [];
    default:
      return [];
  }
}

function mapEvents(events: DiscoveryStepEvent[]): ThoughtEvent[] {
  return events.map((e) => {
    const parts: string[] = [e.status];
    if (e.note) parts.push(e.note);
    if (e.error) parts.push(e.error);
    const data: Record<string, unknown> = {};
    if (e.costUsd != null) data['costUsd'] = e.costUsd;
    if (e.apiCall) {
      data['provider'] = e.apiCall.provider;
      data['endpoint'] = e.apiCall.endpoint;
      if (e.apiCall.cached) data['cached'] = true;
      if (e.apiCall.rowCount != null) data['rows'] = e.apiCall.rowCount;
    }
    if (e.llm) {
      data['model'] = e.llm.model;
      if (e.llm.inputTokens != null) data['inputTokens'] = e.llm.inputTokens;
      if (e.llm.outputTokens != null) data['outputTokens'] = e.llm.outputTokens;
      if (e.llm.promptVersion) data['promptVersion'] = e.llm.promptVersion;
    }
    return {
      at: e.finishedAt ?? e.startedAt,
      level: e.status === 'failed' ? 'error' : 'info',
      message: parts.join(' — '),
      data: Object.keys(data).length ? data : undefined,
    } satisfies ThoughtEvent;
  });
}

export function discoveryRunToThought(run: KeywordDiscoveryRunDto): Thought {
  const eventsByStep = new Map<DiscoveryStepId, DiscoveryStepEvent[]>();
  for (const e of run.events) {
    const list = eventsByStep.get(e.step) ?? [];
    list.push(e);
    eventsByStep.set(e.step, list);
  }

  const currentIdx = DISCOVERY_STEP_ORDER.indexOf(run.currentStep as DiscoveryStepId);
  const allDone =
    run.status === 'ready' || run.status === 'confirmed' || run.currentStep === 'done';

  const steps: ThoughtStep[] = DISCOVERY_STEP_ORDER.map((step, idx) => {
    const evs = eventsByStep.get(step) ?? [];
    const started = evs.find((e) => e.status === 'started');
    const finished = [...evs]
      .reverse()
      .find((e) => e.status === 'completed' || e.status === 'failed');

    let status: ThoughtStepStatus;
    if (run.error?.step === step) {
      status = 'failed';
    } else if (evs.some((e) => e.status === 'completed')) {
      status = 'complete';
    } else if (evs.some((e) => e.status === 'failed')) {
      status = 'failed';
    } else if (allDone) {
      status = 'complete';
    } else if (currentIdx < 0) {
      status = 'pending';
    } else if (idx < currentIdx) {
      status = 'complete';
    } else if (idx === currentIdx) {
      status = run.status === 'discovering' ? 'running' : 'pending';
    } else {
      status = 'pending';
    }

    const meta = STEP_META[step];
    const stepCostUsd = sumCosts(evs.map((e) => e.costUsd));

    return {
      id: step,
      label: meta.label,
      summary: meta.summary,
      status,
      costUsd: stepCostUsd,
      startedAt: started?.startedAt,
      finishedAt: finished?.finishedAt,
      durationMs: finished?.durationMs,
      attempt: Math.max(1, evs.filter((e) => e.status === 'started').length),
      output: status === 'complete' || status === 'failed' ? stepOutput(step, run) : undefined,
      events: mapEvents(evs),
      error:
        run.error?.step === step
          ? { message: run.error.message, stack: run.error.stack }
          : undefined,
      promptVersion: finished ? evs.find((e) => e.llm?.promptVersion)?.llm?.promptVersion : undefined,
    } satisfies ThoughtStep;
  });

  for (let i = 1; i < steps.length; i++) {
    steps[i].input = steps[i - 1].output;
  }

  const currentStepId = (() => {
    if (run.status === 'ready' || run.status === 'confirmed' || run.currentStep === 'done') {
      return DISCOVERY_RESULT_STEP_ID;
    }
    if (run.status === 'pending' || run.status === 'discovering') {
      return resolveDiscoveryNavStepId(run);
    }
    return run.currentStep as string;
  })();

  const startedAt = run.events[0]?.startedAt ?? run.createdAt;
  const finishedAt = allDone || run.status === 'failed' ? run.updatedAt : undefined;

  const total = run.costSummary?.totalUsd;
  const candidateCount = run.artifacts.scoredCandidates?.length ?? 0;
  const stepCosts = sumCosts(steps.map((s) => s.costUsd));

  return {
    id: run.id,
    thinkerKind: 'keyword-discovery' as const,
    title: run.artifacts.profile?.businessName
      ? `Discovery · ${run.artifacts.profile.businessName}`
      : 'Keyword discovery',
    summary:
      total != null
        ? `Discovery pipeline · ${candidateCount} candidates · ${usd(total)}`
        : `Discovery pipeline · ${candidateCount} candidates`,
    totalCostUsd: total ?? stepCosts,
    status: runStatus(run),
    currentStepId,
    steps,
    inputs: [
      {
        portId: 'profile',
        label: 'Onboarding profile',
        artifact: run.artifacts.profile
          ? json('profile-in', 'Profile', run.artifacts.profile)
          : undefined,
      },
    ],
    outputs: [
      {
        portId: 'shortlist',
        label: 'Confirmed shortlist',
        artifact: run.artifacts.confirmedSnapshot
          ? json('shortlist-out', 'Confirmed', run.artifacts.confirmedSnapshot)
          : run.costSummary
            ? metric('cost-out', 'Run cost', usd(total), undefined, undefined, 'Total API + LLM cost')
            : undefined,
      },
    ],
    startedAt,
    finishedAt,
  } satisfies Thought;
}

/** Masthead subtitle for the embedded discovery runner. */
export function formatDiscoveryMastheadDeck(
  run: KeywordDiscoveryRunDto,
  siteLabel: string,
): string {
  const started = run.createdAt;
  const startLine = started
    ? `Keyword discovery · ${siteLabel} · started ${new Date(started).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })}`
    : `Keyword discovery · ${siteLabel}`;

  const candidates = run.artifacts.scoredCandidates?.length ?? 0;
  const avatars = run.artifacts.suggestedAvatars?.length ?? 0;

  if (run.status === 'ready' || run.status === 'confirmed') {
    return `${startLine} · ${candidates} keyword(s) · ${avatars} audience(s)`;
  }
  if (run.status === 'discovering' || run.status === 'pending') {
    const phase = DISCOVERY_NAV_PHASES.find((p) => p.steps.includes(run.currentStep as DiscoveryStepId));
    const phaseLabel = phase?.navLabel ?? run.currentStep;
    return `${startLine} · ${phaseLabel}`;
  }
  return startLine;
}
