export type AnalyticsSection =
  | 'pulse'
  | 'content'
  | 'funnels'
  | 'sessions'
  | 'heatmaps'
  | 'experiments'
  | 'signals';

export interface AnalyticsContentRow {
  title: string;
  slug: string;
  path: string;
  sessions: number;
  avgTime: string;
  scrollDepth: number;
  ctaClicks: number;
  cvr: number;
  trend: 'up' | 'down' | 'flat';
  trendPct: number;
}

export interface AnalyticsFunnelStep {
  label: string;
  count: number;
  dropPct: number;
  api: string;
}

export interface AnalyticsFunnel {
  id: string;
  label: string;
  desc: string;
  totalCvr: string;
  steps: AnalyticsFunnelStep[];
}

export interface AnalyticsSessionRow {
  id: string;
  location: string;
  duration: string;
  pages: number;
  aiSummary: string;
  value: 'high' | 'medium' | 'low';
  signals: string[];
}

export interface AnalyticsHeatmapSection {
  label: string;
  reachPct: number;
  hasCta: boolean;
  ctaClicks?: number;
}

export interface AnalyticsHeatmapArticle {
  id: string;
  label: string;
  sections: AnalyticsHeatmapSection[];
}

export interface AnalyticsExperiment {
  id: string;
  name: string;
  status: 'running' | 'complete' | 'draft';
  metric: string;
  confidence: number;
  variants: { name: string; cvr: number; sessions: number; winner?: boolean }[];
  insight: string;
}

export interface AnalyticsSignal {
  id: string;
  severity: 'critical' | 'opportunity' | 'insight' | 'info';
  title: string;
  body: string;
  api: string;
  action?: string;
}

export interface AnalyticsPulseMetric {
  id: string;
  label: string;
  value: string;
  hint: string;
  trend?: string;
}

export interface HomeAnalyticsSnapshot {
  /** PostHog property filter: site_slug */
  siteSlug: string;
  siteLabel: string;
  hostname: string;
  rangeLabel: string;
  filterNote: string;
  pulse: AnalyticsPulseMetric[];
  contentRows: AnalyticsContentRow[];
  funnels: AnalyticsFunnel[];
  sessions: AnalyticsSessionRow[];
  playlists: { name: string; count: number }[];
  heatmaps: AnalyticsHeatmapArticle[];
  experiments: AnalyticsExperiment[];
  signals: AnalyticsSignal[];
}
