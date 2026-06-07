import type {
  ProtopipeArticleBlock,
  ProtopipeContentSectionImage,
  ProtopipeContentTemplate,
} from '@hive/contracts';
import { patchSection } from './protopipe-writing-session';

export function visibleBlocks(blocks: ProtopipeArticleBlock[]): ProtopipeArticleBlock[] {
  return blocks.filter((b) => b.visible !== false);
}

export function isPinnedBlock(block: ProtopipeArticleBlock): boolean {
  return block.slotId === 'cta';
}

export function getHeroImageBlock(
  template: ProtopipeContentTemplate,
): Extract<ProtopipeArticleBlock, { kind: 'image' }> | null {
  const block = (template.blocks ?? []).find((b) => b.kind === 'image' && b.slotId === 'hero');
  return block?.kind === 'image' ? block : null;
}

export function proseBlocksForSections(template: ProtopipeContentTemplate): Extract<
  ProtopipeArticleBlock,
  { kind: 'prose' }
>[] {
  return visibleBlocks(template.blocks ?? []).filter(
    (b): b is Extract<ProtopipeArticleBlock, { kind: 'prose' }> =>
      b.kind === 'prose' && b.slotId !== 'intro',
  );
}

export function sectionIndexForProseBlock(
  template: ProtopipeContentTemplate,
  blockId: string,
): number {
  return proseBlocksForSections(template).findIndex((b) => b.id === blockId);
}

export function syncTemplateImagesToSections(
  template: ProtopipeContentTemplate,
): ProtopipeContentTemplate {
  if (!template.blocks?.length) return template;
  const proseList = proseBlocksForSections(template);
  if (!proseList.length) return template;

  const sections = [...template.sections];
  for (let i = 0; i < proseList.length; i++) {
    const block = proseList[i];
    if (!sections[i]) continue;
    if (block.images !== undefined) {
      sections[i] = {
        ...sections[i],
        images: block.images.map((img) => ({ ...img })),
      };
    }
  }
  return { ...template, sections };
}

export function patchBlock(
  template: ProtopipeContentTemplate,
  blockId: string,
  patch: Partial<ProtopipeArticleBlock>,
): ProtopipeContentTemplate {
  if (!template.blocks?.length) return template;

  const blocks = template.blocks.map((block) =>
    block.id === blockId ? ({ ...block, ...patch } as ProtopipeArticleBlock) : block,
  );

  let next: ProtopipeContentTemplate = { ...template, blocks };

  const updated = blocks.find((b) => b.id === blockId);
  if (updated?.kind === 'prose' && updated.slotId === 'intro' && patch.kind === undefined) {
    const prose = updated as Extract<ProtopipeArticleBlock, { kind: 'prose' }>;
    if ('body' in patch) {
      next = { ...next, intro: prose.body };
    }
  }

  if (updated?.kind === 'prose' && updated.slotId !== 'intro' && 'images' in patch) {
    next = syncTemplateImagesToSections(next);
  }

  if (updated?.kind === 'cta') {
    const cta = updated as Extract<ProtopipeArticleBlock, { kind: 'cta' }>;
    next = { ...next, cta: { label: cta.label, href: cta.href } };
  }

  if (updated?.kind === 'internal_links') {
    const links = updated as Extract<ProtopipeArticleBlock, { kind: 'internal_links' }>;
    next = { ...next, internalLinks: links.links };
  }

  return next;
}

export function patchSectionWithBlocks(
  template: ProtopipeContentTemplate,
  index: number,
  partial: Parameters<typeof patchSection>[2],
): ProtopipeContentTemplate {
  let next = patchSection(template, index, partial);
  if (!next.blocks?.length || !('images' in partial)) return next;

  const proseList = proseBlocksForSections(next);
  const target = proseList[index];
  if (!target) return next;

  return patchBlock(next, target.id, {
    images: partial.images as ProtopipeContentSectionImage[] | undefined,
  });
}

export function toggleBlockVisibility(
  template: ProtopipeContentTemplate,
  blockId: string,
): ProtopipeContentTemplate {
  const block = template.blocks?.find((b) => b.id === blockId);
  if (!block?.optional) return template;
  return patchBlock(template, blockId, { visible: block.visible === false });
}

export function reorderBlocks(
  template: ProtopipeContentTemplate,
  previousIndex: number,
  currentIndex: number,
): ProtopipeContentTemplate {
  if (!template.blocks?.length) return template;

  const pinned = template.blocks.filter(isPinnedBlock);
  const movable = template.blocks.filter((b) => !isPinnedBlock(b));
  const next = [...movable];
  const [moved] = next.splice(previousIndex, 1);
  next.splice(currentIndex, 0, moved);

  return { ...template, blocks: [...next, ...pinned] };
}

export function blockKindLabel(kind: ProtopipeArticleBlock['kind']): string {
  switch (kind) {
    case 'prose':
      return 'Prose';
    case 'image':
      return 'Image';
    case 'howto_steps':
      return 'Steps';
    case 'list_items':
      return 'List';
    case 'comparison_table':
      return 'Table';
    case 'faq_list':
      return 'FAQ';
    case 'internal_links':
      return 'Links';
    case 'cta':
      return 'CTA';
    case 'author_line':
      return 'Author';
    default:
      return kind;
  }
}

export function imagePlaceholderHint(block: {
  label?: string;
  promptHint?: string;
  role?: string;
}): string {
  if (block.promptHint?.trim()) return block.promptHint.trim();
  if (block.role === 'hero') return 'Wide hero photo for this article';
  return block.label?.trim() || 'Upload an image or add a URL';
}

export function imageIsComplete(img: { url?: string; alt?: string }): boolean {
  return Boolean(img.url?.trim() && img.alt?.trim());
}

export interface PendingTemplateImage {
  id: string;
  label: string;
}

/** Images seeded by layout that still need url + alt before publish. */
export function pendingTemplateImages(template: ProtopipeContentTemplate): PendingTemplateImage[] {
  if (!template.blocks?.length) return [];

  const pending: PendingTemplateImage[] = [];
  const hero = getHeroImageBlock(template);
  if (hero && !imageIsComplete(hero)) {
    pending.push({ id: 'hero-image', label: hero.label?.trim() || 'Hero image' });
  }

  for (const block of visibleBlocks(template.blocks)) {
    if (block.kind !== 'prose' || !block.images?.length) continue;
    const slotLabel = block.label?.trim() || block.slotId;
    for (let i = 0; i < block.images.length; i++) {
      if (!imageIsComplete(block.images[i])) {
        pending.push({
          id: `section-image-${block.slotId}-${i}`,
          label: `${slotLabel} photo`,
        });
      }
    }
  }

  return pending;
}
