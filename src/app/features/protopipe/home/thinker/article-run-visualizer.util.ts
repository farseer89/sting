import type {
  ArticleGenerationBrief,
  ArticleGenerationDraftedFaqItem,
  ArticleGenerationDraftedSection,
  ArticleGenerationImageGeneration,
  ArticleGenerationImageSlot,
  ArticleGenerationOutline,
  ArticleGenerationReview,
  ArticleGenerationRunDto,
  ArticleGenerationStep,
  ProtopipeContentTemplate,
  ProtopipeArticleBlock,
} from '@hive/contracts';
import type { BinderStepStatus } from './thinker-binder.mapper';

export type VisualizerBlockKind =
  | 'kicker'
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'chips'
  | 'meta-row'
  | 'article-section'
  | 'faq'
  | 'score-bar'
  | 'notice'
  | 'image';

export interface VisualizerBlock {
  kind: VisualizerBlockKind;
  level?: 1 | 2 | 3;
  text?: string;
  items?: string[];
  label?: string;
  value?: string;
  hint?: string;
  /** 0–100 for score-bar */
  score?: number;
  imageUrl?: string;
  imageAlt?: string;
}

export interface StepVisualizerView {
  title: string;
  subtitle?: string;
  emptyMessage?: string;
  blocks: VisualizerBlock[];
}

export function buildArticleStepVisualizer(
  run: ArticleGenerationRunDto,
  step: ArticleGenerationStep,
  stepStatus: BinderStepStatus,
): StepVisualizerView {
  const a = run.artifacts;

  if (stepStatus === 'pending') {
    return {
      title: 'Waiting for this step',
      emptyMessage: 'This step has not run yet. The preview will appear here as artifacts land.',
      blocks: [],
    };
  }

  switch (step) {
    case 'build_brief':
    case 'compile_context':
      return briefVisualizer(a.brief, step === 'compile_context' ? 'Writing context' : 'SEO brief');
    case 'outline':
      return outlineVisualizer(a.outline, a.metadata?.titleTag);
    case 'draft':
      return draftVisualizer(a.outline, a.sections, a.metadata?.titleTag);
    case 'draft_faq':
      return faqVisualizer(a.faqItems, a.outline?.h1);
    case 'assemble':
      return templateVisualizer(a.template, a.imageGeneration);
    case 'metadata':
      return metadataVisualizer(a.metadata);
    case 'review':
      return reviewVisualizer(a.review, a.selfHealProgress);
    case 'generate_images':
      return imageVisualizer(a.imageGeneration);
    case 'infer_type':
      return {
        title: 'Article type',
        subtitle: run.articleType.replace(/_/g, ' '),
        blocks: [{ kind: 'paragraph', text: `This run is a ${run.articleType.replace(/_/g, ' ')} page.` }],
      };
    default:
      return {
        title: 'Step output',
        subtitle: step.replace(/_/g, ' '),
        emptyMessage: 'No article preview for this step — use the output tab for raw artifacts.',
        blocks: [],
      };
  }
}

function briefVisualizer(
  brief: ArticleGenerationBrief | undefined,
  title: string,
): StepVisualizerView {
  if (!brief) {
    return { title, emptyMessage: 'Brief not available yet.', blocks: [] };
  }

  const blocks: VisualizerBlock[] = [
    { kind: 'kicker', text: 'Primary keyword' },
    { kind: 'heading', level: 1, text: brief.primaryKeyword.phrase },
    {
      kind: 'chips',
      items: [brief.primaryKeyword.intent, brief.primaryKeyword.priority, `${brief.targetWordCount} words`],
    },
    { kind: 'meta-row', label: 'SERP geo', value: brief.serpGeo.locationName },
  ];

  if (brief.secondaryKeywords.length) {
    blocks.push({ kind: 'kicker', text: 'Secondary keywords' });
    blocks.push({ kind: 'chips', items: brief.secondaryKeywords });
  }

  if (brief.nlpTerms.length) {
    blocks.push({ kind: 'kicker', text: 'NLP terms to weave in' });
    blocks.push({ kind: 'chips', items: brief.nlpTerms.slice(0, 24) });
  }

  blocks.push({ kind: 'kicker', text: 'Voice' });
  blocks.push({
    kind: 'paragraph',
    text: [
      brief.voiceConfig.tone,
      brief.voiceConfig.pov.replace(/_/g, ' '),
      `${brief.voiceConfig.sentenceLength} sentences`,
      `${brief.voiceConfig.jargonLevel} jargon`,
      `${brief.voiceConfig.ctaStyle} CTA`,
    ].join(' · '),
  });

  if (brief.voiceConfig.avoid.length) {
    blocks.push({ kind: 'kicker', text: 'Avoid' });
    blocks.push({ kind: 'chips', items: brief.voiceConfig.avoid });
  }

  if (brief.contentGaps.length) {
    blocks.push({ kind: 'kicker', text: 'Content gaps to cover' });
    blocks.push({ kind: 'list', items: brief.contentGaps });
  }

  if (brief.businessContext) {
    blocks.push({ kind: 'kicker', text: 'Business context' });
    blocks.push({ kind: 'paragraph', text: brief.businessContext });
  }

  if (brief.authorContext) {
    blocks.push({ kind: 'kicker', text: 'Author context' });
    blocks.push({ kind: 'paragraph', text: brief.authorContext });
  }

  return {
    title,
    subtitle: `${brief.targetWordCount} words · ${brief.serpGeo.locationName}`,
    blocks,
  };
}

function outlineVisualizer(
  outline: ArticleGenerationOutline | undefined,
  titleTag?: string,
): StepVisualizerView {
  if (!outline) {
    return { title: 'Outline', emptyMessage: 'Outline not ready yet.', blocks: [] };
  }

  const blocks: VisualizerBlock[] = [
    { kind: 'kicker', text: 'Title tag (planned)' },
    { kind: 'paragraph', text: titleTag ?? outline.h1 },
    { kind: 'heading', level: 1, text: outline.h1 },
  ];

  for (const section of outline.sections) {
    blocks.push({
      kind: 'article-section',
      level: 2,
      text: section.h2,
      hint: `${section.targetWordCount} words`,
      items: section.notes.length ? section.notes : undefined,
    });
  }

  return {
    title: 'Outline',
    subtitle: `${outline.sections.length} section(s) — article skeleton`,
    blocks,
  };
}

function draftVisualizer(
  outline: ArticleGenerationOutline | undefined,
  sections: ArticleGenerationDraftedSection[] | undefined,
  titleTag?: string,
): StepVisualizerView {
  if (!sections?.length) {
    return { title: 'Draft', emptyMessage: 'Sections will appear here as they are drafted.', blocks: [] };
  }

  const blocks: VisualizerBlock[] = [
    { kind: 'kicker', text: 'Working title' },
    { kind: 'paragraph', text: titleTag ?? outline?.h1 ?? 'Draft article' },
  ];

  if (outline?.h1) {
    blocks.push({ kind: 'heading', level: 1, text: outline.h1 });
  }

  for (const section of sections) {
    blocks.push({
      kind: 'article-section',
      level: 2,
      text: section.section.h2,
      hint: `${section.wordCount} words`,
      value: section.prose,
    });
  }

  const words = sections.reduce((n, s) => n + s.wordCount, 0);
  return {
    title: 'Draft',
    subtitle: `${words.toLocaleString()} words · as it will read in the article`,
    blocks,
  };
}

function faqVisualizer(
  faqItems: ArticleGenerationDraftedFaqItem[] | undefined,
  articleTitle?: string,
): StepVisualizerView {
  if (!faqItems?.length) {
    return {
      title: 'FAQ',
      emptyMessage: 'FAQ items are generated for pillar guides when PAA questions match.',
      blocks: [],
    };
  }

  const blocks: VisualizerBlock[] = [];
  if (articleTitle) {
    blocks.push({ kind: 'heading', level: 1, text: articleTitle });
  }
  blocks.push({ kind: 'kicker', text: 'Frequently asked questions' });

  for (const item of faqItems) {
    blocks.push({ kind: 'faq', label: item.question, text: item.answer });
  }

  return {
    title: 'FAQ',
    subtitle: `${faqItems.length} question(s)`,
    blocks,
  };
}

function templateVisualizer(
  template: ProtopipeContentTemplate | undefined,
  imageGeneration?: ArticleGenerationImageGeneration,
): StepVisualizerView {
  if (!template) {
    return { title: 'Assembled article', emptyMessage: 'Template not assembled yet.', blocks: [] };
  }

  const blocks: VisualizerBlock[] = [
    { kind: 'kicker', text: 'Title tag' },
    { kind: 'paragraph', text: template.title },
    { kind: 'meta-row', label: 'Meta description', value: template.metaDescription },
    { kind: 'heading', level: 1, text: template.h1 },
  ];

  if (template.blocks?.length) {
    blocks.push(...templateBlockVisualizerBlocks(template.blocks));
  } else {
    blocks.push({ kind: 'paragraph', text: template.intro });
    blocks.push(
      ...imageSlotBlocks(
        imageGeneration?.slots?.filter(
          (s) => s.status === 'generated' && Boolean(s.publicUrl?.trim() || s.sourceUrl?.trim()),
        ),
      ),
    );

    for (const section of template.sections ?? []) {
      blocks.push({
        kind: 'article-section',
        level: 2,
        text: section.h2,
        value: section.body,
      });
    }
  }

  if (template.cta) {
    blocks.push({ kind: 'kicker', text: 'Call to action' });
    blocks.push({ kind: 'paragraph', text: `${template.cta.label} → ${template.cta.href}` });
  }

  return {
    title: 'Assembled article',
    subtitle: 'Full post preview with images',
    blocks,
  };
}

function templateBlockVisualizerBlocks(blocks: ProtopipeArticleBlock[]): VisualizerBlock[] {
  const out: VisualizerBlock[] = [];

  for (const block of blocks) {
    if (block.visible === false) continue;

    switch (block.kind) {
      case 'prose':
        if (block.h2) out.push({ kind: 'heading', level: 2, text: block.h2 });
        if (block.body?.trim()) out.push({ kind: 'paragraph', text: block.body });
        for (const img of block.images ?? []) {
          const url = img.url?.trim();
          if (!url) continue;
          out.push({
            kind: 'image',
            label: block.label ?? block.h2 ?? 'Section image',
            imageUrl: url,
            imageAlt: img.alt,
          });
        }
        break;
      case 'image': {
        const url = block.url?.trim();
        if (!url) break;
        out.push({
          kind: 'image',
          label: block.label ?? block.role ?? 'Image',
          imageUrl: url,
          imageAlt: block.alt,
          text: block.promptHint,
        });
        break;
      }
      case 'howto_steps':
        out.push({ kind: 'kicker', text: block.label ?? 'How-to steps' });
        out.push({ kind: 'list', items: block.steps.map((s) => s.name).filter(Boolean) });
        break;
      case 'list_items':
        out.push({ kind: 'kicker', text: block.label ?? 'List' });
        out.push({ kind: 'list', items: block.items.map((i) => i.title).filter(Boolean) });
        break;
      case 'faq_list':
        for (const item of block.items ?? []) {
          out.push({ kind: 'faq', label: item.question, text: item.answer });
        }
        break;
      case 'internal_links':
        out.push({ kind: 'kicker', text: 'Internal links' });
        out.push({
          kind: 'list',
          items: block.links.map((l) => `${l.label} → ${l.href}`),
        });
        break;
      case 'cta':
        out.push({ kind: 'paragraph', text: `${block.label} → ${block.href}` });
        break;
      case 'author_line':
        out.push({ kind: 'paragraph', text: block.text });
        break;
      case 'comparison_table':
        out.push({ kind: 'kicker', text: block.label ?? 'Comparison' });
        out.push({
          kind: 'paragraph',
          text: `${block.columns.map((c) => c.label).join(' · ')} — ${block.rows.length} row(s)`,
        });
        break;
    }
  }

  return out;
}

function metadataVisualizer(
  metadata: ArticleGenerationRunDto['artifacts']['metadata'],
): StepVisualizerView {
  if (!metadata) {
    return { title: 'Metadata', emptyMessage: 'Metadata not generated yet.', blocks: [] };
  }

  return {
    title: 'Metadata',
    subtitle: 'Search and social snippets',
    blocks: [
      { kind: 'meta-row', label: 'Title tag', value: metadata.titleTag, hint: `${metadata.titleTag.length} chars` },
      { kind: 'meta-row', label: 'Meta description', value: metadata.metaDesc, hint: `${metadata.metaDesc.length} chars` },
      { kind: 'meta-row', label: 'Slug', value: `/${metadata.slug}` },
      { kind: 'meta-row', label: 'OG title', value: metadata.ogTitle },
      { kind: 'meta-row', label: 'OG description', value: metadata.ogDesc },
    ],
  };
}

function reviewVisualizer(
  review: ArticleGenerationReview | undefined,
  selfHeal: ArticleGenerationRunDto['artifacts']['selfHealProgress'],
): StepVisualizerView {
  if (!review) {
    return { title: 'Review', emptyMessage: 'Review scores will appear here.', blocks: [] };
  }

  const blocks: VisualizerBlock[] = [
    {
      kind: 'score-bar',
      label: 'Overall',
      score: review.overallScore,
      text: review.passesThreshold ? 'Passes threshold' : 'Below threshold',
    },
  ];

  const scoreRows: [string, number][] = [
    ['Keyword integration', review.scores.keywordIntegration],
    ['Voice match', review.scores.voiceMatch],
    ['Structure', review.scores.structuralAdherence],
    ['Specificity', review.scores.specificity],
    ['Readability', review.scores.readability],
    ['E-E-A-T', review.scores.eeatSignal],
  ];
  for (const [label, score] of scoreRows) {
    blocks.push({ kind: 'score-bar', label, score });
  }

  if (selfHeal && selfHeal.phase !== 'skipped') {
    blocks.push({
      kind: 'notice',
      text: formatSelfHealNotice(selfHeal),
    });
  }

  if (review.violations.length) {
    blocks.push({ kind: 'kicker', text: 'Violations' });
    blocks.push({ kind: 'list', items: review.violations });
  }

  if (review.sectionViolations.length) {
    blocks.push({ kind: 'kicker', text: 'Section issues' });
    blocks.push({
      kind: 'list',
      items: review.sectionViolations.map((v) => `${v.h2}: ${v.message}`),
    });
  }

  return {
    title: 'Quality review',
    subtitle: `Score ${review.overallScore.toFixed(2)} · ${review.passesThreshold ? 'pass' : 'needs attention'}`,
    blocks,
  };
}

function formatSelfHealNotice(
  heal: NonNullable<ArticleGenerationRunDto['artifacts']['selfHealProgress']>,
): string {
  if (heal.phase === 'done') {
    return `Self-heal redrafted ${heal.redraftSectionIndices.length} section(s) and re-scored the draft.`;
  }
  if (heal.skippedSectionIndices?.length) {
    return `Self-heal capped at ${heal.redraftSectionIndices.length} of ${heal.failingSectionIndices.length} failing sections (one attempt per run).`;
  }
  switch (heal.phase) {
    case 'redraft':
      return `Self-heal in progress: redrafting ${heal.redraftedCount}/${heal.totalToRedraft} section(s)…`;
    case 're-assemble':
      return 'Self-heal: rebuilding the article from healed sections…';
    case 're-review':
      return 'Self-heal: re-running the quality review…';
    default:
      return 'Self-heal attempted on failing sections.';
  }
}

function imageVisualizer(
  ig: ArticleGenerationRunDto['artifacts']['imageGeneration'],
): StepVisualizerView {
  if (!ig?.slots.length) {
    return { title: 'Images', emptyMessage: 'Image slots will appear here.', blocks: [] };
  }

  const totalCost =
    ig.totalCostUsd ??
    ig.slots.reduce((sum, s) => sum + (s.costUsd ?? 0), 0);
  const costLabel = totalCost > 0 ? `$${totalCost.toFixed(4)}` : null;

  const blocks: VisualizerBlock[] = [
    {
      kind: 'notice',
      text: `${ig.mode} mode · ${ig.generatedCount ?? 0}/${ig.plannedCount} generated${costLabel ? ` · ${costLabel}${ig.costEstimated ? ' est.' : ''}` : ''}`,
    },
    { kind: 'kicker', text: 'Style profile' },
    { kind: 'paragraph', text: `${ig.styleProfile.label} — ${ig.styleProfile.promptSuffix}` },
  ];

  blocks.push(...imageSlotBlocks(ig.slots));

  return {
    title: 'Generated images',
    subtitle: [ig.model ?? 'fal.ai', costLabel ? `${costLabel} total` : null].filter(Boolean).join(' · '),
    blocks,
  };
}

function imageSlotBlocks(slots: ArticleGenerationImageSlot[] | undefined): VisualizerBlock[] {
  if (!slots?.length) return [];

  const blocks: VisualizerBlock[] = [{ kind: 'kicker', text: 'Image slots' }];

  for (const slot of slots) {
    const url = slot.publicUrl?.trim() || slot.sourceUrl?.trim();
    const costHint =
      slot.costUsd != null ? `$${slot.costUsd.toFixed(4)}${slot.status === 'planned' ? ' est.' : ''}` : slot.imageSize;

    if (url) {
      blocks.push({
        kind: 'image',
        label: slot.label,
        imageUrl: url,
        imageAlt: slot.altSuggestion ?? slot.label,
        hint: costHint,
        text: slot.builtPrompt,
      });
    } else {
      blocks.push({
        kind: 'meta-row',
        label: slot.label,
        value: slot.status === 'failed' ? slot.error ?? 'Failed' : slot.status,
        hint: costHint,
      });
      if (slot.builtPrompt) {
        blocks.push({ kind: 'paragraph', text: slot.builtPrompt });
      }
    }
  }

  return blocks;
}
