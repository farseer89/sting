import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

export type AnalyticsSection =
  | 'pulse'
  | 'content'
  | 'funnels'
  | 'sessions'
  | 'heatmaps'
  | 'experiments'
  | 'signals';

export interface ContentRow {
  title: string;
  slug: string;
  sessions: number;
  avgTime: string;
  scrollDepth: number;
  ctaClicks: number;
  cvr: number;
  trend: 'up' | 'down' | 'flat';
  trendPct: number;
}

export interface FunnelStep {
  label: string;
  count: number;
  dropPct: number;
  api: string;
}

export interface SessionRow {
  id: string;
  location: string;
  duration: string;
  pages: number;
  aiSummary: string;
  value: 'high' | 'medium' | 'low';
  signals: string[];
  recordingUrl: string;
}

export interface HeatmapSection {
  label: string;
  reachPct: number;
  hasCta: boolean;
  ctaClicks?: number;
}

export interface Experiment {
  id: string;
  name: string;
  status: 'running' | 'complete' | 'draft';
  metric: string;
  confidence: number;
  variants: { name: string; cvr: number; sessions: number; winner?: boolean }[];
  insight: string;
}

export interface Signal {
  id: string;
  severity: 'critical' | 'opportunity' | 'insight' | 'info';
  icon: string;
  title: string;
  body: string;
  api: string;
  action?: string;
}

@Component({
  selector: 'app-protopipe-home-analytics-binder',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-home-analytics-binder.component.html',
  styleUrl: './protopipe-home-analytics-binder.component.scss',
})
export class ProtopipeHomeAnalyticsBinderComponent {
  readonly activeSection = signal<AnalyticsSection>('pulse');
  readonly activeHeatmapArticle = signal<string>('panel-upgrade');
  readonly activeFunnel = signal<string>('content-to-lead');

  readonly heatmapArticles = [
    { id: 'panel-upgrade', label: 'When Should You Upgrade Your Electrical Panel?' },
    { id: 'ev-charger', label: 'How Much Does EV Charger Installation Cost?' },
    { id: 'safety-tips', label: '10 Electrical Safety Tips' },
  ];

  readonly heatmaps: Record<string, HeatmapSection[]> = {
    'panel-upgrade': [
      { label: 'Intro / hook', reachPct: 94, hasCta: false },
      { label: 'Signs Your Panel Needs Replacing', reachPct: 82, hasCta: false },
      { label: 'Understanding Panel Capacity', reachPct: 71, hasCta: false },
      { label: 'The Cost of a Panel Upgrade', reachPct: 63, hasCta: true, ctaClicks: 18 },
      { label: 'The Permit Process in Arizona', reachPct: 42, hasCta: false },
      { label: 'DIY vs. Licensed Electrician', reachPct: 31, hasCta: false },
      { label: 'Bottom CTA / next steps', reachPct: 18, hasCta: true, ctaClicks: 4 },
    ],
    'ev-charger': [
      { label: 'Intro / hook', reachPct: 96, hasCta: false },
      { label: 'Level 1 vs Level 2 Charger', reachPct: 88, hasCta: false },
      { label: 'Installation Cost Breakdown', reachPct: 76, hasCta: true, ctaClicks: 14 },
      { label: 'Permit Requirements', reachPct: 54, hasCta: false },
      { label: 'How Long Does It Take?', reachPct: 38, hasCta: false },
      { label: 'Bottom CTA', reachPct: 22, hasCta: true, ctaClicks: 3 },
    ],
    'safety-tips': [
      { label: 'Intro', reachPct: 91, hasCta: false },
      { label: 'Tips 1–3', reachPct: 79, hasCta: false },
      { label: 'Tips 4–7', reachPct: 52, hasCta: false },
      { label: 'Tips 8–10', reachPct: 31, hasCta: true, ctaClicks: 6 },
      { label: 'Bottom CTA', reachPct: 14, hasCta: true, ctaClicks: 1 },
    ],
  };

  readonly funnels: Record<string, { label: string; desc: string; totalCvr: string; steps: FunnelStep[] }> = {
    'content-to-lead': {
      label: 'Content → Lead',
      desc: 'Full conversion path from article pageview to form submission.',
      totalCvr: '1.11%',
      steps: [
        { label: 'Article pageview', count: 8432, dropPct: 0, api: 'event: $pageview, path matches /blog/' },
        { label: 'Scrolled 50%+', count: 5890, dropPct: 30.1, api: 'event: scroll_depth, properties.depth >= 50' },
        { label: 'CTA visible', count: 2247, dropPct: 61.8, api: 'event: $element_click, tag: section.cta-section' },
        { label: 'CTA clicked', count: 712, dropPct: 68.3, api: 'event: cta_click' },
        { label: 'Form started', count: 389, dropPct: 45.4, api: 'event: form_start, form_id: contact' },
        { label: 'Lead submitted', count: 94, dropPct: 75.8, api: 'event: form_submit, form_id: contact' },
      ],
    },
    'phone-cta': {
      label: 'Phone CTA',
      desc: 'How many article readers tap the phone number to call.',
      totalCvr: '12.5%',
      steps: [
        { label: 'Article pageview', count: 1247, dropPct: 0, api: 'event: $pageview, path matches /blog/' },
        { label: 'Phone CTA visible', count: 934, dropPct: 25.1, api: 'event: phone_cta_view' },
        { label: 'Phone number tapped', count: 156, dropPct: 83.3, api: 'event: phone_click' },
      ],
    },
    'multi-article': {
      label: 'Multi-article read',
      desc: 'Users who engage deeply enough to read a second article.',
      totalCvr: '15.9%',
      steps: [
        { label: 'First article view', count: 1247, dropPct: 0, api: 'event: $pageview, path matches /blog/' },
        { label: 'Read 75%+ of article', count: 847, dropPct: 32.1, api: 'event: scroll_depth, depth >= 75' },
        { label: 'Clicked internal link', count: 312, dropPct: 63.2, api: 'event: $autocapture, link href matches /blog/' },
        { label: 'Second article view', count: 198, dropPct: 36.5, api: 'event: $pageview, session_article_count >= 2' },
      ],
    },
  };

  readonly contentRows: ContentRow[] = [
    { title: 'When Should You Upgrade Your Electrical Panel?', slug: 'electrical-panel-upgrade', sessions: 412, avgTime: '4:12', scrollDepth: 74, ctaClicks: 18, cvr: 4.4, trend: 'up', trendPct: 22 },
    { title: 'How Much Does an Electrician Cost in Phoenix?', slug: 'electrician-cost-phoenix', sessions: 244, avgTime: '3:15', scrollDepth: 58, ctaClicks: 9, cvr: 3.7, trend: 'up', trendPct: 8 },
    { title: 'How Much Does EV Charger Installation Cost?', slug: 'ev-charger-installation-cost', sessions: 289, avgTime: '3:47', scrollDepth: 62, ctaClicks: 11, cvr: 3.8, trend: 'up', trendPct: 41 },
    { title: 'Signs Your Breaker Box Needs Replacing', slug: 'signs-breaker-box-needs-replacing', sessions: 115, avgTime: '2:58', scrollDepth: 51, ctaClicks: 3, cvr: 2.6, trend: 'flat', trendPct: 0 },
    { title: '10 Electrical Safety Tips', slug: 'electrical-safety-tips', sessions: 187, avgTime: '2:31', scrollDepth: 41, ctaClicks: 4, cvr: 2.1, trend: 'down', trendPct: 6 },
  ];

  readonly sessions: SessionRow[] = [
    {
      id: 'rec_01j2kp',
      location: 'Phoenix, AZ',
      duration: '8m 14s',
      pages: 4,
      aiSummary: 'Researched panel upgrade costs extensively. Clicked "Get a quote" twice, paused on the form\'s phone number field for 43 seconds, then abandoned. High purchase intent.',
      value: 'high',
      signals: ['form dropout', 'multi-page'],
      recordingUrl: '#',
    },
    {
      id: 'rec_02m4qr',
      location: 'Scottsdale, AZ',
      duration: '3m 22s',
      pages: 2,
      aiSummary: 'Read EV charger article to 90% scroll depth. Hovered on phone CTA for 8 seconds, then exited. Likely comparing contractors.',
      value: 'high',
      signals: ['deep read', 'cta hover'],
      recordingUrl: '#',
    },
    {
      id: 'rec_03f7xt',
      location: 'Mesa, AZ',
      duration: '14m 02s',
      pages: 7,
      aiSummary: 'Rage-clicked form submit button 3 times. Validation error appears to not have cleared after phone number correction. High frustration signal.',
      value: 'medium',
      signals: ['rage click', 'form error'],
      recordingUrl: '#',
    },
    {
      id: 'rec_04n9wz',
      location: 'Tempe, AZ',
      duration: '5m 44s',
      pages: 3,
      aiSummary: 'Read panel upgrade and cost breakdown articles. Clicked internal link to EV charger article. Never reached a CTA.',
      value: 'medium',
      signals: ['multi-page', 'no cta'],
      recordingUrl: '#',
    },
    {
      id: 'rec_05b1kl',
      location: 'Chandler, AZ',
      duration: '1m 08s',
      pages: 1,
      aiSummary: 'Landed on safety tips article from organic search. Scrolled to 31%, then exited. Low engagement — possible mismatch between search intent and content.',
      value: 'low',
      signals: ['low scroll', 'quick exit'],
      recordingUrl: '#',
    },
  ];

  readonly playlists = [
    { name: 'Form abandonment', count: 23, icon: '⚠' },
    { name: 'Multi-article readers', count: 47, icon: '📚' },
    { name: 'Phone CTA interactions', count: 89, icon: '📞' },
    { name: 'Rage clicks', count: 12, icon: '🔥' },
  ];

  readonly experiments: Experiment[] = [
    {
      id: 'exp-cta-copy',
      name: 'CTA button copy',
      status: 'running',
      metric: 'form_submit conversion',
      confidence: 87,
      variants: [
        { name: 'Get a free quote (control)', cvr: 2.1, sessions: 412 },
        { name: 'Call us today', cvr: 2.4, sessions: 407 },
        { name: 'Schedule an inspection', cvr: 3.8, sessions: 398, winner: true },
      ],
      insight: '"Schedule an inspection" outperforms control by +81%. Matches homeowner intent more precisely — they\'re not ready to "get a quote" yet, but they are ready to schedule.',
    },
    {
      id: 'exp-hero-image',
      name: 'Hero image on articles',
      status: 'complete',
      metric: 'scroll_depth avg + time on page',
      confidence: 98,
      variants: [
        { name: 'No hero image (control)', cvr: 2.12, sessions: 612 },
        { name: 'Hero image above fold', cvr: 3.87, sessions: 589, winner: true },
      ],
      insight: 'Hero images increase avg scroll depth from 51% to 68% and avg time on page from 2:12 to 3:47. All new articles should include hero images.',
    },
    {
      id: 'exp-internal-links',
      name: 'Inline CTA placement',
      status: 'running',
      metric: 'cta_click rate',
      confidence: 61,
      variants: [
        { name: 'Bottom only (control)', cvr: 1.8, sessions: 287 },
        { name: 'Mid-article + bottom', cvr: 4.4, sessions: 294, winner: true },
      ],
      insight: 'Mid-article CTA placement (inside the "cost" section) drives significantly higher click rates. Early results — need more data to confirm.',
    },
    {
      id: 'exp-form-phone',
      name: 'Phone number optional',
      status: 'draft',
      metric: 'form_submit conversion',
      confidence: 0,
      variants: [
        { name: 'Phone required (control)', cvr: 1.11, sessions: 0 },
        { name: 'Phone optional', cvr: 0, sessions: 0 },
      ],
      insight: 'Rage click analysis shows 74% of form dropouts happen on the phone number field. Hypothesis: making it optional will increase form completions significantly.',
    },
  ];

  readonly signals: Signal[] = [
    {
      id: 'sig-1',
      severity: 'critical',
      icon: '🚨',
      title: 'Form validation is blocking 74% of form starters',
      body: 'Rage click analysis shows 3x industry-average rage clicks on the contact form\'s Submit button. Session recordings confirm a validation error on the phone number field that doesn\'t clear correctly on correction. Fixing this could unlock ~200 additional leads/month.',
      api: 'HogQLQuery: SELECT COUNT() FROM events WHERE event = \'$rageclick\' AND elements_chain LIKE \'%contact-form%\'',
      action: 'Fix form validation',
    },
    {
      id: 'sig-2',
      severity: 'opportunity',
      icon: '🔑',
      title: 'Multi-article readers convert at 4.1× the site average',
      body: 'Users who read 2 or more articles convert at 4.56% vs the site-wide 1.11%. Your internal link strategy is the highest-leverage conversion mechanism you have. Every top article needs strong links to related articles.',
      api: 'FunnelsQuery: segmented by session_article_count >= 2',
      action: 'Audit internal links',
    },
    {
      id: 'sig-3',
      severity: 'opportunity',
      icon: '📈',
      title: '"How much does..." articles convert 2.3× above average',
      body: 'Cost and pricing articles (panel upgrade cost, EV charger cost) drive disproportionate leads. Visitors arriving with price intent are further down the funnel. Writing more cost-focused articles should be the immediate priority.',
      api: 'TrendsQuery: cvr by page_title contains "cost" OR "price"',
      action: 'Prioritize 3 cost articles',
    },
    {
      id: 'sig-4',
      severity: 'insight',
      icon: '💡',
      title: 'Mid-article CTA drives 3× more clicks than bottom CTA',
      body: 'Only 18% of article readers reach the bottom CTA. The CTA embedded in the "cost" section — which 63% of readers reach — generates 3× more clicks. Reposition all article CTAs to appear in the high-reach cost or decision section.',
      api: 'HogQLQuery: cta_click events grouped by element position',
      action: 'Reposition CTAs',
    },
    {
      id: 'sig-5',
      severity: 'insight',
      icon: '📱',
      title: 'Mobile users bounce 28% faster on articles without hero images',
      body: 'Mobile sessions on articles without a hero image have an avg time-on-page of 1:31 vs 3:22 with hero. 4 of your top 10 articles are missing hero images. This is especially critical for EV charger and safety articles which skew mobile.',
      api: 'TrendsQuery: avg_time_on_page segmented by has_hero_image × device_type',
      action: 'Add heroes to 4 articles',
    },
    {
      id: 'sig-6',
      severity: 'info',
      icon: '🕐',
      title: 'Thursday 8–10 AM is your highest-converting traffic window',
      body: 'TrendsQuery across 90 days shows organic traffic peaks Thursday morning and converts at 1.89% — 70% above your overall average. Consider scheduling social shares, email drops, and new article publishes to Thursday 7 AM.',
      api: 'HogQLQuery: cvr by dayofweek(timestamp), hour(timestamp)',
    },
  ];

  get activeFunnelData() {
    return this.funnels[this.activeFunnel()];
  }

  get activeHeatmapData(): HeatmapSection[] {
    return this.heatmaps[this.activeHeatmapArticle()] ?? [];
  }

  get activeHeatmapArticleLabel(): string {
    return this.heatmapArticles.find((a) => a.id === this.activeHeatmapArticle())?.label ?? '';
  }

  barWidth(count: number, max: number): number {
    return Math.round((count / max) * 100);
  }
}
