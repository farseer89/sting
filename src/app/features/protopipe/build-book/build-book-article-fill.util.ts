import type {
  ProtopipeArticleBlock,
  ProtopipeContentTemplate,
  ProtopipeContentCta,
} from '@hive/contracts';
import type { BuildBookBlockInstance } from './build-book.types';
import { resolvePatternIdForBlock } from './build-book-block-registry.util';
import { stripLeadingMarkdownHeading } from './inline/markdown-preview.util';

export interface BlogArticleFillSection {
  h2?: string;
  body: string;
}

export interface BlogArticleFillImage {
  url: string;
  alt: string;
}

export interface BlogArticleFillComparisonColumn {
  key: string;
  label: string;
}

export interface BlogArticleFillComparisonRow {
  label: string;
  values: Record<string, string>;
  highlight?: boolean;
}

export interface BlogArticleFillSnapshot {
  location: string;
  service: string;
  challenge: string;
  result: string;
}

export interface BlogArticleFillSource {
  title: string;
  intro?: string;
  kicker?: string;
  sections: BlogArticleFillSection[];
  faqItems?: Array<{ question: string; answer: string }>;
  cta?: { label: string; href: string };
  images: BlogArticleFillImage[];
  quickAnswer?: string;
  recommendationSummary?: string;
  comparisonColumns?: BlogArticleFillComparisonColumn[];
  comparisonRows?: BlogArticleFillComparisonRow[];
  decisionCriteria?: string[];
  snapshot?: BlogArticleFillSnapshot;
  outcome?: string;
  takeaways?: string[];
  internalLinks?: Array<{ label: string; href: string }>;
}

/** Fingerprint so we re-fill Profile only when the portable template changes. */
export function articleFillFingerprint(source: BlogArticleFillSource): string {
  return [
    source.title,
    source.intro?.length ?? 0,
    source.sections.length,
    source.sections.map((s) => `${s.h2?.length ?? 0}:${s.body.length}`).join(','),
    source.faqItems?.length ?? 0,
    source.images.map((i) => i.url).join('|'),
    source.cta?.label ?? '',
  ].join('::');
}

export function fillSourceFromProtopipeTemplate(
  template: ProtopipeContentTemplate,
  extras?: { kicker?: string },
): BlogArticleFillSource {
  const blocks = (template.blocks ?? []) as ProtopipeArticleBlock[];
  const proseBlocks = blocks.filter(
    (b): b is Extract<ProtopipeArticleBlock, { kind: 'prose' }> => b.kind === 'prose',
  );
  const imageBlocks = blocks.filter(
    (b): b is Extract<ProtopipeArticleBlock, { kind: 'image' }> =>
      b.kind === 'image' && typeof b.url === 'string' && b.url.trim().length > 0,
  );
  const faqBlock = blocks.find(
    (b): b is Extract<ProtopipeArticleBlock, { kind: 'faq_list' }> => b.kind === 'faq_list',
  );
  const ctaBlock = blocks.find(
    (b): b is Extract<ProtopipeArticleBlock, { kind: 'cta' }> => b.kind === 'cta',
  );

  const title =
    template.title?.trim() ||
    template.h1?.trim() ||
    proseBlocks.find((p) => p.h2)?.h2?.trim() ||
    'Article';

  const intro = template.intro?.trim() || pickIntroFromProse(proseBlocks) || '';

  let sections: BlogArticleFillSection[] = (template.sections ?? [])
    .map((section) => ({
      h2: typeof section.h2 === 'string' ? section.h2 : undefined,
      body: typeof section.body === 'string' ? section.body : '',
    }))
    .filter((section) => section.body.trim().length > 0);

  if (sections.length === 0) {
    sections = proseBlocks
      .filter((block) => !isIntroProse(block))
      .map((block) => ({
        h2: block.h2,
        body: block.body ?? '',
      }))
      .filter((section) => section.body.trim().length > 0);
  }

  const faqItems =
    faqBlock?.items?.map((item) => ({
      question: item.question,
      answer: item.answer,
    })) ?? undefined;

  const cta = readCta(template.cta, ctaBlock);

  return {
    title,
    intro,
    kicker: extras?.kicker,
    sections,
    faqItems,
    cta,
    images: imageBlocks.map((img) => ({
      url: img.url,
      alt: img.alt?.trim() || title,
    })),
  };
}

/**
 * Map a portable article onto Build Book blog-post block props in stack order.
 * Preserves unknown props; only overwrites fields the pattern uses for display.
 */
export function fillBlogPostBlockProps(
  blocks: BuildBookBlockInstance[],
  source: BlogArticleFillSource,
): BuildBookBlockInstance[] {
  let sectionIndex = 0;
  let imageIndex = 0;
  let introUsed = false;

  return blocks.map((block) => {
    const patternId = block.patternId ?? resolvePatternIdForBlock(block.blockId);
    const props = structuredClone(block.props ?? {});
    const kicker = source.kicker?.trim();

    switch (patternId) {
      case 'section-intro': {
        if (kicker && typeof props['kicker'] === 'string') props['kicker'] = kicker;
        if (typeof props['eyebrow'] === 'string' && kicker) props['eyebrow'] = kicker;
        if ('heading' in props || props['heading'] == null) props['heading'] = source.title;
        if ('title' in props) props['title'] = source.title;
        if ('body' in props || props['body'] == null) {
          // Never borrow sections[0] — that duplicates the first body block.
          props['body'] = source.intro?.trim() || '';
          introUsed = true;
        }
        break;
      }
      case 'prose-band': {
        const section = source.sections[sectionIndex];
        sectionIndex += 1;
        if (kicker && typeof props['kicker'] === 'string') props['kicker'] = kicker;
        if (section) {
          const heading = section.h2?.trim() || source.title;
          props['heading'] = heading;
          props['body'] = stripLeadingMarkdownHeading(section.body, heading);
          if ('lede' in props) props['lede'] = props['body'];
        } else if (!introUsed && source.intro?.trim()) {
          props['heading'] = source.title;
          props['body'] = source.intro;
          introUsed = true;
        }
        break;
      }
      case 'content-split': {
        const section = source.sections[sectionIndex];
        sectionIndex += 1;
        if (kicker && typeof props['kicker'] === 'string') props['kicker'] = kicker;
        if (section) {
          const heading = section.h2?.trim() || source.title;
          props['heading'] = heading;
          props['body'] = stripLeadingMarkdownHeading(section.body, heading);
        }
        const image = source.images[imageIndex];
        if (image) {
          imageIndex += 1;
          props['imageSrc'] = image.url;
          props['imageAlt'] = image.alt;
        }
        break;
      }
      case 'quick-answer': {
        const answer =
          source.quickAnswer?.trim() ||
          source.recommendationSummary?.trim() ||
          source.intro?.trim() ||
          '';
        if (answer) {
          if (kicker) props['kicker'] = kicker;
          if (source.recommendationSummary?.trim() && !source.quickAnswer?.trim()) {
            props['kicker'] =
              typeof props['kicker'] === 'string' && props['kicker']
                ? props['kicker']
                : 'Recommendation';
            props['heading'] =
              typeof props['heading'] === 'string' && props['heading']
                ? props['heading']
                : 'Best-fit recommendation';
          }
          props['body'] = answer;
        }
        break;
      }
      case 'comparison-table': {
        if (source.comparisonColumns?.length) {
          props['columns'] = source.comparisonColumns.map((column) => ({ ...column }));
        }
        if (source.comparisonRows?.length) {
          props['rows'] = source.comparisonRows.map((row) => ({
            label: row.label,
            values: { ...row.values },
            highlight: Boolean(row.highlight),
          }));
        }
        if (source.decisionCriteria?.length && typeof props['subhead'] === 'string') {
          props['subhead'] = source.decisionCriteria.join(' · ');
        }
        if (kicker) props['kicker'] = kicker;
        break;
      }
      case 'case-snapshot': {
        if (source.snapshot) {
          props['location'] = source.snapshot.location;
          props['service'] = source.snapshot.service;
          props['challenge'] = source.snapshot.challenge;
          props['result'] = source.snapshot.result;
        }
        if (kicker) props['kicker'] = kicker;
        break;
      }
      case 'related-links': {
        if (source.internalLinks?.length) {
          props['heading'] =
            typeof props['heading'] === 'string' && props['heading']
              ? props['heading']
              : 'Related on this site';
          props['links'] = source.internalLinks.map((link) => ({ ...link }));
        }
        break;
      }
      case 'faq-accordion': {
        if (source.faqItems?.length) {
          props['kicker'] = typeof props['kicker'] === 'string' ? props['kicker'] || 'FAQ' : 'FAQ';
          props['heading'] =
            typeof props['heading'] === 'string' && props['heading']
              ? props['heading']
              : `Questions about “${source.title}”`;
          props['items'] = source.faqItems.map((item) => ({
            q: item.question,
            a: item.answer,
          }));
        }
        break;
      }
      case 'cta-banner':
      case 'inquiry-close': {
        if (source.cta?.label) {
          props['heading'] =
            typeof props['heading'] === 'string' && props['heading']
              ? props['heading']
              : 'Ready for the next step?';
          props['ctaLabel'] = source.cta.label;
          props['primaryCtaLabel'] = source.cta.label;
          if (source.cta.href) {
            props['ctaHref'] = source.cta.href;
            props['primaryCtaHref'] = source.cta.href;
            if ('href' in props) props['href'] = source.cta.href;
          }
          if ('label' in props) props['label'] = source.cta.label;
        }
        break;
      }
      default:
        break;
    }

    return { ...block, props };
  });
}

function isIntroProse(block: Extract<ProtopipeArticleBlock, { kind: 'prose' }>): boolean {
  const slot = (block.slotId ?? '').toLowerCase();
  if (slot === 'intro' || slot.includes('intro')) return true;
  if (!block.h2?.trim() && block.label?.toLowerCase() === 'introduction') return true;
  return false;
}

function pickIntroFromProse(
  proseBlocks: Array<Extract<ProtopipeArticleBlock, { kind: 'prose' }>>,
): string {
  const intro = proseBlocks.find((block) => isIntroProse(block));
  return intro?.body?.trim() || '';
}

function readCta(
  templateCta: ProtopipeContentCta | undefined,
  block: Extract<ProtopipeArticleBlock, { kind: 'cta' }> | undefined,
): { label: string; href: string } | undefined {
  const label = templateCta?.label?.trim() || block?.label?.trim();
  const href = templateCta?.href?.trim() || block?.href?.trim();
  if (!label) return undefined;
  return { label, href: href || '/contact' };
}
