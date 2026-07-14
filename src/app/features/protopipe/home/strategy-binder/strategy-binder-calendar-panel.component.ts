import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import type { ProtopipeContentPlanCalendarItem, ProtopipeSiteContentPlan } from '@hive/contracts';
import {
  buildMonthCalendarFromPlan,
  buildQuarterCalendarFromPlan,
  buildWeekCalendarFromPlan,
  initialQuarterKey,
  planToContentCalendars,
  shiftMonthKey,
  shiftQuarterKey,
  shiftWeekStartKey,
  BINDER_CALENDAR_ZOOM_MODES,
  type StrategyCalendarViewMode,
} from '../strategy/strategy-content-calendar';
import { calendarItemKey } from '../strategy/strategy.helpers';
import type { StrategyBinderCalendarItem } from './strategy-binder.mapper';
import type {
  CalendarNextAction,
  CalendarSecondaryAction,
} from './calendar-article-action.util';

export type BinderCalendarMode = 'planner' | 'calendar';

export type CalendarPanelActionKind = 'primary' | CalendarSecondaryAction;

export interface CalendarPanelActionEvent {
  item: ProtopipeContentPlanCalendarItem;
  action: CalendarPanelActionKind;
}

@Component({
  selector: 'app-strategy-binder-calendar-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './strategy-binder-calendar-panel.component.html',
  styleUrl: './strategy-binder-calendar-panel.component.scss',
})
export class StrategyBinderCalendarPanelComponent {
  readonly plan = input.required<ProtopipeSiteContentPlan>();
  readonly items = input.required<StrategyBinderCalendarItem[]>();
  readonly deck = input('');
  readonly kicker = input('Strategy · Schedule');
  readonly selectedKey = input<string | null>(null);
  /**
   * Prefetched SoT map (itemKey → next action). When present, labels/status
   * come from here — parent recomputes when posts/plan change.
   */
  readonly nextActions = input<Readonly<Record<string, CalendarNextAction>>>({});

  readonly selectItem = output<ProtopipeContentPlanCalendarItem>();
  /** @deprecated Prefer runPanelAction — kept for transitional parent wiring. */
  readonly runAction = output<ProtopipeContentPlanCalendarItem>();
  readonly runPanelAction = output<CalendarPanelActionEvent>();

  readonly mode = signal<BinderCalendarMode>('planner');
  readonly zoom = signal<StrategyCalendarViewMode>('month');
  readonly weekStartKey = signal<string | null>(null);
  readonly monthKey = signal<string | null>(null);
  readonly quarterKey = signal<string | null>(null);

  readonly zoomModes = BINDER_CALENDAR_ZOOM_MODES;

  readonly calendarBundle = computed(() => planToContentCalendars(this.plan()));

  readonly activeWeekStartKey = computed(
    () => this.weekStartKey() ?? this.calendarBundle().initialWeekStartKey,
  );

  readonly activeMonthKey = computed(
    () => this.monthKey() ?? this.calendarBundle().initialMonthKey,
  );

  readonly activeQuarterKey = computed(() => this.quarterKey() ?? initialQuarterKey());

  readonly activeWeek = computed(() =>
    buildWeekCalendarFromPlan(this.plan(), this.activeWeekStartKey()),
  );

  readonly activeMonth = computed(() =>
    buildMonthCalendarFromPlan(this.plan(), this.activeMonthKey()),
  );

  readonly activeQuarter = computed(() =>
    buildQuarterCalendarFromPlan(this.plan(), this.activeQuarterKey()),
  );

  readonly navLabel = computed(() => {
    if (this.zoom() === 'week') return this.activeWeek().label;
    if (this.zoom() === 'quarter') return this.activeQuarter().label;
    return this.activeMonth().month;
  });

  readonly metaLabel = computed(() => {
    if (this.zoom() === 'week') {
      const count = this.activeWeek().articleCount;
      return `${count} article${count === 1 ? '' : 's'} this week`;
    }
    if (this.zoom() === 'quarter') {
      const count = this.activeQuarter().articleCount;
      return `${count} article${count === 1 ? '' : 's'} this quarter`;
    }
    const count = this.activeMonth().articleCount;
    return `${count} article${count === 1 ? '' : 's'} this month`;
  });

  setMode(mode: BinderCalendarMode): void {
    this.mode.set(mode);
  }

  setZoom(zoom: StrategyCalendarViewMode): void {
    this.zoom.set(zoom);
  }

  prevPeriod(): void {
    if (this.zoom() === 'week') {
      this.weekStartKey.set(shiftWeekStartKey(this.activeWeekStartKey(), -1));
      return;
    }
    if (this.zoom() === 'quarter') {
      this.quarterKey.set(shiftQuarterKey(this.activeQuarterKey(), -1));
      return;
    }
    this.monthKey.set(shiftMonthKey(this.activeMonthKey(), -1));
  }

  nextPeriod(): void {
    if (this.zoom() === 'week') {
      this.weekStartKey.set(shiftWeekStartKey(this.activeWeekStartKey(), 1));
      return;
    }
    if (this.zoom() === 'quarter') {
      this.quarterKey.set(shiftQuarterKey(this.activeQuarterKey(), 1));
      return;
    }
    this.monthKey.set(shiftMonthKey(this.activeMonthKey(), 1));
  }

  isSelected(item: StrategyBinderCalendarItem | { itemKey: string }): boolean {
    const key = 'itemKey' in item ? item.itemKey : item.key;
    return this.selectedKey() === key;
  }

  openMapped(item: StrategyBinderCalendarItem): void {
    this.selectItem.emit(item.source);
  }

  openSticky(itemKey: string): void {
    const match = this.items().find((row) => row.key === itemKey);
    if (match) this.selectItem.emit(match.source);
  }

  onAction(
    item: StrategyBinderCalendarItem,
    event: Event,
    action: CalendarPanelActionKind = 'primary',
  ): void {
    event.stopPropagation();
    this.runPanelAction.emit({ item: item.source, action });
    if (action === 'primary') {
      this.runAction.emit(item.source);
    }
  }

  nextFor(item: StrategyBinderCalendarItem): CalendarNextAction {
    return (
      this.nextActions()[item.key] ?? {
        stage: 'write',
        label: 'Write',
        statusLabel: 'Not written',
      }
    );
  }

  itemKey = calendarItemKey;
}
