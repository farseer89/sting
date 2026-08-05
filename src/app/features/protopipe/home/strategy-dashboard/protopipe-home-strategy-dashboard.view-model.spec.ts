import { describe, expect, it } from 'vitest';
import type { ProtopipeSiteContentPlan } from '@hive/contracts';
import { mapStrategyBinderView } from '../strategy-binder/strategy-binder.mapper';
import {
  buildStrategyCalendarRows,
  buildStrategyStepCards,
  buildStrategySummaryCards,
  buildStrategyWorkspaceCards,
  strategyDashboardStatusLabel,
  strategyPlanCapturedAt,
} from './protopipe-home-strategy-dashboard.view-model';

const plan = {
  generatedAt: '2026-08-04T12:00:00.000Z',
  pillars: [
    {
      clusterName: 'Emergency plumbing',
      pillarKeyword: 'emergency plumber maui',
      angle: 'Fast local response',
      supportingCount: 4,
    },
  ],
  calendar: [
    {
      workingTitle: 'What to do when a pipe bursts',
      suggestedKeyword: 'burst pipe repair',
      clusterName: 'Emergency plumbing',
      clusterRole: 'pillar' as const,
      proposedPublishAt: '2026-08-10T00:00:00.000Z',
      priority: 'high' as const,
      funnelStage: 'awareness' as const,
      intent: 'informational',
    },
  ],
  clusters: [{ name: 'Emergency plumbing', audienceLabel: 'Homeowners' }],
  keywordTiers: {
    immediateFocus: [
      {
        phrase: 'emergency plumber maui',
        searchVolume: 1200,
        difficulty: 42,
        intent: 'commercial',
      },
    ],
    longTerm: [],
    longTail: [],
  },
  narrative: {
    headline: 'Own emergency plumbing in Maui',
    why: 'Focus on high-intent local searches with pillar content.',
  },
  existingContent: {
    alreadyRanking: [{ phrase: 'maui plumber', position: 8 }],
    refreshCandidates: [],
  },
} as unknown as ProtopipeSiteContentPlan;

describe('protopipe strategy dashboard view model', () => {
  const vm = mapStrategyBinderView(plan, 'maui-plumbers.example', '');

  it('builds summary cards from binder stats', () => {
    const cards = buildStrategySummaryCards(vm);
    expect(cards.map((card) => card.label)).toEqual([
      'Pillars',
      'Scheduled',
      'Backlog',
      'Ranking now',
    ]);
    expect(cards[0]?.value).toBe('1');
    expect(cards[3]?.value).toBe('1');
  });

  it('builds section step cards', () => {
    const steps = buildStrategyStepCards(vm);
    expect(steps.map((step) => step.id)).toEqual(['pillars', 'calendar', 'backlog', 'keywords']);
    expect(steps[0]?.status).toBe('complete');
    expect(steps[0]?.metric).toBe('1 pillars');
  });

  it('builds workspace invite cards', () => {
    const cards = buildStrategyWorkspaceCards(vm);
    expect(cards[0]?.metric).toBe('Emergency plumbing');
    expect(cards[1]?.metric).toBe('What to do when a pipe bursts');
    expect(cards[2]?.metric).toBe('1 keywords');
  });

  it('builds calendar table rows', () => {
    const rows = buildStrategyCalendarRows(vm);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe('What to do when a pipe bursts');
    expect(rows[0]?.keyword).toBe('burst pipe repair');
  });

  it('formats plan status labels', () => {
    expect(
      strategyDashboardStatusLabel({
        isRunning: true,
        isComplete: false,
        hasFailed: false,
        capturedAt: null,
      }),
    ).toBe('Building your content plan…');

    expect(strategyPlanCapturedAt(plan)).toMatch(/Aug/);
  });
});
