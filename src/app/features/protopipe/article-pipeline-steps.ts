import type { ArticleGenerationRunDto, ArticleGenerationStep } from '@hive/contracts';
import { resolveArticleGenerationStepsV2 } from '@hive/contracts';

export const GENERATION_STEPS_V1: ArticleGenerationStep[] = [
  'infer_type',
  'analyse_competition',
  'content_plan',
  'research',
  'build_brief',
  'outline',
  'draft',
  'layout_plan',
  'metadata',
  'assemble',
  'generate_images',
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
  run: Pick<
    ArticleGenerationRunDto,
    'pipelineVersion' | 'contentPostId' | 'resolvedCognitivePackId'
  >,
): ArticleGenerationStep[] {
  return resolvePipelineVersion(run) === 2
    ? resolveArticleGenerationStepsV2(run.resolvedCognitivePackId)
    : GENERATION_STEPS_V1;
}

export const STEP_LABELS: Record<ArticleGenerationStep, string> = {
  infer_type: 'Infer type',
  analyse_competition: 'Analyse competition',
  content_plan: 'Content plan',
  research: 'Research',
  build_brief: 'Build brief',
  compile_context: 'Compile context',
  cognitive_pass: 'Cognitive pass',
  outline: 'Outline',
  draft: 'Drafts',
  draft_faq: 'FAQ',
  layout_plan: 'Layout plan',
  review: 'Review',
  metadata: 'Metadata',
  assemble: 'Assemble',
  generate_images: 'Generate images',
};

export const STEP_SHORT_LABELS: Record<ArticleGenerationStep, string> = {
  infer_type: 'Classify',
  analyse_competition: 'Competition',
  content_plan: 'Strategy',
  research: 'Research',
  build_brief: 'Brief',
  compile_context: 'Context',
  cognitive_pass: 'Think',
  outline: 'Outline',
  draft: 'Draft',
  draft_faq: 'FAQ',
  layout_plan: 'Layout',
  review: 'Review',
  metadata: 'Metadata',
  assemble: 'Assemble',
  generate_images: 'Images',
};
