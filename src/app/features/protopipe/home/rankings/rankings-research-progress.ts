import type { RankingsResearchProgress, Thought } from '@hive/contracts';

const PIPELINE_STAGES: RankingsResearchProgress['stage'][] = [
  'load_context',
  'resolve_markets',
  'fetch_rankings',
  'finalize',
];

export function rankingsResearchProgressFromThought(
  thought: Thought | null | undefined,
): RankingsResearchProgress | null {
  const raw = thought?.artifacts?.['researchProgress'];
  if (!raw || typeof raw !== 'object') return null;

  const progress = raw as Partial<RankingsResearchProgress>;
  if (
    !progress.stage ||
    typeof progress.done !== 'number' ||
    typeof progress.total !== 'number' ||
    !progress.updatedAt
  ) {
    return null;
  }

  if (!PIPELINE_STAGES.includes(progress.stage)) return null;

  return {
    stage: progress.stage,
    done: progress.done,
    total: progress.total,
    phrase: typeof progress.phrase === 'string' ? progress.phrase : undefined,
    updatedAt: progress.updatedAt,
  };
}

export function rankingsResearchProgressPercent(
  thought: Thought | null | undefined,
  progress: RankingsResearchProgress | null,
): number {
  if (thought?.status === 'complete') return 100;

  if (!progress) {
    if (thought?.status === 'pending') return 4;
    if (thought?.status === 'running') {
      const stepId = thought.currentStepId;
      if (stepId === 'finalize') return 96;
      if (stepId === 'fetch_rankings') return 12;
      if (stepId === 'resolve_markets') return 8;
      return 5;
    }
    return 0;
  }

  const stageIndex = PIPELINE_STAGES.indexOf(progress.stage);
  const stageBase = [4, 10, 12, 96][stageIndex] ?? 4;
  const stageSpan = [6, 2, 84, 4][stageIndex] ?? 10;

  if (progress.stage !== 'fetch_rankings' || progress.total <= 0) {
    return Math.min(99, stageBase + Math.round(stageSpan * 0.35));
  }

  const ratio = Math.min(1, Math.max(0, progress.done / progress.total));
  return Math.min(99, Math.round(stageBase + ratio * stageSpan));
}

export function rankingsResearchProgressLabel(
  thought: Thought | null | undefined,
  progress: RankingsResearchProgress | null,
): string {
  if (thought?.status === 'complete') return 'Research complete';

  if (!progress) {
    if (thought?.status === 'pending') return 'Starting rankings research…';
    return 'Researching rankings…';
  }

  switch (progress.stage) {
    case 'load_context':
      return 'Loading keywords and markets…';
    case 'resolve_markets':
      return 'Resolving ranking markets…';
    case 'finalize':
      return 'Finalizing rankings…';
    case 'fetch_rankings':
      if (progress.total <= 0) return 'Preparing SERP fetches…';
      if (progress.done <= 0) return 'Loading search metrics…';
      if (progress.phrase) {
        return `Researching “${progress.phrase}” (${progress.done}/${progress.total})`;
      }
      return `Capturing SERP snapshots (${progress.done}/${progress.total})`;
    default:
      return 'Researching rankings…';
  }
}

export function rankingsResearchProgressDetail(progress: RankingsResearchProgress | null): string {
  if (!progress || progress.stage !== 'fetch_rankings' || progress.total <= 0) {
    return 'Fetching live Google results for each keyword and market.';
  }
  const remaining = Math.max(progress.total - progress.done, 0);
  if (remaining === 0) return 'Wrapping up the last snapshots.';
  return `${remaining} snapshot${remaining === 1 ? '' : 's'} remaining across your keywords and markets.`;
}
