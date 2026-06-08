import type { Thinker } from './thinker.model';
import type { Thought, ThoughtStep } from './thought.model';
import type { TrainOfThought } from './train.model';

/**
 * Mock Train of Thought used to design the interface without a backend.
 * Research -> Writer -> {UI Builder, SEO Audit} exercises every visual state:
 * complete, running (pulse + live events), pending (blocked), failed (+stack +
 * offending input), branching edges, and a rerun diff (outline, attempt 2).
 */

export const THINKERS: Record<string, Thinker> = {
  'keyword-discovery': {
    kind: 'keyword-discovery',
    label: 'Keyword Discovery',
    description: 'Mines + scores keywords and suggests customer avatars from the onboarding profile.',
    icon: 'search',
    inputs: [{ id: 'profile', label: 'Onboarding profile', artifactKind: 'json' }],
    outputs: [{ id: 'shortlist', label: 'Confirmed shortlist', artifactKind: 'json' }],
    stepSpecs: [
      { id: 'load_profile', label: 'Profile' },
      { id: 'fetch_gsc', label: 'Search Console' },
      { id: 'fetch_site_snapshot', label: 'Site Snapshot' },
      { id: 'fetch_ranked', label: 'Ranked' },
      { id: 'spyfu_gaps', label: 'Competitor Gaps' },
      { id: 'resolve_discovery_seeds', label: 'Resolve Seeds' },
      { id: 'fetch_ads_ideas', label: 'Ad Ideas' },
      { id: 'geo_expansion', label: 'Geo Expansion' },
      { id: 'seed_expansion', label: 'Seed Expansion' },
      { id: 'merge_score', label: 'Merge & Score' },
      { id: 'serp_enrichment', label: 'SERP Enrich' },
      { id: 'infer_avatars', label: 'Avatars' },
      { id: 'extract_context_questions', label: 'Context Questions' },
      { id: 'confirm', label: 'Confirm' },
    ],
  },
  research: {
    kind: 'research',
    label: 'Research',
    description: 'Gathers SERP, questions and demand into an SEO brief.',
    icon: 'search',
    inputs: [{ id: 'keyword', label: 'Keyword', artifactKind: 'text' }],
    outputs: [{ id: 'brief', label: 'Brief', artifactKind: 'json' }],
    stepSpecs: [
      { id: 'gather_serp', label: 'Gather SERP' },
      { id: 'extract_questions', label: 'Extract questions' },
      { id: 'synthesize_brief', label: 'Synthesize brief' },
    ],
  },
  writer: {
    kind: 'writer',
    label: 'Writer',
    description: 'Turns a brief into a structured, on-voice draft.',
    icon: 'write',
    inputs: [{ id: 'brief', label: 'Brief', artifactKind: 'json' }],
    outputs: [{ id: 'draft', label: 'Draft', artifactKind: 'markdown' }],
    stepSpecs: [
      { id: 'analyze_brief', label: 'Analyze brief' },
      { id: 'outline', label: 'Outline' },
      { id: 'draft', label: 'Draft' },
      { id: 'review', label: 'Review' },
    ],
  },
  ui_builder: {
    kind: 'ui_builder',
    label: 'UI Builder',
    description: 'Lays the draft into themed page sections.',
    icon: 'grid',
    inputs: [{ id: 'draft', label: 'Draft', artifactKind: 'markdown' }],
    outputs: [{ id: 'page', label: 'Page', artifactKind: 'markdown' }],
    stepSpecs: [
      { id: 'plan_layout', label: 'Plan layout' },
      { id: 'build_sections', label: 'Build sections' },
      { id: 'assemble', label: 'Assemble' },
    ],
  },
  seo_audit: {
    kind: 'seo_audit',
    label: 'SEO Audit',
    description: 'Scores the draft against the target keyword.',
    icon: 'shield',
    inputs: [{ id: 'draft', label: 'Draft', artifactKind: 'markdown' }],
    outputs: [{ id: 'score', label: 'Score', artifactKind: 'metric' }],
    stepSpecs: [
      { id: 'parse', label: 'Parse draft' },
      { id: 'score', label: 'Score' },
    ],
  },
};

function evt(at: string, level: ThoughtStep['events'][number]['level'], message: string) {
  return { at, level, message };
}

// ---- Research: complete ----------------------------------------------------

const researchThought: Thought = {
  id: 'thought-research',
  thinkerKind: 'research',
  title: 'Research · "destination wedding painter"',
  summary: 'Built a brief from the top 10 results and 14 related questions.',
  status: 'complete',
  startedAt: '2026-06-01T18:02:10Z',
  finishedAt: '2026-06-01T18:03:48Z',
  inputs: [
    { portId: 'keyword', label: 'Keyword', artifact: { id: 'a-kw', label: 'Keyword', kind: 'text', data: 'destination wedding painter' } },
  ],
  outputs: [
    {
      portId: 'brief',
      label: 'Brief',
      artifact: {
        id: 'a-brief',
        label: 'SEO brief',
        kind: 'json',
        summary: '7 must-cover terms, target 1,400 words.',
        data: {
          primaryKeyword: 'destination wedding painter',
          mustCoverTerms: ['live wedding painting', 'acrylic on canvas', 'travel fee', 'timeline'],
          competitorHeadings: ['What is live wedding painting?', 'How it works', 'Pricing & travel'],
          targetWordCount: 1400,
        },
      },
    },
  ],
  currentStepId: undefined,
  steps: [
    {
      id: 'gather_serp', label: 'Gather SERP', status: 'complete', attempt: 1,
      summary: 'Pulled the top 10 organic results.',
      durationMs: 24200, startedAt: '2026-06-01T18:02:10Z', finishedAt: '2026-06-01T18:02:34Z',
      events: [evt('18:02:10', 'info', 'Fetching SERP (US · desktop)'), evt('18:02:34', 'info', '10 results parsed')],
      output: [{ id: 'o-serp', label: 'SERP', kind: 'table', data: { columns: ['#', 'Title'], rows: [['1', 'Live Wedding Painting — Studio A'], ['2', 'Destination Wedding Artist'], ['3', 'Watercolor Wedding Memories']] } }],
    },
    {
      id: 'extract_questions', label: 'Extract questions', status: 'complete', attempt: 1,
      summary: 'Found 14 People-Also-Ask questions.',
      durationMs: 18100, startedAt: '2026-06-01T18:02:34Z', finishedAt: '2026-06-01T18:02:52Z',
      events: [evt('18:02:52', 'info', '14 PAA questions extracted')],
      output: [{ id: 'o-q', label: 'Questions', kind: 'markdown', data: '- How much does live wedding painting cost?\n- Do painters travel internationally?\n- How long does a painting take?' }],
    },
    {
      id: 'synthesize_brief', label: 'Synthesize brief', status: 'complete', attempt: 1,
      summary: 'Consolidated demand into a brief.',
      durationMs: 56000, startedAt: '2026-06-01T18:02:52Z', finishedAt: '2026-06-01T18:03:48Z',
      promptVersion: 'brief/v3',
      events: [evt('18:03:48', 'info', 'Brief synthesized · 7 must-cover terms')],
      output: [{ id: 'o-brief', label: 'Brief', kind: 'json', data: { mustCoverTerms: 7, targetWordCount: 1400 } }],
    },
  ],
};

// ---- Writer: running (active) · outline reran (diff) · draft streaming ------

const writerThought: Thought = {
  id: 'thought-writer',
  thinkerKind: 'writer',
  title: 'Writer · destination wedding painter',
  summary: 'Drafting section 2 of 4.',
  status: 'running',
  startedAt: '2026-06-01T18:04:02Z',
  currentStepId: 'draft',
  inputs: [
    { portId: 'brief', label: 'Brief', artifact: researchThought.outputs[0].artifact },
  ],
  outputs: [
    { portId: 'draft', label: 'Draft', artifact: undefined },
  ],
  steps: [
    {
      id: 'analyze_brief', label: 'Analyze brief', status: 'complete', attempt: 1,
      summary: 'Read the brief and target voice.',
      durationMs: 9200, startedAt: '2026-06-01T18:04:02Z', finishedAt: '2026-06-01T18:04:11Z',
      events: [evt('18:04:11', 'info', 'Voice: warm, expert; 4 sections planned')],
      input: [researchThought.outputs[0].artifact!],
      output: [{ id: 'w-analysis', label: 'Plan', kind: 'json', data: { sections: 4, voice: 'warm-expert' } }],
    },
    {
      id: 'outline', label: 'Outline', status: 'complete', attempt: 2,
      summary: 'Drafted a 4-section outline (rerun once).',
      durationMs: 12400, startedAt: '2026-06-01T18:04:30Z', finishedAt: '2026-06-01T18:04:42Z',
      promptVersion: 'outline/v2',
      events: [
        evt('18:04:18', 'warn', 'First outline was too generic — rerun requested'),
        evt('18:04:42', 'info', 'Outline accepted (attempt 2)'),
      ],
      previousOutput: [{ id: 'w-outline-1', label: 'Outline', kind: 'markdown', data: '## Overview\n## Key considerations\n## FAQ' }],
      output: [{ id: 'w-outline-2', label: 'Outline', kind: 'markdown', data: '## What live wedding painting is\n## How a destination commission works\n## Pricing, travel & timeline\n## Booking your date' }],
    },
    {
      id: 'draft', label: 'Draft', status: 'running', attempt: 1,
      summary: 'Writing section 2 of 4.',
      startedAt: '2026-06-01T18:04:42Z',
      promptVersion: 'section/v4',
      events: [
        evt('18:04:42', 'info', 'Section 1 drafted (312 words)'),
        evt('18:05:01', 'debug', 'Streaming section 2…'),
      ],
      input: [{ id: 'w-outline-2', label: 'Outline', kind: 'markdown', data: '4 sections' }],
    },
    {
      id: 'review', label: 'Review', status: 'pending', attempt: 0,
      summary: 'Scores the draft once writing finishes.',
      events: [],
    },
  ],
};

// ---- UI Builder: pending (blocked on Writer) -------------------------------

const uiBuilderThought: Thought = {
  id: 'thought-ui',
  thinkerKind: 'ui_builder',
  title: 'UI Builder · landing sections',
  summary: 'Waiting for the draft.',
  status: 'pending',
  inputs: [{ portId: 'draft', label: 'Draft', artifact: undefined }],
  outputs: [{ portId: 'page', label: 'Page', artifact: undefined }],
  steps: [
    { id: 'plan_layout', label: 'Plan layout', status: 'pending', attempt: 0, events: [] },
    { id: 'build_sections', label: 'Build sections', status: 'pending', attempt: 0, events: [] },
    { id: 'assemble', label: 'Assemble', status: 'pending', attempt: 0, events: [] },
  ],
};

// ---- SEO Audit: failed (+ stack + offending input) -------------------------

const seoAuditThought: Thought = {
  id: 'thought-seo',
  thinkerKind: 'seo_audit',
  title: 'SEO Audit · draft scoring',
  summary: 'Failed while scoring — draft was incomplete.',
  status: 'failed',
  startedAt: '2026-06-01T18:05:05Z',
  finishedAt: '2026-06-01T18:05:07Z',
  currentStepId: 'score',
  inputs: [{ portId: 'draft', label: 'Draft', artifact: { id: 'partial-draft', label: 'Draft (partial)', kind: 'markdown', data: '## What live wedding painting is\n(section 2 missing)' } }],
  outputs: [{ portId: 'score', label: 'Score', artifact: undefined }],
  steps: [
    {
      id: 'parse', label: 'Parse draft', status: 'complete', attempt: 1,
      durationMs: 1100, startedAt: '2026-06-01T18:05:05Z', finishedAt: '2026-06-01T18:05:06Z',
      events: [evt('18:05:06', 'warn', 'Draft has 1 of 4 sections')],
      output: [{ id: 's-parsed', label: 'Parsed', kind: 'json', data: { sections: 1, words: 312 } }],
    },
    {
      id: 'score', label: 'Score', status: 'failed', attempt: 1,
      startedAt: '2026-06-01T18:05:06Z', finishedAt: '2026-06-01T18:05:07Z',
      events: [evt('18:05:07', 'error', 'Cannot score: draft below minimum length')],
      error: {
        message: 'Draft below minimum length (312 / 1400 words)',
        offendingInput: { id: 'partial-draft', label: 'Draft (partial)', kind: 'markdown', data: '## What live wedding painting is\n(section 2 missing)' },
        stack: 'ScoreError: draft below minimum length\n    at scoreDraft (seo/score.ts:48)\n    at runStep (orchestrator.ts:210)\n    at runTrain (train-runner.ts:96)',
      },
    },
  ],
};

export const TRAIN_MOCK: TrainOfThought = {
  id: 'train-1',
  title: 'Article production',
  nodes: [
    { id: 'n-research', thinkerKind: 'research', thought: researchThought, position: { x: 40, y: 180 } },
    { id: 'n-writer', thinkerKind: 'writer', thought: writerThought, position: { x: 360, y: 180 } },
    { id: 'n-ui', thinkerKind: 'ui_builder', thought: uiBuilderThought, position: { x: 700, y: 60 } },
    { id: 'n-seo', thinkerKind: 'seo_audit', thought: seoAuditThought, position: { x: 700, y: 320 } },
  ],
  edges: [
    { id: 'e1', fromNode: 'n-research', fromPort: 'brief', toNode: 'n-writer', toPort: 'brief', label: 'brief' },
    { id: 'e2', fromNode: 'n-writer', fromPort: 'draft', toNode: 'n-ui', toPort: 'draft', label: 'draft' },
    { id: 'e3', fromNode: 'n-writer', fromPort: 'draft', toNode: 'n-seo', toPort: 'draft', label: 'draft' },
  ],
};
