import type {
  ProtopipeContentPlanCalendarItem,
  ProtopipeSiteContentPlan,
} from '@hive/contracts';
import { calendarDisplayTitle, calendarItemKey } from './strategy.helpers';

export type StrategyCalendarStatus = 'draft' | 'scheduled' | 'published' | 'research';

export interface StrategyCalendarSticky {
  itemKey: string;
  title: string;
  status: StrategyCalendarStatus;
  clusterName: string;
  hint?: string;
  isGap?: boolean;
}

export type StrategyCalendarViewMode = 'week' | 'month' | 'quarter';

/** Legacy map calendar — week + month only. */
export const STRATEGY_CALENDAR_VIEW_MODES: { id: 'week' | 'month'; label: string }[] = [
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'Month' },
];

/** Binder client calendar — week / month / quarter. */
export const BINDER_CALENDAR_ZOOM_MODES: { id: StrategyCalendarViewMode; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
];

export interface StrategyWeekCalendar {
  label: string;
  weekStartKey: string;
  weekdays: string[];
  days: StrategyCalendarCell[];
  articleCount: number;
  isCurrentWeek: boolean;
}

export interface StrategyCalendarCell {
  day: number | null;
  dateKey?: string;
  weekend: boolean;
  stickies: StrategyCalendarSticky[];
  isToday: boolean;
}

export interface StrategyContentCalendar {
  month: string;
  monthKey: string;
  weekdays: string[];
  weeks: StrategyCalendarCell[][];
  articleCount: number;
}

export interface StrategyQuarterMonthColumn {
  month: string;
  monthKey: string;
  shortLabel: string;
  stickies: Array<StrategyCalendarSticky & { dayLabel: string }>;
  articleCount: number;
}

export interface StrategyQuarterCalendar {
  label: string;
  quarterKey: string;
  months: StrategyQuarterMonthColumn[];
  articleCount: number;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

function calendarStatus(item: ProtopipeContentPlanCalendarItem, now = Date.now()): StrategyCalendarStatus {
  if (item.kind === 'refresh-existing') {
    return 'published';
  }
  if (!item.proposedPublishAt) {
    return 'research';
  }
  const when = new Date(item.proposedPublishAt).getTime();
  return when <= now ? 'published' : 'scheduled';
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function parseMonthKey(key: string): { year: number; month: number } {
  const [y, m] = key.split('-').map(Number);
  return { year: y, month: m };
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function sameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function weekLabel(weekStart: Date, today: Date): string {
  if (sameDate(startOfWeek(today), weekStart)) {
    return 'This week';
  }
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const startFmt = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endFmt = weekEnd.toLocaleDateString('en-US', {
    month: sameMonth ? undefined : 'short',
    day: 'numeric',
    year: weekStart.getFullYear() === weekEnd.getFullYear() ? undefined : 'numeric',
  });
  if (weekStart.getFullYear() !== weekEnd.getFullYear()) {
    return `${startFmt}, ${weekStart.getFullYear()} – ${endFmt}, ${weekEnd.getFullYear()}`;
  }
  return `${startFmt} – ${endFmt}${sameMonth ? '' : `, ${weekEnd.getFullYear()}`}`;
}

function avatarHint(
  plan: ProtopipeSiteContentPlan,
  avatarId?: string | null,
): string | undefined {
  if (!avatarId) return undefined;
  const avatar = plan.keywordStrategySnapshot?.confirmedAvatars?.find((a) => a.id === avatarId);
  if (!avatar) return undefined;
  const label = avatar.intentCluster || avatar.description;
  return label.length > 24 ? `${label.slice(0, 21)}…` : label;
}

function stickyHint(plan: ProtopipeSiteContentPlan, item: ProtopipeContentPlanCalendarItem): string | undefined {
  const parts: string[] = [];
  const audience = avatarHint(plan, item.avatarId);
  if (audience) parts.push(audience);
  if (item.funnelStage) parts.push(item.funnelStage);
  return parts.length ? parts.join(' · ') : undefined;
}

function indexPostsByDate(
  plan: ProtopipeSiteContentPlan,
  now = Date.now(),
): Map<string, StrategyCalendarSticky[]> {
  const byDate = new Map<string, StrategyCalendarSticky[]>();

  for (const item of plan.calendar) {
    if (!item.proposedPublishAt) {
      continue;
    }
    const d = new Date(item.proposedPublishAt);
    const key = toDateKey(d);
    const dayPosts = byDate.get(key) ?? [];
    dayPosts.push({
      itemKey: calendarItemKey(item),
      title: calendarDisplayTitle(item),
      status: calendarStatus(item, now),
      clusterName: item.clusterName ?? 'Unassigned',
      hint: stickyHint(plan, item),
      isGap: item.isGap,
    });
    byDate.set(key, dayPosts);
  }

  return byDate;
}

function buildWeekCalendar(
  postsByDate: Map<string, StrategyCalendarSticky[]>,
  weekStart: Date,
  today = new Date(),
): StrategyWeekCalendar {
  const days: StrategyCalendarCell[] = [];
  let articleCount = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dateKey = toDateKey(d);
    const stickies = postsByDate.get(dateKey) ?? [];
    articleCount += stickies.length;
    days.push({
      day: d.getDate(),
      dateKey,
      weekend: i === 0 || i === 6,
      stickies,
      isToday: sameDate(d, today),
    });
  }

  return {
    label: weekLabel(weekStart, today),
    weekStartKey: toDateKey(weekStart),
    weekdays: [...WEEKDAYS],
    days,
    articleCount,
    isCurrentWeek: sameDate(startOfWeek(today), weekStart),
  };
}

function buildMonthGrid(
  year: number,
  month: number,
  posts: Map<number, StrategyCalendarSticky[]>,
  today = new Date(),
): StrategyContentCalendar {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const cells: StrategyCalendarCell[] = [];

  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ day: null, weekend: false, stickies: [], isToday: false });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const weekdayIndex = (firstWeekday + day - 1) % 7;
    const isToday =
      today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === day;
    cells.push({
      day,
      dateKey: toDateKey(new Date(year, month - 1, day)),
      weekend: weekdayIndex === 0 || weekdayIndex === 6,
      stickies: posts.get(day) ?? [],
      isToday,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ day: null, weekend: false, stickies: [], isToday: false });
  }

  const weeks: StrategyCalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  let articleCount = 0;
  for (const stickies of posts.values()) {
    articleCount += stickies.length;
  }

  return {
    month: monthLabel(year, month),
    monthKey: monthKey(year, month),
    weekdays: [...WEEKDAYS],
    weeks,
    articleCount,
  };
}

/** Plan calendar items → premiere-style month grids (one per month with posts). */
export function planToContentCalendars(
  plan: ProtopipeSiteContentPlan,
  now = new Date(),
): {
  calendars: StrategyContentCalendar[];
  initialMonthKey: string;
  postsByDate: Map<string, StrategyCalendarSticky[]>;
  initialWeekStartKey: string;
} {
  const postsByDate = indexPostsByDate(plan, now.getTime());
  const byMonth = new Map<string, Map<number, StrategyCalendarSticky[]>>();

  for (const [dateKey, stickies] of postsByDate) {
    const d = parseDateKey(dateKey);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const key = monthKey(year, month);

    const monthPosts = byMonth.get(key) ?? new Map<number, StrategyCalendarSticky[]>();
    monthPosts.set(day, stickies);
    byMonth.set(key, monthPosts);
  }

  const sortedKeys = [...byMonth.keys()].sort();
  const calendars = sortedKeys.map((key) => {
    const { year, month } = parseMonthKey(key);
    return buildMonthGrid(year, month, byMonth.get(key)!, now);
  });

  const todayKey = monthKey(now.getFullYear(), now.getMonth() + 1);
  const initialMonthKey =
    sortedKeys.find((k) => k === todayKey) ??
    sortedKeys.find((k) => k >= todayKey) ??
    sortedKeys[0] ??
    todayKey;

  const initialWeekStartKey = toDateKey(startOfWeek(now));

  return { calendars, initialMonthKey, postsByDate, initialWeekStartKey };
}

export function buildWeekCalendarFromPlan(
  plan: ProtopipeSiteContentPlan,
  weekStartKey: string,
  now = new Date(),
): StrategyWeekCalendar {
  const postsByDate = indexPostsByDate(plan, now.getTime());
  return buildWeekCalendar(postsByDate, parseDateKey(weekStartKey), now);
}

function quarterKey(year: number, quarter: number): string {
  return `${year}-Q${quarter}`;
}

function parseQuarterKey(key: string): { year: number; quarter: number } {
  const match = /^(\d{4})-Q([1-4])$/.exec(key);
  if (!match) {
    const now = new Date();
    return { year: now.getFullYear(), quarter: Math.floor(now.getMonth() / 3) + 1 };
  }
  return { year: Number(match[1]), quarter: Number(match[2]) };
}

function quarterLabel(year: number, quarter: number): string {
  return `Q${quarter} ${year}`;
}

function shiftQuarterKey(key: string, delta: number): string {
  const { year, quarter } = parseQuarterKey(key);
  const absolute = year * 4 + (quarter - 1) + delta;
  const nextYear = Math.floor(absolute / 4);
  const nextQuarter = (absolute % 4) + 1;
  return quarterKey(nextYear, nextQuarter);
}

export function initialQuarterKey(now = new Date()): string {
  return quarterKey(now.getFullYear(), Math.floor(now.getMonth() / 3) + 1);
}

export function shiftWeekStartKey(weekStartKey: string, deltaWeeks: number): string {
  const d = parseDateKey(weekStartKey);
  d.setDate(d.getDate() + deltaWeeks * 7);
  return toDateKey(d);
}

export function shiftMonthKey(key: string, deltaMonths: number): string {
  const { year, month } = parseMonthKey(key);
  const absolute = year * 12 + (month - 1) + deltaMonths;
  const nextYear = Math.floor(absolute / 12);
  const nextMonth = (absolute % 12) + 1;
  return monthKey(nextYear, nextMonth);
}

export { shiftQuarterKey };

/** Build a quarter overview: three month columns with dated stickies. */
export function buildQuarterCalendarFromPlan(
  plan: ProtopipeSiteContentPlan,
  activeQuarterKey: string,
  now = new Date(),
): StrategyQuarterCalendar {
  const postsByDate = indexPostsByDate(plan, now.getTime());
  const { year, quarter } = parseQuarterKey(activeQuarterKey);
  const startMonth = (quarter - 1) * 3 + 1;
  const months: StrategyQuarterMonthColumn[] = [];
  let articleCount = 0;

  for (let i = 0; i < 3; i += 1) {
    const month = startMonth + i;
    const key = monthKey(year, month);
    const stickies: Array<StrategyCalendarSticky & { dayLabel: string }> = [];

    for (const [dateKey, dayStickies] of postsByDate) {
      if (!dateKey.startsWith(key)) continue;
      const day = Number(dateKey.slice(-2));
      const dayLabel = new Date(year, month - 1, day).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      for (const sticky of dayStickies) {
        stickies.push({ ...sticky, dayLabel });
      }
    }

    stickies.sort((a, b) => a.dayLabel.localeCompare(b.dayLabel));
    articleCount += stickies.length;
    months.push({
      month: monthLabel(year, month),
      monthKey: key,
      shortLabel: new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short' }),
      stickies,
      articleCount: stickies.length,
    });
  }

  return {
    label: quarterLabel(year, quarter),
    quarterKey: activeQuarterKey,
    months,
    articleCount,
  };
}

/** Build a single month grid even when that month has no posts yet. */
export function buildMonthCalendarFromPlan(
  plan: ProtopipeSiteContentPlan,
  activeMonthKey: string,
  now = new Date(),
): StrategyContentCalendar {
  const postsByDate = indexPostsByDate(plan, now.getTime());
  const { year, month } = parseMonthKey(activeMonthKey);
  const byDay = new Map<number, StrategyCalendarSticky[]>();

  for (const [dateKey, stickies] of postsByDate) {
    if (!dateKey.startsWith(activeMonthKey)) continue;
    const day = Number(dateKey.slice(-2));
    byDay.set(day, stickies);
  }

  return buildMonthGrid(year, month, byDay, now);
}
