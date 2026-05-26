import { describe, expect, it } from 'vitest';
import type { CalendarItem } from './calendar.types';
import {
  DEFAULT_STATUS_COLORS,
  GHOST_STATUSES,
  resolveVariant,
} from './calendar.types';
import {
  addDays,
  addMonths,
  addWeeks,
  buildMonthGrid,
  buildWeekGrid,
  coerceDate,
  daysBetween,
  endOfMonth,
  groupItemsByDay,
  isSameDay,
  isToday,
  monthLabel,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toDayKey,
  weekLabel,
  weekdayLabels,
} from './calendar-grid.util';

const FIXED_TODAY = new Date(2026, 4, 26);

function item(
  id: string,
  date: Date | string,
  overrides: Partial<CalendarItem<{ tag: string }>> = {},
): CalendarItem<{ tag: string }> {
  return { id, date, title: `Item ${id}`, data: { tag: id }, ...overrides };
}

describe('calendar.types', () => {
  it('DEFAULT_STATUS_COLORS covers the five pipeline statuses', () => {
    expect(Object.keys(DEFAULT_STATUS_COLORS).sort()).toEqual(
      ['draft', 'failed', 'published', 'scheduled', 'suggested'].sort(),
    );
  });

  it('GHOST_STATUSES marks suggested as ghost by default', () => {
    expect(GHOST_STATUSES.has('suggested')).toBe(true);
    expect(GHOST_STATUSES.has('draft')).toBe(false);
  });

  describe('resolveVariant', () => {
    it('honors explicit variant override', () => {
      expect(resolveVariant(item('a', FIXED_TODAY, { variant: 'ghost', status: 'published' }))).toBe(
        'ghost',
      );
      expect(resolveVariant(item('b', FIXED_TODAY, { variant: 'solid', status: 'suggested' }))).toBe(
        'solid',
      );
    });

    it('infers ghost from suggested status', () => {
      expect(resolveVariant(item('a', FIXED_TODAY, { status: 'suggested' }))).toBe('ghost');
    });

    it('defaults to solid', () => {
      expect(resolveVariant(item('a', FIXED_TODAY))).toBe('solid');
      expect(resolveVariant(item('b', FIXED_TODAY, { status: 'published' }))).toBe('solid');
    });
  });
});

describe('calendar-grid.util — core helpers', () => {
  it('coerceDate accepts Date instances without mutation', () => {
    const d = new Date(2026, 4, 26, 10, 30);
    const out = coerceDate(d);
    expect(out).not.toBe(d);
    expect(out.getTime()).toBe(d.getTime());
  });

  it('coerceDate parses ISO strings', () => {
    const out = coerceDate('2026-05-26T10:30:00Z');
    expect(out instanceof Date).toBe(true);
    expect(Number.isNaN(out.getTime())).toBe(false);
  });

  it('coerceDate throws on garbage input', () => {
    expect(() => coerceDate('not-a-date')).toThrow();
  });

  it('startOfDay zeros the time portion', () => {
    const out = startOfDay(new Date(2026, 4, 26, 15, 30, 45, 123));
    expect(out.getHours()).toBe(0);
    expect(out.getMinutes()).toBe(0);
    expect(out.getSeconds()).toBe(0);
    expect(out.getMilliseconds()).toBe(0);
    expect(out.getDate()).toBe(26);
  });

  it('startOfMonth → first day of month', () => {
    const out = startOfMonth(new Date(2026, 4, 26));
    expect(out.getDate()).toBe(1);
    expect(out.getMonth()).toBe(4);
  });

  it('endOfMonth → last day of month (handles 28/29/30/31)', () => {
    expect(endOfMonth(new Date(2026, 1, 5)).getDate()).toBe(28);
    expect(endOfMonth(new Date(2024, 1, 5)).getDate()).toBe(29);
    expect(endOfMonth(new Date(2026, 3, 5)).getDate()).toBe(30);
    expect(endOfMonth(new Date(2026, 4, 5)).getDate()).toBe(31);
  });

  it('addMonths handles year rollover and negative', () => {
    expect(addMonths(new Date(2026, 11, 15), 1).getMonth()).toBe(0);
    expect(addMonths(new Date(2026, 11, 15), 1).getFullYear()).toBe(2027);
    expect(addMonths(new Date(2026, 0, 15), -1).getMonth()).toBe(11);
    expect(addMonths(new Date(2026, 0, 15), -1).getFullYear()).toBe(2025);
  });

  it('addMonths anchors to day-1 to avoid Jan-31 + 1 = Mar 3 surprises', () => {
    const out = addMonths(new Date(2026, 0, 31), 1);
    expect(out.getMonth()).toBe(1);
    expect(out.getDate()).toBe(1);
  });

  it('addDays handles month and year rollover', () => {
    expect(addDays(new Date(2026, 4, 30), 5).getDate()).toBe(4);
    expect(addDays(new Date(2026, 4, 30), 5).getMonth()).toBe(5);
    expect(addDays(new Date(2026, 11, 31), 1).getFullYear()).toBe(2027);
  });

  it('isSameDay ignores time of day', () => {
    expect(isSameDay(new Date(2026, 4, 26, 0, 0), new Date(2026, 4, 26, 23, 59))).toBe(true);
    expect(isSameDay(new Date(2026, 4, 26), new Date(2026, 4, 27))).toBe(false);
  });

  it('isToday compares against supplied "now"', () => {
    expect(isToday(new Date(2026, 4, 26), FIXED_TODAY)).toBe(true);
    expect(isToday(new Date(2026, 4, 27), FIXED_TODAY)).toBe(false);
  });

  it('toDayKey produces zero-padded YYYY-MM-DD', () => {
    expect(toDayKey(new Date(2026, 0, 3))).toBe('2026-01-03');
    expect(toDayKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('daysBetween is inclusive at midnight', () => {
    expect(daysBetween(new Date(2026, 4, 26), new Date(2026, 4, 26))).toBe(0);
    expect(daysBetween(new Date(2026, 4, 26), new Date(2026, 4, 29))).toBe(3);
    expect(daysBetween(new Date(2026, 4, 29), new Date(2026, 4, 26))).toBe(-3);
  });
});

describe('calendar-grid.util — buildMonthGrid', () => {
  it('returns exactly 42 cells', () => {
    expect(buildMonthGrid(FIXED_TODAY).length).toBe(42);
  });

  it('Sunday-start: first cell is the Sunday on or before day-1', () => {
    const grid = buildMonthGrid(new Date(2026, 4, 26), 0);
    expect(grid[0].dayOfWeek).toBe(0);
  });

  it('Monday-start: first cell is the Monday on or before day-1', () => {
    const grid = buildMonthGrid(new Date(2026, 4, 26), 1);
    expect(grid[0].dayOfWeek).toBe(1);
  });

  it('includes day-1 of the cursor month', () => {
    const grid = buildMonthGrid(new Date(2026, 4, 26));
    const dayOne = grid.find((d) => d.dayOfMonth === 1 && d.isCurrentMonth);
    expect(dayOne).toBeDefined();
  });

  it('marks today when the cursor month contains today', () => {
    const grid = buildMonthGrid(FIXED_TODAY, 0, FIXED_TODAY);
    const todayCell = grid.find((d) => d.isToday);
    expect(todayCell?.dayOfMonth).toBe(26);
    expect(todayCell?.isCurrentMonth).toBe(true);
  });

  it('marks no today when cursor month is different from now', () => {
    const grid = buildMonthGrid(new Date(2026, 7, 15), 0, FIXED_TODAY);
    expect(grid.some((d) => d.isToday)).toBe(false);
  });

  it('flags weekends correctly', () => {
    const grid = buildMonthGrid(FIXED_TODAY);
    const sundays = grid.filter((d) => d.dayOfWeek === 0);
    const saturdays = grid.filter((d) => d.dayOfWeek === 6);
    expect(sundays.every((d) => d.isWeekend)).toBe(true);
    expect(saturdays.every((d) => d.isWeekend)).toBe(true);
    expect(grid.filter((d) => d.dayOfWeek === 3).every((d) => !d.isWeekend)).toBe(true);
  });

  it('produces stable YYYY-MM-DD keys', () => {
    const grid = buildMonthGrid(new Date(2026, 4, 26));
    expect(grid[0].key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Set(grid.map((d) => d.key)).size).toBe(42);
  });

  it('flags out-of-month cells correctly at month boundaries', () => {
    const grid = buildMonthGrid(new Date(2026, 4, 15));
    const outOfMonth = grid.filter((d) => !d.isCurrentMonth);
    expect(outOfMonth.length).toBeGreaterThan(0);
    expect(outOfMonth.every((d) => d.date.getMonth() !== 4)).toBe(true);
  });
});

describe('calendar-grid.util — groupItemsByDay', () => {
  it('buckets items into their local-TZ day', () => {
    const items = [
      item('a', new Date(2026, 4, 26, 9)),
      item('b', new Date(2026, 4, 26, 17)),
      item('c', new Date(2026, 4, 27, 8)),
    ];
    const grouped = groupItemsByDay(items);
    expect(grouped.get('2026-05-26')?.map((i) => i.id)).toEqual(['a', 'b']);
    expect(grouped.get('2026-05-27')?.map((i) => i.id)).toEqual(['c']);
  });

  it('sorts items within a day ascending by time', () => {
    const items = [
      item('late', new Date(2026, 4, 26, 17)),
      item('early', new Date(2026, 4, 26, 9)),
      item('mid', new Date(2026, 4, 26, 12)),
    ];
    const grouped = groupItemsByDay(items);
    expect(grouped.get('2026-05-26')?.map((i) => i.id)).toEqual(['early', 'mid', 'late']);
  });

  it('accepts ISO string dates', () => {
    const items = [item('a', '2026-05-26T10:00:00')];
    const grouped = groupItemsByDay(items);
    expect(grouped.get('2026-05-26')?.length).toBe(1);
  });

  it('returns an empty map for no items', () => {
    expect(groupItemsByDay([]).size).toBe(0);
  });
});

describe('calendar-grid.util — week helpers', () => {
  it('addWeeks shifts by 7-day multiples', () => {
    expect(addWeeks(new Date(2026, 4, 26), 1).getDate()).toBe(2);
    expect(addWeeks(new Date(2026, 4, 26), 1).getMonth()).toBe(5);
    expect(addWeeks(new Date(2026, 4, 26), -2).getDate()).toBe(12);
    expect(addWeeks(new Date(2026, 4, 26), -2).getMonth()).toBe(4);
  });

  it('startOfWeek (Sunday) lands on the prior Sunday', () => {
    const tuesday = new Date(2026, 4, 26);
    const start = startOfWeek(tuesday, 0);
    expect(start.getDay()).toBe(0);
    expect(start.getDate()).toBe(24);
  });

  it('startOfWeek (Monday) lands on the prior Monday', () => {
    const tuesday = new Date(2026, 4, 26);
    const start = startOfWeek(tuesday, 1);
    expect(start.getDay()).toBe(1);
    expect(start.getDate()).toBe(25);
  });

  it('startOfWeek is idempotent when already on the start day', () => {
    const sunday = new Date(2026, 4, 24);
    expect(startOfWeek(sunday, 0).getDate()).toBe(24);
  });

  it('buildWeekGrid returns exactly 7 cells', () => {
    expect(buildWeekGrid(FIXED_TODAY).length).toBe(7);
  });

  it('buildWeekGrid first cell respects weekStartsOn', () => {
    expect(buildWeekGrid(FIXED_TODAY, 0)[0].dayOfWeek).toBe(0);
    expect(buildWeekGrid(FIXED_TODAY, 1)[0].dayOfWeek).toBe(1);
  });

  it('buildWeekGrid contains the cursor day', () => {
    const grid = buildWeekGrid(FIXED_TODAY);
    expect(grid.some((d) => isSameDay(d.date, FIXED_TODAY))).toBe(true);
  });

  it('buildWeekGrid marks today when the week contains today', () => {
    const grid = buildWeekGrid(FIXED_TODAY, 0, FIXED_TODAY);
    expect(grid.filter((d) => d.isToday).length).toBe(1);
    expect(grid.find((d) => d.isToday)?.dayOfMonth).toBe(26);
  });

  it('buildWeekGrid produces unique sequential keys', () => {
    const grid = buildWeekGrid(FIXED_TODAY);
    const keys = grid.map((d) => d.key);
    expect(new Set(keys).size).toBe(7);
    for (let i = 1; i < grid.length; i += 1) {
      expect(daysBetween(grid[i - 1].date, grid[i].date)).toBe(1);
    }
  });

  it('weekLabel formats same-month range compactly', () => {
    const label = weekLabel(new Date(2026, 4, 19), 0, 'en-US');
    expect(label).toMatch(/May.*17.*23.*2026/);
  });

  it('weekLabel formats cross-month range', () => {
    const label = weekLabel(new Date(2026, 4, 1), 0, 'en-US');
    expect(label).toMatch(/Apr.*May.*2026/);
  });

  it('weekLabel formats cross-year range', () => {
    const label = weekLabel(new Date(2025, 11, 31), 0, 'en-US');
    expect(label).toContain('2025');
    expect(label).toContain('2026');
  });
});

describe('calendar-grid.util — labels', () => {
  it('weekdayLabels returns 7 entries', () => {
    expect(weekdayLabels(0).length).toBe(7);
    expect(weekdayLabels(1).length).toBe(7);
  });

  it('weekdayLabels rotates when weekStartsOn=1', () => {
    const sundayStart = weekdayLabels(0, 'en-US');
    const mondayStart = weekdayLabels(1, 'en-US');
    expect(mondayStart[0]).toBe(sundayStart[1]);
    expect(mondayStart[6]).toBe(sundayStart[0]);
  });

  it('monthLabel renders month + year', () => {
    const label = monthLabel(new Date(2026, 4, 26), 'en-US');
    expect(label).toMatch(/May.*2026/);
  });
});
