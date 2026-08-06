import type {
  ShireAnalyticsContentRow,
  ShireAnalyticsExperiment,
  ShireAnalyticsFunnel,
  ShireAnalyticsHeatmapPage,
  ShireAnalyticsPlaylist,
  ShireAnalyticsPulseMetric,
  ShireAnalyticsSeriesPoint,
  ShireAnalyticsSessionRow,
  ShireAnalyticsSignal,
  ShireAnalyticsTrafficSource,
} from '@hive/contracts';

export type AnalyticsSection =
  | 'pulse'
  | 'content'
  | 'funnels'
  | 'sessions'
  | 'heatmaps'
  | 'experiments'
  | 'signals';

export type AnalyticsContentRow = ShireAnalyticsContentRow;
export type AnalyticsFunnel = ShireAnalyticsFunnel;
export type AnalyticsSessionRow = ShireAnalyticsSessionRow;
export type AnalyticsHeatmapPage = ShireAnalyticsHeatmapPage;
export type AnalyticsExperiment = ShireAnalyticsExperiment;
export type AnalyticsSignal = ShireAnalyticsSignal;
export type AnalyticsPlaylist = ShireAnalyticsPlaylist;
export type AnalyticsPulseMetric = ShireAnalyticsPulseMetric;
export type AnalyticsSeriesPoint = ShireAnalyticsSeriesPoint;
export type AnalyticsTrafficSource = ShireAnalyticsTrafficSource;

export interface HomeAnalyticsSnapshot {
  siteSlug: string;
  siteLabel: string;
  hostname: string;
  rangeLabel: string;
  filterNote: string;
  pulse: AnalyticsPulseMetric[];
  series: AnalyticsSeriesPoint[];
  trafficSources: AnalyticsTrafficSource[];
  contentRows: AnalyticsContentRow[];
  funnels: AnalyticsFunnel[];
  sessions: AnalyticsSessionRow[];
  playlists: AnalyticsPlaylist[];
  heatmaps: AnalyticsHeatmapPage[];
  experiments: AnalyticsExperiment[];
  signals: AnalyticsSignal[];
}
