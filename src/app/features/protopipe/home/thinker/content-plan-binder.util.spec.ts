import { describe, expect, it } from 'vitest';
import type { ProtopipeSiteContentPlan } from '@hive/contracts';
import type { ThoughtStep } from '../../lab/thinker/thought.model';
import { mapStrategyIntelNavSteps, mapStrategyResultNavStep } from './content-plan-binder.util';
import type { BinderStepView } from './thinker-binder.mapper';

function minimalPlan(overrides: Partial<ProtopipeSiteContentPlan> = {}): ProtopipeSiteContentPlan {
  return {
    id: 'plan-1',
    siteId: 'site-1',
    version: 1,
    status: 'complete',
    currentStep: 'done',
    keywordTiers: { immediateFocus: [], longTerm: [], longTail: [] },
    clusters: [],
    pillars: [{ name: 'Widgets', angle: 'Budget-first', memberKeywords: ['widgets'] }],
    calendar: [
      {
        workingTitle: 'Guide to widgets',
        suggestedKeyword: 'widgets guide',
        intent: 'informational',
        articleType: 'guide',
        clusterRole: 'pillar',
        priority: 'high',
        kind: 'new',
        proposedPublishAt: '2026-07-01',
      },
    ],
    focusStrategies: [],
    events: [],
    ...overrides,
  } as ProtopipeSiteContentPlan;
}

describe('content-plan-binder.util', () => {
  it('marks strategy intel phases done only when plan payload exists', () => {
    const plan = minimalPlan({
      strategyIntel: {
        version: 1,
        keywordIntel: [
          {
            phrase: 'widgets guide',
            gapClusters: [],
            unansweredQuestions: ['How much?'],
            highestLeverageQuestion: 'Budget?',
          },
        ],
        clusterIntel: [],
        avatarIntel: [],
        thesisSeeds: [],
      },
    });
    const intelThought = {
      id: 'strategy_intel',
      label: 'Strategy intel',
      status: 'complete',
      attempt: 1,
      events: [],
    } as ThoughtStep;
    const intelMapped = {
      id: 'strategy_intel',
      num: '06',
      label: 'Strategy intel',
      status: 'done',
      subSteps: [],
      events: [],
      llmCalls: [],
      rawJson: '{}',
    } as BinderStepView;

    const steps = mapStrategyIntelNavSteps(plan, intelThought, intelMapped);
    expect(steps.find((s) => s.id === 'intel:keyword')?.status).toBe('done');
    expect(steps.find((s) => s.id === 'intel:cluster')?.status).toBe('pending');
    expect(steps.find((s) => s.id === 'intel:keyword')?.outputArtifact?.kind).toBe('json');
    expect(steps.find((s) => s.id === 'intel:keyword')?.rawJson).toContain('widgets guide');
  });

  it('keeps intel phases pending when strategyIntel is missing even if parent is done', () => {
    const plan = minimalPlan({ strategyIntel: undefined });
    const intelMapped = {
      id: 'strategy_intel',
      num: '06',
      label: 'Strategy intel',
      status: 'done',
      subSteps: [
        { id: 'intel:keyword', num: '01', label: 'Keyword', status: 'done' as const },
      ],
      events: [],
      llmCalls: [],
      rawJson: '{}',
    } as BinderStepView;

    const steps = mapStrategyIntelNavSteps(plan, undefined, intelMapped);
    expect(steps.every((s) => s.status === 'pending')).toBe(true);
  });

  it('exposes full strategy payload on Strategy Result output/raw', () => {
    const plan = minimalPlan({
      strategyIntel: {
        version: 1,
        keywordIntel: [
          {
            phrase: 'widgets guide',
            gapClusters: [],
            unansweredQuestions: [],
            highestLeverageQuestion: 'Budget?',
          },
        ],
        clusterIntel: [],
        avatarIntel: [],
        thesisSeeds: [],
      },
    });
    const result = mapStrategyResultNavStep(plan, []);
    expect(result.status).toBe('done');
    expect(result.outputArtifact?.preview).toContain('strategyIntel');
    expect(result.rawJson).toContain('widgets guide');
    expect(result.subSteps?.some((s) => s.id === 'raw' && s.status === 'done')).toBe(true);
  });
});
