export type StrategyWriterPanelId = 'brief' | 'preview' | 'hints' | 'seo' | 'facts';

export interface StrategyWriterSection {
  h2: string;
  body: string;
}

export interface StrategyWriterHint {
  id: string;
  label: string;
  detail: string;
  done: boolean;
}

export interface StrategyWriterFact {
  id: string;
  claim: string;
  status: 'flagged' | 'confirmed';
  note: string;
}

export interface StrategyWriterMock {
  primaryKeyword: string;
  scheduleLabel: string;
  h1: string;
  intro: string;
  sections: StrategyWriterSection[];
  keywords: string[];
  metaTitle: string;
  metaDescription: string;
  brief: {
    targetWords: number;
    angle: string;
    positioning: string;
    mustCover: string[];
    secondaryKeywords: string[];
  };
  serp: {
    title: string;
    url: string;
    description: string;
  };
  hints: StrategyWriterHint[];
  facts: StrategyWriterFact[];
}

export const STRATEGY_WRITER_PANELS: { id: StrategyWriterPanelId; label: string }[] = [
  { id: 'brief', label: 'Brief' },
  { id: 'preview', label: 'SERP' },
  { id: 'hints', label: 'Hints' },
  { id: 'seo', label: 'SEO' },
  { id: 'facts', label: 'Facts' },
];

/** Fixture aligned with MOCK_STRATEGY_PLAN lead article. */
export const MOCK_STRATEGY_WRITER: StrategyWriterMock = {
  primaryKeyword: 'live wedding painting tuscany',
  scheduleLabel: 'Wed Jun 3 · 9:00 AM',
  h1: 'Live Wedding Painting in Tuscany: What Couples Should Know',
  intro:
    'A live wedding painter turns your Tuscan ceremony into a heirloom — brushstrokes while vows unfold, finished art before the last dance. This guide covers timing, venue logistics, and what to expect when you hire an artist for a destination wedding in Italy.',
  sections: [
    {
      h2: 'Why Tuscany is ideal for live wedding art',
      body:
        'Villa terraces, golden-hour light, and long outdoor ceremonies give an artist time to compose a meaningful scene. Couples often display the finished piece at the reception — it becomes a focal point guests gather around.',
    },
    {
      h2: 'Timeline: ceremony through first look of the painting',
      body:
        'Most artists arrive 45 minutes before the processional, work through the ceremony and portraits, and reveal a near-complete canvas during cocktail hour. Plan a dedicated easel near natural light for the unveiling.',
    },
  ],
  keywords: ['live wedding painting tuscany', 'tuscany wedding artist', 'destination wedding painter italy'],
  metaTitle: 'Live Wedding Painting in Tuscany | Destination Wedding Painter',
  metaDescription:
    'What to expect when hiring a live wedding painter in Tuscany — timing, venue tips, and how finished art fits your destination wedding day.',
  brief: {
    targetWords: 1400,
    angle: 'Lead with ceremony-day experience, then practical logistics for international couples.',
    positioning:
      'Position as the specialist for luxury destination weddings — not generic wedding art content.',
    mustCover: ['ceremony timing', 'villa logistics', 'finished piece reveal', 'travel for artists'],
    secondaryKeywords: ['tuscany wedding artist', 'live painter destination wedding', 'wedding painter italy'],
  },
  serp: {
    title: 'Live Wedding Painting in Tuscany | Destination Wedding Painter',
    url: 'destinationweddingpainter.com › live-wedding-painting-tuscany',
    description:
      'What couples should know about live wedding painting in Tuscany — ceremony timing, villa logistics, and what the finished piece looks like before your reception.',
  },
  hints: [
    { id: 'h1', label: 'Open with the emotional payoff', detail: 'Lead with the finished canvas moment, not logistics.', done: true },
    { id: 'h2', label: 'Mention golden hour', detail: 'Tuscany light is a differentiator — weave it into section one.', done: true },
    { id: 'h3', label: 'Add a venue checklist', detail: 'Power, shade, and guest sightlines — bullet list in section two.', done: false },
    { id: 'h4', label: 'Internal link to booking', detail: 'CTA toward painter cost / booking page.', done: false },
  ],
  facts: [
    {
      id: 'f1',
      claim: 'Most live wedding paintings are finished during cocktail hour',
      status: 'confirmed',
      note: 'Matches typical artist workflow in brief.',
    },
    {
      id: 'f2',
      claim: 'Artists need 45 minutes setup before the ceremony',
      status: 'flagged',
      note: 'Verify with your standard travel + setup policy.',
    },
  ],
};
