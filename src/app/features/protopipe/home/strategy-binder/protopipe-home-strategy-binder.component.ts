import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

export type StrategySection = 'overview' | 'pillars' | 'calendar' | 'backlog' | 'keywords' | 'tune';

export interface MockPillar {
  id: string;
  name: string;
  keyword: string;
  angle: string;
  intent: string;
  supportingCount: number;
  articles: string[];
}

export interface MockCalendarItem {
  title: string;
  keyword: string;
  type: 'pillar' | 'supporting';
  cluster: string;
  intent: string;
  publishAt: string;
  priority: 'high' | 'medium' | 'low';
  funnelStage: 'awareness' | 'consideration' | 'decision';
}

export interface MockKeyword {
  phrase: string;
  volume: number;
  difficulty: number;
  tier: 'immediate' | 'long-term' | 'long-tail';
  intent: string;
  gap: boolean;
}

@Component({
  selector: 'app-protopipe-home-strategy-binder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-home-strategy-binder.component.html',
  styleUrl: './protopipe-home-strategy-binder.component.scss',
})
export class ProtopipeHomeStrategyBinderComponent {
  readonly activeSection = signal<StrategySection>('overview');

  readonly narrative = {
    headline: 'Become Phoenix\'s most-trusted electrical expert before your competitors figure out content',
    why: 'Sparky Electric has strong reviews and established local presence. Your competitors are just starting to invest in content. This 6-month window is the highest-leverage moment to own the organic rankings that drive inbound calls.',
  };

  readonly stats = {
    pillars: 4,
    scheduled: 8,
    backlog: 14,
    keywords: 62,
    existingWins: 3,
  };

  readonly pillars: MockPillar[] = [
    {
      id: 'panel-upgrades',
      name: 'Panel & Service Upgrades',
      keyword: 'electrical panel upgrade',
      angle: 'Educate homeowners on real warning signs and costs. Position Sparky as the local expert who doesn\'t oversell.',
      intent: 'Informational → Decision',
      supportingCount: 5,
      articles: [
        'When Should You Upgrade Your Electrical Panel?',
        'How Much Does a 200 Amp Service Upgrade Cost?',
        'Signs Your Breaker Box Needs Replacing',
        '100A vs 200A Panel: What\'s Right for Your Home?',
        'The Permit Process for Panel Upgrades in Phoenix',
      ],
    },
    {
      id: 'ev-charging',
      name: 'EV Charging Installation',
      keyword: 'home EV charger installation',
      angle: 'Capture the EV adoption wave early. Most EV owners are searching for trusted local electricians before they buy their second car.',
      intent: 'Decision',
      supportingCount: 4,
      articles: [
        'How Much Does EV Charger Installation Cost in Phoenix?',
        'Level 1 vs Level 2 Home EV Charger: Which Do You Need?',
        'How Long Does EV Charger Installation Take?',
        'EV Charger Installation Requirements: What You Need to Know',
      ],
    },
    {
      id: 'electrical-safety',
      name: 'Electrical Safety',
      keyword: 'home electrical safety',
      angle: 'Build trust and authority with safety content. This drives brand recall and top-of-funnel leads from homeowners who aren\'t ready to hire yet but will be.',
      intent: 'Awareness',
      supportingCount: 3,
      articles: [
        '10 Electrical Safety Tips Every Homeowner Should Know',
        'Is Your Home\'s Wiring Safe? Warning Signs to Watch For',
        'GFCI vs AFCI Outlets: What\'s the Difference and Where Do You Need Them?',
      ],
    },
    {
      id: 'home-renovations',
      name: 'Home Renovation Electrical',
      keyword: 'electrician for home renovation',
      angle: 'Intercept homeowners mid-renovation. This is a high-value, high-intent audience — they\'re already spending money and need an electrician.',
      intent: 'Consideration → Decision',
      supportingCount: 2,
      articles: [
        'What Electrical Work Requires a Licensed Electrician?',
        'How to Plan Electrical for a Kitchen Remodel',
      ],
    },
  ];

  readonly calendar: MockCalendarItem[] = [
    {
      title: 'When Should You Upgrade Your Electrical Panel?',
      keyword: 'electrical panel upgrade',
      type: 'pillar',
      cluster: 'Panel & Service Upgrades',
      intent: 'Informational',
      publishAt: 'Jun 26, 2026',
      priority: 'high',
      funnelStage: 'consideration',
    },
    {
      title: 'How Much Does EV Charger Installation Cost in Phoenix?',
      keyword: 'EV charger installation cost',
      type: 'pillar',
      cluster: 'EV Charging',
      intent: 'Decision',
      publishAt: 'Jul 3, 2026',
      priority: 'high',
      funnelStage: 'decision',
    },
    {
      title: '10 Electrical Safety Tips Every Homeowner Should Know',
      keyword: 'home electrical safety tips',
      type: 'supporting',
      cluster: 'Electrical Safety',
      intent: 'Awareness',
      publishAt: 'Jul 10, 2026',
      priority: 'medium',
      funnelStage: 'awareness',
    },
    {
      title: 'How Much Does a 200 Amp Service Upgrade Cost?',
      keyword: '200 amp service upgrade cost',
      type: 'supporting',
      cluster: 'Panel & Service Upgrades',
      intent: 'Decision',
      publishAt: 'Jul 17, 2026',
      priority: 'high',
      funnelStage: 'decision',
    },
    {
      title: 'Level 1 vs Level 2 Home EV Charger: Which Do You Need?',
      keyword: 'level 2 EV charger home',
      type: 'supporting',
      cluster: 'EV Charging',
      intent: 'Informational',
      publishAt: 'Jul 24, 2026',
      priority: 'medium',
      funnelStage: 'consideration',
    },
    {
      title: 'Signs Your Breaker Box Needs Replacing',
      keyword: 'signs breaker box needs replacing',
      type: 'supporting',
      cluster: 'Panel & Service Upgrades',
      intent: 'Awareness',
      publishAt: 'Jul 31, 2026',
      priority: 'medium',
      funnelStage: 'awareness',
    },
    {
      title: 'Is Your Home\'s Wiring Safe? Warning Signs to Watch For',
      keyword: 'home wiring safety',
      type: 'supporting',
      cluster: 'Electrical Safety',
      intent: 'Awareness',
      publishAt: 'Aug 7, 2026',
      priority: 'low',
      funnelStage: 'awareness',
    },
    {
      title: 'What Electrical Work Requires a Licensed Electrician?',
      keyword: 'what electrical work requires electrician',
      type: 'pillar',
      cluster: 'Home Renovation',
      intent: 'Informational',
      publishAt: 'Aug 14, 2026',
      priority: 'medium',
      funnelStage: 'consideration',
    },
  ];

  readonly backlog: { title: string; keyword: string; cluster: string; volume: number; difficulty: number }[] = [
    { title: 'The Permit Process for Panel Upgrades in Phoenix', keyword: 'panel upgrade permit phoenix', cluster: 'Panel & Service Upgrades', volume: 880, difficulty: 22 },
    { title: '100A vs 200A Panel: What\'s Right for Your Home?', keyword: '100 amp vs 200 amp panel', cluster: 'Panel & Service Upgrades', volume: 1600, difficulty: 28 },
    { title: 'EV Charger Installation Requirements', keyword: 'EV charger installation requirements', cluster: 'EV Charging', volume: 2200, difficulty: 33 },
    { title: 'How Long Does EV Charger Installation Take?', keyword: 'how long EV charger installation', cluster: 'EV Charging', volume: 1100, difficulty: 19 },
    { title: 'GFCI vs AFCI Outlets Explained', keyword: 'GFCI vs AFCI outlet', cluster: 'Electrical Safety', volume: 3600, difficulty: 31 },
    { title: 'How to Plan Electrical for a Kitchen Remodel', keyword: 'kitchen remodel electrical', cluster: 'Home Renovation', volume: 4400, difficulty: 44 },
    { title: 'Cost to Rewire a House in Arizona', keyword: 'cost to rewire house arizona', cluster: 'Panel & Service Upgrades', volume: 1900, difficulty: 36 },
    { title: 'Whole Home Generator Installation Guide', keyword: 'whole home generator installation', cluster: 'Electrical Safety', volume: 5400, difficulty: 48 },
  ];

  readonly keywords: MockKeyword[] = [
    { phrase: 'electrical panel upgrade', volume: 12100, difficulty: 42, tier: 'immediate', intent: 'Informational', gap: true },
    { phrase: 'breaker box replacement', volume: 8200, difficulty: 38, tier: 'immediate', intent: 'Informational', gap: true },
    { phrase: 'EV charger installation cost', volume: 6600, difficulty: 29, tier: 'immediate', intent: 'Decision', gap: true },
    { phrase: '200 amp service upgrade cost', volume: 4400, difficulty: 31, tier: 'immediate', intent: 'Decision', gap: false },
    { phrase: 'home EV charger installation', volume: 9900, difficulty: 41, tier: 'long-term', intent: 'Decision', gap: true },
    { phrase: 'electrician panel upgrade cost', volume: 3600, difficulty: 27, tier: 'long-term', intent: 'Decision', gap: false },
    { phrase: 'home electrical safety', volume: 5400, difficulty: 35, tier: 'long-term', intent: 'Awareness', gap: false },
    { phrase: 'what electrician license needed', volume: 2900, difficulty: 24, tier: 'long-term', intent: 'Informational', gap: false },
    { phrase: 'signs breaker box needs replacing', volume: 1600, difficulty: 18, tier: 'long-tail', intent: 'Awareness', gap: true },
    { phrase: 'panel upgrade permit phoenix az', volume: 880, difficulty: 12, tier: 'long-tail', intent: 'Informational', gap: true },
    { phrase: 'level 2 EV charger phoenix electrician', volume: 590, difficulty: 9, tier: 'long-tail', intent: 'Decision', gap: true },
    { phrase: 'GFCI outlet installation cost', volume: 2200, difficulty: 22, tier: 'long-tail', intent: 'Decision', gap: false },
  ];

  get immediateFocus(): MockKeyword[] {
    return this.keywords.filter((k) => k.tier === 'immediate');
  }

  get longTerm(): MockKeyword[] {
    return this.keywords.filter((k) => k.tier === 'long-term');
  }

  get longTail(): MockKeyword[] {
    return this.keywords.filter((k) => k.tier === 'long-tail');
  }

  difficultyLabel(n: number): string {
    if (n < 20) return 'Easy';
    if (n < 35) return 'Moderate';
    if (n < 50) return 'Hard';
    return 'Very hard';
  }

  difficultyClass(n: number): string {
    if (n < 20) return 'easy';
    if (n < 35) return 'moderate';
    return 'hard';
  }

  formatVolume(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  }
}
