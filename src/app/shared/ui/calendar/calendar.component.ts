import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  TemplateRef,
  computed,
  contentChild,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { SelectButton } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import { CalendarMonthViewComponent } from './views/calendar-month-view.component';
import { CalendarWeekViewComponent } from './views/calendar-week-view.component';
import { CalendarAgendaViewComponent } from './views/calendar-agenda-view.component';
import type { CalendarItem, CalendarItemAction, CalendarView } from './calendar.types';
import { DEFAULT_SOURCE_ICONS, DEFAULT_STATUS_COLORS } from './calendar.types';
import { addMonths, addWeeks, monthLabel, weekLabel, type WeekStart } from './calendar-grid.util';

const MOBILE_BREAKPOINT_PX = 600;

@Component({
  selector: 'app-calendar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    FormsModule,
    Button,
    Dialog,
    SelectButton,
    CalendarMonthViewComponent,
    CalendarWeekViewComponent,
    CalendarAgendaViewComponent,
  ],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
})
export class CalendarComponent<T = unknown> {
  // ───── Inputs ──────────────────────────────────────────────────────────
  readonly items = input.required<readonly CalendarItem<T>[]>();
  readonly view = model<CalendarView>('month');
  readonly cursor = model<Date>(new Date());
  readonly weekStartsOn = input<WeekStart>(0);
  readonly itemsPerDay = input<number>(3);
  readonly statusColors = input<Readonly<Record<string, string>>>(DEFAULT_STATUS_COLORS);
  readonly sourceIcons = input<Readonly<Record<string, string>>>(DEFAULT_SOURCE_ICONS);
  readonly showWeekends = input<boolean>(true);
  readonly expandOnClick = input<boolean>(true);

  // ───── Slots ───────────────────────────────────────────────────────────
  readonly chipTmpl = contentChild<TemplateRef<{ $implicit: CalendarItem<T> }>>('chip');
  readonly dialogTmpl = contentChild<TemplateRef<{ $implicit: CalendarItem<T> }>>('dialog');
  readonly toolbarTmpl = contentChild<TemplateRef<unknown>>('toolbar');

  // ───── Outputs ─────────────────────────────────────────────────────────
  readonly itemClick = output<CalendarItem<T>>();
  readonly itemAction = output<{ item: CalendarItem<T>; actionId: string }>();
  readonly cellClick = output<Date>();
  readonly viewChange = output<CalendarView>();

  // ───── Internal state ──────────────────────────────────────────────────
  private readonly destroyRef = inject(DestroyRef);
  private readonly viewport = signal(
    typeof window === 'undefined' ? 1024 : window.innerWidth,
  );
  protected readonly isMobile = computed(() => this.viewport() < MOBILE_BREAKPOINT_PX);
  protected readonly dialogVisible = signal(false);
  protected readonly activeItem = signal<CalendarItem<T> | null>(null);

  protected readonly viewOptions = [
    { label: 'Month', value: 'month' as CalendarView, icon: 'pi pi-calendar' },
    { label: 'Week', value: 'week' as CalendarView, icon: 'pi pi-th-large' },
    { label: 'Agenda', value: 'agenda' as CalendarView, icon: 'pi pi-list' },
  ];

  protected readonly currentTitle = computed(() => {
    const view = this.view();
    if (view === 'week') return weekLabel(this.cursor(), this.weekStartsOn());
    return monthLabel(this.cursor());
  });

  protected readonly navAriaLabels = computed(() => {
    const view = this.view();
    if (view === 'week') return { prev: 'Previous week', next: 'Next week' };
    return { prev: 'Previous month', next: 'Next month' };
  });

  constructor() {
    if (typeof window !== 'undefined') {
      const handler = (): void => this.viewport.set(window.innerWidth);
      window.addEventListener('resize', handler);
      this.destroyRef.onDestroy(() => window.removeEventListener('resize', handler));
    }
    effect(() => {
      if (this.isMobile() && (this.view() === 'month' || this.view() === 'week')) {
        this.view.set('agenda');
      }
    });
    effect(() => {
      this.viewChange.emit(this.view());
    });
  }

  // ───── Toolbar actions ─────────────────────────────────────────────────
  protected prev(): void {
    this.cursor.set(this.shiftCursor(-1));
  }

  protected next(): void {
    this.cursor.set(this.shiftCursor(1));
  }

  private shiftCursor(delta: 1 | -1): Date {
    return this.view() === 'week'
      ? addWeeks(this.cursor(), delta)
      : addMonths(this.cursor(), delta);
  }

  protected today(): void {
    this.cursor.set(new Date());
  }

  protected onViewChange(value: CalendarView | null): void {
    if (value) this.view.set(value);
  }

  // ───── Item interactions ───────────────────────────────────────────────
  protected onItemClick(item: CalendarItem<T>): void {
    this.itemClick.emit(item);
    if (this.expandOnClick()) {
      this.activeItem.set(item);
      this.dialogVisible.set(true);
    }
  }

  protected onCellClick(date: Date): void {
    this.cellClick.emit(date);
  }

  protected onActionClick(action: CalendarItemAction): void {
    const item = this.activeItem();
    if (!item) return;
    this.itemAction.emit({ item, actionId: action.id });
    this.dialogVisible.set(false);
  }

  protected actionSeverity(action: CalendarItemAction): 'primary' | 'secondary' | 'danger' {
    return action.kind ?? 'secondary';
  }

  protected isPrimaryAction(action: CalendarItemAction): boolean {
    return action.kind === 'primary';
  }

  protected isDangerAction(action: CalendarItemAction): boolean {
    return action.kind === 'danger';
  }

  protected closeDialog(): void {
    this.dialogVisible.set(false);
  }

  protected formatDate(value: Date | string): string {
    const dt = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(dt);
  }
}
