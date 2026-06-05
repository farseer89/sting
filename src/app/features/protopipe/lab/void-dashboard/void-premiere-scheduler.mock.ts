export type ContentStatus = 'draft' | 'scheduled' | 'published' | 'research';

export interface ContentDay {
  label: string;
  sub: string;
  isWeekend: boolean;
  isToday: boolean;
}

export interface ContentPlan {
  id: string;
  code: string;
  name: string;
  color: string;
  startPct: number;
  widthPct: number;
  pieceCount: number;
  status: string;
}

export interface ContentStage {
  id: string;
  planId: string;
  name: string;
  color: string;
  startPct: number;
  widthPct: number;
  pieceCount: number;
}

export interface ContentPiece {
  id: string;
  planId: string;
  title: string;
  keyword: string;
  status: ContentStatus;
  startPct: number;
  widthPct: number;
  color: string;
  publishLabel?: string;
}

export interface ContentMonitorCard {
  label: string;
  value: string;
  subtext?: string;
  badge?: string;
}

export interface KeywordCoverage {
  phrase: string;
  volume: number;
  position: number | null;
  article?: string;
  status: 'ranking' | 'draft' | 'gap' | 'scheduled';
}

export const CONTENT_DAYS: ContentDay[] = [
  { label: 'Mon', sub: '26', isWeekend: false, isToday: false },
  { label: 'Tue', sub: '27', isWeekend: false, isToday: false },
  { label: 'Wed', sub: '28', isWeekend: false, isToday: true },
  { label: 'Thu', sub: '29', isWeekend: false, isToday: false },
  { label: 'Fri', sub: '30', isWeekend: false, isToday: false },
  { label: 'Sat', sub: '31', isWeekend: true, isToday: false },
  { label: 'Sun', sub: '1', isWeekend: true, isToday: false },
  { label: 'Mon', sub: '2', isWeekend: false, isToday: false },
  { label: 'Tue', sub: '3', isWeekend: false, isToday: false },
  { label: 'Wed', sub: '4', isWeekend: false, isToday: false },
  { label: 'Thu', sub: '5', isWeekend: false, isToday: false },
  { label: 'Fri', sub: '6', isWeekend: false, isToday: false },
  { label: 'Sat', sub: '7', isWeekend: true, isToday: false },
  { label: 'Sun', sub: '8', isWeekend: true, isToday: false },
];

export const CONTENT_PLANS: ContentPlan[] = [
  {
    id: 'cp1',
    code: 'Q2-SEO',
    name: 'Q2 Destination SEO Push',
    color: '#0a9396',
    startPct: 2,
    widthPct: 82,
    pieceCount: 7,
    status: 'Active',
  },
  {
    id: 'cp2',
    code: 'ITALY',
    name: 'Tuscany & Italy cluster',
    color: '#2a9d8f',
    startPct: 22,
    widthPct: 48,
    pieceCount: 3,
    status: 'Active',
  },
  {
    id: 'cp3',
    code: 'COST',
    name: 'Cost & planning articles',
    color: '#ee9b00',
    startPct: 8,
    widthPct: 36,
    pieceCount: 2,
    status: 'Drafting',
  },
];

export const CONTENT_STAGES: ContentStage[] = [
  { id: 's1', planId: 'cp1', name: 'Keyword research', color: '#005f73', startPct: 2, widthPct: 12, pieceCount: 10 },
  { id: 's2', planId: 'cp1', name: 'Drafting', color: '#0a9396', startPct: 14, widthPct: 28, pieceCount: 3 },
  { id: 's3', planId: 'cp1', name: 'Editing & SEO', color: '#2a9d8f', startPct: 42, widthPct: 22, pieceCount: 2 },
  { id: 's4', planId: 'cp1', name: 'Publishing', color: '#94d2bd', startPct: 64, widthPct: 20, pieceCount: 2 },
];

export const CONTENT_PIECES: ContentPiece[] = [
  {
    id: 'a1',
    planId: 'cp1',
    title: 'How Much Does a Wedding Painter Cost?',
    keyword: 'how much does a wedding painter cost',
    status: 'draft',
    startPct: 14,
    widthPct: 18,
    color: '#0a9396',
    publishLabel: 'May 30',
  },
  {
    id: 'a2',
    planId: 'cp1',
    title: 'Live Wedding Painting in Tuscany',
    keyword: 'best wedding painters in tuscany',
    status: 'scheduled',
    startPct: 52,
    widthPct: 14,
    color: '#2a9d8f',
    publishLabel: 'Jun 4',
  },
  {
    id: 'a3',
    planId: 'cp1',
    title: 'Hiring a Painter for Your Wedding Abroad',
    keyword: 'hire painter for wedding abroad',
    status: 'draft',
    startPct: 18,
    widthPct: 16,
    color: '#40916c',
    publishLabel: 'Jun 2',
  },
  {
    id: 'a4',
    planId: 'cp1',
    title: 'Italy Destination Wedding Artist Guide',
    keyword: 'italy destination wedding artist',
    status: 'scheduled',
    startPct: 58,
    widthPct: 16,
    color: '#52b788',
    publishLabel: 'Jun 12',
  },
  {
    id: 'a5',
    planId: 'cp1',
    title: 'Live Painter vs Wedding Photographer',
    keyword: 'live painter vs wedding photographer',
    status: 'published',
    startPct: 4,
    widthPct: 10,
    color: '#005f73',
    publishLabel: 'May 8',
  },
  {
    id: 'a6',
    planId: 'cp1',
    title: 'Wedding Day Painting Timeline',
    keyword: 'wedding day painting timeline',
    status: 'draft',
    startPct: 24,
    widthPct: 14,
    color: '#74c69d',
    publishLabel: 'Jun 6',
  },
];

export const CONTENT_MONITOR: ContentMonitorCard[] = [
  { label: 'Organic clicks', value: '184', subtext: '+12% this week', badge: 'GSC' },
  { label: 'Avg position', value: '18.4', subtext: '−1.2 vs last week' },
  { label: 'Keywords tracked', value: '10', subtext: '3 high priority' },
  { label: 'In pipeline', value: '4', subtext: '2 scheduled', badge: 'Live' },
];

export const KEYWORD_COVERAGE: KeywordCoverage[] = [
  { phrase: 'destination wedding painter', volume: 720, position: 14, article: 'Home + services', status: 'ranking' },
  { phrase: 'live wedding painting', volume: 1300, position: 22, article: 'Painter vs Photographer', status: 'ranking' },
  { phrase: 'how much does a wedding painter cost', volume: 480, position: null, article: 'Cost article', status: 'draft' },
  { phrase: 'hire painter for wedding abroad', volume: 140, position: null, status: 'gap' },
  { phrase: 'best wedding painters in tuscany', volume: 70, position: 41, article: 'Tuscany piece', status: 'scheduled' },
];

export const CONTENT_VIEW_MODES = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
] as const;

export const CONTENT_ROW_MODES = [
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'articles', label: 'Articles' },
  { id: 'traffic', label: 'Traffic' },
] as const;

export const TRAFFIC_SPARKLINE = [42, 58, 51, 72, 64, 38, 45, 52, 68, 74, 61, 55, 78, 84];

export const STATUS_LABELS: Record<ContentStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  published: 'Live',
  research: 'Research',
};

export const COVERAGE_STATUS_LABELS: Record<KeywordCoverage['status'], string> = {
  ranking: 'Ranking',
  draft: 'In draft',
  gap: 'Gap',
  scheduled: 'Scheduled',
};

export interface CalendarSticky {
  title: string;
  status: ContentStatus;
}

export interface CalendarCell {
  day: number | null;
  weekend: boolean;
  stickies: CalendarSticky[];
}

export interface ContentCalendar {
  month: string;
  weekdays: string[];
  weeks: CalendarCell[][];
}

export interface PostItNote {
  text: string;
  meta: string;
  status: KeywordCoverage['status'];
  pin: string;
}

function buildContentCalendar(): ContentCalendar {
  const posts: Record<number, CalendarSticky[]> = {
    2: [{ title: 'Hiring a Painter Abroad', status: 'draft' }],
    4: [{ title: 'Live Painting in Tuscany', status: 'scheduled' }],
    6: [{ title: 'Painting Day Timeline', status: 'draft' }],
    9: [{ title: 'France Live Painting Recap', status: 'published' }],
    12: [
      { title: 'Italy Artist Guide', status: 'scheduled' },
      { title: 'Amalfi Coast FAQ', status: 'draft' },
    ],
    16: [{ title: 'Booking Timeline Checklist', status: 'draft' }],
    19: [{ title: 'Positano Venue Spotlight', status: 'scheduled' }],
    24: [{ title: 'Painter vs Photographer', status: 'published' }],
    27: [{ title: 'Summer Destinations Roundup', status: 'draft' }],
  };

  // June 2026 — June 1 is a Monday (Sun = 0)
  const daysInMonth = 30;
  const firstWeekday = 1;
  const cells: CalendarCell[] = [];

  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ day: null, weekend: false, stickies: [] });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const weekdayIndex = (firstWeekday + day - 1) % 7;
    cells.push({
      day,
      weekend: weekdayIndex === 0 || weekdayIndex === 6,
      stickies: posts[day] ?? [],
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, weekend: false, stickies: [] });
  }

  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return {
    month: 'June 2026',
    weekdays: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    weeks,
  };
}

export const CONTENT_CALENDAR: ContentCalendar = buildContentCalendar();

export const POSTIT_NOTES: PostItNote[] = [
  { text: 'destination wedding painter', meta: '720 vol · pos 14', status: 'ranking', pin: 'Core page' },
  { text: 'live wedding painting', meta: '1.3k vol · pos 22', status: 'ranking', pin: 'Core page' },
  { text: 'how much does a wedding painter cost', meta: '480 vol · drafting', status: 'draft', pin: 'In brief' },
  { text: 'hire painter for wedding abroad', meta: '140 vol · no page yet', status: 'gap', pin: 'Gap' },
  { text: 'best wedding painters in tuscany', meta: '70 vol · Jun 4', status: 'scheduled', pin: 'Queued' },
  { text: 'italy destination wedding artist', meta: '90 vol · Jun 12', status: 'scheduled', pin: 'Queued' },
];
