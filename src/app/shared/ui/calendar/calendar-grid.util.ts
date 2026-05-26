/**
 * Pure date math + grouping helpers for `<fw-calendar>`.
 *
 * All comparisons are local-timezone. Date keys are `YYYY-MM-DD` strings in
 * the user's local timezone so visual grouping matches what the user sees.
 *
 * See: Mothership/ai-plans/protopipe-content-pipeline-calendar.md
 */

import type { CalendarItem } from './calendar.types';

export type WeekStart = 0 | 1;

export interface MonthGridDay {
  /** Local-midnight Date for the cell. */
  date: Date;
  /** YYYY-MM-DD local key, useful for grouping / track-by. */
  key: string;
  /** Day-of-month number (1-31). */
  dayOfMonth: number;
  /** 0 = Sun … 6 = Sat (JS convention). */
  dayOfWeek: number;
  /** True when the cell belongs to the cursor's displayed month. */
  isCurrentMonth: boolean;
  /** True when the cell is the local "today". */
  isToday: boolean;
  /** True when Sat/Sun. */
  isWeekend: boolean;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Coerce Date | ISO string → Date. Returns a fresh Date instance. */
export function coerceDate(value: Date | string): Date {
  if (value instanceof Date) return new Date(value.getTime());
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${String(value)}`);
  }
  return parsed;
}

/** Local-midnight clone of the supplied date (does not mutate input). */
export function startOfDay(date: Date): Date {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  return d;
}

/** First day of the cursor's month (local TZ). */
export function startOfMonth(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

/** Last day of the cursor's month (local TZ). */
export function endOfMonth(date: Date): Date {
  const d = startOfMonth(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return d;
}

/** Add `n` months to `date` (handles negative). Returns a fresh Date. */
export function addMonths(date: Date, n: number): Date {
  const d = new Date(date.getTime());
  const targetMonth = d.getMonth() + n;
  d.setDate(1);
  d.setMonth(targetMonth);
  return d;
}

/** Add `n` days to `date`. Returns a fresh Date. */
export function addDays(date: Date, n: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + n);
  return d;
}

/** Add `n` weeks to `date`. Returns a fresh Date. */
export function addWeeks(date: Date, n: number): Date {
  return addDays(date, n * 7);
}

/**
 * First day of the week containing `date`, honoring `weekStartsOn`
 * (0 = Sun, 1 = Mon). Returns a local-midnight Date.
 */
export function startOfWeek(date: Date, weekStartsOn: WeekStart = 0): Date {
  const d = startOfDay(date);
  const offset = (d.getDay() - weekStartsOn + 7) % 7;
  return addDays(d, -offset);
}

/** True when the two dates fall on the same local-TZ calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** True when `date` is the local-TZ today. */
export function isToday(date: Date, now: Date = new Date()): boolean {
  return isSameDay(date, now);
}

/** `YYYY-MM-DD` local-TZ key used for grouping and track-by. */
export function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Build a 6×7 (42-cell) month grid for the cursor date.
 *
 * The grid always renders 6 weeks so the surface never resizes between
 * months. Days outside the cursor's month are marked `isCurrentMonth: false`
 * so the consumer can dim them.
 */
export function buildMonthGrid(
  cursor: Date,
  weekStartsOn: WeekStart = 0,
  now: Date = new Date(),
): MonthGridDay[] {
  const firstOfMonth = startOfMonth(cursor);
  const firstDow = firstOfMonth.getDay();
  const leadingDays = (firstDow - weekStartsOn + 7) % 7;
  const gridStart = addDays(firstOfMonth, -leadingDays);

  const days: MonthGridDay[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = addDays(gridStart, i);
    const dow = d.getDay();
    days.push({
      date: d,
      key: toDayKey(d),
      dayOfMonth: d.getDate(),
      dayOfWeek: dow,
      isCurrentMonth: d.getMonth() === cursor.getMonth() && d.getFullYear() === cursor.getFullYear(),
      isToday: isSameDay(d, now),
      isWeekend: dow === 0 || dow === 6,
    });
  }
  return days;
}

/** Bucket items into a `dayKey → items[]` map, sorted by date ascending within each day. */
export function groupItemsByDay<T>(items: readonly CalendarItem<T>[]): Map<string, CalendarItem<T>[]> {
  const byDay = new Map<string, CalendarItem<T>[]>();
  for (const item of items) {
    const dt = coerceDate(item.date);
    const key = toDayKey(dt);
    const bucket = byDay.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      byDay.set(key, [item]);
    }
  }
  for (const bucket of byDay.values()) {
    bucket.sort((a, b) => coerceDate(a.date).getTime() - coerceDate(b.date).getTime());
  }
  return byDay;
}

/**
 * Weekday short labels rotated for `weekStartsOn`.
 * Uses Intl.DateTimeFormat so labels follow the user's locale when supplied.
 */
export function weekdayLabels(weekStartsOn: WeekStart = 0, locale?: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const sundayBase = new Date(2024, 0, 7);
  const labels: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = addDays(sundayBase, (i + weekStartsOn) % 7);
    labels.push(fmt.format(d));
  }
  return labels;
}

/** Human month label, e.g. "May 2026". */
export function monthLabel(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}

/**
 * Build a 7-cell week grid containing the day for `cursor`, starting on
 * `weekStartsOn`. All cells are part of the cursor's week so
 * `isCurrentMonth` simply reflects whether the day's month equals the
 * cursor's month (lets the consumer dim month-boundary days subtly).
 */
export function buildWeekGrid(
  cursor: Date,
  weekStartsOn: WeekStart = 0,
  now: Date = new Date(),
): MonthGridDay[] {
  const weekStart = startOfWeek(cursor, weekStartsOn);
  const days: MonthGridDay[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = addDays(weekStart, i);
    const dow = d.getDay();
    days.push({
      date: d,
      key: toDayKey(d),
      dayOfMonth: d.getDate(),
      dayOfWeek: dow,
      isCurrentMonth:
        d.getMonth() === cursor.getMonth() && d.getFullYear() === cursor.getFullYear(),
      isToday: isSameDay(d, now),
      isWeekend: dow === 0 || dow === 6,
    });
  }
  return days;
}

/**
 * Human week label, e.g. "May 18 — 24, 2026" (same month) or
 * "Apr 27 — May 3, 2026" (spans months) or "Dec 28, 2025 — Jan 3, 2026"
 * (spans years).
 */
export function weekLabel(cursor: Date, weekStartsOn: WeekStart = 0, locale?: string): string {
  const start = startOfWeek(cursor, weekStartsOn);
  const end = addDays(start, 6);
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  const monthDay = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
  const dayOnly = new Intl.DateTimeFormat(locale, { day: 'numeric' });
  const monthDayYear = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (sameMonth) {
    return `${monthDay.format(start)} – ${dayOnly.format(end)}, ${end.getFullYear()}`;
  }
  if (sameYear) {
    return `${monthDay.format(start)} – ${monthDay.format(end)}, ${end.getFullYear()}`;
  }
  return `${monthDayYear.format(start)} – ${monthDayYear.format(end)}`;
}

/** Inclusive day count between two dates (local TZ). */
export function daysBetween(a: Date, b: Date): number {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(ms / MS_PER_DAY);
}
