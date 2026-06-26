import { describe, expect, it } from 'vitest';
import type { Thought } from '@hive/contracts';
import { canRerunShireThought, THOUGHT_RUN_STALE_MS } from './thought-rerun.util';

describe('thought-rerun.util', () => {
  const base: Thought = {
    id: 'run-1',
    thinkerKind: 'article_generation',
    title: 'Article',
    status: 'running',
    steps: [],
    inputs: [],
    outputs: [],
    startedAt: new Date(Date.now() - THOUGHT_RUN_STALE_MS - 1000).toISOString(),
  };

  it('allows rerun when run is complete', () => {
    expect(canRerunShireThought({ ...base, status: 'complete' })).toBe(true);
  });

  it('blocks rerun on fresh running run', () => {
    expect(
      canRerunShireThought({
        ...base,
        startedAt: new Date().toISOString(),
      }),
    ).toBe(false);
  });

  it('allows rerun on stale running run', () => {
    expect(canRerunShireThought(base)).toBe(true);
  });
});
