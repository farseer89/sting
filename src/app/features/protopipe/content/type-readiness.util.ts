import type { ProtopipeArticleBlock, ProtopipeContentTemplate } from '@hive/contracts';

export type ReadinessStatus = 'pass' | 'warn' | 'fail';

export interface TypeReadinessItem {
  id: string;
  label: string;
  status: ReadinessStatus;
  message?: string;
}

function txt(value: string | undefined | null): string {
  return value?.trim() ?? '';
}

function visibleBlocks(blocks: ProtopipeArticleBlock[]): ProtopipeArticleBlock[] {
  return blocks.filter((b) => b.visible !== false);
}

function introWordCount(template: ProtopipeContentTemplate): number {
  if (template.blocks?.length) {
    const intro = visibleBlocks(template.blocks).find(
      (b) => b.kind === 'prose' && b.slotId === 'intro',
    );
    if (intro?.kind === 'prose') {
      return txt(intro.body).split(/\s+/).filter(Boolean).length;
    }
  }
  return txt(template.intro).split(/\s+/).filter(Boolean).length;
}

function hasCta(template: ProtopipeContentTemplate): boolean {
  if (template.blocks?.length) {
    const cta = visibleBlocks(template.blocks).find((b) => b.kind === 'cta');
    return cta?.kind === 'cta' ? Boolean(txt(cta.label) && txt(cta.href)) : false;
  }
  return Boolean(txt(template.cta?.label) && txt(template.cta?.href));
}

function item(
  id: string,
  label: string,
  status: ReadinessStatus,
  message?: string,
): TypeReadinessItem {
  return { id, label, status, message };
}

const ARTICLE_TYPE_LABELS: Record<string, string> = {
  howto: 'How-to',
  faq: 'FAQ',
  comparison: 'Comparison',
  pillar: 'Pillar',
  local_service: 'Local service',
  project_case_study: 'Case study',
};

export function articleTypeLabel(articleType?: string, layoutVariant?: string): string {
  if (!articleType) return 'Article';
  const base = ARTICLE_TYPE_LABELS[articleType] ?? articleType;
  if (articleType === 'pillar' && layoutVariant === 'listicle') return 'Listicle';
  if (articleType === 'comparison' && layoutVariant === 'list') return 'Comparison list';
  return base;
}

/** Live type-aware readiness chips for the writer strip (mirrors bagend validateTypeReadiness). */
export function computeTypeReadiness(template: ProtopipeContentTemplate): TypeReadinessItem[] {
  const items: TypeReadinessItem[] = [];
  const blocks = template.blocks?.length ? visibleBlocks(template.blocks) : [];
  const articleType = template.articleType;
  const layoutVariant = template.layoutVariant;

  items.push(
    item('title', 'Title', txt(template.title) ? 'pass' : 'warn', 'Add a search title'),
  );
  const metaLen = txt(template.metaDescription).length;
  items.push(
    item(
      'meta',
      'Meta description',
      metaLen >= 140 && metaLen <= 160 ? 'pass' : 'warn',
      'Aim for 140–160 characters',
    ),
  );

  if (!articleType) {
    items.push(item('type', 'Article type', 'warn', 'Type is set when generated from a plan'));
    items.push(item('cta', 'Call to action', hasCta(template) ? 'pass' : 'warn', 'Add a CTA'));
    return items;
  }

  const find = (slotId: string) => blocks.find((b) => b.slotId === slotId);

  switch (articleType) {
    case 'howto': {
      const stepsBlock = blocks.find((b) => b.kind === 'howto_steps');
      const stepCount =
        stepsBlock?.kind === 'howto_steps'
          ? stepsBlock.steps.filter((s) => txt(s.name) && txt(s.body)).length
          : 0;
      items.push(
        item(
          'howto_steps',
          `Steps (${stepCount})`,
          stepCount >= 3 ? 'pass' : 'fail',
          'Need at least 3 completed steps',
        ),
      );
      const introWords = introWordCount(template);
      items.push(
        item(
          'direct_answer',
          'Direct answer intro',
          introWords >= 25 ? 'pass' : 'warn',
          'Intro should answer the query in ~40–60 words',
        ),
      );
      break;
    }
    case 'faq': {
      const faq = blocks.find((b) => b.kind === 'faq_list');
      const count =
        faq?.kind === 'faq_list'
          ? faq.items.filter((i) => txt(i.question) && txt(i.answer)).length
          : 0;
      items.push(
        item(
          'faq_items',
          `FAQ pairs (${count})`,
          count >= 2 ? 'pass' : 'fail',
          'Need at least 2 Q&A pairs',
        ),
      );
      break;
    }
    case 'comparison': {
      if (layoutVariant === 'list') {
        const list = blocks.find((b) => b.kind === 'list_items');
        const count =
          list?.kind === 'list_items' ? list.items.filter((i) => txt(i.title)).length : 0;
        items.push(
          item(
            'comparison_list',
            `Ranked items (${count})`,
            count >= 2 ? 'pass' : 'fail',
            'Need at least 2 items',
          ),
        );
      } else {
        const table = blocks.find((b) => b.kind === 'comparison_table');
        const rows = table?.kind === 'comparison_table' ? table.rows.length : 0;
        items.push(
          item(
            'comparison_table',
            `Comparison table (${rows} rows)`,
            rows >= 2 ? 'pass' : 'fail',
            'Need a table with at least 2 rows',
          ),
        );
      }
      const rec = find('recommendation');
      items.push(
        item(
          'recommendation',
          'Recommendation',
          rec?.kind === 'prose' && txt(rec.body) ? 'pass' : 'warn',
          'Add a clear pick',
        ),
      );
      break;
    }
    case 'local_service': {
      const area = find('service_area');
      items.push(
        item(
          'service_area',
          'Service area',
          area?.kind === 'prose' && txt(area.body) ? 'pass' : 'warn',
          'Mention where you serve',
        ),
      );
      break;
    }
    case 'pillar': {
      if (layoutVariant === 'listicle') {
        const list = blocks.find((b) => b.kind === 'list_items');
        const count =
          list?.kind === 'list_items' ? list.items.filter((i) => txt(i.title)).length : 0;
        items.push(
          item(
            'listicle_items',
            `List items (${count})`,
            count >= 5 ? 'pass' : 'warn',
            'Listicles rank best with 5+ items',
          ),
        );
      }
      break;
    }
    default:
      break;
  }

  items.push(item('cta', 'Call to action', hasCta(template) ? 'pass' : 'warn', 'Add a CTA'));

  const links = blocks.find((b) => b.kind === 'internal_links');
  const linkCount =
    links?.kind === 'internal_links'
      ? links.links.filter((l) => txt(l.href) && txt(l.label)).length
      : template.internalLinks?.filter((l) => txt(l.href) && txt(l.label)).length ?? 0;
  items.push(
    item(
      'internal_links',
      'Internal links',
      linkCount > 0 ? 'pass' : 'warn',
      'Link to related posts or pages',
    ),
  );

  return items;
}
