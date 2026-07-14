import type { ProtopipeContentPost, ProtopipeContentTemplate } from '@hive/contracts';
import type {
  BlogArticleTemplateKey,
  BuildBookBlockInstance,
  BuildBookPage,
} from '../../build-book/build-book.types';
import { fillBlogPostBlockProps, fillSourceFromProtopipeTemplate } from '../../build-book/build-book-article-fill.util';
import { findBlogArticleTemplate, type BlogArticlePackagePreview } from '../../build-book/build-book-blog-template.catalog';
import { findBuildBookBlockDefinition } from '../../build-book/build-book-block.catalog';
import { resolvePatternIdForBlock } from '../../build-book/build-book-block-registry.util';
import type { BuildPageBlockState } from '../../build-book/canvas/build-page-canvas.component';

/** Always-available editorial stack when Build Book profiles are missing. */
export const DEFAULT_BLOG_PREVIEW_SEED_BLOCKS: BuildBookBlockInstance[] = [
  {
    id: 'default-b1',
    blockId: 'universal-intro-centered',
    componentId: 'universal-intro-centered',
    section: 'fold',
    order: 0,
    patternId: 'section-intro',
    props: {},
  },
  {
    id: 'default-b2',
    blockId: 'universal-prose-band',
    componentId: 'universal-prose-band',
    section: 'fold',
    order: 1,
    patternId: 'prose-band',
    props: {},
  },
  {
    id: 'default-b3',
    blockId: 'universal-split-image-right',
    componentId: 'universal-split-image-right',
    section: 'fold',
    order: 2,
    patternId: 'content-split',
    props: {},
  },
  {
    id: 'default-b4',
    blockId: 'universal-prose-band',
    componentId: 'universal-prose-band',
    section: 'fold',
    order: 3,
    patternId: 'prose-band',
    props: {},
  },
  {
    id: 'default-b5',
    blockId: 'universal-split-image-left',
    componentId: 'universal-split-image-left',
    section: 'fold',
    order: 4,
    patternId: 'content-split',
    props: {},
  },
  {
    id: 'default-b6',
    blockId: 'universal-faq-accordion',
    componentId: 'universal-faq-accordion',
    section: 'fold',
    order: 5,
    patternId: 'faq-accordion',
    props: {},
  },
  {
    id: 'default-b7',
    blockId: 'universal-cta-band',
    componentId: 'universal-cta-band',
    section: 'close',
    order: 6,
    patternId: 'cta-banner',
    props: {},
  },
];

export interface ResolveBlogPreviewStackInput {
  post: ProtopipeContentPost;
  /** Prefer role=template-profile pages. */
  profiles: readonly BuildBookPage[];
  /** All blog-post pages — used when blogTemplateProfileId is set but not in profiles. */
  blogPages?: readonly BuildBookPage[];
  /** Fallback seed blocks when no profile stack exists. */
  defaultSeedBlocks?: readonly BuildBookBlockInstance[];
}

export interface ResolveBlogPreviewStackResult {
  profileId?: string;
  profileLabel?: string;
  varietyKey?: string;
  templateKey?: BlogArticleTemplateKey;
  templateLabel?: string;
  articlePackage?: BlogArticlePackagePreview;
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

function articleTemplateBlocksFor(
  key: BlogArticleTemplateKey,
  blockIds: readonly string[],
): BuildBookBlockInstance[] {
  return blockIds
    .map((blockId, index): BuildBookBlockInstance | null => {
      const def = findBuildBookBlockDefinition(blockId);
      if (!def) return null;
      return {
        id: `design-${key}-b${index + 1}`,
        blockId,
        componentId: def.componentId,
        section: def.section,
        label: def.label,
        order: index,
        patternId: resolvePatternIdForBlock(blockId),
        props: structuredClone(def.defaultProps ?? {}),
        sourceTemplateId: def.sourceTemplateId,
      };
    })
    .filter((block): block is BuildBookBlockInstance => block !== null);
}

function pickProfile(input: ResolveBlogPreviewStackInput): BuildBookPage | undefined {
  const profileId = input.post.blogTemplateProfileId?.trim() || undefined;
  if (profileId) {
    const fromProfiles = input.profiles.find((page) => page.id === profileId);
    if (fromProfiles?.blocks?.length) return fromProfiles;
    const fromPages = input.blogPages?.find(
      (page) => page.kind === 'blog-post' && page.id === profileId,
    );
    if (fromPages?.blocks?.length) return fromPages;
  }
  return input.profiles.find((page) => (page.blocks?.length ?? 0) > 0) ?? input.profiles[0];
}

/**
 * Display-only: clone selected template-profile stack and fill from ContentTemplate.
 * Does not mutate Build Book draft.
 */
export function resolveBlogPreviewStack(
  input: ResolveBlogPreviewStackInput,
): ResolveBlogPreviewStackResult {
  const profile = pickProfile(input);
  const defaults = input.defaultSeedBlocks ?? DEFAULT_BLOG_PREVIEW_SEED_BLOCKS;

  const sourceBlocks =
    profile?.blocks?.length
      ? cloneStack(profile.blocks, profile.id)
      : cloneStack(defaults, 'default');

  const hasArticleBody = templateHasBody(input.post.template);
  const filled = hasArticleBody
    ? fillBlogPostBlockProps(
        sourceBlocks,
        fillSourceFromProtopipeTemplate(input.post.template!, {
          kicker: input.post.suggestedKeyword,
        }),
      )
    : sourceBlocks;

  for (const block of filled) {
    if (!block.patternId) {
      block.patternId = resolvePatternIdForBlock(block.blockId);
    }
  }

  return {
    profileId: profile?.id,
    profileLabel: profile?.label ?? (profile ? undefined : 'Editorial default'),
    varietyKey: profile?.templateProfileMeta?.varietyKey,
    templateKey: profile?.templateProfileMeta?.articleTemplateKey,
    templateLabel:
      profile?.templateProfileMeta?.articleTemplateKey
        ? findBlogArticleTemplate(profile.templateProfileMeta.articleTemplateKey)?.label ??
          profile.label
        : undefined,
    blockStates: toBlockStates(filled),
    hasArticleBody,
  };
}

export function resolveBlogArticleTemplatePreviewStack(
  key: BlogArticleTemplateKey,
): ResolveBlogPreviewStackResult {
  const template = findBlogArticleTemplate(key);
  if (!template) {
    return {
      templateKey: key,
      blockStates: [],
      hasArticleBody: false,
    };
  }

  const blocks = articleTemplateBlocksFor(key, template.blockIds);
  const filled = fillBlogPostBlockProps(blocks, template.preview);

  return {
    templateKey: template.id,
    templateLabel: template.label,
    articlePackage: template.preview,
    blockStates: toBlockStates(filled),
    hasArticleBody: true,
  };
}

export function blogArticleTemplatePreviewTitle(key: BlogArticleTemplateKey): string {
  return findBlogArticleTemplate(key)?.preview.h1 ?? findBlogArticleTemplate(key)?.preview.title ?? 'Blog article';
}
