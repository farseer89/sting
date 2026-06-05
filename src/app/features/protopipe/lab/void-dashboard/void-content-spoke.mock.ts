export type SpokeNodeKind = 'pillar' | 'keyword' | 'article';

export type SpokeNodeStatus = 'published' | 'scheduled' | 'draft' | 'gap' | 'ranking';

export interface SpokeNode {
  id: string;
  label: string;
  kind: SpokeNodeKind;
  status?: SpokeNodeStatus;
  meta?: string;
  /** Calendar sticky key when kind === 'article'. */
  calendarItemKey?: string;
}

export interface SpokeCluster {
  id: string;
  label: string;
  sublabel: string;
  color: string;
  colorSoft: string;
  startAngle: number;
  endAngle: number;
  nodes: SpokeNode[];
}

export interface ContentSpokeAccount {
  id: string;
  host: string;
  seed: string;
  planLabel: string;
  metrics: { label: string; value: string }[];
}

export const CONTENT_SPOKE_ACCOUNT: ContentSpokeAccount = {
  id: 'dwp',
  host: 'destinationweddingpainter.com',
  seed: 'destination wedding painter',
  planLabel: 'Q2 content plan',
  metrics: [
    { label: 'Pillars', value: '4' },
    { label: 'Keywords', value: '10' },
    { label: 'Articles', value: '7' },
    { label: 'Scheduled', value: '2' },
  ],
};

/** ATP-inspired clusters: modifiers + content plan rings. */
export const CONTENT_SPOKE_CLUSTERS: SpokeCluster[] = [
  {
    id: 'pillars',
    label: 'Pillars',
    sublabel: 'Content themes',
    color: '#0a9396',
    colorSoft: 'rgba(10, 147, 150, 0.12)',
    startAngle: 220,
    endAngle: 310,
    nodes: [
      { id: 'p1', label: 'Destination pricing', kind: 'pillar', status: 'ranking' },
      { id: 'p2', label: 'Italy & Tuscany', kind: 'pillar', status: 'scheduled' },
      { id: 'p3', label: 'Process & timeline', kind: 'pillar', status: 'draft' },
      { id: 'p4', label: 'Painter vs photo', kind: 'pillar', status: 'published' },
    ],
  },
  {
    id: 'questions',
    label: 'Questions',
    sublabel: 'Who · what · why · how',
    color: '#ee9b00',
    colorSoft: 'rgba(238, 155, 0, 0.12)',
    startAngle: 310,
    endAngle: 20,
    nodes: [
      { id: 'q1', label: 'how much does a wedding painter cost', kind: 'keyword', status: 'draft', meta: '480 vol' },
      { id: 'q2', label: 'what is live wedding painting', kind: 'keyword', status: 'gap', meta: '210 vol' },
      { id: 'q3', label: 'why hire a destination painter', kind: 'keyword', status: 'gap', meta: '90 vol' },
      { id: 'q4', label: 'how long does a wedding painting take', kind: 'keyword', status: 'ranking', meta: '110 vol' },
    ],
  },
  {
    id: 'prepositions',
    label: 'Prepositions',
    sublabel: 'For · near · with · in',
    color: '#5c6bc0',
    colorSoft: 'rgba(92, 107, 192, 0.12)',
    startAngle: 20,
    endAngle: 110,
    nodes: [
      { id: 'pr1', label: 'wedding painter for destination wedding', kind: 'keyword', status: 'ranking', meta: '210 vol' },
      { id: 'pr2', label: 'live painter in tuscany', kind: 'keyword', status: 'scheduled', meta: '70 vol' },
      { id: 'pr3', label: 'artist with wedding experience abroad', kind: 'keyword', status: 'gap', meta: '55 vol' },
      { id: 'pr4', label: 'painter near amalfi coast', kind: 'keyword', status: 'gap', meta: '40 vol' },
    ],
  },
  {
    id: 'comparisons',
    label: 'Comparisons',
    sublabel: 'Vs · or · like · and',
    color: '#c45c26',
    colorSoft: 'rgba(196, 92, 38, 0.1)',
    startAngle: 110,
    endAngle: 170,
    nodes: [
      { id: 'c1', label: 'live painter vs wedding photographer', kind: 'keyword', status: 'published', meta: '95 vol' },
      { id: 'c2', label: 'destination painter or local artist', kind: 'keyword', status: 'gap', meta: '30 vol' },
      { id: 'c3', label: 'wedding painter like caricature artist', kind: 'keyword', status: 'gap', meta: '25 vol' },
    ],
  },
  {
    id: 'articles',
    label: 'Article plan',
    sublabel: 'Draft · scheduled · live',
    color: '#2a9d8f',
    colorSoft: 'rgba(42, 157, 143, 0.12)',
    startAngle: 170,
    endAngle: 220,
    nodes: [
      { id: 'a1', label: 'How Much Does a Wedding Painter Cost?', kind: 'article', status: 'draft', meta: 'May 30' },
      { id: 'a2', label: 'Live Wedding Painting in Tuscany', kind: 'article', status: 'scheduled', meta: 'Jun 4' },
      { id: 'a3', label: 'Italy Destination Wedding Artist Guide', kind: 'article', status: 'scheduled', meta: 'Jun 12' },
      { id: 'a4', label: 'Live Painter vs Wedding Photographer', kind: 'article', status: 'published', meta: 'Live' },
      { id: 'a5', label: 'Hiring a Painter for Your Wedding Abroad', kind: 'article', status: 'draft', meta: 'Jun 2' },
    ],
  },
];

export const CONTENT_SPOKE_LEGEND = [
  { id: 'pillar', label: 'Pillar' },
  { id: 'keyword', label: 'Keyword' },
  { id: 'article', label: 'Article' },
] as const;
