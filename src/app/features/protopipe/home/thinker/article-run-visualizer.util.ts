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
  ArticleGenerationWritingContext,
  ProtopipeContentTemplate,
  ProtopipeArticleBlock,
} from '@hive/contracts';
import type { Thought, ThoughtArtifact, ThoughtStep } from '../../lab/thinker/thought.model';
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
  | 'image'
  | 'context-panel'
  | 'lead-table';

export type LeadPriority = 'critical' | 'high' | 'medium' | 'monitor';

export interface LeadTableRow {
  name: string;
  score: number;
  priority: LeadPriority;
  rating?: number;
  ratingCount?: number;
  hasWebsite: boolean;
  websiteQuality?: string;
  websiteUri?: string;
  address?: string;
  mapsUrl?: string;
  factors?: string[];
  /** True when this lead's domain appears in paid Google Ads for the category search. */
  runsAds?: boolean;
}

export type ContextPanelTone = 'neutral' | 'strategy' | 'verified' | 'warning' | 'style';

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
  tone?: ContextPanelTone;
  /** Rows for lead-table blocks */
  leads?: LeadTableRow[];
}

export interface StepVisualizerView {
  title: string;
  subtitle?: string;
  emptyMessage?: string;
  blocks: VisualizerBlock[];
  /** Context tabs for compile_context — header stays in `blocks`, tab bodies here. */
  tabs?: VisualizerTab[];
  defaultTabId?: string;
}

export type ContextVisualizerTabId = 'thesis' | 'strategy' | 'audience' | 'business' | 'voice-brand';

export interface VisualizerTab {
  id: string;
  label: string;
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
      return briefVisualizer(a.brief, 'SEO brief');
    case 'compile_context':
      return compileContextVisualizer(a.brief, a.writingContext);
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

export function buildArticlePreviewVisualizer(
  options: { run?: ArticleGenerationRunDto | null; thought?: Thought | null },
): StepVisualizerView {
  if (options.run?.artifacts.template) {
    return templateVisualizer(options.run.artifacts.template, options.run.artifacts.imageGeneration);
  }

  const artifact = findArticleArtifact(options.thought);
  if (!artifact) {
    return {
      title: 'Article preview',
      emptyMessage:
        'The article will appear here once the assemble step creates a template. Draft sections are visible on the Draft step.',
      blocks: [],
    };
  }

  const template = templateFromArtifact(artifact);
  if (template) {
    return templateVisualizer(template);
  }

  const blocks = artifactBlocks(artifact);
  return {
    title: artifact.label || 'Article preview',
    subtitle: artifact.summary,
    emptyMessage: 'No article preview is available yet.',
    blocks,
  };
}

function findArticleArtifact(thought: Thought | null | undefined): ThoughtArtifact | undefined {
  const portArtifact = thought?.outputs
    .map((port) => port.artifact)
    .find((artifact): artifact is ThoughtArtifact => Boolean(artifact));
  if (isArticleLikeArtifact(portArtifact)) return portArtifact;

  const steps = [...(thought?.steps ?? [])].reverse();
  for (const step of steps) {
    const artifact = step.output?.find(isArticleLikeArtifact);
    if (artifact) return artifact;
  }

  return undefined;
}

function isArticleLikeArtifact(artifact: ThoughtArtifact | undefined): artifact is ThoughtArtifact {
  if (!artifact) return false;
  const key = `${artifact.id} ${artifact.label} ${artifact.kind}`.toLowerCase();
  if (key.includes('article') || key.includes('template') || key.includes('draft')) {
    return true;
  }
  return Boolean(templateFromArtifact(artifact));
}

function templateFromArtifact(artifact: ThoughtArtifact | undefined): ProtopipeContentTemplate | undefined {
  const data = artifact?.data;
  if (isContentTemplate(data)) return data;
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (isContentTemplate(record['template'])) return record['template'];
    if (isContentTemplate(record['article'])) return record['article'];
  }
  return undefined;
}

function isContentTemplate(value: unknown): value is ProtopipeContentTemplate {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record['title'] === 'string' &&
    typeof record['h1'] === 'string' &&
    (Array.isArray(record['blocks']) || Array.isArray(record['sections']) || typeof record['intro'] === 'string')
  );
}

export function buildThoughtStepVisualizer(step: ThoughtStep): StepVisualizerView {
  if (step.status === 'pending') {
    return {
      title: step.label,
      subtitle: step.summary,
      emptyMessage: 'This step has not run yet. The preview will appear here as artifacts land.',
      blocks: [],
    };
  }

  const blocks: VisualizerBlock[] = [];

  for (const artifact of step.output ?? []) {
    blocks.push(...artifactBlocks(artifact));
  }

  if (!blocks.length && step.llmCalls?.length) {
    blocks.push(
      ...step.llmCalls.map((call) => ({
        kind: 'context-panel' as const,
        tone: 'strategy' as const,
        label: call.label,
        text: call.response,
        hint: call.model,
      })),
    );
  }

  if (!blocks.length && step.subSteps?.length) {
    blocks.push({
      kind: 'kicker',
      text: 'Step work',
    });
    blocks.push({
      kind: 'list',
      items: step.subSteps.map((sub) =>
        [sub.label, sub.detail, sub.status].filter(Boolean).join(' — '),
      ),
    });
  }

  if (!blocks.length && step.events.length) {
    blocks.push({
      kind: 'kicker',
      text: 'Events',
    });
    blocks.push({
      kind: 'list',
      items: step.events.map((event) => event.message),
    });
  }

  return {
    title: step.label,
    subtitle: step.summary,
    emptyMessage: 'No visual preview is available for this step yet. Check the output or raw tab for details.',
    blocks,
  };
}

function artifactBlocks(artifact: ThoughtArtifact): VisualizerBlock[] {
  const labelBlock: VisualizerBlock = { kind: 'kicker', text: artifact.label };
  if (artifact.kind === 'image') {
    const image = imageArtifactData(artifact.data);
    if (image.url) {
      return [
        labelBlock,
        {
          kind: 'image',
          label: artifact.label,
          imageUrl: image.url,
          imageAlt: image.alt ?? artifact.label,
          text: image.prompt,
        },
      ];
    }
  }

  const text = artifactText(artifact);
  if (!text.trim()) {
    return [];
  }

  if (artifact.kind === 'markdown' || artifact.kind === 'text') {
    return [
      labelBlock,
      {
        kind: 'context-panel',
        tone: 'neutral',
        label: artifact.summary ?? artifact.label,
        text,
      },
    ];
  }

  return [
    labelBlock,
    {
      kind: 'context-panel',
      tone: 'neutral',
      label: artifact.summary ?? artifact.kind,
      text,
    },
  ];
}

function artifactText(artifact: ThoughtArtifact): string {
  if (typeof artifact.data === 'string') {
    return artifact.data;
  }
  try {
    return JSON.stringify(artifact.data, null, 2);
  } catch {
    return String(artifact.data ?? '');
  }
}

function imageArtifactData(data: unknown): { url?: string; alt?: string; prompt?: string } {
  if (typeof data === 'string') {
    return { url: data };
  }
  if (!data || typeof data !== 'object') {
    return {};
  }
  const record = data as Record<string, unknown>;
  return {
    url: typeof record['url'] === 'string' ? record['url'] : undefined,
    alt: typeof record['alt'] === 'string' ? record['alt'] : undefined,
    prompt: typeof record['prompt'] === 'string' ? record['prompt'] : undefined,
  };
}

/** Extra fields persisted on brief / writingContext beyond hive-contracts base types. */
type BriefStrategyView = ArticleGenerationBrief & {
  thesisSeed?: string;
  keyQuestionToAnswer?: string;
  strategyNarrative?: string;
  coreCompetitorError?: string;
  mechanismApplication?: string;
  journeyStage?: string;
  novelMechanism?: string;
  keyValidationQuestion?: string;
};

type WritingContextView = ArticleGenerationWritingContext & {
  intelligenceContextBlock?: string;
  answeredContextCardCount?: number;
};

const INTELLIGENCE_SECTION_RE = /^---\s*(.+?)\s*---$/;
const TOPIC_HEADER_RE = /^([A-Z][A-Z0-9 /_-]{1,40}):$/;

function panelToneForSection(title: string): ContextPanelTone {
  const key = title.trim().toLowerCase();
  if (key.includes('do not repeat')) return 'warning';
  if (key.includes('verified')) return 'verified';
  if (key.includes('style')) return 'style';
  if (key.includes('business context') || key.includes('offers') || key.includes('brand')) {
    return 'neutral';
  }
  return 'neutral';
}

function stripBulletPrefix(line: string): string {
  return line.replace(/^[-•*]\s*/, '').trim();
}

function parseKnowledgeLines(lines: string[]): VisualizerBlock[] {
  const blocks: VisualizerBlock[] = [];
  for (const raw of lines) {
    const line = stripBulletPrefix(raw);
    const colon = line.indexOf(':');
    if (colon <= 0 || colon > 80) {
      if (line) blocks.push({ kind: 'list', items: [line] });
      continue;
    }
    const label = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (!value) continue;
    blocks.push({
      kind: 'article-section',
      text: label,
      value,
    });
  }
  return blocks;
}

function isVoiceBrandSection(title: string): boolean {
  const key = title.trim().toLowerCase();
  return key.includes('style') || key.includes('brand');
}

function partitionIntelligenceContext(text: string): {
  business: VisualizerBlock[];
  voiceBrand: VisualizerBlock[];
} {
  const business: VisualizerBlock[] = [];
  const voiceBrand: VisualizerBlock[] = [];
  const lines = text.split('\n');
  let sectionTitle = 'Business intelligence';
  let sectionTone: ContextPanelTone = 'neutral';
  let sectionIntro: string[] = [];
  let sectionItems: string[] = [];
  let topicLabel: string | undefined;
  let topicItems: string[] = [];

  const sectionTarget = () => (isVoiceBrandSection(sectionTitle) ? voiceBrand : business);

  const flushTopic = () => {
    if (!topicLabel || !topicItems.length) {
      topicLabel = undefined;
      topicItems = [];
      return;
    }
    sectionTarget().push({
      kind: 'context-panel',
      tone: sectionTone,
      label: topicLabel,
      items: topicItems.map(stripBulletPrefix),
    });
    topicLabel = undefined;
    topicItems = [];
  };

  const flushSection = () => {
    flushTopic();
    const intro = sectionIntro.join('\n').trim();
    const items = sectionItems.map(stripBulletPrefix).filter(Boolean);
    if (intro || items.length) {
      sectionTarget().push({
        kind: 'context-panel',
        tone: sectionTone,
        label: sectionTitle,
        text: intro || undefined,
        items: items.length ? items : undefined,
      });
    }
    sectionIntro = [];
    sectionItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) continue;

    const sectionMatch = trimmed.match(INTELLIGENCE_SECTION_RE);
    if (sectionMatch) {
      flushSection();
      sectionTitle = sectionMatch[1].trim();
      sectionTone = panelToneForSection(sectionTitle);
      continue;
    }

    const topicMatch = trimmed.match(TOPIC_HEADER_RE);
    if (topicMatch) {
      flushTopic();
      topicLabel = topicMatch[1]
        .split(' ')
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(' ');
      continue;
    }

    if (topicLabel) {
      topicItems.push(trimmed);
      continue;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      sectionItems.push(trimmed);
    } else if (!sectionIntro.length && !sectionItems.length) {
      sectionIntro.push(trimmed);
    } else {
      sectionItems.push(trimmed);
    }
  }

  flushSection();
  return { business, voiceBrand };
}

function parseIntelligenceContextPanels(text: string): VisualizerBlock[] {
  const { business, voiceBrand } = partitionIntelligenceContext(text);
  return [...business, ...voiceBrand];
}

function extractPlanNarrative(combined: string, intelligenceBlock?: string): string | undefined {
  let text = combined.trim();
  if (intelligenceBlock?.trim()) {
    text = text.replace(intelligenceBlock.trim(), '').trim();
  }
  const marker = text.search(/\n---\s*.+\s*---/);
  if (marker >= 0) {
    text = text.slice(0, marker).trim();
  }

  const chunks = text.split(/\n\n+/).filter(Boolean);
  const narrative: string[] = [];
  const knowledge: string[] = [];

  for (const chunk of chunks) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    if (
      lines.length > 0 &&
      lines.every((l) => {
        const stripped = stripBulletPrefix(l);
        const colon = stripped.indexOf(':');
        return colon > 0 && colon < 80 && stripped.slice(colon + 1).trim().length > 0;
      })
    ) {
      knowledge.push(...lines);
    } else {
      narrative.push(chunk);
    }
  }

  return narrative.join('\n\n').trim() || undefined;
}

function partitionBusinessContext(
  combined: string | undefined,
  intelligenceBlock: string | undefined,
): {
  planNarrative?: string;
  business: VisualizerBlock[];
  voiceBrand: VisualizerBlock[];
} {
  const combinedText = combined?.trim() ?? '';
  const planNarrative = combinedText
    ? extractPlanNarrative(combinedText, intelligenceBlock)
    : undefined;

  const business: VisualizerBlock[] = [];
  const voiceBrand: VisualizerBlock[] = [];

  const intelSource =
    intelligenceBlock?.trim() ||
    (combinedText.includes('---') ? combinedText : '');

  if (intelSource) {
    const partitioned = partitionIntelligenceContext(intelSource);
    business.push(...partitioned.business);
    voiceBrand.push(...partitioned.voiceBrand);
  }

  if (!intelSource && combinedText) {
    const knowledgeLines = combinedText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && /^[-•*]?\s*[^:]+:\s+/.test(l));
    if (knowledgeLines.length) {
      business.push({ kind: 'kicker', text: 'Site knowledge' });
      business.push(...parseKnowledgeLines(knowledgeLines));
    }

    const remainder = combinedText
      .split('\n')
      .filter((l) => l.trim() && !knowledgeLines.includes(l.trim()))
      .join('\n')
      .trim();
    if (remainder && !planNarrative) {
      business.push({
        kind: 'context-panel',
        tone: 'neutral',
        label: 'Business context',
        text: remainder,
      });
    }
  }

  return { planNarrative, business, voiceBrand };
}

function parseBusinessContextPanels(combined: string, intelligenceBlock?: string): VisualizerBlock[] {
  const { planNarrative, business, voiceBrand } = partitionBusinessContext(
    combined,
    intelligenceBlock,
  );
  const blocks: VisualizerBlock[] = [];
  if (planNarrative) {
    blocks.push({
      kind: 'context-panel',
      tone: 'strategy',
      label: 'Plan narrative',
      text: planNarrative,
    });
  }
  blocks.push(...business, ...voiceBrand);
  return blocks;
}

function buildThesisTabBlocks(brief: BriefStrategyView | undefined): VisualizerBlock[] {
  if (!brief) return [];

  const blocks: VisualizerBlock[] = [];

  if (brief.thesisSeed) {
    blocks.push({
      kind: 'context-panel',
      tone: 'strategy',
      label: 'Thesis seed',
      text: brief.thesisSeed,
    });
  }

  if (brief.strategyNarrative) {
    blocks.push({
      kind: 'context-panel',
      tone: 'strategy',
      label: 'Strategy narrative',
      text: brief.strategyNarrative,
    });
  }

  const pushMeta = (label: string, value?: string) => {
    if (value?.trim()) blocks.push({ kind: 'meta-row', label, value: value.trim() });
  };

  pushMeta('Key question', brief.keyQuestionToAnswer ?? brief.keyValidationQuestion);
  pushMeta('Competitor gap', brief.coreCompetitorError);
  pushMeta('Mechanism', brief.mechanismApplication ?? brief.novelMechanism);

  return blocks;
}

function buildStrategyTabBlocks(
  brief: BriefStrategyView | undefined,
  planNarrative?: string,
): VisualizerBlock[] {
  if (!brief && !planNarrative) return [];

  const blocks: VisualizerBlock[] = [];

  if (brief) {
    blocks.push({
      kind: 'chips',
      items: [
        brief.primaryKeyword.phrase,
        brief.primaryKeyword.intent,
        `${brief.targetWordCount.toLocaleString()} words`,
        brief.serpGeo.locationName,
        ...(brief.clusterName ? [brief.clusterName] : []),
      ],
    });

    if (brief.recommendedAngle) {
      blocks.push({
        kind: 'context-panel',
        tone: 'strategy',
        label: 'Recommended angle',
        text: brief.recommendedAngle,
      });
    }

    if (brief.positioningSummary) {
      blocks.push({
        kind: 'context-panel',
        tone: 'strategy',
        label: 'Positioning',
        text: brief.positioningSummary,
      });
    }

    if (brief.rationale) {
      blocks.push({ kind: 'paragraph', text: brief.rationale });
    }

    const pushMeta = (label: string, value?: string) => {
      if (value?.trim()) blocks.push({ kind: 'meta-row', label, value: value.trim() });
    };

    pushMeta('Journey stage', brief.journeyStage);
    pushMeta('Cluster', brief.clusterName);

    if (brief.mandatorySections?.length) {
      blocks.push({ kind: 'kicker', text: 'Mandatory sections' });
      blocks.push({ kind: 'list', items: brief.mandatorySections });
    }

    if (brief.internalLinkTargets?.length) {
      blocks.push({ kind: 'kicker', text: 'Internal links' });
      blocks.push({
        kind: 'list',
        items: brief.internalLinkTargets.map(
          (t) => `${t.label}${t.reason ? ` — ${t.reason}` : ''}`,
        ),
      });
    }

    if (brief.contentGaps.length) {
      blocks.push({ kind: 'kicker', text: 'Content gaps to cover' });
      blocks.push({ kind: 'list', items: brief.contentGaps });
    }

    if (brief.secondaryKeywords.length) {
      blocks.push({ kind: 'kicker', text: 'Secondary keywords' });
      blocks.push({ kind: 'chips', items: brief.secondaryKeywords.slice(0, 16) });
    }

    if (brief.nlpTerms.length) {
      blocks.push({ kind: 'kicker', text: 'NLP terms' });
      blocks.push({ kind: 'chips', items: brief.nlpTerms.slice(0, 20) });
    }
  }

  if (planNarrative) {
    blocks.push({
      kind: 'context-panel',
      tone: 'strategy',
      label: 'Plan narrative',
      text: planNarrative,
    });
  }

  return blocks;
}

function buildAudienceTabBlocks(brief: BriefStrategyView | undefined): VisualizerBlock[] {
  if (!brief?.audienceSummary && !brief?.authorContext) return [];

  const blocks: VisualizerBlock[] = [];

  if (brief.audienceSummary) {
    blocks.push({
      kind: 'context-panel',
      tone: 'neutral',
      label: 'Audience summary',
      text: brief.audienceSummary,
    });
  }

  if (brief.authorContext) {
    blocks.push({
      kind: 'context-panel',
      tone: 'neutral',
      label: 'Author context',
      text: brief.authorContext,
    });
  }

  return blocks;
}

function buildBusinessTabBlocks(
  panels: VisualizerBlock[],
  ctx: WritingContextView | undefined,
): VisualizerBlock[] {
  const blocks: VisualizerBlock[] = [];

  if (ctx?.answeredContextCardCount != null && ctx.answeredContextCardCount > 0) {
    blocks.push({
      kind: 'meta-row',
      label: 'Sharpen answers',
      value: `${ctx.answeredContextCardCount} verified fact(s) loaded`,
    });
  }

  blocks.push(...panels);
  return blocks;
}

function buildVoiceBrandTabBlocks(
  brief: ArticleGenerationBrief | undefined,
  panels: VisualizerBlock[],
): VisualizerBlock[] {
  const blocks: VisualizerBlock[] = [];

  if (brief) {
    blocks.push({
      kind: 'context-panel',
      tone: 'style',
      label: 'Voice config',
      text: [
        brief.voiceConfig.tone,
        brief.voiceConfig.pov.replace(/_/g, ' '),
        `${brief.voiceConfig.sentenceLength} sentences`,
        `${brief.voiceConfig.jargonLevel} jargon`,
        `${brief.voiceConfig.ctaStyle} CTA`,
      ].join(' · '),
    });

    if (brief.voiceConfig.avoid.length) {
      blocks.push({ kind: 'kicker', text: 'Phrases to avoid' });
      blocks.push({ kind: 'chips', items: brief.voiceConfig.avoid });
    }
  }

  blocks.push(...panels);
  return blocks;
}

function compileContextVisualizer(
  brief: ArticleGenerationBrief | undefined,
  writingContext: ArticleGenerationWritingContext | undefined,
): StepVisualizerView {
  const ctx = writingContext as WritingContextView | undefined;
  const strategyBrief = brief as BriefStrategyView | undefined;

  if (!brief && !ctx) {
    return {
      title: 'Writing context',
      emptyMessage: 'Context compiles from your calendar post, plan brief, and Sharpen answers.',
      blocks: [],
    };
  }

  const intelligenceBlock = ctx?.intelligenceContextBlock;
  const { planNarrative, business, voiceBrand } = partitionBusinessContext(
    brief?.businessContext,
    intelligenceBlock,
  );

  const headerBlocks: VisualizerBlock[] = [
    { kind: 'kicker', text: 'Article assignment' },
    {
      kind: 'heading',
      level: 1,
      text: ctx?.workingTitle ?? brief?.primaryKeyword.phrase ?? 'Writing context',
    },
  ];

  const thesisBlocks = buildThesisTabBlocks(strategyBrief);
  const strategyBlocks = buildStrategyTabBlocks(strategyBrief, planNarrative);
  const audienceBlocks = buildAudienceTabBlocks(strategyBrief);
  const businessBlocks = buildBusinessTabBlocks(business, ctx);
  const voiceBrandBlocks = buildVoiceBrandTabBlocks(brief, voiceBrand);

  const subtitleParts = [
    brief?.primaryKeyword.phrase,
    brief ? `${brief.targetWordCount.toLocaleString()} words` : null,
    ctx?.answeredContextCardCount ? `${ctx.answeredContextCardCount} Sharpen answers` : null,
  ].filter(Boolean);

  return {
    title: 'Writing context',
    subtitle: subtitleParts.join(' · '),
    blocks: headerBlocks,
    defaultTabId: 'thesis',
    tabs: [
      {
        id: 'thesis',
        label: 'Thesis',
        emptyMessage:
          'Thesis sharpens after the cognitive pass. Plan thesis seed and key question land here when set.',
        blocks: thesisBlocks,
      },
      {
        id: 'strategy',
        label: 'Strategy',
        emptyMessage: 'Strategy angle, positioning, and coverage targets from your content plan.',
        blocks: strategyBlocks,
      },
      {
        id: 'audience',
        label: 'Audience',
        emptyMessage: 'Audience profile and author context from Sharpen and the plan brief.',
        blocks: audienceBlocks,
      },
      {
        id: 'business',
        label: 'Business',
        emptyMessage:
          'Verified facts, offers, and site knowledge from Sharpen — answer questions to fill this in.',
        blocks: businessBlocks,
      },
      {
        id: 'voice-brand',
        label: 'Voice & Brand',
        emptyMessage:
          'Voice settings, style examples, and brand book context from Sharpen and brand setup.',
        blocks: voiceBrandBlocks,
      },
    ],
  };
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
    blocks.push(...parseBusinessContextPanels(brief.businessContext));
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
