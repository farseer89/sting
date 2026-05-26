import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  input,
  output,
} from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import { CalendarEventChipComponent } from '../calendar-event-chip.component';
import type { CalendarItem } from '../calendar.types';
import { DEFAULT_SOURCE_ICONS, DEFAULT_STATUS_COLORS } from '../calendar.types';
import {
  buildWeekGrid,
  groupItemsByDay,
  type MonthGridDay,
  type WeekStart,
} from '../calendar-grid.util';

interface StatusSummaryEntry {
  status: string;
  label: string;
  count: number;
  color: string;
}

const STATUS_LABELS: Readonly<Record<string, string>> = Object.freeze({
  suggested: 'suggested',
  draft: 'drafts',
  scheduled: 'scheduled',
  published: 'published',
  failed: 'failed',
});

/**
 * Week view — 7-day column layout with sticky day headers, today highlight,
 * and a status summary strip above the grid.
 *
 * Designed for day-bucketed content (drafts / scheduled / published posts),
 * not time-of-day events. Chips render in comfortable density with 2-line
 * title wrap to take advantage of the extra vertical real estate.
 */
@Component({
  selector: 'app-calendar-week-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, NgTemplateOutlet, CalendarEventChipComponent],
  templateUrl: './calendar-week-view.component.html',
  styleUrl: './calendar-week-view.component.scss',
})
export class CalendarWeekViewComponent<T = unknown> {
  readonly cursor = input.required<Date>();
  readonly items = input.required<readonly CalendarItem<T>[]>();
  readonly weekStartsOn = input<WeekStart>(0);
  readonly statusColors = input<Readonly<Record<string, string>>>(DEFAULT_STATUS_COLORS);
  readonly sourceIcons = input<Readonly<Record<string, string>>>(DEFAULT_SOURCE_ICONS);
  readonly chipTemplate = input<TemplateRef<{ $implicit: CalendarItem<T> }> | null>(null);

  readonly itemClick = output<CalendarItem<T>>();
  readonly cellClick = output<Date>();

  protected readonly grid = computed<MonthGridDay[]>(() =>
    buildWeekGrid(this.cursor(), this.weekStartsOn()),
  );

  private readonly byDay = computed(() => groupItemsByDay(this.items()));

  protected readonly summary = computed<StatusSummaryEntry[]>(() => {
    const counts = new Map<string, number>();
    const visibleKeys = new Set(this.grid().map((d) => d.key));
    for (const [key, bucket] of this.byDay()) {
      if (!visibleKeys.has(key)) continue;
      for (const it of bucket) {
        const status = it.status ?? 'other';
        counts.set(status, (counts.get(status) ?? 0) + 1);
      }
    }
    const palette = this.statusColors();
    return [...counts.entries()]
      .map(([status, count]) => ({
        status,
        count,
        label: STATUS_LABELS[status] ?? status,
        color: palette[status] ?? 'var(--p-text-muted-color, #6b7280)',
      }))
      .sort((a, b) => b.count - a.count);
  });

  protected readonly totalCount = computed(() =>
    this.summary().reduce((sum, s) => sum + s.count, 0),
  );

  protected itemsForDay(key: string): CalendarItem<T>[] {
    return this.byDay().get(key) ?? [];
  }

  protected accentFor(item: CalendarItem<T>): string | undefined {
    if (!item.status) return undefined;
    return this.statusColors()[item.status];
  }

  protected sourceIconFor(item: CalendarItem<T>): string | undefined {
    if (!item.source) return undefined;
    return this.sourceIcons()[item.source];
  }

  protected dayName(day: MonthGridDay): string {
    return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(day.date);
  }

  protected onChipClick(item: CalendarItem<T>): void {
    this.itemClick.emit(item);
  }

  protected onCellClick(day: MonthGridDay): void {
    this.cellClick.emit(day.date);
  }

  protected trackDay = (_: number, day: MonthGridDay): string => day.key;
  protected trackItem = (_: number, item: CalendarItem<T>): string => item.id;
  protected trackStatus = (_: number, entry: StatusSummaryEntry): string => entry.status;
}
