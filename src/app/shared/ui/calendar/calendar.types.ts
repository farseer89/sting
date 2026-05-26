/**
 * Public types for the `<fw-calendar>` shared UI component.
 *
 * The calendar is domain-agnostic. Consumers map their data into `CalendarItem<T>`
 * and supply optional templates / status palettes to drive look-and-feel.
 *
 * See: Mothership/ai-plans/protopipe-content-pipeline-calendar.md
 */

export type CalendarView = 'month' | 'week' | 'agenda';

export type CalendarItemVariant = 'solid' | 'ghost';

export type CalendarItemTrend = 'up' | 'down' | 'flat';

export type CalendarActionKind = 'primary' | 'secondary' | 'danger';

export interface CalendarItemMetric {
  /** Short label, e.g. "visits". Used for accessibility / hover. */
  label: string;
  /** Display value, e.g. 18 or "+18". Renders verbatim in the chip badge. */
  value: string | number;
  /** Optional trend arrow tint. */
  trend?: CalendarItemTrend;
}

export interface CalendarItemAction {
  /** Stable identifier emitted via `(itemAction)`. */
  id: string;
  /** Button label. */
  label: string;
  /** Optional PrimeIcons class, e.g. "pi pi-pencil". */
  icon?: string;
  /** Visual emphasis. Defaults to 'secondary'. */
  kind?: CalendarActionKind;
}

export interface CalendarItem<T = unknown> {
  /** Stable identifier for tracking. */
  id: string;
  /** Primary date the item lives on. Date or ISO string accepted. */
  date: Date | string;
  /** Optional end date for multi-day items (Phase 4+). */
  endDate?: Date | string;
  /** Display title shown in the chip. */
  title: string;
  /**
   * Status key into the `statusColors` palette. Drives the left-stripe color
   * and the inferred default `variant` (e.g. `suggested` → ghost).
   */
  status?: string;
  /** Override the inferred variant. `ghost` renders a dashed border. */
  variant?: CalendarItemVariant;
  /** Source key into the `sourceIcons` palette (e.g. 'agent' | 'human' | 'hybrid'). */
  source?: string;
  /** Small text badge (e.g. priority). */
  badge?: string;
  /** Optional performance / encouragement badge (e.g. GA visits). */
  metric?: CalendarItemMetric;
  /** Optional pipeline verbs rendered in the expanded dialog. */
  actions?: CalendarItemAction[];
  /** Consumer's full record. Reads back on click. */
  data: T;
}

/**
 * Default status palette using PrimeNG theme tokens so consumers get a
 * sensible look that follows the active theme automatically.
 *
 * Keys are status strings. Values are CSS color expressions (typically a
 * `var(--p-*)` reference) used for the chip's left stripe / accent.
 */
export const DEFAULT_STATUS_COLORS: Readonly<Record<string, string>> = Object.freeze({
  suggested: 'var(--p-surface-400, #94a3b8)',
  draft: 'var(--p-surface-500, #64748b)',
  scheduled: 'var(--p-orange-500, #f97316)',
  published: 'var(--p-green-500, #22c55e)',
  failed: 'var(--p-red-500, #ef4444)',
});

/** Status keys whose default variant is ghost (dashed border, no left stripe). */
export const GHOST_STATUSES: ReadonlySet<string> = new Set(['suggested']);

/**
 * Default source icon palette. Values are PrimeIcons class names.
 *
 * Source identifies the origin of an item (agent, human, hybrid) so the
 * calendar can show a small badge that reinforces the auto/manual plan-tier
 * story without the component caring about plan tiers itself.
 */
export const DEFAULT_SOURCE_ICONS: Readonly<Record<string, string>> = Object.freeze({
  agent: 'pi pi-bolt',
  human: 'pi pi-user',
  hybrid: 'pi pi-users',
});

/** Resolve the effective variant for an item, honoring explicit override. */
export function resolveVariant(item: CalendarItem<unknown>): CalendarItemVariant {
  if (item.variant) return item.variant;
  if (item.status && GHOST_STATUSES.has(item.status)) return 'ghost';
  return 'solid';
}
