import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { ProtopipeSiteContentPlan } from '@hive/contracts';
import { ProtopipeHomeSidePanelService } from '../protopipe-home-side-panel.service';
import { ProtopipeHomeWriterViewState } from '../protopipe-home-writer-view.state';
import { ProtopipeHomeStrategyViewState } from './protopipe-home-strategy-view.state';
import { calendarItemKey } from './strategy.helpers';
import {
  buildWeekCalendarFromPlan,
  planToContentCalendars,
  STRATEGY_CALENDAR_VIEW_MODES,
  type StrategyCalendarViewMode,
  type StrategyContentCalendar,
} from './strategy-content-calendar';

@Component({
  selector: 'app-strategy-content-calendar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './strategy-content-calendar.component.html',
  styleUrl: './strategy-content-calendar.component.scss',
})
export class StrategyContentCalendarComponent {
  private readonly viewState = inject(ProtopipeHomeStrategyViewState);
  private readonly sidePanel = inject(ProtopipeHomeSidePanelService);
  private readonly writerView = inject(ProtopipeHomeWriterViewState);

  readonly plan = input.required<ProtopipeSiteContentPlan>();

  readonly viewModes = STRATEGY_CALENDAR_VIEW_MODES;
  readonly viewMode = signal<StrategyCalendarViewMode>('week');
  readonly monthKey = signal<string | null>(null);
  readonly weekStartKey = signal<string | null>(null);

  readonly calendarBundle = computed(() => planToContentCalendars(this.plan()));

  readonly calendars = computed(() => this.calendarBundle().calendars);

  readonly activeWeekStartKey = computed(
    () => this.weekStartKey() ?? this.calendarBundle().initialWeekStartKey,
  );

  readonly activeWeek = computed(() =>
    buildWeekCalendarFromPlan(this.plan(), this.activeWeekStartKey()),
  );

  readonly activeCalendar = computed((): StrategyContentCalendar | null => {
    const list = this.calendars();
    if (list.length === 0) {
      return null;
    }
    const key = this.monthKey() ?? this.calendarBundle().initialMonthKey;
    return list.find((c) => c.monthKey === key) ?? list[0];
  });

  readonly monthIndex = computed(() => {
    const cal = this.activeCalendar();
    if (!cal) {
      return -1;
    }
    return this.calendars().findIndex((c) => c.monthKey === cal.monthKey);
  });

  readonly canGoPrevMonth = computed(() => this.monthIndex() > 0);
  readonly canGoNextMonth = computed(() => {
    const idx = this.monthIndex();
    return idx >= 0 && idx < this.calendars().length - 1;
  });

  readonly canGoPrevWeek = computed(() => true);
  readonly canGoNextWeek = computed(() => true);

  readonly navLabel = computed(() =>
    this.viewMode() === 'week' ? this.activeWeek().label : (this.activeCalendar()?.month ?? ''),
  );

  readonly metaLabel = computed(() => {
    if (this.viewMode() === 'week') {
      const count = this.activeWeek().articleCount;
      return `${count} article${count === 1 ? '' : 's'} this week`;
    }
    const cal = this.activeCalendar();
    if (!cal) {
      return '';
    }
    return `${cal.articleCount} articles this month`;
  });

  readonly selectedItemKey = computed(() => {
    const article = this.viewState.selectedArticle();
    return article ? calendarItemKey(article) : null;
  });

  setViewMode(mode: StrategyCalendarViewMode): void {
    this.viewMode.set(mode);
  }

  prevPeriod(): void {
    if (this.viewMode() === 'week') {
      this.shiftWeek(-7);
      return;
    }
    this.prevMonth();
  }

  nextPeriod(): void {
    if (this.viewMode() === 'week') {
      this.shiftWeek(7);
      return;
    }
    this.nextMonth();
  }

  canGoPrev(): boolean {
    return this.viewMode() === 'week' ? this.canGoPrevWeek() : this.canGoPrevMonth();
  }

  canGoNext(): boolean {
    return this.viewMode() === 'week' ? this.canGoNextWeek() : this.canGoNextMonth();
  }

  prevMonth(): void {
    const idx = this.monthIndex();
    if (idx <= 0) {
      return;
    }
    this.monthKey.set(this.calendars()[idx - 1].monthKey);
  }

  nextMonth(): void {
    const idx = this.monthIndex();
    const list = this.calendars();
    if (idx < 0 || idx >= list.length - 1) {
      return;
    }
    this.monthKey.set(list[idx + 1].monthKey);
  }

  openArticle(itemKey: string): void {
    const item = this.plan().calendar.find((entry) => calendarItemKey(entry) === itemKey);
    if (!item) {
      return;
    }
    this.writerView.clearPanel();
    this.viewState.openArticle(item);
    this.sidePanel.ensureOpen();
  }

  isStickySelected(itemKey: string): boolean {
    return this.selectedItemKey() === itemKey;
  }

  private shiftWeek(days: number): void {
    const current = this.parseDateKey(this.activeWeekStartKey());
    current.setDate(current.getDate() + days);
    this.weekStartKey.set(this.toDateKey(current));
  }

  private parseDateKey(key: string): Date {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  private toDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
