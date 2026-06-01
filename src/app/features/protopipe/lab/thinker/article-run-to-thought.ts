import type {
  ArticleGenerationArtifacts,
  ArticleGenerationEvent,
  ArticleGenerationOutline,
  ArticleGenerationDraftedSection,
  ArticleGenerationRunDto,
  ArticleGenerationStep,
} from '@hive/contracts';
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

const STEP_ORDER: ArticleGenerationStep[] = [
  'infer_type',
  'analyse_competition',
  'content_plan',
  'research',
  'build_brief',
  'outline',
  'draft',
  'review',
  'metadata',
  'assemble',
];

const STEP_META: Record<
  ArticleGenerationStep,
  { label: string; summary: string }
> = {
  infer_type: { label: 'Classify', summary: 'Infer the article type from the keyword.' },
  analyse_competition: { label: 'Competition', summary: 'Profile the top-ranking pages.' },
  content_plan: { label: 'Strategy', summary: 'Consolidate the competitor scan into a strategy.' },
  research: { label: 'Research', summary: 'Gather SERP, PAA, site + brand context.' },
  build_brief: { label: 'Brief', summary: 'Compile the SEO brief.' },
  outline: { label: 'Outline', summary: 'Design the H1 and section outline.' },
  draft: { label: 'Draft', summary: 'Write the section prose.' },
  review: { label: 'Review', summary: 'Score the draft against the brief.' },
  metadata: { label: 'Metadata', summary: 'Generate title tag, meta and schema.' },
  assemble: { label: 'Assemble', summary: 'Assemble the final article template.' },
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
      return a.brief
        ? [
            json(
              'brief',
              'SEO brief',
              a.brief,
              `${a.brief.primaryKeyword.phrase} · ${a.brief.targetWordCount} words`,
            ),
          ]
        : [];
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
      return a.review
        ? [
            json(
              'review',
              'Review',
              a.review,
              `Score ${a.review.overallScore} · ${a.review.passesThreshold ? 'passes' : 'below threshold'}`,
            ),
          ]
        : [];
    case 'metadata':
      return a.metadata
        ? [json('metadata', 'Metadata', a.metadata, a.metadata.titleTag)]
        : [];
    case 'assemble':
      return a.template
        ? [json('template', 'Article template', a.template)]
        : [];
    default:
      return [];
  }
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

  const currentIdx = STEP_ORDER.indexOf(run.currentStep as ArticleGenerationStep);
  const allDone = run.status === 'complete' || run.currentStep === 'done';

  const steps: ThoughtStep[] = STEP_ORDER.map((step, idx) => {
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

    const meta = STEP_META[step];
    const error =
      run.error?.step === step
        ? { message: run.error.message, stack: run.error.stack }
        : undefined;

    return {
      id: step,
      label: meta.label,
      summary: meta.summary,
      status,
      startedAt: started?.startedAt,
      finishedAt: finished?.finishedAt,
      durationMs: finished?.durationMs,
      attempt: Math.max(1, evs.filter((e) => e.status === 'started').length),
      output: status === 'complete' || status === 'failed' ? stepOutput(step, run) : undefined,
      events: mapEvents(evs),
      error,
      promptVersion: finished?.promptVersion ?? started?.promptVersion,
    } satisfies ThoughtStep;
  });

  // Chain inputs: each step takes the prior step's output as its input view.
  for (let i = 1; i < steps.length; i++) {
    steps[i].input = steps[i - 1].output;
  }

  const currentStepId =
    run.currentStep === 'done'
      ? steps[steps.length - 1]?.id
      : (run.currentStep as string);

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
    steps,
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
