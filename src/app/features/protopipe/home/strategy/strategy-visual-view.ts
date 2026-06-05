export type StrategyVisualView = 'map' | 'calendar' | 'keywords' | 'content' | 'tune';

export const STRATEGY_VISUAL_VIEWS: { id: StrategyVisualView; label: string; tune?: boolean }[] = [
  { id: 'map', label: 'Map' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'keywords', label: 'Keywords' },
  { id: 'content', label: 'Content' },
  { id: 'tune', label: 'Tune', tune: true },
];
