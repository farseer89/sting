import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';
import type { CalendarItem, CalendarItemTrend } from './calendar.types';
import { resolveVariant } from './calendar.types';

/**
 * Default chip rendered inside a calendar day cell or agenda list.
 *
 * Two visual variants:
 *   - solid (committed items): colored left stripe + filled background
 *   - ghost  (proposals):       dashed border, no stripe, reduced contrast
 *
 * Optional decorations: source icon (top-right), metric badge (right-aligned),
 * and a small text badge under the title.
 *
 * Consumers can replace this entirely by projecting their own `<ng-template #chip>`
 * into `<fw-calendar>`. This is the default a consumer gets for free.
 */
@Component({
  selector: 'app-calendar-event-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, NgStyle],
  templateUrl: './calendar-event-chip.component.html',
  styleUrl: './calendar-event-chip.component.scss',
})
export class CalendarEventChipComponent {
  readonly item = input.required<CalendarItem<unknown>>();
  /** Resolved accent color from the status palette (parent does the lookup). */
  readonly accentColor = input<string | undefined>(undefined);
  /** Resolved PrimeIcons class for the source badge (parent does the lookup). */
  readonly sourceIcon = input<string | undefined>(undefined);
  /** Visual density. `compact` shrinks padding + font for dense month-grid cells. */
  readonly density = input<'comfortable' | 'compact'>('comfortable');

  readonly chipClick = output<void>();

  protected readonly variant = computed(() => resolveVariant(this.item()));
  protected readonly isGhost = computed(() => this.variant() === 'ghost');

  protected readonly stripeStyle = computed(() => {
    const color = this.accentColor();
    return color && !this.isGhost() ? { 'background-color': color } : null;
  });

  protected readonly chipClasses = computed(() => ({
    'chip--solid': !this.isGhost(),
    'chip--ghost': this.isGhost(),
    'chip--compact': this.density() === 'compact',
  }));

  protected readonly trendIcon = computed((): string | null => {
    const t = this.item().metric?.trend;
    if (t === 'up') return 'pi pi-arrow-up';
    if (t === 'down') return 'pi pi-arrow-down';
    if (t === 'flat') return 'pi pi-minus';
    return null;
  });

  protected readonly trendClass = computed((): string => {
    const t = this.item().metric?.trend;
    if (t === 'up') return 'trend trend--up';
    if (t === 'down') return 'trend trend--down';
    return 'trend trend--flat';
  });

  protected onActivate(event: Event): void {
    event.stopPropagation();
    this.chipClick.emit();
  }

  protected metricAriaLabel(): string | null {
    const m = this.item().metric;
    if (!m) return null;
    const trend = trendWord(m.trend);
    return `${m.value} ${m.label}${trend ? ', ' + trend : ''}`;
  }
}

function trendWord(t: CalendarItemTrend | undefined): string {
  if (t === 'up') return 'trending up';
  if (t === 'down') return 'trending down';
  if (t === 'flat') return 'unchanged';
  return '';
}
