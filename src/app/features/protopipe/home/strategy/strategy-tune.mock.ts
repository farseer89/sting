export interface StrategyTuneStyleOption {
  id: string;
  label: string;
  description: string;
  accent: string;
  glyph: string;
}

export interface StrategyTuneInspiration {
  id: string;
  label: string;
  kind: 'image' | 'pdf' | 'link';
  accent: string;
}

export interface StrategyTuneReference {
  id: string;
  url: string;
  label: string;
  note?: string;
  accent: string;
}

export type StrategyTuneKnownFactCategory =
  | 'services'
  | 'pricing'
  | 'geography'
  | 'process'
  | 'credentials'
  | 'other';

export interface StrategyTuneKnownFact {
  id: string;
  category: StrategyTuneKnownFactCategory;
  statement: string;
  source?: string;
}

export type StrategyTuneFactCheckStatus = 'pending' | 'confirmed' | 'dismissed';

export interface StrategyTuneFactCheck {
  id: string;
  claim: string;
  articleTitle: string;
  category: 'business_specific' | 'industry_norm' | 'broken_link' | 'scope';
  status: StrategyTuneFactCheckStatus;
  suggestion?: string;
}

export type StrategyTuneTab = 'voice' | 'inspiration' | 'references' | 'facts';

export type StrategyInspoFilter = 'all' | 'image' | 'pdf' | 'link';

export interface StrategyTuneTabDef {
  id: StrategyTuneTab;
  label: string;
  glyph: string;
  sublabel: string;
}

export interface StrategyTuneFixture {
  styleNotes: string;
  activeStyleIds: string[];
  styleOptions: StrategyTuneStyleOption[];
  inspirations: StrategyTuneInspiration[];
  references: StrategyTuneReference[];
  knownFacts: StrategyTuneKnownFact[];
  factChecks: StrategyTuneFactCheck[];
}

export const TUNE_TABS: StrategyTuneTabDef[] = [
  { id: 'voice', label: 'Voice', glyph: '◔', sublabel: 'Tone & context' },
  { id: 'inspiration', label: 'Inspiration', glyph: '▣', sublabel: 'Uploads & mood' },
  { id: 'references', label: 'References', glyph: '⧉', sublabel: 'Sites to match' },
  { id: 'facts', label: 'Facts', glyph: '✓', sublabel: 'Ground truth' },
];

export const KNOWN_FACT_CATEGORIES: { id: StrategyTuneKnownFactCategory; label: string }[] = [
  { id: 'services', label: 'Services' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'geography', label: 'Geography' },
  { id: 'process', label: 'Process' },
  { id: 'credentials', label: 'Credentials' },
  { id: 'other', label: 'Other' },
];

export const FACT_CHECK_CATEGORY_LABELS: Record<StrategyTuneFactCheck['category'], string> = {
  business_specific: 'Needs your facts',
  industry_norm: 'General guidance',
  broken_link: 'Broken link',
  scope: 'Scope / length',
};

export const INSPO_FILTERS: { id: StrategyInspoFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'image', label: 'Images' },
  { id: 'pdf', label: 'PDFs' },
  { id: 'link', label: 'Links' },
];

/** Mock tune data — destination wedding painter persona. */
export const MOCK_STRATEGY_TUNE: StrategyTuneFixture = {
  styleNotes:
    'Warm and editorial, never salesy. Lead with ceremony moments and venue specificity. First-person when describing live painting on the day. Avoid generic “timeless romance” filler — name places, light, and process.',
  activeStyleIds: ['luxury', 'editorial', 'first-person', 'venue'],
  styleOptions: [
    {
      id: 'luxury',
      label: 'Luxury',
      description: 'Elevated, unhurried — villa light and fine-art framing',
      accent: '#8b7355',
      glyph: '✦',
    },
    {
      id: 'editorial',
      label: 'Editorial',
      description: 'Magazine pacing — strong lede, short paragraphs',
      accent: '#5c6bc0',
      glyph: '¶',
    },
    {
      id: 'first-person',
      label: 'First-person',
      description: 'Artist on the day — “I set up beside the aisle…”',
      accent: '#0a9396',
      glyph: 'I',
    },
    {
      id: 'venue',
      label: 'Venue-focused',
      description: 'Name the place — courtyard, cliff, villa, coast',
      accent: '#c45c26',
      glyph: '⌂',
    },
    {
      id: 'process',
      label: 'Process-driven',
      description: 'Timeline, setup, what couples should expect',
      accent: '#7a8f9a',
      glyph: '◷',
    },
    {
      id: 'concise',
      label: 'Concise',
      description: 'No fluff — answer intent in the first screen',
      accent: '#6b7280',
      glyph: '—',
    },
    {
      id: 'warm',
      label: 'Warm',
      description: 'Human, inviting — never cold or corporate',
      accent: '#df9a3c',
      glyph: '☼',
    },
    {
      id: 'technical',
      label: 'Technical',
      description: 'Specs when useful — canvas size, drying time, travel',
      accent: '#277da1',
      glyph: '⚙',
    },
  ],
  inspirations: [
    { id: 'in1', label: 'Villa ceremony — golden hour', kind: 'image', accent: '#c4a574' },
    { id: 'in2', label: 'Process board — palette & easel', kind: 'image', accent: '#7a8f9a' },
    { id: 'in3', label: 'Amalfi terrace reference shot', kind: 'image', accent: '#5c8fb0' },
    { id: 'in4', label: 'Brand mood — editorial spread', kind: 'pdf', accent: '#5c6bc0' },
    { id: 'in5', label: 'Competitor tone reference', kind: 'link', accent: '#0a9396' },
  ],
  references: [
    {
      id: 'ref1',
      url: 'https://www.junebugweddings.com',
      label: 'Junebug Weddings',
      note: 'Tone for destination features — aspirational but grounded',
      accent: '#c4a0a0',
    },
    {
      id: 'ref2',
      url: 'https://destinationweddingpainter.com/our-story',
      label: 'Your site — Our story',
      note: 'Match existing voice on live-event pages',
      accent: '#0a9396',
    },
    {
      id: 'ref3',
      url: 'https://www.martha.com/weddings',
      label: 'Martha Weddings',
      note: 'Structure for venue + vendor roundup posts',
      accent: '#8b4049',
    },
  ],
  knownFacts: [
    {
      id: 'kf1',
      category: 'services',
      statement: 'Live wedding painting on canvas during the ceremony and reception — not digital or post-event commissions.',
      source: 'Our story page',
    },
    {
      id: 'kf2',
      category: 'geography',
      statement: 'Based in Italy; regularly serves Tuscany, Amalfi Coast, Lake Como, and Sicily for destination weddings.',
    },
    {
      id: 'kf3',
      category: 'process',
      statement: 'Typical setup: easel beside the aisle or terrace; painting continues through vows and first dance.',
    },
    {
      id: 'kf4',
      category: 'pricing',
      statement: 'Packages start at €2,800 for a single-day ceremony + reception; travel quoted separately for non-Italy venues.',
      source: 'Booking FAQ (internal)',
    },
    {
      id: 'kf5',
      category: 'credentials',
      statement: 'Featured in Junebug Weddings and Martha Weddings; 120+ destination weddings since 2018.',
    },
  ],
  factChecks: [
    {
      id: 'fc1',
      claim: 'Most couples receive the finished canvas within 24 hours of the reception.',
      articleTitle: 'How to Hire a Wedding Painter Abroad',
      category: 'business_specific',
      status: 'pending',
      suggestion: 'Confirm drying time and handoff — is same-day delivery ever offered?',
    },
    {
      id: 'fc2',
      claim: 'Villa Cetinale is a popular Tuscany venue for live painting.',
      articleTitle: 'Live Wedding Painting in Tuscany',
      category: 'industry_norm',
      status: 'confirmed',
      suggestion: 'Verified against venue list and past bookings.',
    },
    {
      id: 'fc3',
      claim: 'Average wedding painter rates in Europe run €1,200–€1,800.',
      articleTitle: 'Wedding Painter Cost: What to Expect',
      category: 'business_specific',
      status: 'dismissed',
      suggestion: 'Industry range — your packages start higher; keep your pricing anchor instead.',
    },
  ],
};
