import type { ProtopipeArticleBlock, ProtopipeContentTemplate } from '@hive/contracts';

export function visibleBlocks(blocks: ProtopipeArticleBlock[]): ProtopipeArticleBlock[] {
  return blocks.filter((b) => b.visible !== false);
}

export function isPinnedBlock(block: ProtopipeArticleBlock): boolean {
  return block.slotId === 'cta';
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

  const updated = blocks.find((b) => b.id === blockId);
  let next: ProtopipeContentTemplate = { ...template, blocks };

  if (updated?.kind === 'prose' && updated.slotId === 'intro' && patch.kind === undefined) {
    const prose = updated as Extract<ProtopipeArticleBlock, { kind: 'prose' }>;
    if ('body' in patch) {
      next = { ...next, intro: prose.body };
    }
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
