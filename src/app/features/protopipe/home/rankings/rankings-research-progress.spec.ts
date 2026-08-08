import type { RankingsResearchProgress, Thought } from '@hive/contracts';
import {
  rankingsResearchProgressDetail,
  rankingsResearchProgressFromThought,
  rankingsResearchProgressLabel,
  rankingsResearchProgressPercent,
} from './rankings-research-progress';

describe('rankingsResearchProgress', () => {
  const baseThought = (patch: Partial<Thought> = {}): Thought =>
    ({
      id: 'run-1',
      thinkerKind: 'rankings_baseline',
      title: 'Rankings research',
      status: 'running',
      steps: [],
      inputs: [],
      outputs: [],
      ...patch,
    }) as Thought;

  it('reads progress from run artifacts', () => {
    const progress: RankingsResearchProgress = {
      stage: 'fetch_rankings',
      done: 3,
      total: 12,
      phrase: 'maui hotels',
      updatedAt: '2026-08-08T12:00:00.000Z',
    };

    expect(
      rankingsResearchProgressFromThought(
        baseThought({ artifacts: { researchProgress: progress } }),
      ),
    ).toEqual(progress);
  });

  it('maps fetch progress into a mid-run percent', () => {
    const thought = baseThought({
      currentStepId: 'fetch_rankings',
      artifacts: {
        researchProgress: {
          stage: 'fetch_rankings',
          done: 6,
          total: 12,
          updatedAt: '2026-08-08T12:00:00.000Z',
        },
      },
    });
    const progress = rankingsResearchProgressFromThought(thought);

    expect(rankingsResearchProgressPercent(thought, progress)).toBe(54);
    expect(rankingsResearchProgressLabel(thought, progress)).toContain('6/12');
  });

  it('returns complete state at 100%', () => {
    const thought = baseThought({ status: 'complete' });
    expect(rankingsResearchProgressPercent(thought, null)).toBe(100);
    expect(rankingsResearchProgressLabel(thought, null)).toBe('Research complete');
  });

  it('describes remaining snapshots', () => {
    expect(
      rankingsResearchProgressDetail({
        stage: 'fetch_rankings',
        done: 4,
        total: 10,
        updatedAt: '2026-08-08T12:00:00.000Z',
      }),
    ).toBe('6 snapshots remaining across your keywords and markets.');
  });
});
