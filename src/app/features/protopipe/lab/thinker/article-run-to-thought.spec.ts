import type { ArticleGenerationRunDto } from '@hive/contracts';
import { articleRunToThought } from './article-run-to-thought';

function minimalV2Run(overrides: Partial<ArticleGenerationRunDto> = {}): ArticleGenerationRunDto {
  return {
    id: 'run1',
    siteId: 'site1',
    keywordId: 'kw1',
    articleType: 'howto',
    pipelineVersion: 2,
    contentPostId: 'post1',
    resolvedCognitivePackId: 'trains_of_thought/v1',
    status: 'complete',
    currentStep: 'done',
    artifacts: {
      brief: {
        primaryKeyword: { phrase: 'live wedding painter', intent: 'informational' },
        targetWordCount: 2200,
        secondaryKeywords: [],
        nlpTerms: [],
        contentGaps: ['timing'],
        competitorOutlines: [],
        voiceConfig: {
          tone: 'friendly',
          pov: 'second_person',
          sentenceLength: 'varied',
          jargonLevel: 'light',
          ctaStyle: 'soft',
          avoid: [],
        },
        serpGeo: { locationCode: 2840, locationName: 'United States' },
      },
      cognitiveRun: {
        packId: 'trains_of_thought/v1',
        packLabel: 'Trains of Thought',
        mode: 'stub',
        synthesis: {
          thesis: 'Own the timing gap',
          recommendedAngle: 'Timing beats price lists',
          positioningSummary: 'Be the painter couples trust on the day.',
          articlePackage: {
            thesis: 'Own the timing gap',
            coreArgument: 'Timing wins trust',
            openingLine: 'Most painters show up late — we anchor the ceremony timeline.',
            supportingClaims: ['Day-of timing'],
            avoidAngles: ['Generic gift guide'],
            outline: [
              {
                heading: 'Why timing matters',
                purpose: 'Establish thesis',
                keyPoints: ['Ceremony anchor'],
                targetWordCount: 300,
              },
              {
                heading: 'How we work the room',
                purpose: 'Process',
                keyPoints: ['Setup'],
                targetWordCount: 300,
              },
              {
                heading: 'Booking the right artist',
                purpose: 'Decision',
                keyPoints: ['Style fit'],
                targetWordCount: 300,
              },
            ],
          },
        },
        collectedAt: '2026-01-01T00:00:00.000Z',
        trains: [
          {
            slug: 't1_first_principles',
            label: 'First Principles',
            status: 'skipped',
            output: { mode: 'stub' },
            durationMs: 0,
          },
          {
            slug: 'synthesis',
            label: 'Master Synthesis',
            status: 'skipped',
            output: { thesis: 'Own the timing gap' },
            durationMs: 0,
          },
        ],
      },
    },
    events: [
      {
        step: 'compile_context',
        status: 'completed',
        startedAt: '2026-01-01T00:00:00.000Z',
        finishedAt: '2026-01-01T00:00:01.000Z',
      },
      {
        step: 'cognitive_pass',
        status: 'completed',
        startedAt: '2026-01-01T00:00:01.000Z',
        finishedAt: '2026-01-01T00:00:02.000Z',
        note: 'Trains of Thought · stub',
      },
      {
        step: 'outline',
        status: 'completed',
        startedAt: '2026-01-01T00:00:02.000Z',
        finishedAt: '2026-01-01T00:00:03.000Z',
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:03.000Z',
    ...overrides,
  } as ArticleGenerationRunDto;
}

describe('articleRunToThought', () => {
  it('expands cognitive_pass into per-train steps when cognitiveRun.trains exists', () => {
    const thought = articleRunToThought(minimalV2Run());

    expect(thought.steps.some((s) => s.id === 'cognitive_pass')).toBe(false);
    expect(thought.steps.some((s) => s.id === 'train:t1_first_principles')).toBe(true);
    expect(thought.steps.some((s) => s.id === 'train:synthesis')).toBe(true);

    const synthesisStep = thought.steps.find((s) => s.id === 'train:synthesis');
    expect(synthesisStep?.summary).toContain('Own the timing gap');
    expect(synthesisStep?.output?.some((a) => a.id === 'article-package-outline')).toBe(true);
    expect(synthesisStep?.output?.some((a) => a.id === 'enriched-brief')).toBe(true);
  });

  it('keeps a single Think step while cognitive_pass is running without trains', () => {
    const thought = articleRunToThought(
      minimalV2Run({
        status: 'running',
        currentStep: 'cognitive_pass',
        artifacts: {
          brief: minimalV2Run().artifacts.brief,
        },
      }),
    );

    expect(thought.steps.some((s) => s.id === 'cognitive_pass')).toBe(true);
    expect(thought.currentStepId).toBe('cognitive_pass');
  });

  it('includes step descriptions and structured sub-steps like strategy runbook', () => {
    const thought = articleRunToThought(minimalV2Run());
    const context = thought.steps.find((s) => s.id === 'compile_context');
    expect(context?.description).toContain('content plan');
    expect(context?.subSteps?.some((s) => s.id === 'ctx:load')).toBe(true);

    const synthesis = thought.steps.find((s) => s.id === 'train:synthesis');
    expect(synthesis?.description).toContain('thesis');
    expect(synthesis?.subSteps?.length).toBeGreaterThan(0);
  });

  it('maps draft sub-steps from outline sections while running', () => {
    const section = (h2: string) => ({
      h2,
      notes: [] as string[],
      kwSlice: [] as string[],
      targetWordCount: 300,
    });

    const thought = articleRunToThought(
      minimalV2Run({
        status: 'running',
        currentStep: 'draft',
        artifacts: {
          ...minimalV2Run().artifacts,
          outline: {
            h1: 'Live wedding painter guide',
            sections: [
              section('Why timing matters'),
              section('How we work the room'),
              section('Booking the right artist'),
            ],
          },
          sections: [
            {
              section: section('Why timing matters'),
              prose: 'Timing wins trust.',
              wordCount: 120,
              promptVersion: 'draft/v1',
              rawCompletion: 'Timing wins trust.',
            },
          ],
        },
        events: [
          ...minimalV2Run().events,
          {
            step: 'draft',
            status: 'started',
            startedAt: '2026-01-01T00:00:04.000Z',
          },
        ],
      }),
    );

    const draft = thought.steps.find((s) => s.id === 'draft');
    expect(draft?.status).toBe('running');
    expect(draft?.summary).toBe('Section 2 of 3');
    expect(draft?.subSteps?.some((s) => s.label === 'Why timing matters')).toBe(true);
    expect(draft?.subSteps?.some((s) => s.status === 'running')).toBe(true);
  });

  it('marks review failed when self-heal finished but run is still running', () => {
    const thought = articleRunToThought(
      minimalV2Run({
        status: 'running',
        currentStep: 'review',
        artifacts: {
          ...minimalV2Run().artifacts,
          review: {
            scores: {
              keywordIntegration: 0.8,
              voiceMatch: 0.75,
              structuralAdherence: 0.5,
              specificity: 0.7,
              readability: 0.8,
              eeatSignal: 0.7,
            },
            overallScore: 0.73,
            violations: ['STRUCTURAL: missing outline sections'],
            sectionViolations: [],
            flaggedFacts: [],
            passesThreshold: false,
            failingSections: [0, 1],
            promptVersion: 'review/v3',
            rawCompletion: '{}',
          },
          selfHealAttempted: true,
          selfHealProgress: {
            phase: 'done',
            failingSectionIndices: [0, 1],
            redraftSectionIndices: [0, 1],
            redraftedCount: 2,
            totalToRedraft: 2,
            updatedAt: '2026-01-01T00:10:00.000Z',
          },
        },
        events: [
          ...minimalV2Run().events,
          {
            step: 'review',
            status: 'started',
            startedAt: '2026-01-01T00:05:00.000Z',
          },
        ],
      }),
    );

    const review = thought.steps.find((s) => s.id === 'review');
    expect(review?.status).toBe('failed');
    expect(review?.summary).toContain('Below threshold');
  });
});
