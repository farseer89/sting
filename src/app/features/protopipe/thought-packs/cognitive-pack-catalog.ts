import type { CognitivePackCatalogItem } from './cognitive-pack.model';

/** Static v1 catalog — seeded from trainlibrary.md + thoughttrain.md. */
export const COGNITIVE_PACK_CATALOG: CognitivePackCatalogItem[] = [
  {
    id: 'none',
    slug: 'standard',
    label: 'Standard',
    tagline: 'Plan brief angle only — no cognitive pass.',
    description:
      'The default writer path. Uses your content plan brief, competitor context, and business intelligence without an extra thinking kit. Best when you want speed over forced originality.',
    coverImageAlt: 'Minimal blank canvas representing the default writing path',
    accentColor: '#64748b',
    trainRefs: [],
    bestFor: ['Quick drafts', 'Straightforward local service pages', 'When the plan angle is already strong'],
    whenToUse: 'When you do not need a dedicated cognitive kit before outline and draft.',
    pairsWithPackIds: ['saturated_serp'],
    status: 'available',
    tier: 'included',
    version: 'v1',
  },
  {
    id: 'trains_of_thought/v1',
    slug: 'trains-of-thought',
    label: 'Trains of Thought',
    tagline: 'Full multi-train pipeline — thesis before prose.',
    description:
      'The flagship kit. Parallel cognitive rails (epistemic, market, falsification, synthesis) force a defensible thesis before a single H2 is written. Built for articles that must not read like SERP averages.',
    coverImageAlt: 'Converging rail lines representing parallel cognitive trains',
    accentColor: '#0a9396',
    trainRefs: [
      {
        slug: 'first_principles',
        label: 'First Principles Excavator',
        mechanism: 'Strip the topic to atomic truths beneath received wisdom.',
      },
      {
        slug: 'steel_man',
        label: 'Steel-Man',
        mechanism: 'Build the strongest case against each assertion.',
      },
      {
        slug: 'tension_id',
        label: 'Tension ID',
        mechanism: 'Find the irresolvable paradox that holds the thesis.',
      },
      {
        slug: 'falsification_rail',
        label: 'Falsification Rail',
        mechanism: 'Harden the thesis against the most likely disproof.',
      },
      {
        slug: 'market_intelligence',
        label: 'Market Intelligence',
        mechanism: 'Ground reasoning in SERP gaps before synthesis.',
      },
    ],
    bestFor: [
      'Pillar and thought-leadership articles',
      'Topics where everyone says the same thing',
      'When you need a thesis you can defend in public',
    ],
    whenToUse:
      'When you want maximum cognitive depth and are willing to spend extra LLM steps before drafting.',
    pairsWithPackIds: ['non_obvious_thesis', 'defensible_contrarian'],
    status: 'coming_soon',
    tier: 'pro',
    estimatedCostUsd: { min: 0.08, max: 0.21 },
    stepCount: 25,
    version: 'v1',
  },
  {
    id: 'non_obvious_thesis',
    slug: 'non-obvious-thesis',
    label: 'Non-obvious Thesis',
    tagline: 'First principles + outdated wisdom + inversion.',
    description:
      'Strips conventional wisdom, date-stamps what may be stale, then inverts failure modes into a sharper claim. For topics that look solved on the surface.',
    coverImageAlt: 'Layered depth representing buried assumptions',
    accentColor: '#7c3aed',
    trainRefs: [
      {
        slug: 'first_principles',
        label: 'First Principles Excavator',
        mechanism: 'Strip the topic to atomic truths beneath received wisdom.',
      },
      {
        slug: 'dead_star',
        label: 'Dead Star',
        mechanism: 'Flag conventional wisdom backed by outdated evidence.',
      },
      {
        slug: 'inversion_engine',
        label: 'Inversion Engine',
        mechanism: 'List failure modes, invert into design principles.',
      },
    ],
    bestFor: ['Conventional wisdom dominates the SERP', 'Industry “best practices” that nobody questions'],
    whenToUse: 'If the SERP is saturated with sameness but the topic has hidden depth.',
    pairsWithPackIds: ['trains_of_thought/v1', 'unique_article'],
    status: 'coming_soon',
    tier: 'pro',
    estimatedCostUsd: { min: 0.05, max: 0.12 },
    stepCount: 12,
    version: 'v1',
  },
  {
    id: 'saturated_serp',
    slug: 'saturated-serp-wedge',
    label: 'Saturated SERP Wedge',
    tagline: 'Market gaps + white space + specificity.',
    description:
      'Maps what competitors cover, finds structural and topic gaps, then spirals into a specific angle nobody else owns. Built for competitive queries.',
    coverImageAlt: 'Dense grid with one open cell representing a SERP gap',
    accentColor: '#2563eb',
    trainRefs: [
      {
        slug: 'market_intelligence',
        label: 'Market Intelligence',
        mechanism: 'SERP structure and topic clustering before reasoning.',
      },
      {
        slug: 'negative_space',
        label: 'Negative Space',
        mechanism: 'Find what the field avoids discussing.',
      },
      {
        slug: 'specificity_spiral',
        label: 'Specificity Spiral',
        mechanism: 'Narrow scope until insight density spikes.',
      },
    ],
    bestFor: ['Competitive informational keywords', 'Local service SERPs with template content'],
    whenToUse: 'If the SERP is saturated — run Market Intelligence + Negative Space + Specificity Spiral.',
    pairsWithPackIds: ['unique_article', 'none'],
    status: 'coming_soon',
    tier: 'pro',
    estimatedCostUsd: { min: 0.04, max: 0.1 },
    stepCount: 10,
    version: 'v1',
  },
  {
    id: 'controversial_topic',
    slug: 'controversial-topic',
    label: 'Controversial Topic',
    tagline: 'Steel-man both sides, then stress-test.',
    description:
      'Builds the strongest opposing cases, identifies core tension, and invites an adversarial critique before you commit to an angle. For genuinely contested topics.',
    coverImageAlt: 'Two opposing arcs meeting at a tension point',
    accentColor: '#dc2626',
    trainRefs: [
      {
        slug: 'steel_man',
        label: 'Steel-Man',
        mechanism: 'Strongest counterargument to each assertion.',
      },
      {
        slug: 'falsification_rail',
        label: 'Falsification Rail',
        mechanism: 'Harden thesis against likely disproof.',
      },
      {
        slug: 'adversarial_twin',
        label: 'Adversarial Twin',
        mechanism: 'Fresh critic attacks thesis without pipeline context.',
      },
    ],
    bestFor: ['Two legitimate schools of thought', 'Policy or pricing debates', 'Comparison content'],
    whenToUse: 'If the topic is controversial — Steel-Man + Falsification Rail + Adversarial Twin.',
    pairsWithPackIds: ['defensible_contrarian'],
    status: 'coming_soon',
    tier: 'pro',
    estimatedCostUsd: { min: 0.06, max: 0.14 },
    stepCount: 11,
    version: 'v1',
  },
  {
    id: 'defensible_contrarian',
    slug: 'defensible-contrarian',
    label: 'Defensible Contrarian',
    tagline: 'Depth charge + falsify + sharpen the headline.',
    description:
      'Asks “why?” five levels deep, stress-tests the bedrock claim, then pushes to the edge of defensible provocation. For takes that must survive pushback.',
    coverImageAlt: 'Shield with spark representing a defensible hot take',
    accentColor: '#ea580c',
    trainRefs: [
      {
        slug: 'socratic_depth_charge',
        label: 'Socratic Depth Charge',
        mechanism: 'Five levels of “why?” to bedrock assumptions.',
      },
      {
        slug: 'falsification_rail',
        label: 'Falsification Rail',
        mechanism: 'Harden thesis against likely disproof.',
      },
      {
        slug: 'provocateur',
        label: 'Provocateur',
        mechanism: 'Sharpen to the most defensible provocative version.',
      },
    ],
    bestFor: ['Thought leadership', 'Opinion content', 'Social distribution'],
    whenToUse: 'Produce a defensible contrarian take — Socratic Depth Charge + Falsification Rail + Provocateur.',
    pairsWithPackIds: ['controversial_topic', 'trains_of_thought/v1'],
    status: 'coming_soon',
    tier: 'pro',
    estimatedCostUsd: { min: 0.05, max: 0.12 },
    stepCount: 10,
    version: 'v1',
  },
  {
    id: 'business_stress_test',
    slug: 'business-stress-test',
    label: 'Business Stress Test',
    tagline: 'Invert failure, scale-test, pre-mortem.',
    description:
      'Charlie Munger inversion plus scale breakpoints and a pre-mortem before you write strategy or pricing content. For business decisions dressed as articles.',
    coverImageAlt: 'Structural cracks revealing load-bearing assumptions',
    accentColor: '#059669',
    trainRefs: [
      {
        slug: 'inversion_engine',
        label: 'Inversion Engine',
        mechanism: 'Failure modes inverted into design principles.',
      },
      {
        slug: 'scale_inversion',
        label: 'Scale Inversion',
        mechanism: 'Test thesis at 10× and 0.1× scale.',
      },
      {
        slug: 'pre_mortem_reversal',
        label: 'Pre-Mortem Reversal',
        mechanism: 'Assume failure; redesign the premise.',
      },
    ],
    bestFor: ['Business models', 'Pricing pages', 'Strategy and positioning content'],
    whenToUse: 'If the topic is a business decision — Inversion Engine + Second-Order Machine + Pre-Mortem.',
    pairsWithPackIds: ['non_obvious_thesis'],
    status: 'coming_soon',
    tier: 'pro',
    estimatedCostUsd: { min: 0.04, max: 0.1 },
    stepCount: 9,
    version: 'v1',
  },
  {
    id: 'unique_article',
    slug: 'unique-article',
    label: 'Article No One Else Can Write',
    tagline: 'White space + behavior gap + specificity.',
    description:
      'Finds what competitors refuse to cover, contrasts stated vs actual practice, then narrows until the article could only come from your business context.',
    coverImageAlt: 'Single illuminated path through empty space',
    accentColor: '#db2777',
    trainRefs: [
      {
        slug: 'negative_space',
        label: 'Negative Space',
        mechanism: 'Map the conversation; find absent topics.',
      },
      {
        slug: 'ethnographic_gap',
        label: 'Ethnographic Gap',
        mechanism: 'Stated best practice vs what people actually do.',
      },
      {
        slug: 'specificity_spiral',
        label: 'Specificity Spiral',
        mechanism: 'Five iterations of narrowing scope.',
      },
    ],
    bestFor: [
      'Professional services with real field experience',
      'Topics where generic content saturates the SERP',
    ],
    whenToUse: 'Write the article no one else can write — Negative Space + Ethnographic Gap + Specificity Spiral.',
    pairsWithPackIds: ['saturated_serp', 'non_obvious_thesis'],
    status: 'coming_soon',
    tier: 'pro',
    estimatedCostUsd: { min: 0.05, max: 0.11 },
    stepCount: 11,
    version: 'v1',
  },
];

export function getPackById(id: string): CognitivePackCatalogItem | undefined {
  return COGNITIVE_PACK_CATALOG.find((p) => p.id === id);
}

export function getPacksByIds(ids: string[]): CognitivePackCatalogItem[] {
  return ids
    .map((id) => getPackById(id))
    .filter((p): p is CognitivePackCatalogItem => p !== undefined);
}

export function formatPackCost(pack: CognitivePackCatalogItem): string {
  if (pack.tier === 'included') return 'Included';
  const range = pack.estimatedCostUsd;
  if (!range) return 'Pro';
  if (range.min === range.max) return `~$${range.min.toFixed(2)} / article`;
  return `~$${range.min.toFixed(2)}–${range.max.toFixed(2)} / article`;
}

export function packStatusLabel(status: CognitivePackCatalogItem['status']): string {
  switch (status) {
    case 'available':
      return 'Available';
    case 'coming_soon':
      return 'Coming soon';
    case 'beta':
      return 'Beta';
  }
}
