import type { ProtopipeSiteMentionSnapshot } from '@hive/contracts';
import {
  extractMentionOutput,
  mentionSnapshotToThought,
  mentionTrackingToThought,
} from './mention-tracking-run-to-thought';
import type { Thought } from '../thinker/thought.model';

describe('mention-tracking-run-to-thought', () => {
  const sampleOutput = {
    prompts: [
      {
        id: 'p1',
        text: 'best plumber in austin',
        promptType: 'generic' as const,
      },
    ],
    captures: [
      {
        promptId: 'p1',
        engine: 'gemini' as const,
        runIndex: 0,
        rawResponse: 'Try ABC Plumbing for reliable service.',
        capturedAt: '2026-07-30T00:00:00.000Z',
      },
    ],
    results: [
      {
        promptId: 'p1',
        engine: 'gemini' as const,
        runIndex: 0,
        brandMentioned: true,
        citedUrls: [],
        citedCompetitors: ['ABC Plumbing'],
        citedDomains: [],
      },
    ],
    summaryByType: {
      generic: { promptCount: 1, mentionRate: 1, consistencyScore: 1, topGap: undefined },
      local: { promptCount: 0, mentionRate: 0, consistencyScore: 0 },
      comparison: { promptCount: 0, mentionRate: 0, consistencyScore: 0 },
      brand_defense: { promptCount: 0, mentionRate: 0, consistencyScore: 0 },
    },
    disclaimer: 'sampled_estimate' as const,
    generatedAt: '2026-07-30T00:00:00.000Z',
  };

  it('extracts mention output from compat snapshot', () => {
    const snapshot: ProtopipeSiteMentionSnapshot = {
      id: 'run-1',
      siteId: 'site-1',
      version: 1,
      status: 'complete',
      output: sampleOutput,
      createdAt: '2026-07-30T00:00:00.000Z',
      updatedAt: '2026-07-30T00:05:00.000Z',
    };

    expect(extractMentionOutput(snapshot)).toEqual(sampleOutput);
  });

  it('projects snapshot into a Thought with enriched step outputs', () => {
    const thought = mentionSnapshotToThought({
      id: 'run-1',
      siteId: 'site-1',
      version: 1,
      status: 'complete',
      output: sampleOutput,
      createdAt: '2026-07-30T00:00:00.000Z',
      updatedAt: '2026-07-30T00:05:00.000Z',
    });

    expect(thought.thinkerKind).toBe('mention_tracking');
    expect(thought.steps).toHaveLength(5);
    expect(thought.steps[0]?.output?.[0]?.kind).toBe('table');
    expect(thought.steps[1]?.output?.[0]?.kind).toBe('markdown');
    expect(thought.steps[2]?.output?.[0]?.kind).toBe('table');
  });

  it('enriches a Shire Thought with mention artifacts', () => {
    const base: Thought = {
      id: 'run-1',
      thinkerKind: 'mention_tracking',
      title: 'Mention tracking',
      status: 'complete',
      steps: [
        {
          id: 'generate_prompts',
          label: 'Generate prompts',
          status: 'complete',
          attempt: 1,
          events: [],
        },
        {
          id: 'capture_responses',
          label: 'Capture responses',
          status: 'complete',
          attempt: 1,
          events: [],
        },
        {
          id: 'parse_mentions',
          label: 'Parse mentions',
          status: 'complete',
          attempt: 1,
          events: [],
        },
        {
          id: 'aggregate',
          label: 'Aggregate',
          status: 'complete',
          attempt: 1,
          events: [],
        },
        {
          id: 'finalize',
          label: 'Finalize',
          status: 'complete',
          attempt: 1,
          events: [],
        },
      ],
      inputs: [],
      outputs: [
        {
          portId: 'snapshot',
          label: 'Mention snapshot',
          artifact: {
            id: 'out',
            label: 'Output',
            kind: 'json',
            data: sampleOutput,
          },
        },
      ],
    };

    const enriched = mentionTrackingToThought(base);
    expect(enriched.steps[1]?.output?.[0]?.label).toBe('Gemini raw responses');
    expect(enriched.summary).toContain('100% mention rate');
  });
});
