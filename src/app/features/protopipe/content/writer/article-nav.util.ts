import type {
  ArticleGenerationLayoutSlot,
  ArticleGenerationRunDto,
  ArticlePresentation,
  ProtopipeArticleBlock,
  ProtopipeContentTemplate,
} from '@hive/contracts';

export type ArticleNavReadiness = 'empty' | 'drafting' | 'copy-ready' | 'visual-ready';

export interface ArticleNavSlot {
  slotId: string;
  blockId: string;
  index: number;
  presentation: ArticlePresentation;
  label: string;
  h2?: string;
  sectionIndex?: number;
  readiness: ArticleNavReadiness;
}

function blockHasCopy(block: ProtopipeArticleBlock | undefined): boolean {
  if (!block) return false;
  switch (block.kind) {
    case 'prose':
      return Boolean(block.body?.trim() || block.h2?.trim());
    case 'image':
      return Boolean(block.url?.trim() && block.alt?.trim());
    case 'infographic':
      return Boolean(
        block.infographic?.items?.length ||
          (block.url?.trim() && block.alt?.trim()),
      );
    case 'howto_steps':
      return block.steps.some((s) => s.body?.trim());
    case 'list_items':
      return block.items.some((i) => i.body?.trim() || i.title?.trim());
    case 'comparison_table':
      return block.rows.length > 0;
    case 'faq_list':
      return block.items.some((i) => i.answer?.trim());
    case 'internal_links':
      return block.links.length > 0;
    case 'cta':
      return Boolean(block.label?.trim());
    case 'author_line':
      return Boolean(block.text?.trim());
    default:
      return false;
  }
}

function blockNeedsVisual(presentation: ArticlePresentation): boolean {
  return (
    presentation === 'hero' ||
    presentation === 'full_photo' ||
    presentation === 'image_left' ||
    presentation === 'image_right' ||
    presentation === 'infographic'
  );
}

function blockHasVisual(block: ProtopipeArticleBlock | undefined, presentation: ArticlePresentation): boolean {
  if (!blockNeedsVisual(presentation)) return true;
  if (!block) return false;
  if (block.kind === 'image' || block.kind === 'infographic') {
    if (block.kind === 'infographic' && block.infographic?.items?.length) return true;
    return Boolean(block.url?.trim());
  }
  if (block.kind === 'prose') {
    if (presentation === 'infographic' && block.infographic?.items?.length) {
      return true;
    }
    return (block.images ?? []).some((img) => Boolean(img.url?.trim()));
  }
  return false;
}

function readinessForSlot(
  slot: ArticleGenerationLayoutSlot,
  block: ProtopipeArticleBlock | undefined,
  run: ArticleGenerationRunDto | null,
): ArticleNavReadiness {
  const currentStep = run?.currentStep;
  const isDrafting =
    run?.status === 'running' &&
    (currentStep === 'draft' || currentStep === 'draft_faq') &&
    slot.sectionIndex !== undefined;

  if (isDrafting && !blockHasCopy(block)) {
    return 'drafting';
  }

  const hasCopy = blockHasCopy(block);
  if (!hasCopy) return 'empty';

  if (blockHasVisual(block, slot.presentation)) {
    return 'visual-ready';
  }

  if (run?.status === 'running' && currentStep === 'generate_images') {
    return 'copy-ready';
  }

  return blockNeedsVisual(slot.presentation) ? 'copy-ready' : 'visual-ready';
}

function slotLabel(slot: ArticleGenerationLayoutSlot, index: number): string {
  return slot.h2?.trim() || slot.label?.trim() || `Section ${index + 1}`;
}

export function buildArticleNavSlots(input: {
  layoutPlan?: ArticleGenerationLayoutSlot[] | null;
  template?: ProtopipeContentTemplate | null;
  run?: ArticleGenerationRunDto | null;
}): ArticleNavSlot[] {
  const slots = input.layoutPlan ?? [];
  if (!slots.length) return [];

  const blocks = input.template?.blocks ?? input.run?.artifacts?.layoutSkeleton?.blocks ?? [];
  const blockBySlot = new Map(blocks.map((b) => [b.slotId, b]));

  return slots.map((slot, index) => {
    const block = blockBySlot.get(slot.slotId);
    return {
      slotId: slot.slotId,
      blockId: slot.blockId,
      index,
      presentation: slot.presentation,
      label: slotLabel(slot, index),
      h2: slot.h2,
      sectionIndex: slot.sectionIndex,
      readiness: readinessForSlot(slot, block, input.run ?? null),
    };
  });
}

export function mergeRunPreviewTemplate(
  run: ArticleGenerationRunDto | null,
  sessionTemplate: ProtopipeContentTemplate | null | undefined,
): ProtopipeContentTemplate | null {
  if (!run) return sessionTemplate ?? null;

  const skeleton = run.artifacts?.layoutSkeleton;
  const assembled = run.artifacts?.template;
  const base = assembled ?? skeleton ?? sessionTemplate;
  if (!base) return null;

  const merged: ProtopipeContentTemplate = {
    ...base,
    blocks: base.blocks ? [...base.blocks] : undefined,
    sections: base.sections ? base.sections.map((s) => ({ ...s })) : [],
  };

  const drafted = run.artifacts?.sections ?? [];
  if (drafted.length && merged.blocks?.length) {
    const introDraft = drafted[0];
    const bodyDrafts = drafted.slice(1);
    let bodyIndex = 0;
    for (const block of merged.blocks) {
      if (block.kind === 'prose' && block.slotId === 'intro') {
        if (introDraft?.prose?.trim()) {
          block.body = introDraft.prose;
        }
        continue;
      }
      if (block.kind !== 'prose' || block.slotId === 'hero') continue;
      const draft = bodyDrafts[bodyIndex];
      if (draft?.prose?.trim()) {
        block.body = draft.prose;
        if (draft.section.h2) block.h2 = draft.section.h2;
      }
      bodyIndex += 1;
    }
  }

  const layoutSlots = run.artifacts?.layoutPlan?.slots ?? [];
  if (layoutSlots.length && merged.blocks?.length) {
    const bySlot = new Map(layoutSlots.map((slot) => [slot.slotId, slot.presentation]));
    merged.blocks = merged.blocks.map((block) => ({
      ...block,
      presentation: bySlot.get(block.slotId) ?? block.presentation,
    }));
  }

  if (assembled?.blocks?.length) {
    merged.blocks = assembled.blocks;
  }

  return merged;
}
