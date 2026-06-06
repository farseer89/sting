import type { ArticleGenerationRunDto, ArticleGenerationStep } from '@hive/contracts';
import { ARTICLE_GENERATION_STEPS_V2 } from '@hive/contracts';

export const GENERATION_STEPS_V1: ArticleGenerationStep[] = [
  'infer_type',
  'analyse_competition',
  'content_plan',
  'research',
  'build_brief',
  'outline',
  'draft',
  'metadata',
  'assemble',
  'review',
];

export function resolvePipelineVersion(
  run: Pick<ArticleGenerationRunDto, 'pipelineVersion' | 'contentPostId'>,
): 1 | 2 {
  if (run.pipelineVersion === 2 || run.pipelineVersion === 1) {
    return run.pipelineVersion;
  }
  return run.contentPostId ? 2 : 1;
}

export function generationStepsForRun(
  run: Pick<ArticleGenerationRunDto, 'pipelineVersion' | 'contentPostId'>,
): ArticleGenerationStep[] {
  return resolvePipelineVersion(run) === 2
    ? [...ARTICLE_GENERATION_STEPS_V2]
    : GENERATION_STEPS_V1;
}

export const STEP_LABELS: Record<ArticleGenerationStep, string> = {
  infer_type: 'Infer type',
  analyse_competition: 'Analyse competition',
  content_plan: 'Content plan',
  research: 'Research',
  build_brief: 'Build brief',
  compile_context: 'Compile context',
  outline: 'Outline',
  draft: 'Drafts',
  review: 'Review',
  metadata: 'Metadata',
  assemble: 'Assemble',
};

export const STEP_SHORT_LABELS: Record<ArticleGenerationStep, string> = {
  infer_type: 'Classify',
  analyse_competition: 'Competition',
  content_plan: 'Strategy',
  research: 'Research',
  build_brief: 'Brief',
  compile_context: 'Context',
  outline: 'Outline',
  draft: 'Draft',
  review: 'Review',
  metadata: 'Metadata',
  assemble: 'Assemble',
};
