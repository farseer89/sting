import type {
  ArticleGenerationArtifacts,
  ArticleGenerationEvent,
  ArticleGenerationOutline,
  ArticleGenerationDraftedSection,
  ArticleGenerationReview,
  ArticleGenerationRunDto,
  ArticleGenerationStep,
  CognitiveTrainStep,
} from '@hive/contracts';
import { generationStepsForRun, STEP_SHORT_LABELS } from '../../article-pipeline-steps';
import type {
  Thought,
  ThoughtArtifact,
  ThoughtEvent,
  ThoughtStatus,
  ThoughtStep,
  ThoughtStepStatus,
} from './thought.model';

/**
 * Adapter: project a live ArticleGenerationRun (the 10-step writer pipeline)
 * onto the generic Thought model so it can be rendered in the Thinker view.
 * Pure + synchronous so it can run inside a computed() on every poll tick.
 */

const STEP_META: Record<
  ArticleGenerationStep,
  { label: string; summary: string }
> = {
  infer_type: { label: 'Classify', summary: 'Infer the article type from the keyword.' },
  analyse_competition: { label: 'Competition', summary: 'Profile the top-ranking pages.' },
  content_plan: { label: 'Strategy', summary: 'Consolidate the competitor scan into a strategy.' },
  research: { label: 'Research', summary: 'Gather SERP, PAA, site + brand context.' },
  build_brief: { label: 'Brief', summary: 'Compile the SEO brief.' },
  compile_context: {
    label: 'Context',
    summary: 'Load the plan brief and compile the writing context.',
  },
  cognitive_pass: {
    label: 'Think',
    summary: 'Run the selected thought pack before outline and draft.',
  },
  outline: { label: 'Outline', summary: 'Design the H1 and section outline.' },
  draft: { label: 'Draft', summary: 'Write the section prose.' },
  review: { label: 'Review', summary: 'Score the draft against the brief.' },
  metadata: { label: 'Metadata', summary: 'Generate title tag, meta and schema.' },
  assemble: { label: 'Assemble', summary: 'Assemble the final article template.' },
  generate_images: {
    label: 'Images',
    summary: 'Plan hero and section images with consistent editorial style via fal.ai.',
  },
};

function runStatus(run: ArticleGenerationRunDto): ThoughtStatus {
  switch (run.status) {
    case 'pending':
      return 'pending';
    case 'running':
      return 'running';
    case 'complete':
      return 'complete';
    case 'failed':
      return 'failed';
    default:
      return 'idle';
  }
}

function json(id: string, label: string, data: unknown, summary?: string): ThoughtArtifact {
  return { id, label, kind: 'json', data, summary };
}

function markdown(id: string, label: string, data: string, summary?: string): ThoughtArtifact {
  return { id, label, kind: 'markdown', data, summary };
}

function text(id: string, label: string, data: string, summary?: string): ThoughtArtifact {
  return { id, label, kind: 'text', data, summary };
}

function outlineToMarkdown(outline: ArticleGenerationOutline): string {
  const lines = [`# ${outline.h1}`, ''];
  for (const s of outline.sections) {
    lines.push(`## ${s.h2}`);
    if (s.notes?.length) lines.push(s.notes.map((n) => `- ${n}`).join('\n'));
    lines.push('');
  }
  return lines.join('\n').trim();
}

function sectionsToMarkdown(sections: ArticleGenerationDraftedSection[]): string {
  return sections
    .map((s) => `## ${s.section.h2}\n\n${s.prose}`)
    .join('\n\n')
    .trim();
}

/** Output artifact(s) a given step produces, if present in the run. */
function stepOutput(
  step: ArticleGenerationStep,
  run: ArticleGenerationRunDto,
): ThoughtArtifact[] {
  const a: ArticleGenerationArtifacts = run.artifacts;
  switch (step) {
    case 'infer_type':
      return [text('article-type', 'Article type', run.articleType)];
    case 'analyse_competition':
      return a.competitionAnalysis
        ? [
            json(
              'competition',
              'Competition analysis',
              a.competitionAnalysis,
              `${a.competitionAnalysis.scannedCount} page(s) profiled`,
            ),
          ]
        : [];
    case 'content_plan':
      return a.contentStrategy
        ? [
            json(
              'strategy',
              'Content strategy',
              a.contentStrategy,
              `${a.contentStrategy.articleIdeas.length} idea(s)`,
            ),
          ]
        : [];
    case 'research':
      return a.research
        ? [json('research', 'Research bundle', a.research, a.research.inferenceRationale)]
        : [];
    case 'build_brief':
    case 'compile_context':
      return a.brief
        ? [
            json(
              'brief',
              'SEO brief',
              a.brief,
              `${a.brief.primaryKeyword.phrase} · ${a.brief.targetWordCount} words`,
            ),
            ...(a.writingContext
              ? [json('writing-context', 'Writing context', a.writingContext)]
              : []),
          ]
        : [];
    case 'cognitive_pass': {
      const outputs: ThoughtArtifact[] = [];
      if (a.cognitiveRun?.trains?.length) {
        for (const train of a.cognitiveRun.trains) {
          outputs.push(trainStepArtifact(train));
        }
      } else if (a.cognitiveRun) {
        outputs.push(
          json(
            'cognitive-run',
            'Cognitive pass',
            a.cognitiveRun,
            a.cognitiveRun.synthesis.thesis,
          ),
        );
      }
      if (a.brief && a.cognitiveRun) {
        outputs.push(
          json(
            'enriched-brief',
            'Enriched brief',
            a.brief,
            a.brief.recommendedAngle ?? a.brief.primaryKeyword.phrase,
          ),
        );
      }
      return outputs;
    }
    case 'outline':
      return a.outline
        ? [
            markdown(
              'outline',
              'Outline',
              outlineToMarkdown(a.outline),
              `${a.outline.sections.length} section(s)`,
            ),
            json('outline-raw', 'Outline (raw)', a.outline),
          ]
        : [];
    case 'draft':
      return a.sections?.length
        ? [
            markdown(
              'draft',
              'Draft',
              sectionsToMarkdown(a.sections),
              `${a.sections.reduce((n, s) => n + s.wordCount, 0)} words`,
            ),
          ]
        : [];
    case 'review':
      if (!a.review) return [];
      const outputs = [
        json(
          'review',
          'Review',
          a.review,
          `Score ${formatReviewScore(a.review.overallScore)} · ${a.review.passesThreshold ? 'passes' : 'below threshold'}`,
        ),
      ];
      if (!a.review.passesThreshold) {
        outputs.push(
          markdown(
            'review-violations',
            'Violations',
            formatReviewViolations(a.review),
            `${a.review.violations.length + a.review.sectionViolations.length} issue(s)`,
          ),
        );
      }
      return outputs;
    case 'metadata':
      return a.metadata
        ? [json('metadata', 'Metadata', a.metadata, a.metadata.titleTag)]
        : [];
    case 'assemble':
      return a.template
        ? [json('template', 'Article template', a.template)]
        : [];
    case 'generate_images': {
      if (!a.imageGeneration) return [];
      const ig = a.imageGeneration;
      const generated = ig.generatedCount ?? 0;
      const failed = ig.failedCount ?? 0;
      const slotSummary =
        ig.mode === 'live'
          ? generated > 0
            ? `Live — ${generated}/${ig.plannedCount} generated${failed ? `, ${failed} failed` : ''}`
            : ig.plannedCount === 0
              ? 'Live — no image slots'
              : `Live — 0/${ig.plannedCount} generated`
          : ig.plannedCount === 0
            ? 'Stub — no image slots'
            : `Stub — ${ig.plannedCount} slot(s) planned`;
      const outputs: ThoughtArtifact[] = [
        json('image-generation', 'Image generation plan', ig, slotSummary),
        json(
          'image-style',
          'Shared style profile',
          ig.styleProfile,
          ig.styleProfile.label,
        ),
        json('image-config', 'Provider config', {
          falConfigured: ig.falConfigured,
          s3Configured: ig.s3Configured,
          model: ig.model,
          mode: ig.mode,
          generatedCount: ig.generatedCount,
          failedCount: ig.failedCount,
        }),
      ];
      for (const slot of ig.slots) {
        outputs.push(
          markdown(
            `image-prompt-${slot.id}`,
            `${slot.label} — prompt`,
            slot.builtPrompt,
            'Input sent to fal.ai',
          ),
        );
        if (slot.status === 'generated' && slot.publicUrl?.trim()) {
          outputs.push({
            id: `image-out-${slot.id}`,
            label: `${slot.label} — output`,
            kind: 'image',
            data: {
              url: slot.publicUrl,
              alt: slot.altSuggestion,
              prompt: slot.builtPrompt,
            },
            summary: slot.altSuggestion ?? slot.label,
          });
        } else if (slot.status === 'failed') {
          outputs.push(
            text(
              `image-error-${slot.id}`,
              `${slot.label} — error`,
              slot.error ?? 'Generation failed',
            ),
          );
        }
      }
      return outputs;
    }
    default:
      return [];
  }
}

function trainStepArtifact(train: CognitiveTrainStep): ThoughtArtifact {
  const summary =
    train.status === 'failed'
      ? (train.error ?? 'Failed')
      : train.slug === 'synthesis'
        ? String((train.output as { thesis?: string }).thesis ?? train.label)
        : `${train.status}${train.durationMs != null ? ` · ${train.durationMs}ms` : ''}`;

  return json(`train-${train.slug}`, train.label, train.output, summary);
}

function mapTrainStatus(status: CognitiveTrainStep['status']): ThoughtStepStatus {
  switch (status) {
    case 'complete':
      return 'complete';
    case 'failed':
      return 'failed';
    case 'skipped':
      return 'skipped';
    default:
      return 'pending';
  }
}

function trainStepSummary(train: CognitiveTrainStep): string {
  if (train.status === 'failed') {
    return train.error ?? 'Failed';
  }
  if (train.slug === 'synthesis') {
    return String((train.output as { thesis?: string }).thesis ?? 'Master synthesis');
  }
  if (train.durationMs != null) {
    return `${train.durationMs}ms`;
  }
  return train.label;
}

/** Replace cognitive_pass with one ThoughtStep per train when cognitiveRun.trains exists. */
function expandCognitiveTrainSteps(
  run: ArticleGenerationRunDto,
  steps: ThoughtStep[],
  stepOrder: ArticleGenerationStep[],
): ThoughtStep[] {
  const cognitiveIdx = stepOrder.indexOf('cognitive_pass');
  if (cognitiveIdx < 0) return steps;

  const trains = run.artifacts.cognitiveRun?.trains;
  if (!trains?.length) return steps;

  const parent = steps[cognitiveIdx];
  const trainSteps: ThoughtStep[] = trains.map((train) => ({
    id: `train:${train.slug}`,
    label: train.label,
    summary: trainStepSummary(train),
    status: mapTrainStatus(train.status),
    startedAt: parent.startedAt,
    finishedAt:
      train.status === 'complete' || train.status === 'failed' || train.status === 'skipped'
        ? parent.finishedAt
        : undefined,
    durationMs: train.durationMs,
    attempt: 1,
    input: undefined,
    output:
      train.status === 'complete' || train.status === 'failed'
        ? [trainStepArtifact(train)]
        : train.status === 'skipped'
          ? [json(`train-${train.slug}`, train.label, train.output, 'Skipped (stub)')]
          : undefined,
    events: [],
    error:
      train.status === 'failed' && train.error ? { message: train.error } : undefined,
    promptVersion: train.promptVersion,
  }));

  const synthesisPending =
    parent.status === 'running' &&
    !String(run.artifacts.cognitiveRun?.synthesis?.thesis ?? '').trim();
  if (synthesisPending) {
    trainSteps.push({
      id: 'train:__in_progress__',
      label: 'Next phase…',
      summary: 'Running…',
      status: 'running',
      startedAt: parent.startedAt,
      attempt: 1,
      events: [],
    });
  }

  const brief = run.artifacts.brief;
  if (brief && run.artifacts.cognitiveRun && trainSteps.length > 0) {
    const last = trainSteps[trainSteps.length - 1];
    last.output = [
      ...(last.output ?? []),
      json(
        'enriched-brief',
        'Enriched brief',
        brief,
        brief.recommendedAngle ?? brief.primaryKeyword.phrase,
      ),
    ];
  }

  return [...steps.slice(0, cognitiveIdx), ...trainSteps, ...steps.slice(cognitiveIdx + 1)];
}

function resolveCurrentStepId(
  run: ArticleGenerationRunDto,
  steps: ThoughtStep[],
  stepOrder: ArticleGenerationStep[],
  currentIdx: number,
): string | undefined {
  if (run.currentStep === 'done') {
    return steps[steps.length - 1]?.id;
  }

  const pipelineStep = run.currentStep as ArticleGenerationStep;
  if (pipelineStep !== 'cognitive_pass') {
    return pipelineStep;
  }

  const cognitiveIdx = stepOrder.indexOf('cognitive_pass');
  if (cognitiveIdx < 0 || currentIdx !== cognitiveIdx) {
    return pipelineStep;
  }

  const trains = run.artifacts.cognitiveRun?.trains;
  if (!trains?.length) {
    return 'cognitive_pass';
  }

  const synthesisPending = !String(run.artifacts.cognitiveRun?.synthesis?.thesis ?? '').trim();
  if (synthesisPending && run.status === 'running') {
    return 'train:__in_progress__';
  }

  const runningTrain = trains.find((t) => t.status !== 'complete' && t.status !== 'skipped');
  if (runningTrain) {
    return `train:${runningTrain.slug}`;
  }

  const lastTrain = trains[trains.length - 1];
  return lastTrain ? `train:${lastTrain.slug}` : 'cognitive_pass';
}

function mapEvents(events: ArticleGenerationEvent[]): ThoughtEvent[] {
  return events.map((e) => {
    const parts: string[] = [e.status];
    if (e.note) parts.push(e.note);
    if (e.error) parts.push(e.error);
    return {
      at: e.finishedAt ?? e.startedAt,
      level: e.status === 'failed' ? 'error' : e.status === 'retried' ? 'warn' : 'info',
      message: parts.join(' — '),
      data:
        e.tokens || e.cost != null
          ? { tokens: e.tokens, cost: e.cost, promptVersion: e.promptVersion }
          : undefined,
    } satisfies ThoughtEvent;
  });
}

export function articleRunToThought(run: ArticleGenerationRunDto): Thought {
  const eventsByStep = new Map<ArticleGenerationStep, ArticleGenerationEvent[]>();
  for (const e of run.events) {
    const list = eventsByStep.get(e.step) ?? [];
    list.push(e);
    eventsByStep.set(e.step, list);
  }

  const stepOrder = generationStepsForRun(run);
  const currentIdx = stepOrder.indexOf(run.currentStep as ArticleGenerationStep);
  const allDone = run.status === 'complete' || run.currentStep === 'done';

  const steps: ThoughtStep[] = stepOrder.map((step, idx) => {
    const evs = eventsByStep.get(step) ?? [];
    const started = evs.find((e) => e.status === 'started');
    const finished = [...evs].reverse().find(
      (e) => e.status === 'completed' || e.status === 'failed',
    );

    let status: ThoughtStepStatus;
    if (run.error?.step === step) {
      status = 'failed';
    } else if (evs.some((e) => e.status === 'completed')) {
      status = 'complete';
    } else if (evs.some((e) => e.status === 'failed')) {
      status = 'failed';
    } else if (allDone) {
      status = 'complete';
    } else if (currentIdx < 0) {
      status = 'pending';
    } else if (idx < currentIdx) {
      status = 'complete';
    } else if (idx === currentIdx) {
      status = run.status === 'running' ? 'running' : 'pending';
    } else {
      status = 'pending';
    }

    const meta = STEP_META[step] ?? {
      label: STEP_SHORT_LABELS[step],
      summary: STEP_SHORT_LABELS[step],
    };
    const reviewArtifact = step === 'review' ? run.artifacts?.review : undefined;
    const reviewFailed = reviewArtifact && !reviewArtifact.passesThreshold;

    let stepStatus = status;
    if (reviewFailed && stepStatus === 'complete') {
      stepStatus = 'failed';
    }

    const error =
      run.error?.step === step
        ? { message: run.error.message, stack: run.error.stack }
        : reviewFailed
          ? { message: formatReviewViolations(reviewArtifact) }
          : undefined;

    const summary = reviewFailed
      ? `Below threshold (score ${formatReviewScore(reviewArtifact.overallScore)})`
      : reviewArtifact?.passesThreshold
        ? `Passed (score ${formatReviewScore(reviewArtifact.overallScore)})`
        : meta.summary;

    return {
      id: step,
      label: meta.label,
      summary,
      status: stepStatus,
      startedAt: started?.startedAt,
      finishedAt: finished?.finishedAt,
      durationMs: finished?.durationMs,
      attempt: Math.max(1, evs.filter((e) => e.status === 'started').length),
      output:
        stepStatus === 'complete' || stepStatus === 'failed'
          ? stepOutput(step, run)
          : undefined,
      events: mapEvents(evs),
      error,
      promptVersion: finished?.promptVersion ?? started?.promptVersion,
    } satisfies ThoughtStep;
  });

  let expandedSteps = expandCognitiveTrainSteps(run, steps, stepOrder);

  // Chain inputs: each step takes the prior step's output as its input view.
  for (let i = 1; i < expandedSteps.length; i++) {
    expandedSteps[i].input = expandedSteps[i - 1].output;
  }

  const currentStepId = resolveCurrentStepId(run, expandedSteps, stepOrder, currentIdx);

  const keyword = run.artifacts.brief?.primaryKeyword.phrase;
  const startedAt = run.events[0]?.startedAt ?? run.createdAt;
  const finishedAt = allDone || run.status === 'failed' ? run.updatedAt : undefined;

  const outputArtifact = run.artifacts.template
    ? json('template', 'Article template', run.artifacts.template)
    : run.artifacts.metadata
      ? json('metadata', 'Metadata', run.artifacts.metadata)
      : undefined;

  return {
    id: run.id,
    thinkerKind: 'writer',
    title: keyword ? `Article · ${keyword}` : 'Article run',
    summary: `Writer pipeline · ${run.articleType.replace(/_/g, ' ')}`,
    status: runStatus(run),
    currentStepId,
    steps: expandedSteps,
    inputs: [
      {
        portId: 'keyword',
        label: 'Keyword',
        artifact: keyword ? text('keyword', 'Keyword', keyword) : undefined,
      },
    ],
    outputs: [
      {
        portId: 'article',
        label: 'Article',
        artifact: outputArtifact,
      },
    ],
    startedAt,
    finishedAt,
  } satisfies Thought;
}

function formatReviewScore(score: number): string {
  return Number.isFinite(score) ? score.toFixed(2) : '—';
}

function formatReviewViolations(review: ArticleGenerationReview): string {
  const lines: string[] = [];
  for (const v of review.violations) {
    lines.push(`- ${v}`);
  }
  for (const v of review.sectionViolations) {
    lines.push(`- [${v.sectionIndex}] ${v.h2}: ${v.message}`);
  }
  return lines.length ? lines.join('\n') : 'Review did not pass threshold.';
}
