import type { ArticleGenerationRunDto } from '@hive/contracts';
import { articleRunToThought } from './article-run-to-thought';

function minimalV2Run(overrides: Partial<ArticleGenerationRunDto> = {}): ArticleGenerationRunDto {
  return {
    id: 'run1',
    siteId: 'site1',
    keywordId: 'kw1',
    articleType: 'guide',
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
  };
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
});
