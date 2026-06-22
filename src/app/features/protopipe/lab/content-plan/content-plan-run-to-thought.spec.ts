import type { ProtopipeSiteContentPlan } from '@hive/contracts';
import { contentPlanRunToThought } from './content-plan-run-to-thought';

function minimalPlan(overrides: Partial<ProtopipeSiteContentPlan> = {}): ProtopipeSiteContentPlan {
  return {
    id: 'plan1',
    siteId: 'site1',
    version: 1,
    status: 'complete',
    currentStep: 'done',
    events: [
      {
        step: 'audit',
        status: 'started',
        startedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        step: 'audit',
        status: 'completed',
        startedAt: '2026-01-01T00:00:00.000Z',
        finishedAt: '2026-01-01T00:00:05.000Z',
        durationMs: 5000,
        note: '12 page(s) scanned via sitemap',
      },
      {
        step: 'score_tier',
        status: 'completed',
        startedAt: '2026-01-01T00:00:05.000Z',
        finishedAt: '2026-01-01T00:00:08.000Z',
        durationMs: 3000,
      },
      {
        step: 'cluster',
        status: 'completed',
        startedAt: '2026-01-01T00:00:08.000Z',
        finishedAt: '2026-01-01T00:00:20.000Z',
        durationMs: 12000,
      },
      {
        step: 'unify',
        status: 'completed',
        startedAt: '2026-01-01T00:00:20.000Z',
        finishedAt: '2026-01-01T00:00:35.000Z',
        durationMs: 15000,
      },
      {
        step: 'deep_scan',
        status: 'completed',
        startedAt: '2026-01-01T00:00:35.000Z',
        finishedAt: '2026-01-01T00:01:00.000Z',
        durationMs: 25000,
        note: '5 calendar keyword(s) scanned',
      },
      {
        step: 'strategy_intel',
        status: 'completed',
        startedAt: '2026-01-01T00:01:00.000Z',
        finishedAt: '2026-01-01T00:01:30.000Z',
        durationMs: 30000,
        note: '3 keyword(s), 1 cluster(s), 2 backlog item(s)',
      },
    ],
    keywordTiers: {
      immediateFocus: [
        {
          phrase: 'emergency plumber',
          opportunityScore: 80,
          tier: 'immediate_focus',
          source: 'plan',
        },
      ],
      longTerm: [],
      longTail: [],
    },
    clusters: [
      {
        name: 'Emergency',
        pillarKeyword: 'emergency plumber',
        dominantIntent: 'transactional',
        members: [{ phrase: 'emergency plumber', role: 'pillar' }],
      },
    ],
    focusStrategies: [],
    pillars: [
      {
        clusterName: 'Emergency',
        pillarKeyword: 'emergency plumber',
        supportingCount: 0,
      },
    ],
    calendar: [
      {
        workingTitle: 'Emergency plumber guide',
        suggestedKeyword: 'emergency plumber',
        intent: 'transactional',
        articleType: 'guide',
        clusterRole: 'pillar',
        priority: 'high',
        kind: 'new',
        proposedPublishAt: '2026-02-01',
        funnelStage: 'decision',
      },
    ],
    existingContent: {
      source: 'sitemap',
      scannedCount: 12,
      pages: [],
      refreshCandidates: [],
      alreadyRanking: [],
    },
    narrative: { headline: 'Own emergency search', why: 'High-intent local demand' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:01:00.000Z',
    ...overrides,
  };
}

describe('contentPlanRunToThought', () => {
  it('maps all pipeline steps with artifacts', () => {
    const thought = contentPlanRunToThought(minimalPlan());
    expect(thought.thinkerKind).toBe('content-plan');
    expect(thought.title).toBe('Content plan · v1');
    expect(thought.status).toBe('complete');
    expect(thought.steps.map((s) => s.id)).toEqual([
      'audit',
      'score_tier',
      'cluster',
      'unify',
      'deep_scan',
      'strategy_intel',
    ]);
    expect(thought.currentStepId).toBe('strategy_result');
    expect(thought.steps.every((s) => s.status === 'complete')).toBe(true);
    expect(thought.steps.find((s) => s.id === 'unify')?.output?.length).toBeGreaterThan(0);
  });

  it('maps strategy intel phase sub-steps for side nav', () => {
    const thought = contentPlanRunToThought(minimalPlan());
    const intel = thought.steps.find((s) => s.id === 'strategy_intel');
    expect(intel?.subSteps?.some((s) => s.id === 'intel:keyword')).toBe(true);
    expect(intel?.subSteps?.some((s) => s.id === 'intel:thesis')).toBe(true);
    expect(intel?.subSteps?.some((s) => s.id === 'intel:backlog')).toBe(true);
    expect(intel?.output?.length).toBeGreaterThan(0);
  });

  it('includes score tier description and per-keyword sub-steps', () => {
    const thought = contentPlanRunToThought(
      minimalPlan({
        keywordStrategySnapshot: {
          confirmedKeywords: [
            { phrase: 'emergency plumber', avatarId: 'a1' },
            { phrase: 'drain cleaning', avatarId: 'a1' },
          ],
          confirmedAvatars: [{ id: 'a1', description: 'Homeowner' }],
        },
        keywordTiers: {
          immediateFocus: [
            {
              phrase: 'emergency plumber',
              opportunityScore: 80,
              tier: 'immediate_focus',
              source: 'plan',
              searchVolume: 1200,
              difficulty: 35,
            },
          ],
          longTerm: [
            {
              phrase: 'drain cleaning',
              opportunityScore: 55,
              tier: 'long_term',
              source: 'plan',
              searchVolume: 800,
              difficulty: 48,
            },
          ],
          longTail: [],
        },
      }),
    );
    const score = thought.steps.find((s) => s.id === 'score_tier');
    expect(score?.description).toContain('opportunity');
    expect(score?.subSteps?.some((s) => s.id === 'score:load')).toBe(true);
    expect(score?.subSteps?.some((s) => s.label === 'emergency plumber')).toBe(true);
  });

  it('maps strategy intel sub-steps from live progress while running', () => {
    const thought = contentPlanRunToThought(
      minimalPlan({
        status: 'running',
        currentStep: 'strategy_intel',
        progress: { stage: 'thesis_seeds', scanned: 4, total: 12 },
        events: [
          {
            step: 'audit',
            status: 'completed',
            startedAt: '2026-01-01T00:00:00.000Z',
            finishedAt: '2026-01-01T00:00:05.000Z',
          },
          {
            step: 'score_tier',
            status: 'completed',
            startedAt: '2026-01-01T00:00:05.000Z',
            finishedAt: '2026-01-01T00:00:08.000Z',
          },
          {
            step: 'cluster',
            status: 'completed',
            startedAt: '2026-01-01T00:00:08.000Z',
            finishedAt: '2026-01-01T00:00:20.000Z',
          },
          {
            step: 'unify',
            status: 'completed',
            startedAt: '2026-01-01T00:00:20.000Z',
            finishedAt: '2026-01-01T00:00:35.000Z',
          },
          {
            step: 'deep_scan',
            status: 'completed',
            startedAt: '2026-01-01T00:00:35.000Z',
            finishedAt: '2026-01-01T00:01:00.000Z',
          },
          {
            step: 'strategy_intel',
            status: 'started',
            startedAt: '2026-01-01T00:01:00.000Z',
          },
        ],
      }),
    );
    const intel = thought.steps.find((s) => s.id === 'strategy_intel');
    expect(intel?.status).toBe('running');
    expect(intel?.summary).toBe('Thesis seeds · 5 of 12');
    expect(intel?.subSteps?.find((s) => s.id === 'intel:thesis')?.status).toBe('running');
    expect(intel?.subSteps?.find((s) => s.id === 'intel:backlog')?.status).toBe('pending');
    expect(intel?.subSteps?.find((s) => s.id === 'intel:keyword')?.status).toBe('complete');
  });

  it('surfaces failed run on active step', () => {
    const thought = contentPlanRunToThought(
      minimalPlan({
        status: 'failed',
        currentStep: 'cluster',
        error: 'LLM categorization failed',
        events: [
          {
            step: 'audit',
            status: 'completed',
            startedAt: '2026-01-01T00:00:00.000Z',
            finishedAt: '2026-01-01T00:00:05.000Z',
          },
          {
            step: 'score_tier',
            status: 'completed',
            startedAt: '2026-01-01T00:00:05.000Z',
            finishedAt: '2026-01-01T00:00:08.000Z',
          },
          {
            step: 'cluster',
            status: 'failed',
            startedAt: '2026-01-01T00:00:08.000Z',
            finishedAt: '2026-01-01T00:00:10.000Z',
            error: 'LLM categorization failed',
          },
        ],
      }),
    );
    expect(thought.status).toBe('failed');
    expect(thought.steps.find((s) => s.id === 'cluster')?.status).toBe('failed');
  });
});
