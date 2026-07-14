import type { ProtopipeContentPost, ProtopipeContentTemplate } from '@hive/contracts';
import type { BuildBookBlockInstance, BuildBookPage } from '../../build-book/build-book.types';
import {
  fillBlogPostBlockProps,
  fillSourceFromProtopipeTemplate,
} from '../../build-book/build-book-article-fill.util';
import { findBuildBookBlockDefinition } from '../../build-book/build-book-block.catalog';
import { resolvePatternIdForBlock } from '../../build-book/build-book-block-registry.util';
import type { BuildPageBlockState } from '../../build-book/canvas/build-page-canvas.component';

export interface ResolveBlogPreviewStackInput {
  post: ProtopipeContentPost;
  profiles: readonly BuildBookPage[];
  /** Fallback seed blocks when no profile exists yet. */
  defaultSeedBlocks?: readonly BuildBookBlockInstance[];
}

export interface ResolveBlogPreviewStackResult {
  profileId?: string;
  profileLabel?: string;
  varietyKey?: string;
  blockStates: BuildPageBlockState[];
  hasArticleBody: boolean;
}

function templateHasBody(template: ProtopipeContentTemplate | undefined): boolean {
  if (!template) return false;
  return (
    Boolean(template.intro?.trim()) ||
    (template.sections?.length ?? 0) > 0 ||
    (template.blocks?.length ?? 0) > 0 ||
    Boolean(template.h1?.trim())
  );
}

function cloneStack(
  blocks: readonly BuildBookBlockInstance[],
  pageKey: string,
): BuildBookBlockInstance[] {
  return structuredClone(blocks).map((block, index) => ({
    ...block,
    id: `bp-${pageKey}-b${index + 1}`,
  }));
}

function toBlockStates(blocks: readonly BuildBookBlockInstance[]): BuildPageBlockState[] {
  return blocks.map((block) => ({
    id: block.id,
    blockId: block.blockId,
    section: block.section,
    label: block.label ?? block.blockId,
    layout: findBuildBookBlockDefinition(block.blockId)?.layout ?? 'grid',
    props: structuredClone(block.props ?? {}),
    configured: true,
    pendingPreview: false,
  }));
}

/**
 * Display-only: clone selected template-profile stack and fill from ContentTemplate.
 * Does not mutate Build Book draft.
 */
export function resolveBlogPreviewStack(
  input: ResolveBlogPreviewStackInput,
): ResolveBlogPreviewStackResult {
  const profileId = input.post.blogTemplateProfileId?.trim() || undefined;
  const profile =
    (profileId ? input.profiles.find((page) => page.id === profileId) : undefined) ??
    input.profiles[0];

  const sourceBlocks =
    profile?.blocks?.length
      ? cloneStack(profile.blocks, profile.id)
      : cloneStack(input.defaultSeedBlocks ?? [], 'default');

  const hasArticleBody = templateHasBody(input.post.template);
  const filled = hasArticleBody
    ? fillBlogPostBlockProps(
        sourceBlocks,
        fillSourceFromProtopipeTemplate(input.post.template!, {
          kicker: input.post.suggestedKeyword,
        }),
      )
    : sourceBlocks;

  // Touch patternId resolve so empty stacks still map consistently for canvas.
  for (const block of filled) {
    if (!block.patternId) {
      block.patternId = resolvePatternIdForBlock(block.blockId);
    }
  }

  return {
    profileId: profile?.id,
    profileLabel: profile?.label,
    varietyKey: profile?.templateProfileMeta?.varietyKey,
    blockStates: toBlockStates(filled),
    hasArticleBody,
  };
}
