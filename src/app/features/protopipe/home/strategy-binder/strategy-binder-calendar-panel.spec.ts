import { describe, expect, it } from 'vitest';
import type { ProtopipeContentPlanCalendarItem, ProtopipeSiteContentPlan } from '@hive/contracts';
import { calendarDisplayTitle } from '../strategy/strategy.helpers';
import {
  buildQuarterCalendarFromPlan,
  initialQuarterKey,
  shiftQuarterKey,
} from '../strategy/strategy-content-calendar';
import { mapStrategyBinderView } from './strategy-binder.mapper';

function calendarItem(
  overrides: Partial<ProtopipeContentPlanCalendarItem> = {},
): ProtopipeContentPlanCalendarItem {
  return {
    workingTitle: 'Ev Charger Installations',
    suggestedKeyword: 'ev charger installations',
    intent: 'transactional',
    articleType: 'guide',
    clusterRole: 'pillar',
    priority: 'high',
    kind: 'new',
    proposedPublishAt: '2026-07-13',
    clusterName: 'EV Charger Installation',
    ...overrides,
  };
}

function minimalPlan(overrides: Partial<ProtopipeSiteContentPlan> = {}): ProtopipeSiteContentPlan {
  return {
    id: 'plan-1',
    siteId: 'site-1',
    version: 1,
    status: 'complete',
    currentStep: 'done',
    keywordTiers: { immediateFocus: [], longTerm: [], longTail: [] },
    clusters: [],
    pillars: [
      {
        clusterName: 'EV Charger Installation',
        pillarKeyword: 'ev charger installations',
        supportingCount: 1,
      },
    ],
    calendar: [calendarItem()],
    focusStrategies: [],
    events: [],
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  } as ProtopipeSiteContentPlan;
}

describe('calendarDisplayTitle', () => {
  it('prefers editorialTitle over workingTitle', () => {
    expect(
      calendarDisplayTitle(
        calendarItem({
          editorialTitle: 'How to Choose a Level 2 EV Charger Installer',
        }),
      ),
    ).toBe('How to Choose a Level 2 EV Charger Installer');
  });

  it('falls back to workingTitle then keyword', () => {
    expect(calendarDisplayTitle(calendarItem({ editorialTitle: '  ' }))).toBe(
      'Ev Charger Installations',
    );
    expect(
      calendarDisplayTitle(
        calendarItem({
          editorialTitle: undefined,
          workingTitle: '',
          suggestedKeyword: 'solar panel repair',
        }),
      ),
    ).toBe('solar panel repair');
  });
});

describe('buildQuarterCalendarFromPlan', () => {
  it('buckets stickies into the correct quarter month columns', () => {
    const plan = minimalPlan({
      calendar: [
        calendarItem({
          proposedPublishAt: '2026-07-13T12:00:00.000',
          editorialTitle: 'July EV Install Guide',
          workingTitle: 'Ev Charger Installations',
        }),
        calendarItem({
          proposedPublishAt: '2026-08-03T12:00:00.000',
          workingTitle: 'Solar Panel Maintenance',
          suggestedKeyword: 'solar panel maintenance',
          clusterName: 'Solar',
          clusterRole: 'supporting',
        }),
        calendarItem({
          proposedPublishAt: '2026-10-15T12:00:00.000',
          workingTitle: 'Outside Quarter',
          suggestedKeyword: 'outside',
        }),
      ],
    });

    const quarter = buildQuarterCalendarFromPlan(plan, '2026-Q3');
    expect(quarter.label).toBe('Q3 2026');
    expect(quarter.months.map((m) => m.shortLabel)).toEqual(['Jul', 'Aug', 'Sep']);
    expect(quarter.months[0].stickies[0].title).toBe('July EV Install Guide');
    expect(quarter.months[1].articleCount).toBe(1);
    expect(quarter.months[2].articleCount).toBe(0);
    expect(quarter.articleCount).toBe(2);
  });

  it('shifts quarter keys', () => {
    expect(shiftQuarterKey('2026-Q3', 1)).toBe('2026-Q4');
    expect(shiftQuarterKey('2026-Q4', 1)).toBe('2027-Q1');
    expect(shiftQuarterKey(initialQuarterKey(new Date('2026-07-09')), 0)).toBe('2026-Q3');
  });
});

describe('mapStrategyBinderView titles', () => {
  it('uses editorial titles for calendar and pillar articles', () => {
    const plan = minimalPlan({
      calendar: [
        calendarItem({
          editorialTitle: 'The Complete Guide to EV Charger Installation',
        }),
      ],
    });
    const vm = mapStrategyBinderView(plan, 'WRI', '');
    expect(vm.calendar[0].title).toBe('The Complete Guide to EV Charger Installation');
    expect(vm.pillars[0].articles[0]).toBe('The Complete Guide to EV Charger Installation');
  });
});
