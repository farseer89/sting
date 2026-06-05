import type { KeywordIntent, KeywordPriority } from '../../protopipe.models';

export type VoidWindowId =
  | 'overview'
  | 'keyword-picker'
  | 'scheduler'
  | 'spoke'
  | 'keywords'
  | 'content'
  | 'writer'
  | 'files'
  | 'kanban'
  | 'calendar'
  | 'analytics'
  | 'schedule'
  | 'stripe'
  | 'slack'
  | 'mail'
  | 'serp';

export interface VoidWindowOption {
  id: VoidWindowId;
  label: string;
}

export interface SiteMetric {
  id: string;
  label: string;
  value: string;
  delta?: string;
}

export interface KeywordRow {
  id: string;
  phrase: string;
  intent: KeywordIntent;
  priority: KeywordPriority;
  position: number | null;
  volume: number;
}

export interface ArticleRow {
  id: string;
  title: string;
  keyword: string;
  status: 'published' | 'scheduled' | 'draft';
  date: string;
}

export interface FeedItem {
  id: string;
  time: string;
  label: string;
}

export interface SerpRow {
  pos: number;
  url: string;
  title: string;
}

export interface ScheduleEvent {
  id: string;
  time: string;
  title: string;
  tag?: string;
}

export interface StripeCharge {
  id: string;
  customer: string;
  amount: string;
  status: 'succeeded' | 'pending' | 'failed';
  date: string;
}

export interface SlackMessage {
  id: string;
  user: string;
  time: string;
  text: string;
  unread?: boolean;
}

export interface MailMessage {
  id: string;
  from: string;
  subject: string;
  preview: string;
  time: string;
  unread?: boolean;
}

export interface ChartBar {
  label: string;
  value: number;
}

export interface FolderNode {
  id: string;
  name: string;
  kind: 'site' | 'folder' | 'file';
  meta?: string;
  depth: number;
}

export interface KanbanCard {
  id: string;
  title: string;
  keyword: string;
  column: 'draft' | 'scheduled' | 'published';
  date: string;
}

export interface CalendarDay {
  day: number | null;
  items: { title: string; status: 'draft' | 'scheduled' | 'published' }[];
}

export const VOID_WINDOWS: VoidWindowOption[] = [
  { id: 'keyword-picker', label: 'Keywords' },
  { id: 'scheduler', label: 'Calendar' },
  { id: 'spoke', label: 'Content map' },
  { id: 'overview', label: 'Home' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'keywords', label: 'SEO' },
  { id: 'content', label: 'Articles' },
  { id: 'writer', label: 'Writer' },
  { id: 'files', label: 'Files' },
  { id: 'kanban', label: 'Kanban' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'stripe', label: 'Stripe' },
  { id: 'slack', label: 'Slack' },
  { id: 'mail', label: 'Mail' },
  { id: 'serp', label: 'SERP' },
];

export const VOID_METRICS: SiteMetric[] = [
  { id: 'mrr', label: 'MRR', value: '$4.2k', delta: '+8%' },
  { id: 'clk', label: 'Clicks', value: '184', delta: '+12%' },
  { id: 'pos', label: 'Position', value: '18.4', delta: '−1.2' },
  { id: 'mail', label: 'Inbox', value: '7' },
  { id: 'slack', label: 'Slack', value: '3' },
];

export const VOID_KEYWORDS: KeywordRow[] = [
  { id: '1', phrase: 'destination wedding painter', intent: 'commercial', priority: 'high', position: 14, volume: 720 },
  { id: '2', phrase: 'live wedding painting', intent: 'commercial', priority: 'high', position: 22, volume: 1300 },
  { id: '3', phrase: 'wedding painter for destination wedding', intent: 'commercial', priority: 'high', position: 31, volume: 210 },
  { id: '4', phrase: 'hire painter for wedding abroad', intent: 'transactional', priority: 'medium', position: null, volume: 140 },
  { id: '5', phrase: 'italy destination wedding artist', intent: 'commercial', priority: 'medium', position: 28, volume: 90 },
  { id: '6', phrase: 'france wedding live painting', intent: 'commercial', priority: 'medium', position: 36, volume: 55 },
  { id: '7', phrase: 'how much does a wedding painter cost', intent: 'informational', priority: 'medium', position: null, volume: 480 },
  { id: '8', phrase: 'wedding day painting timeline', intent: 'informational', priority: 'low', position: 52, volume: 110 },
  { id: '9', phrase: 'live painter vs wedding photographer', intent: 'informational', priority: 'low', position: 44, volume: 95 },
  { id: '10', phrase: 'best wedding painters in tuscany', intent: 'commercial', priority: 'medium', position: 41, volume: 70 },
];

export const VOID_ARTICLES: ArticleRow[] = [
  { id: 'a1', title: 'How Much Does a Wedding Painter Cost?', keyword: 'how much does a wedding painter cost', status: 'draft', date: 'May 26' },
  { id: 'a2', title: 'Live Wedding Painting in Tuscany', keyword: 'best wedding painters in tuscany', status: 'scheduled', date: 'Jun 4' },
  { id: 'a3', title: 'Hiring a Painter for Your Wedding Abroad', keyword: 'hire painter for wedding abroad', status: 'draft', date: 'May 22' },
  { id: 'a4', title: 'Live Painter vs Wedding Photographer', keyword: 'live painter vs wedding photographer', status: 'published', date: 'May 8' },
  { id: 'a5', title: 'France Destination Wedding Live Painting', keyword: 'france wedding live painting', status: 'published', date: 'Apr 19' },
  { id: 'a6', title: 'Wedding Day Painting Timeline', keyword: 'wedding day painting timeline', status: 'draft', date: 'May 18' },
  { id: 'a7', title: 'Italy Destination Wedding Artist Guide', keyword: 'italy destination wedding artist', status: 'scheduled', date: 'Jun 12' },
];

export const VOID_FEED: FeedItem[] = [
  { id: 'f1', time: '10:14', label: 'SERP refreshed — destination wedding painter' },
  { id: 'f2', time: '09:52', label: 'Stripe payout initiated — $1,240' },
  { id: 'f3', time: '09:31', label: 'Slack — new lead in #inquiries' },
  { id: 'f4', time: '08:47', label: 'GSC sync complete' },
  { id: 'f5', time: '08:12', label: 'Mail — RE: June Tuscany booking' },
  { id: 'f6', time: '07:55', label: 'Position +3 — live wedding painting' },
];

export const VOID_SERP: SerpRow[] = [
  { pos: 1, url: 'theknot.com/content/live-wedding-painting', title: 'Live Wedding Painting: What to Know' },
  { pos: 2, url: 'weddingwire.com/cost/wedding-painter', title: 'Average Wedding Painter Cost' },
  { pos: 3, url: 'destinationweddingpainter.com', title: 'Destination Wedding Painter — Live Art' },
  { pos: 4, url: 'martha-stewart.com/destination-weddings', title: 'Destination Wedding Ideas' },
  { pos: 5, url: 'pinterest.com/ideas/live-wedding-painting', title: 'Live Wedding Painting Inspiration' },
  { pos: 6, url: 'brides.com/story/wedding-artist', title: 'Hiring a Wedding Artist' },
  { pos: 7, url: 'reddit.com/r/weddingplanning', title: 'Anyone hire a live painter?' },
  { pos: 8, url: 'yelp.com/search/wedding-painter', title: 'Best Wedding Painters Near Me' },
];

export const VOID_SCHEDULE: ScheduleEvent[] = [
  { id: 's1', time: '11:00', title: 'Client call — Amalfi inquiry', tag: 'sales' },
  { id: 's2', time: '13:30', title: 'Publish Tuscany article', tag: 'content' },
  { id: 's3', time: '15:00', title: 'Stripe payout review', tag: 'finance' },
  { id: 's4', time: '16:45', title: 'SERP refresh batch', tag: 'seo' },
  { id: 's5', time: '18:00', title: 'Reply — jessica@planner.co', tag: 'mail' },
  { id: 's6', time: 'Tomorrow', title: 'Wedding paint — Villa Cimbrone', tag: 'event' },
];

export const VOID_STRIPE_CHARGES: StripeCharge[] = [
  { id: 'ch1', customer: 'M. Chen', amount: '$2,400', status: 'succeeded', date: 'Today' },
  { id: 'ch2', customer: 'R. Walsh', amount: '$1,850', status: 'succeeded', date: 'Today' },
  { id: 'ch3', customer: 'Planner Co', amount: '$640', status: 'pending', date: 'Yesterday' },
  { id: 'ch4', customer: 'S. Dubois', amount: '$3,100', status: 'succeeded', date: 'Yesterday' },
  { id: 'ch5', customer: 'Venue Maui', amount: '$920', status: 'succeeded', date: 'May 26' },
  { id: 'ch6', customer: 'Refund #882', amount: '−$150', status: 'failed', date: 'May 25' },
];

export const VOID_SLACK: SlackMessage[] = [
  { id: 'sl1', user: 'jessica', time: '10:02', text: 'Do you travel to Positano in September?', unread: true },
  { id: 'sl2', user: 'aubrey', time: '09:48', text: 'Yes — sending package link now.' },
  { id: 'sl3', user: 'mike', time: '09:12', text: 'GSC clicks up 12% WoW on live wedding painting', unread: true },
  { id: 'sl4', user: 'planner-co', time: '08:55', text: 'Can we lock June 12 for Tuscany post?', unread: true },
  { id: 'sl5', user: 'aubrey', time: '08:40', text: 'Scheduled. Calendar updated.' },
  { id: 'sl6', user: 'stripe-bot', time: '08:12', text: 'Payout $1,240 arriving tomorrow' },
  { id: 'sl7', user: 'seo-agent', time: '07:58', text: '3 keyword gaps vs competitor knot.com' },
];

export const VOID_MAIL: MailMessage[] = [
  { id: 'm1', from: 'Jessica M.', subject: 'Positano September dates', preview: 'We are finalizing our venue…', time: '10:01', unread: true },
  { id: 'm2', from: 'Google Search Console', subject: 'New search performance', preview: 'Your site got 184 clicks…', time: '09:30', unread: true },
  { id: 'm3', from: 'Stripe', subject: 'Payout initiated', preview: 'A payout of $1,240.00 is on the way', time: '08:12' },
  { id: 'm4', from: 'Planner Collective', subject: 'RE: June content collab', preview: 'Tuscany piece looks great…', time: 'Yesterday', unread: true },
  { id: 'm5', from: 'Cloudflare', subject: 'Deploy succeeded — dwp-v2', preview: 'Production deploy completed', time: 'Yesterday' },
  { id: 'm6', from: 'Aubrey', subject: 'Draft: wedding painter cost', preview: 'Added FAQ section per keyword…', time: 'May 26' },
  { id: 'm7', from: 'Newsletter', subject: 'Destination wedding trends', preview: 'Live art experiences are up…', time: 'May 25', unread: true },
];

export const VOID_BAR_CHART: ChartBar[] = [
  { label: 'Mon', value: 42 },
  { label: 'Tue', value: 58 },
  { label: 'Wed', value: 51 },
  { label: 'Thu', value: 72 },
  { label: 'Fri', value: 64 },
  { label: 'Sat', value: 38 },
  { label: 'Sun', value: 45 },
];

export const VOID_CHANNEL_BARS: ChartBar[] = [
  { label: 'Organic', value: 184 },
  { label: 'Direct', value: 96 },
  { label: 'Referral', value: 42 },
  { label: 'Social', value: 28 },
];

export const VOID_FOLDERS: FolderNode[] = [
  { id: 'site', name: 'destinationweddingpainter.com', kind: 'site', meta: 'primary site', depth: 0 },
  { id: 'kw', name: 'keywords', kind: 'folder', meta: '10 tracked', depth: 1 },
  { id: 'kw-strategy', name: 'strategy.json', kind: 'file', meta: '2.1 kb', depth: 2 },
  { id: 'kw-seed', name: 'seed-keywords.csv', kind: 'file', meta: '840 b', depth: 2 },
  { id: 'content', name: 'content', kind: 'folder', meta: '7 articles', depth: 1 },
  { id: 'c-draft', name: 'drafts', kind: 'folder', meta: '3', depth: 2 },
  { id: 'c-d1', name: 'wedding-painter-cost.md', kind: 'file', meta: 'draft', depth: 3 },
  { id: 'c-d2', name: 'hiring-painter-abroad.md', kind: 'file', meta: 'draft', depth: 3 },
  { id: 'c-d3', name: 'painting-timeline.md', kind: 'file', meta: 'draft', depth: 3 },
  { id: 'c-sched', name: 'scheduled', kind: 'folder', meta: '2', depth: 2 },
  { id: 'c-s1', name: 'tuscany-live-painting.md', kind: 'file', meta: 'Jun 4', depth: 3 },
  { id: 'c-s2', name: 'italy-artist-guide.md', kind: 'file', meta: 'Jun 12', depth: 3 },
  { id: 'c-pub', name: 'published', kind: 'folder', meta: '2', depth: 2 },
  { id: 'c-p1', name: 'painter-vs-photographer.md', kind: 'file', meta: 'live', depth: 3 },
  { id: 'c-p2', name: 'france-live-painting.md', kind: 'file', meta: 'live', depth: 3 },
  { id: 'research', name: 'research', kind: 'folder', meta: 'SERP + gaps', depth: 1 },
  { id: 'r-serp', name: 'serp-snapshots', kind: 'folder', meta: '8 keywords', depth: 2 },
  { id: 'r-comp', name: 'competitors', kind: 'folder', meta: '4 domains', depth: 2 },
  { id: 'builder', name: 'site-builder', kind: 'folder', meta: 'dwp-v2', depth: 1 },
  { id: 'b-pages', name: 'pages', kind: 'folder', meta: '6 routes', depth: 2 },
  { id: 'b-home', name: 'index.astro', kind: 'file', meta: 'home', depth: 3 },
];

export const VOID_KANBAN: KanbanCard[] = [
  { id: 'k1', title: 'How Much Does a Wedding Painter Cost?', keyword: 'how much does a wedding painter cost', column: 'draft', date: 'May 26' },
  { id: 'k2', title: 'Hiring a Painter for Your Wedding Abroad', keyword: 'hire painter for wedding abroad', column: 'draft', date: 'May 22' },
  { id: 'k3', title: 'Wedding Day Painting Timeline', keyword: 'wedding day painting timeline', column: 'draft', date: 'May 18' },
  { id: 'k4', title: 'Live Wedding Painting in Tuscany', keyword: 'best wedding painters in tuscany', column: 'scheduled', date: 'Jun 4' },
  { id: 'k5', title: 'Italy Destination Wedding Artist Guide', keyword: 'italy destination wedding artist', column: 'scheduled', date: 'Jun 12' },
  { id: 'k6', title: 'Live Painter vs Wedding Photographer', keyword: 'live painter vs wedding photographer', column: 'published', date: 'May 8' },
  { id: 'k7', title: 'France Destination Wedding Live Painting', keyword: 'france wedding live painting', column: 'published', date: 'Apr 19' },
];

/** May 2026 — content calendar mock (weeks Sun–Sat). */
export const VOID_CALENDAR_WEEKS: CalendarDay[][] = buildMay2026Weeks();

function buildMay2026Weeks(): CalendarDay[][] {
  const posts: Record<number, CalendarDay['items']> = {
    8: [{ title: 'Painter vs Photographer', status: 'published' }],
    18: [{ title: 'Painting Timeline', status: 'draft' }],
    22: [{ title: 'Hiring Painter Abroad', status: 'draft' }],
    26: [{ title: 'Wedding Painter Cost', status: 'draft' }],
    29: [{ title: 'SERP refresh batch', status: 'scheduled' }],
  };

  const weeks: CalendarDay[][] = [];
  let day = 1;
  const daysInMonth = 31;
  // May 1 2026 is Friday → 5 leading blanks if week starts Sunday
  const flat: CalendarDay[] = [];

  for (let i = 0; i < 5; i++) {
    flat.push({ day: null, items: [] });
  }
  while (day <= daysInMonth) {
    flat.push({ day, items: posts[day] ?? [] });
    day++;
  }
  while (flat.length % 7 !== 0) {
    flat.push({ day: null, items: [] });
  }
  for (let i = 0; i < flat.length; i += 7) {
    weeks.push(flat.slice(i, i + 7));
  }
  return weeks;
}
