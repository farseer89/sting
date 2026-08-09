import type { Thought } from '@hive/contracts';
import { describe, expect, it } from 'vitest';
import {
  keywordAlignmentProgressDetail,
  keywordAlignmentProgressLabel,
  keywordAlignmentProgressPercent,
} from './keyword-alignment-progress';

describe('keywordAlignmentProgress', () => {
  const baseThought = (patch: Partial<Thought> = {}): Thought =>
    ({
      id: 'run-1',
      thinkerKind: 'keyword_alignment_audit',
      title: 'Keyword alignment audit',
      status: 'running',
      steps: [{ id: 'match_pages', label: 'Match pages', status: 'running', summary: '3 missing' }],
      inputs: [],
      outputs: [],
      ...patch,
    }) as Thought;

  it('maps running steps into progress percent and labels', () => {
    const thought = baseThought({ currentStepId: 'match_pages' });
    expect(keywordAlignmentProgressPercent(thought)).toBe(62);
    expect(keywordAlignmentProgressLabel(thought)).toContain('Matching keywords');
    expect(keywordAlignmentProgressDetail(thought)).toBe('3 missing');
  });

  it('returns complete state at 100%', () => {
    const thought = baseThought({ status: 'complete' });
    expect(keywordAlignmentProgressPercent(thought)).toBe(100);
    expect(keywordAlignmentProgressLabel(thought)).toBe('Keyword alignment complete');
  });
});
