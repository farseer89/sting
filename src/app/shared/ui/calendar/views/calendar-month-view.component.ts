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
  buildMonthGrid,
  groupItemsByDay,
  type MonthGridDay,
  type WeekStart,
  weekdayLabels,
} from '../calendar-grid.util';

interface CellOverflow<T> {
  date: Date;
  items: CalendarItem<T>[];
}

@Component({
  selector: 'app-calendar-month-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, NgTemplateOutlet, CalendarEventChipComponent],
  templateUrl: './calendar-month-view.component.html',
  styleUrl: './calendar-month-view.component.scss',
})
export class CalendarMonthViewComponent<T = unknown> {
  readonly cursor = input.required<Date>();
  readonly items = input.required<readonly CalendarItem<T>[]>();
  readonly weekStartsOn = input<WeekStart>(0);
  readonly itemsPerDay = input<number>(3);
  readonly statusColors = input<Readonly<Record<string, string>>>(DEFAULT_STATUS_COLORS);
  readonly sourceIcons = input<Readonly<Record<string, string>>>(DEFAULT_SOURCE_ICONS);
  readonly showWeekends = input<boolean>(true);
  readonly chipTemplate = input<TemplateRef<{ $implicit: CalendarItem<T> }> | null>(null);

  readonly itemClick = output<CalendarItem<T>>();
  readonly cellClick = output<Date>();
  readonly overflowClick = output<CellOverflow<T>>();

  protected readonly grid = computed<MonthGridDay[]>(() =>
    buildMonthGrid(this.cursor(), this.weekStartsOn()),
  );

  private readonly byDay = computed(() => groupItemsByDay(this.items()));

  protected readonly weekdays = computed(() => weekdayLabels(this.weekStartsOn()));

  protected itemsForDay(key: string): CalendarItem<T>[] {
    return this.byDay().get(key) ?? [];
  }

  protected visibleItems(key: string): CalendarItem<T>[] {
    return this.itemsForDay(key).slice(0, this.itemsPerDay());
  }

  protected overflowCount(key: string): number {
    return Math.max(0, this.itemsForDay(key).length - this.itemsPerDay());
  }

  protected accentFor(item: CalendarItem<T>): string | undefined {
    if (!item.status) return undefined;
    return this.statusColors()[item.status];
  }

  protected sourceIconFor(item: CalendarItem<T>): string | undefined {
    if (!item.source) return undefined;
    return this.sourceIcons()[item.source];
  }

  protected onChipClick(item: CalendarItem<T>): void {
    this.itemClick.emit(item);
  }

  protected onCellClick(day: MonthGridDay): void {
    this.cellClick.emit(day.date);
  }

  protected onOverflowClick(event: Event, day: MonthGridDay): void {
    event.stopPropagation();
    this.overflowClick.emit({ date: day.date, items: this.itemsForDay(day.key) });
  }

  protected trackDay = (_: number, day: MonthGridDay): string => day.key;
  protected trackItem = (_: number, item: CalendarItem<T>): string => item.id;
}
