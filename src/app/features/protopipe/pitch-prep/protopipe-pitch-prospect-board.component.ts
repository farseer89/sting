import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  booleanAttribute,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { ProgressSpinner } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import type { PitchProspectStatus } from '@hive/contracts';
import { ProtopipePitchProspectService } from './protopipe-pitch-prospect.service';

// ── Types ────────────────────────────────────────────────────────────────────

export type PitchSection = 'leads' | 'prospects' | 'scripts' | 'objections' | 'offer';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won';
export type LeadTemp = 'cold' | 'reached-out' | 'warm' | 'hot';
export type LeadFilter = 'all' | LeadStatus;

interface ScoreBreakdown { label: string; pts: number; }
interface CompAd { name: string; duration: string; est: string; }

export interface PitchLead {
  id: string;
  score: number;
  priority: 'critical' | 'high' | 'medium' | 'monitor';
  name: string;
  initials: string;
  avatarBg: string;
  avatarColor: string;
  category: string;
  area: string;
  phone: string;
  rank: number;
  stars: number;
  reviewCount: number;
  areaBest: number;
  gap: number;
  website: 'none' | 'poor' | 'fair' | 'good';
  status: LeadStatus;
  defaultTemp: LeadTemp;
  compAds: CompAd[];
  scoreBreakdown: ScoreBreakdown[];
  pitch: string[];
  reviewNote: string;
  websiteNote: string;
  rankNote: string;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_PITCH_LEADS: PitchLead[] = [
  {
    id: 'copper-wire', score: 100, priority: 'critical',
    name: 'Copper Wire Co.', initials: 'CW', avatarBg: '#f4f4f5', avatarColor: '#3f3f46',
    category: 'Electrician', area: 'Chandler, AZ', phone: '(480) 555-0147',
    rank: 17, stars: 3.5, reviewCount: 8, areaBest: 4.9, gap: 1.4,
    website: 'none', status: 'new', defaultTemp: 'cold',
    compAds: [{ name: 'Bright Electric', duration: '14 months', est: '$2,400–3,800/mo' }],
    scoreBreakdown: [
      { label: 'Competitor running ads 14mo', pts: 35 },
      { label: 'Review gap 1.4★ vs area best', pts: 28 },
      { label: 'No website', pts: 25 },
      { label: 'Rank #17 (page 2)', pts: 12 },
    ],
    pitch: [
      'Bright Electric has been running Google Ads targeting "Chandler electrician" for 14 months straight. Ad campaigns that aren\'t producing revenue don\'t survive month 3 — they\'re pulling real jobs from your market right now.',
      'You have 3.5 stars with 8 reviews. The top electrician in Phoenix has 4.9 stars and 312 reviews. Most customers read reviews before they call. That gap is deciding the call before you answer.',
      'When someone hears your name and searches it, nothing comes up. No website means the next result they see is Bright Electric\'s. You\'re paying for word of mouth and handing the close to your competitor.',
    ],
    reviewNote: 'Most recent reviews mention slow response time and unclear pricing. Competitors are actively intercepting negative experiences with a review funnel before they post publicly.',
    websiteNote: 'No indexed web presence. Google Business profile is unclaimed on secondary categories. Map listing has no photos beyond 2 years old.',
    rankNote: 'Position #17 places this business below the fold on page 2 of local results. The local pack (top 3 map results) captures ~60% of clicks.',
  },
  {
    id: 'peoria-wiring', score: 80, priority: 'high',
    name: 'Peoria Wiring', initials: 'PW', avatarBg: '#f2f1f0', avatarColor: '#44403c',
    category: 'Electrician', area: 'Peoria, AZ', phone: '(623) 555-0183',
    rank: 15, stars: 4.1, reviewCount: 19, areaBest: 4.9, gap: 0.8,
    website: 'poor', status: 'new', defaultTemp: 'cold',
    compAds: [{ name: 'Bright Electric', duration: '9 months', est: '$1,800–3,200/mo' }],
    scoreBreakdown: [
      { label: 'Competitor running ads 9mo', pts: 30 },
      { label: 'Review gap 0.8★ vs area best', pts: 18 },
      { label: 'Poor website quality', pts: 20 },
      { label: 'Rank #15 (page 2)', pts: 12 },
    ],
    pitch: [
      'Bright Electric has been running paid search ads in Peoria for 9 months. They\'re targeting keywords like "electrician near me" and "panel upgrade Peoria" — searches that should be landing on your listing.',
      '4.1 stars sounds decent until you realize the top competitor has 4.9. Research shows customers treat anything under 4.5 as a yellow flag. 0.8 stars is the difference between the call and the next result.',
      'Your website scores poorly on load speed and mobile — two of Google\'s top ranking signals. You\'re fighting for position with one hand tied.',
    ],
    reviewNote: 'Reviews are infrequent and clustered around older jobs. No active review request process detected.',
    websiteNote: 'Site loads in 6.2s on mobile. Not SSL secured on secondary pages. No structured data or local schema.',
    rankNote: 'Position #15. Organic pack listings 1-3 capture the majority of "no preference" searches.',
  },
  {
    id: 'sparks-pro', score: 70, priority: 'high',
    name: 'Sparks Pro Electric', initials: 'SP', avatarBg: '#f4f4f5', avatarColor: '#3f3f46',
    category: 'Electrician', area: 'East Phoenix, AZ', phone: '(602) 555-0219',
    rank: 9, stars: 4.1, reviewCount: 64, areaBest: 4.9, gap: 0.8,
    website: 'poor', status: 'contacted', defaultTemp: 'reached-out',
    compAds: [{ name: 'Bright Electric', duration: '8 months', est: '$2,000–3,400/mo' }],
    scoreBreakdown: [
      { label: 'Competitor running ads 8mo', pts: 30 },
      { label: 'Review gap 0.8★ vs area best', pts: 18 },
      { label: 'Poor website quality', pts: 15 },
      { label: 'Rank #9 (below local pack)', pts: 7 },
    ],
    pitch: [
      'Bright Electric has been running Google Ads for 8 months in your area. That\'s not a test — that\'s a strategy that\'s working. They\'re capturing the searches that would go to you.',
      'Your competitor has a page that automatically asks happy customers for a review and redirects unhappy ones before they post. That\'s why the gap between your 4.1 and their 4.9 isn\'t closing on its own.',
      'Your website has technical issues holding you back in organic search. You have 64 reviews — the raw material is there. The infrastructure isn\'t converting it.',
    ],
    reviewNote: 'Healthy review volume but velocity has slowed. No evidence of a review generation funnel.',
    websiteNote: 'Non-optimized images, missing meta descriptions on service pages, no local schema markup.',
    rankNote: 'Position #9. Just outside the local 3-pack. Moving to #3–5 is achievable with structured SEO and review velocity.',
  },
  {
    id: 'desert-wire', score: 70, priority: 'high',
    name: 'Desert Wire LLC', initials: 'DW', avatarBg: '#f2f1f0', avatarColor: '#44403c',
    category: 'Electrician', area: 'Scottsdale, AZ', phone: '(480) 555-0094',
    rank: 14, stars: 3.8, reviewCount: 22, areaBest: 4.9, gap: 1.1,
    website: 'none', status: 'new', defaultTemp: 'cold',
    compAds: [],
    scoreBreakdown: [
      { label: 'Review gap 1.1★ vs area best', pts: 25 },
      { label: 'No website', pts: 25 },
      { label: 'Rank #14 (page 2)', pts: 12 },
      { label: 'No competitor running ads yet', pts: 8 },
    ],
    pitch: [
      'Your competitors aren\'t running paid ads in your immediate area yet — which is a short window. Once they do, the cost to catch up multiplies. Right now you can establish position before the bidding starts.',
      '3.8 stars is below the threshold most customers mentally use to shortlist. The area best has 4.9. That 1.1 gap is costing you calls every day — and it won\'t close without a system behind it.',
      'No website means Google can\'t serve you for searches beyond your profile. You\'re invisible to anyone who doesn\'t already know your name.',
    ],
    reviewNote: 'Several 3-star reviews mentioning pricing transparency. No response pattern to negative reviews.',
    websiteNote: 'No indexed web presence. Google Business profile is the only digital footprint.',
    rankNote: 'Position #14. Strong opportunity to move significantly with review velocity and a properly optimized landing page.',
  },
  {
    id: 'az-home', score: 70, priority: 'high',
    name: 'AZ Home Electric', initials: 'AZ', avatarBg: '#f4f4f5', avatarColor: '#3f3f46',
    category: 'Electrician', area: 'Mesa, AZ', phone: '(480) 555-0331',
    rank: 11, stars: 4.2, reviewCount: 45, areaBest: 4.9, gap: 0.7,
    website: 'poor', status: 'qualified', defaultTemp: 'warm',
    compAds: [{ name: 'Bright Electric', duration: '11 months', est: '$2,200–3,600/mo' }],
    scoreBreakdown: [
      { label: 'Competitor running ads 11mo', pts: 30 },
      { label: 'Review gap 0.7★ vs area best', pts: 15 },
      { label: 'Poor website quality', pts: 15 },
      { label: 'Rank #11 (page 2)', pts: 10 },
    ],
    pitch: [
      'Bright Electric has been running ads in Mesa for 11 months. That duration tells you the ROI is there. They\'re bidding on your customers by name in some cases.',
      '4.2 stars is close but not close enough. Customers scanning a results page default to the 4.5+ options first. 45 reviews is a solid base — a review funnel could close this gap in 60 days.',
      'Your site has performance issues that are suppressing your organic rank. You\'re at #11 with a site that could be doing more work for you.',
    ],
    reviewNote: 'Reviews are consistent but slow. Average 1–2 new reviews per month.',
    websiteNote: 'Site has render-blocking scripts. No Google Analytics 4 tracking detected. Contact form returns errors on mobile.',
    rankNote: 'Position #11. Mesa is a competitive sub-market. Paid + organic together would push visibility significantly.',
  },
  {
    id: 'sunbelt', score: 60, priority: 'medium',
    name: 'Sunbelt Electrical', initials: 'SE', avatarBg: '#f2f1f0', avatarColor: '#44403c',
    category: 'Electrician', area: 'Glendale, AZ', phone: '(623) 555-0076',
    rank: 7, stars: 3.9, reviewCount: 18, areaBest: 4.9, gap: 1.0,
    website: 'none', status: 'new', defaultTemp: 'cold',
    compAds: [],
    scoreBreakdown: [
      { label: 'Review gap 1.0★ vs area best', pts: 22 },
      { label: 'No website', pts: 25 },
      { label: 'Rank #7 (near local pack)', pts: 8 },
      { label: 'No competitor running ads', pts: 5 },
    ],
    pitch: [
      'You\'re at position #7 with 3.9 stars and no website. That combination means you\'re losing a measurable percentage of every search that could reach you. You\'re visible enough to be found but not optimized enough to convert.',
      'One bad review at 18 total drops you to 3.7. At this volume, every review carries real weight. A system that routes happy customers to leave reviews changes that math fast.',
      'Glendale has no dominant paid player yet. Being first to establish paid + organic gives you the market before someone else claims it.',
    ],
    reviewNote: '18 reviews is a thin base. One bad week can materially damage the star rating.',
    websiteNote: 'No web presence. Phone number on GMB profile is only contact method.',
    rankNote: 'Position #7 is one strong month from the 3-pack. Review velocity + profile optimization is the lever.',
  },
  {
    id: 'tempe-electric', score: 45, priority: 'medium',
    name: 'Tempe Electric', initials: 'TE', avatarBg: '#e8eeff', avatarColor: '#3554c1',
    category: 'Electrician', area: 'Tempe, AZ', phone: '(480) 555-0258',
    rank: 6, stars: 4.3, reviewCount: 71, areaBest: 4.9, gap: 0.6,
    website: 'good', status: 'qualified', defaultTemp: 'hot',
    compAds: [{ name: 'Bright Electric', duration: '5 months', est: '$1,400–2,800/mo' }],
    scoreBreakdown: [
      { label: 'Competitor running ads 5mo', pts: 20 },
      { label: 'Review gap 0.6★ vs area best', pts: 15 },
      { label: 'Good website (minor gaps)', pts: 5 },
      { label: 'Rank #6 (page 1)', pts: 5 },
    ],
    pitch: [
      'Bright Electric started running ads in Tempe 5 months ago. They\'re buying market share in your backyard while you don\'t have a paid presence. Even a defensive campaign would protect your position.',
      '4.3 stars is solid but the local leader is at 4.9. Customers who compare won\'t always choose you. 0.6 stars is closeable — but it doesn\'t close itself.',
      'Your site is strong which is good news — the infrastructure is there to build on. Paid ads + review velocity is the gap between where you are and market leader.',
    ],
    reviewNote: 'Strong review base with good velocity. Recent reviews are mostly positive with fast response times noted.',
    websiteNote: 'Site is well built. Minor improvements: no review schema, service area pages could be expanded.',
    rankNote: 'Position #6. Strong candidate to break into the local 3-pack with the right signals.',
  },
  {
    id: 'rio-verde', score: 40, priority: 'medium',
    name: 'Rio Verde Electrical', initials: 'RV', avatarBg: '#e8eeff', avatarColor: '#3554c1',
    category: 'Electrician', area: 'Rio Verde, AZ', phone: '(480) 555-0412',
    rank: 12, stars: 4.0, reviewCount: 31, areaBest: 4.9, gap: 0.9,
    website: 'poor', status: 'new', defaultTemp: 'cold',
    compAds: [],
    scoreBreakdown: [
      { label: 'Review gap 0.9★ vs area best', pts: 18 },
      { label: 'Poor website quality', pts: 15 },
      { label: 'Rank #12 (page 2)', pts: 7 },
    ],
    pitch: [
      '4.0 stars is below the shortlist threshold for most search behavior. The top competitor has 4.9. That 0.9 gap is costing you calls on every search comparison.',
      'No competitor is running paid ads in Rio Verde yet — that\'s a window. First mover advantage in paid search is real, and it closes fast once someone takes it.',
      'Your site has performance issues that are costing you organic visibility in an area where you could be the clear leader.',
    ],
    reviewNote: 'Reviews are scattered over 3 years. No apparent review generation strategy.',
    websiteNote: 'Slow load times, outdated design, not mobile optimized. Rio Verde is a growth area — the opportunity is real.',
    rankNote: 'Position #12. Smaller, less competitive market. Achievable to hit top 5 faster than Phoenix proper.',
  },
  {
    id: 'mesa-power', score: 30, priority: 'monitor',
    name: 'Mesa Power Solutions', initials: 'MP', avatarBg: '#f4f4f5', avatarColor: '#3f3f46',
    category: 'Electrician', area: 'Mesa, AZ', phone: '(480) 555-0502',
    rank: 3, stars: 4.6, reviewCount: 189, areaBest: 4.9, gap: 0.3,
    website: 'fair', status: 'contacted', defaultTemp: 'reached-out',
    compAds: [{ name: 'SunState Electric', duration: '6 months', est: '$2,000–3,200/mo' }],
    scoreBreakdown: [
      { label: 'Competitor running ads 6mo', pts: 25 },
      { label: 'Review gap 0.3★ vs area best', pts: 5 },
    ],
    pitch: [
      'You\'re at #3 with 4.6 stars — that\'s a strong position. SunState Electric has been running ads for 6 months targeting your customers. Even at your rank, paid search is buying intent traffic you\'re not capturing.',
      'The gap between 4.6 and 4.9 is smaller than it looks. 189 reviews is a great base — a consistent review funnel could close this and push you to area leader.',
      'Your site works but isn\'t maximizing your position. Structured data and expanded service pages would reinforce the organic rank you\'ve earned.',
    ],
    reviewNote: 'Strong review volume and velocity. Some service-specific pages could drive more category searches.',
    websiteNote: 'Functional but not fully optimized for local SEO. Missing structured data and some service area pages.',
    rankNote: 'Position #3 — inside the local pack. Hold and grow is the strategy here.',
  },
  {
    id: 'scottsdale-spark', score: 30, priority: 'monitor',
    name: 'Scottsdale Spark', initials: 'SS', avatarBg: '#e8eeff', avatarColor: '#3554c1',
    category: 'Electrician', area: 'Scottsdale, AZ', phone: '(480) 555-0619',
    rank: 4, stars: 4.9, reviewCount: 312, areaBest: 4.9, gap: 0,
    website: 'good', status: 'won', defaultTemp: 'hot',
    compAds: [{ name: '3 competitors', duration: 'active', est: 'est. $5k–9k/mo combined' }],
    scoreBreakdown: [
      { label: '3 competitors running ads against you', pts: 30 },
    ],
    pitch: [
      'You\'re the area leader at 4.9 stars — that position has real value and real targets on it. Three competitors are collectively spending $5k–9k per month on ads designed to intercept your customers.',
      'Without a paid presence, you\'re allowing your competitors to buy the searches of people who would otherwise choose you by default based on your organic ranking and reviews.',
      'The hard work of building a reputation is done. Paid ads at your ranking + review level have an unusually high quality score — lower cost per click, higher conversion.',
    ],
    reviewNote: 'Area best. Review profile is strong and consistent. Maintain velocity and respond to all reviews.',
    websiteNote: 'Good site. Well positioned for both organic and paid campaigns.',
    rankNote: 'Position #4 — narrowly outside the 3-pack. Adding paid advertising could push the profile into top 3 combined visibility.',
  },
  {
    id: 'valley-voltage', score: 25, priority: 'monitor',
    name: 'Valley Voltage', initials: 'VV', avatarBg: '#f2f1f0', avatarColor: '#44403c',
    category: 'Electrician', area: 'Tempe, AZ', phone: '(480) 555-0744',
    rank: 5, stars: 4.4, reviewCount: 108, areaBest: 4.9, gap: 0.5,
    website: 'fair', status: 'new', defaultTemp: 'cold',
    compAds: [{ name: 'SunState Electric', duration: '3 months', est: '$1,200–2,400/mo' }],
    scoreBreakdown: [
      { label: 'Competitor running ads 3mo', pts: 10 },
      { label: 'Review gap 0.5★ vs area best', pts: 15 },
    ],
    pitch: [
      'SunState Electric is 3 months into running Google Ads in your area. Early in the campaign — this is the moment to respond before they optimize and entrench.',
      '4.4 stars with 108 reviews is strong. The 0.5 gap to 4.9 is closeable with a review system. Closing that gap changes your visual authority on results pages.',
      'Your site is functional but not maximizing your organic signals. Some technical improvements + paid would compound your existing strong position.',
    ],
    reviewNote: 'Strong base. Review velocity is moderate — could be improved with an active request system.',
    websiteNote: 'Fair performance. Could be improved for mobile experience and local schema.',
    rankNote: 'Position #5. Competitive position with room to grow.',
  },
  {
    id: 'chandler-circuit', score: 20, priority: 'monitor',
    name: 'Chandler Circuit', initials: 'CC', avatarBg: '#f4f4f5', avatarColor: '#3f3f46',
    category: 'Electrician', area: 'Chandler, AZ', phone: '(480) 555-0836',
    rank: 8, stars: 4.5, reviewCount: 94, areaBest: 4.9, gap: 0.4,
    website: 'fair', status: 'won', defaultTemp: 'hot',
    compAds: [{ name: 'SunState Electric', duration: '2 months', est: '$800–1,800/mo' }],
    scoreBreakdown: [
      { label: 'Competitor just started ads 2mo', pts: 10 },
      { label: 'Review gap 0.4★ vs area best', pts: 10 },
    ],
    pitch: [
      'SunState Electric just started running ads in Chandler 2 months ago — very early. This is the cheapest time to respond before they learn the market.',
      '4.5 stars with 94 reviews is a solid position. A small improvement in review velocity could push you toward the benchmark that anchors trust.',
      'Position #8 with a fair site. There\'s a clear path to the 3-pack with a coordinated SEO + review push.',
    ],
    reviewNote: 'Solid review base. Recent reviews positive and specific about quality of work.',
    websiteNote: 'Site is functional. Some improvements to page speed and local schema would help.',
    rankNote: 'Position #8. Chandler is a growing market. First mover with coordinated digital strategy wins here.',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-protopipe-pitch-prospect-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Button, Dialog, InputText, ProgressSpinner, TableModule, Tag],
  templateUrl: './protopipe-pitch-prospect-board.component.html',
  styleUrl: './protopipe-pitch-prospect-board.component.scss',
})
export class ProtopipePitchProspectBoardComponent implements OnInit {
  private readonly router = inject(Router);
  readonly prospectsSvc = inject(ProtopipePitchProspectService);

  readonly embedded = input(false, { transform: booleanAttribute });
  readonly openProspect = output<string>();

  // ── Existing prospect add dialog
  readonly showAdd = signal(false);
  readonly newName = signal('');
  readonly newUrl = signal('');
  readonly creating = signal(false);

  // ── Binder nav
  readonly pitchSection = signal<PitchSection>('leads');

  // ── Leads table state
  readonly leads = MOCK_PITCH_LEADS;
  readonly activeFilter = signal<LeadFilter>('all');
  readonly drawerLead = signal<PitchLead | null>(null);

  readonly temps = signal<Record<string, LeadTemp>>(
    Object.fromEntries(MOCK_PITCH_LEADS.map(l => [l.id, l.defaultTemp])) as Record<string, LeadTemp>
  );

  readonly filteredLeads = computed(() => {
    const f = this.activeFilter();
    return f === 'all' ? this.leads : this.leads.filter(l => l.status === f);
  });

  ngOnInit(): void {
    void this.prospectsSvc.loadList();
  }

  // ── Leads table helpers

  rankClass(rank: number): string {
    if (rank <= 5) return 'vsh-rank--good';
    if (rank <= 10) return 'vsh-rank--mid';
    return 'vsh-rank--low';
  }

  gapClass(gap: number): string {
    if (gap >= 1.0) return 'vsh-review-cell__gap--crit';
    if (gap >= 0.5) return 'vsh-review-cell__gap--warn';
    return 'vsh-review-cell__gap--ok';
  }

  gapText(lead: PitchLead): string {
    return lead.gap === 0 ? 'Area best' : `↓${lead.gap} vs best`;
  }

  adClass(lead: PitchLead): string {
    if (lead.compAds.length > 1) return 'vsh-ad-signal--multi';
    if (lead.compAds.length === 1) return 'vsh-ad-signal--active';
    return 'vsh-ad-signal--none';
  }

  adText(lead: PitchLead): string {
    if (lead.compAds.length > 1) return `${lead.compAds.length} competitors active`;
    if (lead.compAds.length === 1) return `${lead.compAds[0].name} · ${lead.compAds[0].duration}`;
    return 'No competitor ads';
  }

  getTemp(leadId: string): LeadTemp {
    return this.temps()[leadId] ?? 'cold';
  }

  tempLabel(t: LeadTemp): string {
    return { cold: 'Cold', 'reached-out': 'Reached out', warm: 'Warm', hot: 'Hot' }[t];
  }

  cycleTemp(leadId: string, event: Event): void {
    event.stopPropagation();
    const cycle: LeadTemp[] = ['cold', 'reached-out', 'warm', 'hot'];
    const cur = this.getTemp(leadId);
    const next = cycle[(cycle.indexOf(cur) + 1) % cycle.length];
    this.temps.update(t => ({ ...t, [leadId]: next }));
  }

  leadCount(status: LeadStatus): number {
    return this.leads.filter(l => l.status === status).length;
  }

  priorityLabel(p: PitchLead['priority']): string {
    return { critical: 'Critical', high: 'High', medium: 'Medium', monitor: 'Monitor' }[p];
  }

  statusLabel(s: LeadStatus): string {
    return { new: 'New', contacted: 'Contacted', qualified: 'Qualified', won: 'Won' }[s];
  }

  websiteLabel(w: PitchLead['website']): string {
    return { none: 'None', poor: 'Poor', fair: 'Fair', good: 'Good' }[w];
  }

  openDrawer(lead: PitchLead, event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('input') || target.closest('.vsh-lead-actions') || target.closest('.vsh-temp')) return;
    this.drawerLead.set(lead);
  }

  closeDrawer(): void {
    this.drawerLead.set(null);
  }

  // ── Existing prospect methods

  statusSeverity(status: PitchProspectStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'ready': return 'success';
      case 'generating':
      case 'ingesting': return 'warn';
      case 'failed': return 'danger';
      default: return 'secondary';
    }
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  }

  openAdd(): void {
    this.newName.set('');
    this.newUrl.set('');
    this.showAdd.set(true);
  }

  async createProspect(): Promise<void> {
    const name = this.newName().trim();
    const sourceUrl = this.newUrl().trim();
    if (!name || !sourceUrl) return;
    this.creating.set(true);
    const prospect = await this.prospectsSvc.create({ name, sourceUrl });
    this.creating.set(false);
    if (prospect) {
      this.showAdd.set(false);
      this.navigateToProspect(prospect.id);
    }
  }

  openProspectRow(prospectId: string): void {
    this.navigateToProspect(prospectId);
  }

  private navigateToProspect(prospectId: string): void {
    if (this.embedded()) {
      this.openProspect.emit(prospectId);
      return;
    }
    void this.router.navigate(['/home/pitch-prep', prospectId, 'wizard']);
  }
}
