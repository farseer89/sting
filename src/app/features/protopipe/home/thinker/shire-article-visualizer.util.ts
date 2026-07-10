import type {
  ArticleGenerationArtifacts,
  ArticleGenerationRunDto,
  ArticleGenerationStep,
} from '@hive/contracts';
import type { Thought } from '../../lab/thinker/thought.model';
import {
  buildArticlePreviewVisualizer,
  buildArticleStepVisualizer,
  buildThoughtStepVisualizer,
  type StepVisualizerView,
} from './article-run-visualizer.util';
import type { BinderStepStatus } from './thinker-binder.mapper';

const ARTICLE_PIPELINE_STEP_IDS = new Set<string>([
  'infer_type',
  'analyse_competition',
  'content_plan',
  'research',
  'build_brief',
  'compile_context',
  'cognitive_pass',
  'outline',
  'draft',
  'audience_review',
  'draft_faq',
  'layout_plan',
  'review',
  'metadata',
  'assemble',
  'generate_images',
  'finalize',
]);

/** Project a Shire Thought (+ artifacts) into the bagend article-run shape the visualizer expects. */
export function articleRunFromThought(thought: Thought | null | undefined): ArticleGenerationRunDto | null {
  if (!thought || thought.thinkerKind !== 'article_generation') return null;

  const fromArtifacts = (thought.artifacts ?? {}) as Partial<ArticleGenerationArtifacts>;
  const fromOutput = articleOutputFromThought(thought);
  const artifacts: ArticleGenerationArtifacts = {
    ...fromOutput,
    ...fromArtifacts,
  } as ArticleGenerationArtifacts;

  const articleType =
    (typeof artifacts.articleType === 'string' && artifacts.articleType) ||
    (typeof fromOutput.articleType === 'string' && fromOutput.articleType) ||
    'pillar';

  return {
    id: thought.id,
    siteId: '',
    keywordId: '',
    status: thought.status as ArticleGenerationRunDto['status'],
    articleType: articleType as ArticleGenerationRunDto['articleType'],
    currentStep: (thought.currentStepId as ArticleGenerationRunDto['currentStep']) ?? null,
    artifacts,
    events: [],
    contentPostId: '',
    createdAt: thought.startedAt ?? new Date(0).toISOString(),
    updatedAt: thought.finishedAt ?? thought.startedAt ?? new Date(0).toISOString(),
  };
}

function articleOutputFromThought(thought: Thought): Partial<ArticleGenerationArtifacts> {
  const port = thought.outputs?.find((o) => o.portId === 'article');
  const data = port?.artifact?.data;
  if (!data || typeof data !== 'object') return {};
  return data as Partial<ArticleGenerationArtifacts>;
}

export function buildArticleVisualizerForStep(options: {
  run: ArticleGenerationRunDto | null | undefined;
  thought: Thought | null | undefined;
  stepId: string;
  stepStatus: BinderStepStatus;
}): StepVisualizerView {
  const { run, thought, stepId, stepStatus } = options;
  const projected = run ?? articleRunFromThought(thought);
  const thoughtStep = thought?.steps.find((s) => s.id === stepId);

  if (projected && ARTICLE_PIPELINE_STEP_IDS.has(stepId) && stepId !== 'finalize') {
    return buildArticleStepVisualizer(projected, stepId as ArticleGenerationStep, stepStatus);
  }

  if (stepId === 'finalize' && projected?.artifacts?.template) {
    return buildArticlePreviewVisualizer({ run: projected, thought });
  }

  if (thoughtStep) {
    return buildThoughtStepVisualizer(thoughtStep);
  }

  return { title: 'Visualizer', emptyMessage: 'Select a pipeline step.', blocks: [] };
}

export function buildArticlePreviewForSession(options: {
  run: ArticleGenerationRunDto | null | undefined;
  thought: Thought | null | undefined;
}): StepVisualizerView {
  const projected = options.run ?? articleRunFromThought(options.thought);
  return buildArticlePreviewVisualizer({ run: projected, thought: options.thought });
}
