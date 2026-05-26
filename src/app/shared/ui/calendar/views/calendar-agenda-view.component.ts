import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  input,
  output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { CalendarEventChipComponent } from '../calendar-event-chip.component';
import type { CalendarItem } from '../calendar.types';
import { DEFAULT_SOURCE_ICONS, DEFAULT_STATUS_COLORS } from '../calendar.types';
import { coerceDate, groupItemsByDay, isToday, toDayKey } from '../calendar-grid.util';

interface AgendaGroup<T> {
  key: string;
  date: Date;
  label: string;
  isToday: boolean;
  items: CalendarItem<T>[];
}

@Component({
  selector: 'app-calendar-agenda-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, CalendarEventChipComponent],
  templateUrl: './calendar-agenda-view.component.html',
  styleUrl: './calendar-agenda-view.component.scss',
})
export class CalendarAgendaViewComponent<T = unknown> {
  readonly items = input.required<readonly CalendarItem<T>[]>();
  /** Anchor date — agenda shows the month containing the cursor. */
  readonly cursor = input.required<Date>();
  readonly statusColors = input<Readonly<Record<string, string>>>(DEFAULT_STATUS_COLORS);
  readonly sourceIcons = input<Readonly<Record<string, string>>>(DEFAULT_SOURCE_ICONS);
  readonly chipTemplate = input<TemplateRef<{ $implicit: CalendarItem<T> }> | null>(null);

  readonly itemClick = output<CalendarItem<T>>();

  protected readonly groups = computed<AgendaGroup<T>[]>(() => {
    const c = this.cursor();
    const cursorMonth = c.getMonth();
    const cursorYear = c.getFullYear();
    const fmt = new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const grouped = groupItemsByDay(this.items());
    const out: AgendaGroup<T>[] = [];
    for (const [key, list] of grouped.entries()) {
      const dt = coerceDate(list[0].date);
      if (dt.getMonth() !== cursorMonth || dt.getFullYear() !== cursorYear) continue;
      out.push({
        key,
        date: dt,
        label: fmt.format(dt),
        isToday: isToday(dt),
        items: list,
      });
    }
    out.sort((a, b) => a.date.getTime() - b.date.getTime());
    return out;
  });

  protected readonly isEmpty = computed(() => this.groups().length === 0);

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

  protected trackGroup = (_: number, g: AgendaGroup<T>): string => g.key;
  protected trackItem = (_: number, item: CalendarItem<T>): string => item.id;

  /** Stable key for use in templates that need a day key from a Date. */
  protected dayKey(d: Date): string {
    return toDayKey(d);
  }
}
