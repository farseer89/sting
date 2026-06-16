export type StrategyVisualView =
  | 'map'
  | 'calendar'
  | 'backlog'
  | 'keywords'
  | 'content'
  | 'strategy'
  | 'tune';

export const STRATEGY_VISUAL_VIEWS: { id: StrategyVisualView; label: string; tune?: boolean }[] = [
  { id: 'map', label: 'Map' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'backlog', label: 'Backlog' },
  { id: 'keywords', label: 'Keywords' },
  { id: 'content', label: 'Content' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'tune', label: 'Tune', tune: true },
];
