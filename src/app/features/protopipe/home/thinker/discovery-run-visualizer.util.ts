import type { ProtopipeKeywordDiscoveryRunDto } from '@hive/contracts';
import type { KeywordDiscoveryRunDto } from '../../lab/keyword-discovery/keyword-discovery-run.types';
import {
  DISCOVERY_NAV_PHASES,
  DISCOVERY_RESULT_STEP_ID,
  type DiscoveryNavPhaseId,
} from '../../lab/keyword-discovery/discovery-run-to-thought';
import type { BinderStepStatus } from './thinker-binder.mapper';
import type { StepVisualizerView, VisualizerBlock } from './article-run-visualizer.util';

export type DiscoveryVisualizerStep = DiscoveryNavPhaseId | typeof DISCOVERY_RESULT_STEP_ID;

export type DiscoveryResultTabId = 'keywords' | 'audiences' | 'context' | 'sources';

function num(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function pendingView(title: string): StepVisualizerView {
  return {
    title,
    emptyMessage: 'This phase has not run yet. Output will appear here as discovery progresses.',
    blocks: [],
  };
}

function candidateBlocks(
  label: string,
  candidates: { phrase: string; searchVolume?: number; fit?: number; intent?: string }[],
  limit = 8,
): VisualizerBlock[] {
  if (!candidates.length) return [];
  return candidates.slice(0, limit).map((c) => ({
    kind: 'meta-row' as const,
    label: c.phrase,
    value: num(c.searchVolume),
    hint: [c.intent, c.fit != null ? `${c.fit}% fit` : null].filter(Boolean).join(' · ') || undefined,
  }));
}

function buildSourcesPhaseBlocks(run: KeywordDiscoveryRunDto): VisualizerBlock[] {
  const a = run.artifacts;
  const blocks: VisualizerBlock[] = [
    {
      kind: 'meta-row',
      label: 'Business profile',
      value: a.profile?.businessName ?? a.profile?.services?.[0] ?? 'Loaded',
      hint: a.profile ? `${a.profile.services.length} service(s)` : undefined,
    },
    {
      kind: 'meta-row',
      label: 'GSC queries',
      value: `${a.gscQueries?.length ?? 0}`,
    },
    {
      kind: 'meta-row',
      label: 'Ranked keywords',
      value: `${a.rankedKeywords?.length ?? 0}`,
    },
    {
      kind: 'meta-row',
      label: 'Competitor gaps',
      value: `${a.spyfuGaps?.length ?? 0}`,
    },
  ];
  blocks.push(...candidateBlocks('Top GSC', a.gscQueries ?? [], 5));
  return blocks;
}

function buildExpansionPhaseBlocks(run: KeywordDiscoveryRunDto): VisualizerBlock[] {
  const a = run.artifacts;
  const blocks: VisualizerBlock[] = [];
  if (a.discoveryContext) {
    blocks.push({
      kind: 'meta-row',
      label: 'Resolved seeds',
      value: `${a.discoveryContext.seedPhrases.length}`,
      hint: `${a.discoveryContext.profileQuality} profile · ${a.discoveryContext.resolvedBy}`,
    });
  }
  blocks.push(
    {
      kind: 'meta-row',
      label: 'Ad ideas',
      value: `${a.adsIdeas?.length ?? 0}`,
    },
    {
      kind: 'meta-row',
      label: 'Geo expansion',
      value: `${a.geoCandidates?.length ?? 0}`,
    },
    {
      kind: 'meta-row',
      label: 'Related / long-tail',
      value: `${a.relatedKeywords?.length ?? 0}`,
    },
  );
  blocks.push(...candidateBlocks('Sample expansion', a.adsIdeas ?? [], 6));
  return blocks;
}

function buildScoringPhaseBlocks(run: KeywordDiscoveryRunDto): VisualizerBlock[] {
  const scored = run.artifacts.scoredCandidates ?? [];
  const withSerp = scored.filter((c) => c.serpFeatures?.length || c.serpItemTypes?.length).length;
  const blocks: VisualizerBlock[] = [
    {
      kind: 'meta-row',
      label: 'Scored pool',
      value: `${scored.length}`,
    },
    {
      kind: 'meta-row',
      label: 'SERP enriched',
      value: `${withSerp}`,
    },
  ];
  blocks.push(...candidateBlocks('Top scored', scored, 10));
  return blocks;
}

function contextNotesFromRun(run: KeywordDiscoveryRunDto): string[] {
  return run.events
    .filter((e) => e.step === 'extract_context_questions' && e.status === 'completed' && e.note)
    .map((e) => e.note as string);
}

function buildAudiencePhaseBlocks(run: KeywordDiscoveryRunDto): VisualizerBlock[] {
  const avatars = run.artifacts.suggestedAvatars ?? [];
  const notes = contextNotesFromRun(run);
  const blocks: VisualizerBlock[] = [];

  for (const avatar of avatars) {
    blocks.push({
      kind: 'context-panel',
      tone: 'strategy',
      label: avatar.intentCluster,
      text: avatar.description,
      items: avatar.exampleQueries?.slice(0, 4),
    });
  }

  if (notes.length) {
    blocks.push({ kind: 'heading', level: 3, text: 'Strategy context questions' });
    for (const note of notes) {
      blocks.push({ kind: 'paragraph', text: note });
    }
  }

  return blocks;
}

function buildKeywordsTabBlocks(run: KeywordDiscoveryRunDto): VisualizerBlock[] {
  const scored = [...(run.artifacts.scoredCandidates ?? [])]
    .sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0))
    .slice(0, 15);
  return candidateBlocks('Keyword', scored, 15);
}

function buildAudiencesTabBlocks(run: KeywordDiscoveryRunDto): VisualizerBlock[] {
  return buildAudiencePhaseBlocks(run);
}

function buildContextTabBlocks(run: KeywordDiscoveryRunDto): VisualizerBlock[] {
  const notes = contextNotesFromRun(run);
  if (!notes.length) return [];
  return notes.map((note) => ({ kind: 'paragraph' as const, text: note }));
}

function buildSourcesTabBlocks(run: KeywordDiscoveryRunDto): VisualizerBlock[] {
  return buildSourcesPhaseBlocks(run);
}

export function buildDiscoveryResultView(run: KeywordDiscoveryRunDto): StepVisualizerView {
  const candidates = run.artifacts.scoredCandidates?.length ?? 0;
  const avatars = run.artifacts.suggestedAvatars?.length ?? 0;

  const tabs = [
    {
      id: 'keywords' as const,
      label: 'Keywords',
      emptyMessage: 'Scored keywords appear after merge & score completes.',
      blocks: buildKeywordsTabBlocks(run),
    },
    {
      id: 'audiences' as const,
      label: 'Audiences',
      emptyMessage: 'Suggested avatars appear during audience inference.',
      blocks: buildAudiencesTabBlocks(run),
    },
    {
      id: 'context' as const,
      label: 'Context',
      emptyMessage: 'Discovery context questions appear at the end of the pipeline.',
      blocks: buildContextTabBlocks(run),
    },
    {
      id: 'sources' as const,
      label: 'Sources',
      emptyMessage: 'Source inputs populate during the Sources phase.',
      blocks: buildSourcesTabBlocks(run),
    },
  ];

  const defaultTabId =
    candidates > 0 ? 'keywords' : avatars > 0 ? 'audiences' : 'sources';

  return {
    title: 'Discovery Result',
    subtitle: `${candidates} keyword(s) · ${avatars} audience(s)`,
    blocks: [{ kind: 'kicker', text: run.artifacts.profile?.businessName ?? run.artifacts.profile?.services?.[0] ?? 'Keyword discovery' }],
    tabs,
    defaultTabId,
  };
}

const PHASE_BUILDERS: Record<
  DiscoveryNavPhaseId,
  { title: string; build: (run: KeywordDiscoveryRunDto) => VisualizerBlock[] }
> = {
  'discovery:sources': { title: 'Sources', build: buildSourcesPhaseBlocks },
  'discovery:expansion': { title: 'Expansion', build: buildExpansionPhaseBlocks },
  'discovery:scoring': { title: 'Scoring', build: buildScoringPhaseBlocks },
  'discovery:audience': { title: 'Audience', build: buildAudiencePhaseBlocks },
};

export function buildDiscoveryStepVisualizer(
  run: ProtopipeKeywordDiscoveryRunDto,
  step: DiscoveryVisualizerStep,
  stepStatus: BinderStepStatus,
): StepVisualizerView {
  const labRun = run as unknown as KeywordDiscoveryRunDto;
  if (step === DISCOVERY_RESULT_STEP_ID) {
    return buildDiscoveryResultView(labRun);
  }

  const meta = PHASE_BUILDERS[step as DiscoveryNavPhaseId];
  if (!meta) {
    return { title: 'Discovery', emptyMessage: 'Select a pipeline phase.', blocks: [] };
  }

  if (stepStatus === 'pending') {
    return pendingView(meta.title);
  }

  const blocks = meta.build(labRun);
  const phase = DISCOVERY_NAV_PHASES.find((p) => p.id === step);

  return {
    title: meta.title,
    subtitle: phase?.detail,
    emptyMessage: blocks.length ? undefined : `${meta.title} output will appear here as steps complete.`,
    blocks,
  };
}
