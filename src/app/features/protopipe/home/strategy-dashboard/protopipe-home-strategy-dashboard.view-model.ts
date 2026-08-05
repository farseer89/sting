import type { ProtopipeSiteContentPlan } from '@hive/contracts';
import type { StrategyBinderViewModel } from '../strategy-binder/strategy-binder.mapper';
import type { StrategySection } from '../strategy-binder/protopipe-home-strategy-binder.component';

export type StrategyDashboardStepStatus = 'ready' | 'complete';

export type StrategyDashboardStepIcon = 'pillars' | 'calendar' | 'backlog' | 'keywords';

export interface StrategyDashboardStepCard {
  id: StrategySection;
  title: string;
  metric: string;
  hint: string;
  status: StrategyDashboardStepStatus;
  statusLabel: string;
  icon: StrategyDashboardStepIcon;
}

export interface StrategyDashboardSummaryCard {
  id: string;
  label: string;
  value: string;
  hint: string;
}

export interface StrategyDashboardWorkspaceCard {
  id: string;
  title: string;
  metric: string;
  hint: string;
  target: StrategySection;
  empty: boolean;
}

export interface StrategyDashboardCalendarRow {
  id: string;
  title: string;
  keyword: string;
  type: string;
  cluster: string;
  publishAt: string;
  priority: string;
}

export interface StrategyDashboardPillarRow {
  id: string;
  name: string;
  keyword: string;
  articleCount: number;
  intent: string;
}

export interface StrategyDashboardWinRow {
  id: string;
  phrase: string;
  position: string;
}

const CALENDAR_TABLE_LIMIT = 12;
const PILLAR_PREVIEW_LIMIT = 6;
const WIN_PREVIEW_LIMIT = 6;

function formatVolume(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—';
  return value.toLocaleString();
}

export function strategyDashboardStatusLabel(input: {
  isRunning: boolean;
  isComplete: boolean;
  hasFailed: boolean;
  capturedAt: string | null;
}): string {
  if (input.isRunning) return 'Building your content plan…';
  if (input.hasFailed) return 'Build needs attention';
  if (input.isComplete && input.capturedAt) return `Updated ${input.capturedAt}`;
  if (input.isComplete) return 'Content plan ready';
  return 'Generate a plan from your confirmed keywords';
}

export function buildStrategySummaryCards(vm: StrategyBinderViewModel): StrategyDashboardSummaryCard[] {
  return [
    {
      id: 'pillars',
      label: 'Pillars',
      value: String(vm.stats.pillars),
      hint: vm.stats.pillars === 1 ? 'Topic cluster' : 'Topic clusters',
    },
    {
      id: 'scheduled',
      label: 'Scheduled',
      value: String(vm.stats.scheduled),
      hint: vm.calendarDeck,
    },
    {
      id: 'backlog',
      label: 'Backlog',
      value: String(vm.stats.backlog),
      hint: vm.stats.backlog > 0 ? 'Ideas to schedule later' : 'No backlog yet',
    },
    {
      id: 'wins',
      label: 'Ranking now',
      value: String(vm.stats.existingWins),
      hint:
        vm.stats.existingWins > 0 ? 'Keywords already on page one' : 'No current wins captured',
    },
  ];
}

export function buildStrategyStepCards(vm: StrategyBinderViewModel): StrategyDashboardStepCard[] {
  const complete = (count: number): StrategyDashboardStepStatus =>
    count > 0 ? 'complete' : 'ready';

  return [
    {
      id: 'pillars',
      title: 'Content pillars',
      metric: vm.stats.pillars > 0 ? `${vm.stats.pillars} pillars` : 'Review pillars',
      hint: vm.stats.pillars > 0 ? 'Topic clusters and angles' : 'Opens after plan build',
      status: complete(vm.stats.pillars),
      statusLabel: vm.stats.pillars > 0 ? 'Ready' : 'Empty',
      icon: 'pillars',
    },
    {
      id: 'calendar',
      title: 'Content calendar',
      metric: vm.stats.scheduled > 0 ? `${vm.stats.scheduled} scheduled` : 'Open calendar',
      hint: vm.calendarDeck,
      status: complete(vm.stats.scheduled),
      statusLabel: vm.stats.scheduled > 0 ? 'Ready' : 'Empty',
      icon: 'calendar',
    },
    {
      id: 'backlog',
      title: 'Idea backlog',
      metric: vm.stats.backlog > 0 ? `${vm.stats.backlog} ideas` : 'No backlog',
      hint: vm.stats.backlog > 0 ? 'Unscheduled article ideas' : 'Everything is scheduled',
      status: complete(vm.stats.backlog),
      statusLabel: vm.stats.backlog > 0 ? 'Ready' : 'Empty',
      icon: 'backlog',
    },
    {
      id: 'keywords',
      title: 'Keyword tiers',
      metric: vm.stats.keywords > 0 ? `${vm.stats.keywords} keywords` : 'Open keywords',
      hint: 'Immediate, long-term, and long-tail',
      status: complete(vm.stats.keywords),
      statusLabel: vm.stats.keywords > 0 ? 'Ready' : 'Empty',
      icon: 'keywords',
    },
  ];
}

export function buildStrategyWorkspaceCards(
  vm: StrategyBinderViewModel,
): StrategyDashboardWorkspaceCard[] {
  const topPillar = vm.pillars[0];
  const nextCalendar = vm.calendar[0];
  const immediateCount = vm.keywords.filter((kw) => kw.tier === 'immediate').length;

  return [
    {
      id: 'pillar-focus',
      title: 'Lead pillar',
      metric: topPillar?.name ?? 'No pillars yet',
      hint: topPillar
        ? `${topPillar.keyword} · ${topPillar.supportingCount} articles`
        : 'Build your plan to see topic clusters',
      target: 'pillars',
      empty: !topPillar,
    },
    {
      id: 'next-article',
      title: 'Next article',
      metric: nextCalendar?.title ?? 'Nothing scheduled',
      hint: nextCalendar
        ? `${nextCalendar.publishAt} · ${nextCalendar.keyword}`
        : 'Schedule from backlog or pillars',
      target: 'calendar',
      empty: !nextCalendar,
    },
    {
      id: 'keyword-focus',
      title: 'Immediate focus',
      metric: immediateCount > 0 ? `${immediateCount} keywords` : 'No immediate tier',
      hint:
        immediateCount > 0
          ? vm.keywords.find((kw) => kw.tier === 'immediate')?.phrase ?? 'Highest priority tier'
          : 'Keyword tiers appear after build',
      target: 'keywords',
      empty: immediateCount === 0,
    },
  ];
}

export function buildStrategyCalendarRows(
  vm: StrategyBinderViewModel,
): StrategyDashboardCalendarRow[] {
  return vm.calendar.slice(0, CALENDAR_TABLE_LIMIT).map((item) => ({
    id: item.key,
    title: item.title,
    keyword: item.keyword,
    type: item.type,
    cluster: item.cluster,
    publishAt: item.publishAt,
    priority: item.priority,
  }));
}

export function buildStrategyPillarRows(vm: StrategyBinderViewModel): StrategyDashboardPillarRow[] {
  return vm.pillars.slice(0, PILLAR_PREVIEW_LIMIT).map((pillar) => ({
    id: pillar.id,
    name: pillar.name,
    keyword: pillar.keyword,
    articleCount: pillar.supportingCount,
    intent: pillar.intent,
  }));
}

export function buildStrategyWinRows(vm: StrategyBinderViewModel): StrategyDashboardWinRow[] {
  return vm.existingWins.slice(0, WIN_PREVIEW_LIMIT).map((win, index) => ({
    id: `${win.phrase}-${index}`,
    phrase: win.phrase,
    position: `#${win.position}`,
  }));
}

export function strategyPlanCapturedAt(plan: ProtopipeSiteContentPlan | null | undefined): string | null {
  if (!plan?.generatedAt) return null;
  const date = new Date(plan.generatedAt);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatKeywordVolume(value: number): string {
  return formatVolume(value);
}
