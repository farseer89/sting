import type { Thought } from '@hive/contracts';

const ALIGNMENT_STAGE_PERCENT: Record<string, number> = {
  load_context: 22,
  match_pages: 62,
  persist: 86,
  finalize: 96,
};

export function keywordAlignmentProgressPercent(thought: Thought | null | undefined): number {
  if (!thought) return 0;
  if (thought.status === 'complete') return 100;
  if (thought.status === 'failed') return 0;
  if (thought.status === 'pending') return 8;
  return ALIGNMENT_STAGE_PERCENT[thought.currentStepId ?? ''] ?? 28;
}

export function keywordAlignmentProgressLabel(thought: Thought | null | undefined): string {
  if (!thought) return 'Preparing keyword alignment…';
  if (thought.status === 'pending') return 'Starting keyword alignment…';
  if (thought.status === 'complete') return 'Keyword alignment complete';
  if (thought.status === 'failed') return 'Keyword alignment failed';
  switch (thought.currentStepId) {
    case 'load_context':
      return 'Loading keywords and site audit…';
    case 'match_pages':
      return 'Matching keywords to audited pages…';
    case 'persist':
      return 'Saving keyword alignment snapshot…';
    case 'finalize':
      return 'Finalizing keyword fit…';
    default:
      return 'Running keyword alignment…';
  }
}

export function keywordAlignmentProgressDetail(thought: Thought | null | undefined): string {
  if (!thought || thought.status === 'pending') {
    return 'We compare confirmed keywords to your latest site audit and score page fit.';
  }
  return (
    thought.steps.find((step) => step.id === thought.currentStepId)?.summary ||
    thought.summary ||
    'Building missing-page, weak-match, and refresh-candidate facts for content planning.'
  );
}
