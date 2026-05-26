// Shared presentational components (PrimeNG wrappers).
// Layout patterns: global fw-* classes — see docs/UI_PATTERNS.md and UI Playground → Style patterns.

// Calendar — reusable content/schedule visualizer.
// See: Mothership/ai-plans/protopipe-content-pipeline-calendar.md
export { CalendarComponent } from './calendar/calendar.component';
export {
  DEFAULT_SOURCE_ICONS,
  DEFAULT_STATUS_COLORS,
  GHOST_STATUSES,
  resolveVariant,
} from './calendar/calendar.types';
export type {
  CalendarActionKind,
  CalendarItem,
  CalendarItemAction,
  CalendarItemMetric,
  CalendarItemTrend,
  CalendarItemVariant,
  CalendarView,
} from './calendar/calendar.types';
