import type { ProtopipeSiteContentPlan } from '@hive/contracts';
import {
  buildContentPlanStepVisualizer,
  buildStrategyRunResultView,
} from './content-plan-visualizer.util';

function minimalPlan(overrides: Partial<ProtopipeSiteContentPlan> = {}): ProtopipeSiteContentPlan {
  return {
    id: 'plan-1',
    siteId: 'site-1',
    version: 1,
    status: 'running',
    currentStep: 'strategy_intel',
    keywordTiers: { immediateFocus: [], longTerm: [], longTail: [] },
    clusters: [],
    pillars: [],
    calendar: [],
    focusStrategies: [],
    events: [],
    ...overrides,
  } as ProtopipeSiteContentPlan;
}

describe('content-plan-visualizer.util', () => {
  it('buildStrategyRunResultView exposes a tab per strategy aspect', () => {
    const view = buildStrategyRunResultView(
      minimalPlan({
        narrative: { headline: 'Win local search', why: 'Sequence pillars before long-tail.' },
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
        strategyIntel: {
          version: 1,
          keywordIntel: [
            {
              phrase: 'widgets guide',
              gapClusters: [{ theme: 'Pricing', gaps: ['No transparent pricing'], competitorBlindSpots: [] }],
              unansweredQuestions: ['How much do widgets cost?'],
              highestLeverageQuestion: 'What should buyers budget?',
            },
          ],
          clusterIntel: [
            {
              clusterName: 'Widgets',
              adjacentDomains: [],
              novelMechanism: 'Budget-first framing',
            },
          ],
          avatarIntel: [
            {
              avatarId: 'av-1',
              journeyStages: [
                {
                  stageName: 'Research',
                  emotionalState: 'uncertain',
                  keyQuestion: 'Which vendor?',
                  contentThatServes: ['Comparison guides'],
                  nextStage: 'Shortlist',
                },
              ],
              conversionPath: [],
              dropsOffWhen: [],
              emotionalArc: 'Anxious → confident',
            },
          ],
          thesisSeeds: [
            {
              phrase: 'widgets guide',
              workingTitle: 'Guide to widgets',
              thesisSeed: 'Buyers need budget clarity first.',
              coreCompetitorError: 'Competitors hide pricing.',
              mechanismApplication: 'Lead with total cost of ownership.',
              keyValidationQuestion: 'Does TCO beat sticker price?',
            },
          ],
        },
        backlog: [
          {
            workingTitle: 'Widget maintenance',
            suggestedKeyword: 'widget maintenance',
            intent: 'informational',
            articleType: 'guide',
            clusterRole: 'supporting',
            priority: 'medium',
            kind: 'new',
            proposedPublishAt: null,
          },
        ],
      }),
    );

    expect(view.tabs?.map((t) => t.id)).toEqual([
      'plan',
      'calendar',
      'keyword-intel',
      'clusters',
      'audience',
      'thesis',
      'backlog',
    ]);
    expect(view.defaultTabId).toBe('plan');
    expect(view.tabs?.find((t) => t.id === 'thesis')?.blocks.length).toBeGreaterThan(0);
  });

  it('buildContentPlanStepVisualizer returns detailed blocks for keyword intel phase', () => {
    const view = buildContentPlanStepVisualizer(
      minimalPlan({
        strategyIntel: {
          version: 1,
          keywordIntel: [
            {
              phrase: 'widgets guide',
              gapClusters: [{ theme: 'Pricing', gaps: ['No transparent pricing'], competitorBlindSpots: [] }],
              unansweredQuestions: ['How much do widgets cost?'],
              highestLeverageQuestion: 'What should buyers budget?',
            },
          ],
          clusterIntel: [],
          avatarIntel: [],
          thesisSeeds: [],
        },
      }),
      'intel:keyword',
      'done',
    );

    expect(view.title).toBe('Keyword intel');
    expect(view.blocks.length).toBeGreaterThan(0);
    expect(view.blocks.some((b) => b.kind === 'context-panel')).toBe(true);
  });

  it('buildContentPlanStepVisualizer returns pending state before a step runs', () => {
    const view = buildContentPlanStepVisualizer(minimalPlan(), 'audit', 'pending');
    expect(view.emptyMessage).toContain('not run yet');
    expect(view.blocks).toEqual([]);
  });

  it('buildContentPlanStepVisualizer returns tabbed view for strategy result step', () => {
    const plan = minimalPlan({
      narrative: { headline: 'Win local search', why: 'Sequence pillars before long-tail.' },
    });
    const view = buildContentPlanStepVisualizer(plan, 'strategy_result', 'running');
    expect(view.tabs?.length).toBe(7);
    expect(view.title).toBe('Strategy Result');
  });
});
