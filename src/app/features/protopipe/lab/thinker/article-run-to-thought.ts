import type {
  ArticleGenerationArtifacts,
  ArticleGenerationEvent,
  ArticleGenerationImageGeneration,
  ArticleGenerationOutline,
  ArticleGenerationDraftedSection,
  ArticleGenerationReview,
  ArticleGenerationSelfHealProgress,
  ArticleGenerationRunDto,
  ArticleGenerationStep,
  CognitiveTrainStep,
} from '@hive/contracts';
import { generationStepsForRun, STEP_SHORT_LABELS } from '../../article-pipeline-steps';
import type {
  Thought,
  ThoughtArtifact,
  ThoughtEvent,
  ThoughtStatus,
  ThoughtStep,
  ThoughtStepStatus,
  ThoughtSubStep,
  ThoughtLlmCall,
} from './thought.model';
import { formatThinkerCostUsd, sumCosts } from './thinker-cost';

/**
 * Adapter: project a live ArticleGenerationRun (the 10-step writer pipeline)
 * onto the generic Thought model so it can be rendered in the Thinker view.
 * Pure + synchronous so it can run inside a computed() on every poll tick.
 */

const STEP_META: Record<
  ArticleGenerationStep,
  { label: string; summary: string; description: string }
> = {
  infer_type: {
    label: 'Classify',
    summary: 'Infer the article type from the keyword.',
    description:
      'Assigns an article type (guide, pillar, etc.) that drives template blocks, FAQ rules, and review thresholds for the rest of the pipeline.',
  },
  analyse_competition: {
    label: 'Competition',
    summary: 'Profile the top-ranking pages.',
    description:
      'Scans who ranks for the target keyword today — page structure, angles, and gaps your draft needs to beat.',
  },
  content_plan: {
    label: 'Strategy',
    summary: 'Consolidate the competitor scan into a strategy.',
    description:
      'Turns competitor profiles into a content strategy: mandatory sections, demand consensus, and article ideas aligned to the cluster.',
  },
  research: {
    label: 'Research',
    summary: 'Gather SERP, PAA, site + brand context.',
    description:
      'Builds the research bundle — SERP features, people-also-ask, related terms, and brand context that feed the SEO brief.',
  },
  build_brief: {
    label: 'Brief',
    summary: 'Compile the SEO brief.',
    description:
      'Compiles primary keyword, voice, word-count target, content gaps, and NLP terms into the brief every later step writes against.',
  },
  compile_context: {
    label: 'Context',
    summary: 'Load the plan brief and compile the writing context.',
    description:
      'Loads the calendar post brief from your content plan, merges business intelligence, and compiles the v2 writing context.',
  },
  source_voice_research: {
    label: 'Sources',
    summary: 'Find citable sources and authentic voice references.',
    description:
      'Searches for real citable sources and authentic non-corporate voice samples scoped to the topic and audience, then attaches them to the brief for drafting.',
  },
  cognitive_pass: {
    label: 'Think',
    summary: 'Run the selected thought pack before outline and draft.',
    description:
      'Runs the selected thought pack — multiple cognitive trains plus synthesis — to sharpen angle, thesis, and outline before drafting.',
  },
  outline: {
    label: 'Outline',
    summary: 'Design the H1 and section outline.',
    description:
      'Designs the H1 and H2 section outline from the enriched brief, or reuses the cognitive article package when available.',
  },
  draft: {
    label: 'Draft',
    summary: 'Write the section prose.',
    description:
      'Writes intro and body sections one at a time against the outline and brief, streaming partial drafts as each section completes.',
  },
  audience_review: {
    label: 'Audience review',
    summary: 'Read the draft as the target reader.',
    description:
      'Scores clarity and relevance from the audience perspective using the audience book — advisory before FAQ and layout.',
  },
  draft_faq: {
    label: 'FAQ',
    summary: 'Draft FAQ answers from PAA and brief questions for pillar guides.',
    description:
      'Drafts FAQ Q&A blocks from people-also-ask and brief questions — required for pillar guides, skipped for other types.',
  },
  layout_plan: {
    label: 'Layout',
    summary: 'Assign visual presentation per section.',
    description:
      'Maps each outline section to a presentation (prose, split photo, listicle, FAQ, infographic) and seeds the block skeleton for the writer.',
  },
  review: {
    label: 'Review',
    summary: 'Score the draft against the brief.',
    description:
      'Scores the assembled draft against brief requirements; may trigger a self-heal pass to regenerate failing sections.',
  },
  metadata: {
    label: 'Metadata',
    summary: 'Generate title tag, meta and schema.',
    description:
      'Generates title tag, meta description, and JSON-LD schema hints ready for publish.',
  },
  assemble: {
    label: 'Assemble',
    summary: 'Assemble the final article template.',
    description:
      'Merges outline, drafted sections, metadata, FAQ, and site CTA into the block template the writer canvas loads.',
  },
  generate_images: {
    label: 'Images',
    summary: 'Plan hero and section images with consistent editorial style via fal.ai.',
    description:
      'Plans hero and section image slots with a shared style profile, then generates and uploads assets via fal.ai when live.',
  },
  voice_pass: {
    label: 'Voice',
    summary: 'Polish the full article against the avoid list and craft checklist.',
    description:
      'Runs whole-document voice lint (clichés, em dashes, repetition, structural patterns) and rewrites flagged spans before review.',
  },
};

function phaseStatus(
  phaseIndex: number,
  phaseCount: number,
  stepStatus: ThoughtStepStatus,
): ThoughtStepStatus {
  if (stepStatus === 'pending') return 'pending';
  if (stepStatus === 'failed') return phaseIndex === phaseCount - 1 ? 'failed' : 'complete';
  if (stepStatus === 'running') {
    if (phaseIndex < phaseCount - 1) return 'complete';
    return 'running';
  }
  return 'complete';
}

function trainStepDescription(train: CognitiveTrainStep): string {
  if (train.slug === 'synthesis') {
    return 'Combines train outputs into a thesis, article package outline, and enriched brief angle.';
  }
  return `Runs the “${train.label}” lens from the thought pack before outline and draft.`;
}

function buildTrainSubSteps(train: CognitiveTrainStep): ThoughtSubStep[] {
  const status = mapTrainStatus(train.status);
  if (train.status === 'skipped') {
    return [
      {
        id: `${train.slug}:skip`,
        label: 'Skipped in stub mode',
        detail: 'Thought pack stub — no LLM call',
        status: 'skipped',
      },
    ];
  }
  const detailParts: string[] = [];
  if (train.promptVersion) detailParts.push(train.promptVersion);
  if (train.durationMs != null) detailParts.push(`${train.durationMs}ms`);
  if (train.error) detailParts.push(train.error);
  return [
    {
      id: `${train.slug}:run`,
      label: `Run ${train.label}`,
      detail: detailParts.length ? detailParts.join(' · ') : undefined,
      status,
      isLlm: true,
    },
  ];
}

function buildCognitivePassSubSteps(
  run: ArticleGenerationRunDto,
  stepStatus: ThoughtStepStatus,
): ThoughtSubStep[] {
  const trains = run.artifacts.cognitiveRun?.trains;
  if (trains?.length) {
    return trains.map((train) => ({
      id: `train:${train.slug}`,
      label: train.label,
      detail:
        train.status === 'skipped'
          ? 'Stub mode'
          : train.slug === 'synthesis' && run.artifacts.cognitiveRun?.synthesis?.thesis
            ? run.artifacts.cognitiveRun.synthesis.thesis
            : train.durationMs != null
              ? `${train.durationMs}ms`
              : undefined,
      status: mapTrainStatus(train.status),
      isLlm: train.status !== 'skipped',
    }));
  }

  const packLabel = run.resolvedCognitivePackId ?? 'thought pack';
  return [
    {
      id: 'cog:load',
      label: 'Load thought pack',
      detail: packLabel === 'none' ? 'No pack selected' : packLabel,
      status: phaseStatus(0, 2, stepStatus),
    },
    {
      id: 'cog:run',
      label: 'Run cognitive trains',
      detail: 'Parallel lenses then master synthesis',
      status: phaseStatus(1, 2, stepStatus),
      isLlm: true,
    },
  ];
}

function buildDraftSubSteps(
  run: ArticleGenerationRunDto,
  stepStatus: ThoughtStepStatus,
): ThoughtSubStep[] {
  const outline = run.artifacts.outline;
  const sections = run.artifacts.sections ?? [];
  const total = outline?.sections.length ?? 0;

  if (sections.length > 0) {
    const sectionRows: ThoughtSubStep[] = sections.map((sec, index) => ({
      id: `draft:sec:${index}`,
      label: sec.section.h2,
      detail: `${sec.wordCount} words`,
      status: 'complete' as ThoughtStepStatus,
    }));
    if (stepStatus === 'complete' || stepStatus === 'failed') {
      return sectionRows;
    }
    if (total > sections.length) {
      return [
        ...sectionRows,
        {
          id: 'draft:next',
          label: outline!.sections[sections.length]?.h2 ?? 'Next section',
          detail: `${sections.length + 1} of ${total}`,
          status: 'running' as ThoughtStepStatus,
          isLlm: true,
        },
        ...outline!.sections.slice(sections.length + 1).map((s, i) => ({
          id: `draft:pending:${i}`,
          label: s.h2,
          detail: 'Pending',
          status: 'pending' as ThoughtStepStatus,
        })),
      ];
    }
    return sectionRows;
  }

  const phases: ThoughtSubStep[] = [
    {
      id: 'draft:plan',
      label: 'Plan section order',
      detail: total ? `${total} section(s) from outline` : 'From outline',
      status: phaseStatus(0, 2, stepStatus),
    },
    {
      id: 'draft:write',
      label: 'Write section prose',
      detail: 'One LLM call per section',
      status: phaseStatus(1, 2, stepStatus),
      isLlm: true,
    },
  ];
  return phases;
}

function resolveImageGenerationCostUsd(
  ig: ArticleGenerationImageGeneration | undefined,
): number | undefined {
  if (!ig) return undefined;
  if (ig.totalCostUsd != null && ig.totalCostUsd > 0) return ig.totalCostUsd;
  return sumCosts(ig.slots.map((s) => s.costUsd));
}

function buildImageSubSteps(
  run: ArticleGenerationRunDto,
  stepStatus: ThoughtStepStatus,
): ThoughtSubStep[] {
  const ig = run.artifacts.imageGeneration;
  if (ig?.slots.length) {
    return ig.slots.map((slot) => {
      const costLabel = formatThinkerCostUsd(slot.costUsd);
      const statusDetail =
        slot.status === 'generated'
          ? 'Generated'
          : slot.status === 'failed'
            ? slot.error ?? 'Failed'
            : slot.status === 'skipped'
              ? 'Skipped'
              : ig.mode === 'stub'
                ? 'Planned (stub)'
                : 'Planned';
      const detail = costLabel
        ? `${statusDetail} · ${costLabel}${ig.costEstimated ? ' est.' : ''}`
        : statusDetail;
      return {
        id: `img:${slot.id}`,
        label: slot.label?.trim() || slot.id || 'Image',
        detail,
        costUsd: slot.costUsd,
        status:
          slot.status === 'generated'
            ? ('complete' as ThoughtStepStatus)
            : slot.status === 'failed'
              ? ('failed' as ThoughtStepStatus)
              : slot.status === 'skipped'
                ? ('skipped' as ThoughtStepStatus)
                : stepStatus === 'running'
                  ? ('running' as ThoughtStepStatus)
                  : stepStatus === 'complete'
                    ? ('complete' as ThoughtStepStatus)
                    : ('pending' as ThoughtStepStatus),
      };
    });
  }

  return [
    {
      id: 'img:plan',
      label: 'Plan image slots',
      detail: 'Hero + section placeholders with shared style',
      status: phaseStatus(0, 2, stepStatus),
    },
    {
      id: 'img:gen',
      label: 'Generate via fal.ai',
      detail: ig?.mode === 'live' ? 'Live generation + S3 upload' : 'Stub — prompts only',
      status: phaseStatus(1, 2, stepStatus),
    },
  ];
}

function buildArticleSubSteps(
  step: ArticleGenerationStep,
  run: ArticleGenerationRunDto,
  evs: ArticleGenerationEvent[],
  stepStatus: ThoughtStepStatus,
): ThoughtSubStep[] {
  const a = run.artifacts;
  const keyword = a.brief?.primaryKeyword.phrase ?? 'target keyword';

  switch (step) {
    case 'infer_type':
      return [
        {
          id: 'type:resolve',
          label: 'Resolve article type',
          detail: run.articleType.replace(/_/g, ' '),
          status: stepStatus === 'pending' ? 'pending' : 'complete',
        },
      ];

    case 'analyse_competition': {
      const phases: ThoughtSubStep[] = [
        {
          id: 'comp:serp',
          label: 'Load SERP snapshot',
          detail: keyword,
          status: phaseStatus(0, 3, stepStatus),
        },
        {
          id: 'comp:scan',
          label: 'Profile ranking pages',
          detail: 'Structure, headings, and angles',
          status: phaseStatus(1, 3, stepStatus),
        },
        {
          id: 'comp:gaps',
          label: 'Extract gaps and consensus',
          detail: 'What winners cover vs miss',
          status: phaseStatus(2, 3, stepStatus),
        },
      ];
      const pages = a.competitionAnalysis?.pages ?? [];
      if (pages.length > 0 && stepStatus !== 'pending') {
        return [
          ...phases.map((p) => ({ ...p, status: 'complete' as ThoughtStepStatus })),
          ...pages.slice(0, 6).map((page, i) => ({
            id: `comp:page:${i}`,
            label: page.domain || page.url.replace(/^https?:\/\//, '').slice(0, 48),
            detail: page.titleTag ?? page.h1 ?? `#${page.serpPosition ?? i + 1} organic`,
            status: 'complete' as ThoughtStepStatus,
          })),
        ];
      }
      return phases;
    }

    case 'content_plan':
      return [
        {
          id: 'plan:read',
          label: 'Read competition profiles',
          detail: a.competitionAnalysis
            ? `${a.competitionAnalysis.scannedCount} page(s) scanned`
            : 'From competition step',
          status: phaseStatus(0, 2, stepStatus),
          isLlm: false,
        },
        {
          id: 'plan:strategy',
          label: 'Build content strategy',
          detail: 'Mandatory sections and article ideas',
          status: phaseStatus(1, 2, stepStatus),
          isLlm: true,
        },
      ];

    case 'research':
      return [
        {
          id: 'res:serp',
          label: 'SERP features & PAA',
          detail: keyword,
          status: phaseStatus(0, 3, stepStatus),
        },
        {
          id: 'res:related',
          label: 'Related terms & gaps',
          detail: 'Demand signals for the brief',
          status: phaseStatus(1, 3, stepStatus),
        },
        {
          id: 'res:brand',
          label: 'Site and brand context',
          detail: 'Voice and positioning inputs',
          status: phaseStatus(2, 3, stepStatus),
        },
      ];

    case 'build_brief':
      return [
        {
          id: 'brief:research',
          label: 'Merge research bundle',
          detail: a.research?.inferenceRationale?.slice(0, 72) ?? 'From research step',
          status: phaseStatus(0, 2, stepStatus),
        },
        {
          id: 'brief:compile',
          label: 'Compile SEO brief',
          detail: a.brief
            ? `${a.brief.targetWordCount} words · ${a.brief.primaryKeyword.phrase}`
            : 'Keyword, voice, gaps, NLP terms',
          status: phaseStatus(1, 2, stepStatus),
          isLlm: true,
        },
      ];

    case 'compile_context':
      return [
        {
          id: 'ctx:load',
          label: 'Load calendar post brief',
          detail: a.writingContext?.workingTitle ?? keyword,
          status: phaseStatus(0, 3, stepStatus),
        },
        {
          id: 'ctx:intelligence',
          label: 'Assemble business intelligence',
          detail: a.writingContext?.workingTitle
            ? `Plan brief · ${a.writingContext.workingTitle}`
            : 'Sharpen Q&A and site facts',
          status: phaseStatus(1, 3, stepStatus),
        },
        {
          id: 'ctx:compile',
          label: 'Compile writing context',
          detail: 'Brief + voice + plan narrative',
          status: phaseStatus(2, 3, stepStatus),
        },
      ];

    case 'source_voice_research':
      return [
        {
          id: 'svr:queries',
          label: 'Plan claim and voice queries',
          detail: a.sourceVoiceResearch?.skipped ? 'Skipped (sources on brief)' : 'LLM query plan',
          status: phaseStatus(0, 2, stepStatus),
          isLlm: true,
        },
        {
          id: 'svr:sources',
          label: 'Collect sources and voice refs',
          detail: a.sourceVoiceResearch
            ? `${a.sourceVoiceResearch.citableSources?.length ?? 0} sources · ${a.sourceVoiceResearch.voiceReferences?.length ?? 0} voice refs`
            : 'SERP + page fetch + structure',
          status: phaseStatus(1, 2, stepStatus),
          isLlm: true,
        },
      ];

    case 'cognitive_pass':
      return buildCognitivePassSubSteps(run, stepStatus);

    case 'outline': {
      const fromPackage = Boolean(
        a.cognitiveRun?.synthesis?.articlePackage?.outline?.length &&
          evs.some((e) => e.note?.includes('cognitive package')),
      );
      return [
        {
          id: 'out:h1',
          label: 'Set H1 headline',
          detail: a.outline?.h1 ?? a.brief?.recommendedAngle ?? keyword,
          status: phaseStatus(0, 2, stepStatus),
          isLlm: !fromPackage,
        },
        {
          id: 'out:sections',
          label: 'Plan section outline',
          detail: fromPackage
            ? 'From cognitive article package'
            : a.outline
              ? `${a.outline.sections.length} section(s)`
              : 'H2 headings and section notes',
          status: phaseStatus(1, 2, stepStatus),
          isLlm: !fromPackage,
        },
      ];
    }

    case 'draft':
      return buildDraftSubSteps(run, stepStatus);

    case 'audience_review':
      return [
        {
          id: 'audience:read',
          label: 'Read as target audience',
          detail: a.audienceReview
            ? `Score ${formatReviewScore(a.audienceReview.overallScore)}`
            : 'One LLM pass in reader voice',
          status: phaseStatus(0, 1, stepStatus),
          isLlm: true,
        },
      ];

    case 'draft_faq':
      if (run.articleType !== 'pillar') {
        return [
          {
            id: 'faq:skip',
            label: 'Skipped',
            detail: 'FAQ step runs for pillar guides only',
            status: stepStatus === 'pending' ? 'pending' : 'skipped',
          },
        ];
      }
      return [
        {
          id: 'faq:match',
          label: 'Match PAA to questions',
          detail: 'From research and brief',
          status: phaseStatus(0, 2, stepStatus),
        },
        {
          id: 'faq:draft',
          label: 'Draft FAQ answers',
          detail: a.faqItems?.length ? `${a.faqItems.length} item(s)` : 'One LLM pass',
          status: phaseStatus(1, 2, stepStatus),
          isLlm: true,
        },
      ];

    case 'review': {
      const heal = run.artifacts.selfHealProgress;
      const reviewArtifact = a.review;
      const selfHealRan = Boolean(run.artifacts.selfHealAttempted || heal);

      const phases: ThoughtSubStep[] = [
        {
          id: 'rev:score',
          label: 'Score against brief',
          detail: reviewArtifact
            ? `Score ${formatReviewScore(reviewArtifact.overallScore)}`
            : 'Threshold check',
          status:
            selfHealRan || stepStatus !== 'running'
              ? 'complete'
              : phaseStatus(0, 2, stepStatus),
          isLlm: true,
        },
      ];

      if (heal?.phase === 'skipped') {
        phases.push({
          id: 'rev:heal-skip',
          label: 'Self-heal',
          detail: 'Not needed — all sections passed',
          status: 'skipped',
        });
      } else if (selfHealRan || (reviewArtifact?.failingSections.length ?? 0) > 0) {
        phases.push({
          id: 'rev:heal',
          label: 'Self-heal failing sections',
          detail: formatSelfHealDetail(heal, reviewArtifact),
          status: selfHealPhaseStatus(heal, stepStatus, 1),
          isLlm: true,
        });

        for (const idx of heal?.redraftSectionIndices ?? reviewArtifact?.failingSections ?? []) {
          const h2 = run.artifacts.outline?.sections[idx]?.h2 ?? `Section ${idx}`;
          const note =
            heal?.sectionNotes?.[String(idx)] ??
            reviewArtifact?.sectionViolations.find((v) => v.sectionIndex === idx)?.message;
          phases.push({
            id: `rev:heal:${idx}`,
            label: h2,
            detail: note ?? 'Regenerate section prose',
            status: selfHealSectionStatus(heal, idx, stepStatus),
            isLlm: true,
          });
        }

        if (selfHealRan) {
          phases.push({
            id: 'rev:re-score',
            label: 'Re-score after self-heal',
            detail:
              heal?.phase === 're-review'
                ? 'Running review on healed draft'
                : heal?.phase === 'done'
                  ? reviewArtifact
                    ? `Score ${formatReviewScore(reviewArtifact.overallScore)}`
                    : 'Review complete'
                  : 'After sections are redrafted',
            status: selfHealPhaseStatus(heal, stepStatus, 2, true),
            isLlm: true,
          });
        }
      } else {
        phases.push({
          id: 'rev:heal-skip',
          label: 'Self-heal',
          detail: 'Only when review fails threshold',
          status: stepStatus === 'complete' ? 'skipped' : 'pending',
        });
      }

      if (reviewArtifact?.violations.length || reviewArtifact?.sectionViolations.length) {
        return [
          ...phases,
          ...reviewArtifact!.violations.slice(0, 4).map((v, i) => ({
            id: `rev:v:${i}`,
            label: v.slice(0, 64),
            detail: 'Brief violation',
            status: 'failed' as ThoughtStepStatus,
          })),
        ];
      }
      return phases;
    }

    case 'metadata':
      return [
        {
          id: 'meta:title',
          label: 'Title tag',
          detail: a.metadata?.titleTag?.slice(0, 60) ?? 'From brief + outline',
          status: phaseStatus(0, 2, stepStatus),
          isLlm: true,
        },
        {
          id: 'meta:desc',
          label: 'Meta description & schema',
          detail: a.metadata?.metaDesc
            ? `${a.metadata.metaDesc.length} chars`
            : 'JSON-LD type from article strategy',
          status: phaseStatus(1, 2, stepStatus),
          isLlm: true,
        },
      ];

    case 'assemble':
      return [
        {
          id: 'asm:blocks',
          label: 'Merge template blocks',
          detail: a.sections?.length ? `${a.sections.length} section(s)` : 'Sections + metadata',
          status: phaseStatus(0, 2, stepStatus),
        },
        {
          id: 'asm:cta',
          label: 'Attach CTA and FAQ',
          detail: a.faqItems?.length ? `${a.faqItems.length} FAQ block(s)` : 'Site CTA when configured',
          status: phaseStatus(1, 2, stepStatus),
        },
      ];

    case 'generate_images':
      return buildImageSubSteps(run, stepStatus);

    case 'voice_pass':
      return [
        {
          id: 'voice:lint',
          label: 'Lint avoid list and structure',
          detail: a.voicePass
            ? `${a.voicePass.hitCount ?? 0} hit(s)`
            : 'Deterministic counters',
          status: phaseStatus(0, 2, stepStatus),
        },
        {
          id: 'voice:rewrite',
          label: 'Polish full article',
          detail: a.voicePass?.summary ?? 'Whole-document rewrite when needed',
          status: phaseStatus(1, 2, stepStatus),
          isLlm: true,
        },
      ];

    default:
      return [];
  }
}

function articleStepRunningSummary(
  step: ArticleGenerationStep,
  run: ArticleGenerationRunDto,
): string | undefined {
  if (run.status !== 'running') return undefined;

  if (step === 'draft') {
    const outline = run.artifacts.outline;
    const done = run.artifacts.sections?.length ?? 0;
    const total = outline?.sections.length ?? 0;
    if (total > 0 && done > 0) return `Section ${Math.min(done + 1, total)} of ${total}`;
  }

  if (step === 'cognitive_pass') {
    const trains = run.artifacts.cognitiveRun?.trains;
    const active = trains?.find((t) => t.status !== 'complete' && t.status !== 'skipped');
    if (active) return `${active.label}…`;
    if (!run.artifacts.cognitiveRun?.synthesis?.thesis) return 'Synthesizing…';
  }

  if (step === 'generate_images') {
    const ig = run.artifacts.imageGeneration;
    if (ig?.plannedCount) {
      const done = ig.generatedCount ?? 0;
      return `${done}/${ig.plannedCount} generated`;
    }
  }

  if (step === 'review') {
    const heal = run.artifacts.selfHealProgress;
    if (heal?.phase === 'redraft' && heal.totalToRedraft > 0) {
      const label = heal.currentSectionH2 ? `: ${heal.currentSectionH2}` : '';
      return `Self-heal redraft ${heal.redraftedCount}/${heal.totalToRedraft}${label}`;
    }
    if (heal?.phase === 're-assemble') return 'Self-heal: rebuilding article…';
    if (heal?.phase === 're-review') return 'Self-heal: re-scoring draft…';
    if (!run.artifacts.review && !run.artifacts.selfHealProgress) {
      return 'Scoring draft against brief…';
    }
  }

  return undefined;
}

function mapLlmTrace(trace: NonNullable<ArticleGenerationRunDto['llmTraces']>[number]): ThoughtLlmCall {
  return {
    id: trace.id,
    label: trace.label,
    callId: trace.callId,
    promptVersion: trace.promptVersion,
    model: trace.model,
    system: trace.system,
    user: trace.user,
    response: trace.response,
    inputTokens: trace.inputTokens,
    outputTokens: trace.outputTokens,
    costUsd: trace.costUsd,
    durationMs: trace.durationMs,
  };
}

function attachArticleLlmCalls(steps: ThoughtStep[], run: ArticleGenerationRunDto): void {
  const traces = run.llmTraces ?? [];
  if (traces.length === 0) return;

  const byStep = new Map<string, ThoughtLlmCall[]>();
  for (const trace of traces) {
    const list = byStep.get(trace.pipelineStep) ?? [];
    list.push(mapLlmTrace(trace));
    byStep.set(trace.pipelineStep, list);
  }

  const trainSteps = steps.filter((s) => s.id.startsWith('train:'));
  const cognitiveTraces = byStep.get('cognitive_pass') ?? [];

  for (const step of steps) {
    if (step.id.startsWith('train:')) {
      if (step === trainSteps[0]) {
        step.llmCalls = cognitiveTraces;
      }
      continue;
    }
    step.llmCalls = byStep.get(step.id) ?? [];
  }
}

function runStatus(run: ArticleGenerationRunDto): ThoughtStatus {
  switch (run.status) {
    case 'pending':
      return 'pending';
    case 'running':
      return 'running';
    case 'complete':
      return 'complete';
    case 'failed':
      return 'failed';
    default:
      return 'idle';
  }
}

function json(id: string, label: string, data: unknown, summary?: string): ThoughtArtifact {
  return { id, label, kind: 'json', data, summary };
}

function markdown(id: string, label: string, data: string, summary?: string): ThoughtArtifact {
  return { id, label, kind: 'markdown', data, summary };
}

function text(id: string, label: string, data: string, summary?: string): ThoughtArtifact {
  return { id, label, kind: 'text', data, summary };
}

function outlineToMarkdown(outline: ArticleGenerationOutline): string {
  const lines = [`# ${outline.h1}`, ''];
  for (const s of outline.sections) {
    lines.push(`## ${s.h2}`);
    if (s.notes?.length) lines.push(s.notes.map((n) => `- ${n}`).join('\n'));
    lines.push('');
  }
  return lines.join('\n').trim();
}

function sectionsToMarkdown(sections: ArticleGenerationDraftedSection[]): string {
  return sections
    .map((s) => `## ${s.section.h2}\n\n${s.prose}`)
    .join('\n\n')
    .trim();
}

/** Output artifact(s) a given step produces, if present in the run. */
function stepOutput(
  step: ArticleGenerationStep,
  run: ArticleGenerationRunDto,
): ThoughtArtifact[] {
  const a: ArticleGenerationArtifacts = run.artifacts;
  switch (step) {
    case 'infer_type':
      return [text('article-type', 'Article type', run.articleType)];
    case 'analyse_competition':
      return a.competitionAnalysis
        ? [
            json(
              'competition',
              'Competition analysis',
              a.competitionAnalysis,
              `${a.competitionAnalysis.scannedCount} page(s) profiled`,
            ),
          ]
        : [];
    case 'content_plan':
      return a.contentStrategy
        ? [
            json(
              'strategy',
              'Content strategy',
              a.contentStrategy,
              `${a.contentStrategy.articleIdeas.length} idea(s)`,
            ),
          ]
        : [];
    case 'research':
      return a.research
        ? [json('research', 'Research bundle', a.research, a.research.inferenceRationale)]
        : [];
    case 'build_brief':
    case 'compile_context':
      return a.brief
        ? [
            json(
              'brief',
              'SEO brief',
              a.brief,
              `${a.brief.primaryKeyword.phrase} · ${a.brief.targetWordCount} words`,
            ),
            ...(a.writingContext
              ? [json('writing-context', 'Writing context', a.writingContext)]
              : []),
          ]
        : [];
    case 'source_voice_research':
      return a.sourceVoiceResearch
        ? [
            json(
              'source-voice-research',
              'Source & voice research',
              a.sourceVoiceResearch,
              a.sourceVoiceResearch.summary ??
                `${a.sourceVoiceResearch.citableSources?.length ?? 0} sources`,
            ),
          ]
        : [];
    case 'cognitive_pass': {
      const outputs: ThoughtArtifact[] = [];
      if (a.cognitiveRun?.trains?.length) {
        for (const train of a.cognitiveRun.trains) {
          outputs.push(trainStepArtifact(train));
        }
      } else if (a.cognitiveRun) {
        outputs.push(
          json(
            'cognitive-run',
            'Cognitive pass',
            a.cognitiveRun,
            a.cognitiveRun.synthesis.thesis,
          ),
        );
      }
      if (a.brief && a.cognitiveRun) {
        outputs.push(
          json(
            'enriched-brief',
            'Enriched brief',
            a.brief,
            a.brief.recommendedAngle ?? a.brief.primaryKeyword.phrase,
          ),
        );
      }
      return outputs;
    }
    case 'outline':
      return a.outline
        ? [
            markdown(
              'outline',
              'Outline',
              outlineToMarkdown(a.outline),
              `${a.outline.sections.length} section(s)`,
            ),
            json('outline-raw', 'Outline (raw)', a.outline),
          ]
        : [];
    case 'draft':
      return a.sections?.length
        ? [
            markdown(
              'draft',
              'Draft',
              sectionsToMarkdown(a.sections),
              `${a.sections.reduce((n, s) => n + s.wordCount, 0)} words`,
            ),
          ]
        : [];
    case 'audience_review':
      return a.audienceReview
        ? [
            json(
              'audience-review',
              'Audience review',
              a.audienceReview,
              `Score ${formatReviewScore(a.audienceReview.overallScore)} · ${a.audienceReview.passesThreshold ? 'reads well' : 'needs work'}`,
            ),
          ]
        : [];
    case 'draft_faq':
      return a.faqItems?.length
        ? [
            json(
              'faq',
              'FAQ',
              a.faqItems,
              `${a.faqItems.length} question(s)`,
            ),
          ]
        : [];
    case 'review':
      if (!a.review) return [];
      const outputs = [
        json(
          'review',
          'Review',
          a.review,
          `Score ${formatReviewScore(a.review.overallScore)} · ${a.review.passesThreshold ? 'passes' : 'below threshold'}`,
        ),
      ];
      if (!a.review.passesThreshold) {
        outputs.push(
          markdown(
            'review-violations',
            'Violations',
            formatReviewViolations(a.review),
            `${a.review.violations.length + a.review.sectionViolations.length} issue(s)`,
          ),
        );
      }
      return outputs;
    case 'metadata':
      return a.metadata
        ? [json('metadata', 'Metadata', a.metadata, a.metadata.titleTag)]
        : [];
    case 'assemble':
      return a.template
        ? [json('template', 'Article template', a.template)]
        : [];
    case 'generate_images': {
      if (!a.imageGeneration) return [];
      const ig = a.imageGeneration;
      const generated = ig.generatedCount ?? 0;
      const failed = ig.failedCount ?? 0;
      const costLabel = formatThinkerCostUsd(ig.totalCostUsd);
      const slotSummary =
        ig.mode === 'live'
          ? generated > 0
            ? `Live — ${generated}/${ig.plannedCount} generated${failed ? `, ${failed} failed` : ''}`
            : ig.plannedCount === 0
              ? 'Live — no image slots'
              : `Live — 0/${ig.plannedCount} generated`
          : ig.plannedCount === 0
            ? 'Stub — no image slots'
            : `Stub — ${ig.plannedCount} slot(s) planned`;
      const summaryWithCost = costLabel
        ? `${slotSummary} · ${costLabel}${ig.costEstimated ? ' est.' : ''}`
        : slotSummary;
      const outputs: ThoughtArtifact[] = [
        json('image-generation', 'Image generation plan', ig, summaryWithCost),
        json(
          'image-style',
          'Shared style profile',
          ig.styleProfile,
          ig.styleProfile.label,
        ),
        json('image-config', 'Provider config', {
          falConfigured: ig.falConfigured,
          s3Configured: ig.s3Configured,
          model: ig.model,
          mode: ig.mode,
          generatedCount: ig.generatedCount,
          failedCount: ig.failedCount,
        }),
      ];
      for (const slot of ig.slots) {
        outputs.push(
          markdown(
            `image-prompt-${slot.id}`,
            `${slot.label} — prompt`,
            slot.builtPrompt,
            'Input sent to fal.ai',
          ),
        );
        if (slot.status === 'generated' && slot.publicUrl?.trim()) {
          outputs.push({
            id: `image-out-${slot.id}`,
            label: `${slot.label} — output`,
            kind: 'image',
            data: {
              url: slot.publicUrl,
              alt: slot.altSuggestion,
              prompt: slot.builtPrompt,
            },
            summary: slot.altSuggestion ?? slot.label,
          });
        } else if (slot.status === 'failed') {
          outputs.push(
            text(
              `image-error-${slot.id}`,
              `${slot.label} — error`,
              slot.error ?? 'Generation failed',
            ),
          );
        }
      }
      return outputs;
    }
    case 'voice_pass':
      return a.voicePass
        ? [
            json(
              'voice-pass',
              'Voice pass',
              a.voicePass,
              a.voicePass.summary ?? `${a.voicePass.hitCount ?? 0} hit(s)`,
            ),
          ]
        : [];
    default:
      return [];
  }
}

function trainStepArtifact(train: CognitiveTrainStep): ThoughtArtifact {
  const summary =
    train.status === 'failed'
      ? (train.error ?? 'Failed')
      : train.slug === 'synthesis'
        ? String((train.output as { thesis?: string }).thesis ?? train.label)
        : `${train.status}${train.durationMs != null ? ` · ${train.durationMs}ms` : ''}`;

  return json(`train-${train.slug}`, train.label, train.output, summary);
}

function mapTrainStatus(status: CognitiveTrainStep['status']): ThoughtStepStatus {
  switch (status) {
    case 'complete':
      return 'complete';
    case 'failed':
      return 'failed';
    case 'skipped':
      return 'skipped';
    default:
      return 'pending';
  }
}

function trainStepSummary(train: CognitiveTrainStep): string {
  if (train.status === 'failed') {
    return train.error ?? 'Failed';
  }
  if (train.slug === 'synthesis') {
    return String((train.output as { thesis?: string }).thesis ?? 'Master synthesis');
  }
  if (train.durationMs != null) {
    return `${train.durationMs}ms`;
  }
  return train.label;
}

/** Replace cognitive_pass with one ThoughtStep per train when cognitiveRun.trains exists. */
function expandCognitiveTrainSteps(
  run: ArticleGenerationRunDto,
  steps: ThoughtStep[],
  stepOrder: ArticleGenerationStep[],
): ThoughtStep[] {
  const cognitiveIdx = stepOrder.indexOf('cognitive_pass');
  if (cognitiveIdx < 0) return steps;

  const trains = run.artifacts.cognitiveRun?.trains;
  if (!trains?.length) return steps;

  const parent = steps[cognitiveIdx];
  const trainSteps: ThoughtStep[] = trains.map((train) => ({
    id: `train:${train.slug}`,
    label: train.label,
    description: trainStepDescription(train),
    summary: trainStepSummary(train),
    status: mapTrainStatus(train.status),
    costUsd: train.costUsd,
    startedAt: parent.startedAt,
    finishedAt:
      train.status === 'complete' || train.status === 'failed' || train.status === 'skipped'
        ? parent.finishedAt
        : undefined,
    durationMs: train.durationMs,
    attempt: 1,
    input: undefined,
    output:
      train.status === 'complete' || train.status === 'failed'
        ? [trainStepArtifact(train)]
        : train.status === 'skipped'
          ? [json(`train-${train.slug}`, train.label, train.output, 'Skipped (stub)')]
          : undefined,
    events: [],
    subSteps: buildTrainSubSteps(train),
    error:
      train.status === 'failed' && train.error ? { message: train.error } : undefined,
    promptVersion: train.promptVersion,
  }));

  const synthesisPending =
    parent.status === 'running' &&
    !String(run.artifacts.cognitiveRun?.synthesis?.thesis ?? '').trim();
  if (synthesisPending) {
    trainSteps.push({
      id: 'train:__in_progress__',
      label: 'Next phase…',
      description: 'Waiting for the next thought-pack phase to finish.',
      summary: 'Running…',
      status: 'running',
      startedAt: parent.startedAt,
      attempt: 1,
      events: [],
      subSteps: [
        {
          id: 'train:pending',
          label: 'Next train phase',
          detail: 'Master synthesis or remaining lens',
          status: 'running',
          isLlm: true,
        },
      ],
    });
  }

  const articlePackage = run.artifacts.cognitiveRun?.synthesis?.articlePackage;
  if (articlePackage?.outline?.length) {
    const synthesisStep = trainSteps.find((s) => s.id === 'train:synthesis');
    if (synthesisStep) {
      synthesisStep.output = [
        ...(synthesisStep.output ?? []),
        json(
          'article-package-outline',
          'Article outline',
          articlePackage.outline,
          `${articlePackage.outline.length} sections`,
        ),
      ];
    }
  }

  const brief = run.artifacts.brief;
  if (brief && run.artifacts.cognitiveRun && trainSteps.length > 0) {
    const last = trainSteps[trainSteps.length - 1];
    last.output = [
      ...(last.output ?? []),
      json(
        'enriched-brief',
        'Enriched brief',
        brief,
        brief.recommendedAngle ?? brief.primaryKeyword.phrase,
      ),
    ];
  }

  return [...steps.slice(0, cognitiveIdx), ...trainSteps, ...steps.slice(cognitiveIdx + 1)];
}

function resolveCurrentStepId(
  run: ArticleGenerationRunDto,
  steps: ThoughtStep[],
  stepOrder: ArticleGenerationStep[],
  currentIdx: number,
): string | undefined {
  if (run.currentStep === 'done') {
    return steps[steps.length - 1]?.id;
  }

  const pipelineStep = run.currentStep as ArticleGenerationStep;
  if (pipelineStep !== 'cognitive_pass') {
    return pipelineStep;
  }

  const cognitiveIdx = stepOrder.indexOf('cognitive_pass');
  if (cognitiveIdx < 0 || currentIdx !== cognitiveIdx) {
    return pipelineStep;
  }

  const trains = run.artifacts.cognitiveRun?.trains;
  if (!trains?.length) {
    return 'cognitive_pass';
  }

  const synthesisPending = !String(run.artifacts.cognitiveRun?.synthesis?.thesis ?? '').trim();
  if (synthesisPending && run.status === 'running') {
    return 'train:__in_progress__';
  }

  const runningTrain = trains.find((t) => t.status !== 'complete' && t.status !== 'skipped');
  if (runningTrain) {
    return `train:${runningTrain.slug}`;
  }

  const lastTrain = trains[trains.length - 1];
  return lastTrain ? `train:${lastTrain.slug}` : 'cognitive_pass';
}

function healAgeMs(updatedAt?: string): number {
  if (!updatedAt) return Number.POSITIVE_INFINITY;
  const ms = new Date(updatedAt).getTime();
  return Number.isFinite(ms) ? Date.now() - ms : Number.POSITIVE_INFINITY;
}

/** Review can finish in artifacts while the run is still marked running (orphaned worker). */
function inferReviewStepStatus(
  run: ArticleGenerationRunDto,
  evs: ArticleGenerationEvent[],
  baseStatus: ThoughtStepStatus,
): ThoughtStepStatus {
  if (baseStatus !== 'running') return baseStatus;
  if (run.currentStep !== 'review' || run.status !== 'running') return baseStatus;

  const review = run.artifacts?.review;
  if (!review) return baseStatus;
  if (evs.some((e) => e.status === 'completed')) return baseStatus;

  const heal = run.artifacts.selfHealProgress;
  const terminalFailed = (): ThoughtStepStatus =>
    review.passesThreshold ? 'complete' : 'failed';

  if (heal?.phase === 'done' || heal?.phase === 'skipped') {
    return terminalFailed();
  }

  if (!run.artifacts.selfHealAttempted && review.failingSections.length === 0) {
    return terminalFailed();
  }

  if (
    heal?.phase === 'redraft' &&
    heal.totalToRedraft > 0 &&
    heal.redraftedCount >= heal.totalToRedraft
  ) {
    return terminalFailed();
  }

  if (heal?.phase === 're-assemble' && healAgeMs(heal.updatedAt) > 30_000) {
    return terminalFailed();
  }

  if (heal?.phase === 're-review' && healAgeMs(heal.updatedAt) > 90_000) {
    return terminalFailed();
  }

  return baseStatus;
}

function mapEvents(events: ArticleGenerationEvent[]): ThoughtEvent[] {
  return events.map((e) => {
    const parts: string[] = [e.status];
    if (e.note) parts.push(e.note);
    if (e.error) parts.push(e.error);
    if (e.cost != null && e.cost > 0) parts.push(`$${e.cost.toFixed(4)}`);
    return {
      at: e.finishedAt ?? e.startedAt,
      level: e.status === 'failed' ? 'error' : e.status === 'retried' ? 'warn' : 'info',
      message: parts.join(' — '),
      data:
        e.tokens || e.cost != null
          ? { tokens: e.tokens, cost: e.cost, promptVersion: e.promptVersion }
          : undefined,
    } satisfies ThoughtEvent;
  });
}

export function articleRunToThought(run: ArticleGenerationRunDto): Thought {
  const eventsByStep = new Map<ArticleGenerationStep, ArticleGenerationEvent[]>();
  for (const e of run.events) {
    const list = eventsByStep.get(e.step) ?? [];
    list.push(e);
    eventsByStep.set(e.step, list);
  }

  const stepOrder = generationStepsForRun(run);
  const currentIdx = stepOrder.indexOf(run.currentStep as ArticleGenerationStep);
  const allDone = run.status === 'complete' || run.currentStep === 'done';

  const steps: ThoughtStep[] = stepOrder.map((step, idx) => {
    const evs = eventsByStep.get(step) ?? [];
    const started = evs.find((e) => e.status === 'started');
    const finished = [...evs].reverse().find(
      (e) => e.status === 'completed' || e.status === 'failed',
    );

    let status: ThoughtStepStatus;
    if (run.error?.step === step) {
      status = 'failed';
    } else if (evs.some((e) => e.status === 'completed')) {
      status = 'complete';
    } else if (evs.some((e) => e.status === 'failed')) {
      status = 'failed';
    } else if (allDone) {
      status = 'complete';
    } else if (currentIdx < 0) {
      status = 'pending';
    } else if (idx < currentIdx) {
      status = 'complete';
    } else if (idx === currentIdx) {
      status = run.status === 'running' ? 'running' : 'pending';
    } else {
      status = 'pending';
    }

    const meta = STEP_META[step] ?? {
      label: STEP_SHORT_LABELS[step],
      summary: STEP_SHORT_LABELS[step],
      description: STEP_SHORT_LABELS[step],
    };
    const reviewArtifact = step === 'review' ? run.artifacts?.review : undefined;
    const reviewFailed = reviewArtifact && !reviewArtifact.passesThreshold;

    let stepStatus =
      step === 'review' ? inferReviewStepStatus(run, evs, status) : status;
    if (reviewFailed && stepStatus === 'complete') {
      stepStatus = 'failed';
    }

    const error =
      run.error?.step === step
        ? { message: run.error.message, stack: run.error.stack }
        : reviewFailed
          ? { message: formatReviewViolations(reviewArtifact) }
          : undefined;

    const finishedNote = finished?.note;
    const runningSummary = articleStepRunningSummary(step, run);
    let summary = reviewFailed
      ? `Below threshold (score ${formatReviewScore(reviewArtifact.overallScore)})`
      : reviewArtifact?.passesThreshold
        ? `Passed (score ${formatReviewScore(reviewArtifact.overallScore)})`
        : stepStatus === 'running' && runningSummary
          ? runningSummary
          : finishedNote ?? meta.summary;

    if (step === 'generate_images' && stepStatus !== 'pending') {
      const imageCost = resolveImageGenerationCostUsd(run.artifacts.imageGeneration);
      const imageCostLabel = formatThinkerCostUsd(imageCost);
      if (imageCostLabel) {
        summary = summary?.includes(imageCostLabel)
          ? summary
          : `${summary ?? meta.summary} · ${imageCostLabel}${run.artifacts.imageGeneration?.costEstimated ? ' est.' : ''}`;
      }
    }

    return {
      id: step,
      label: meta.label,
      description: meta.description,
      summary,
      status: stepStatus,
      costUsd:
        sumCosts(evs.map((e) => e.cost)) ??
        (step === 'generate_images'
          ? resolveImageGenerationCostUsd(run.artifacts.imageGeneration)
          : undefined),
      startedAt: started?.startedAt,
      finishedAt: finished?.finishedAt,
      durationMs: finished?.durationMs,
      attempt: Math.max(1, evs.filter((e) => e.status === 'started').length),
      output:
        stepStatus === 'complete' || stepStatus === 'failed'
          ? stepOutput(step, run)
          : undefined,
      events: mapEvents(evs),
      subSteps: buildArticleSubSteps(step, run, evs, stepStatus),
      error,
      promptVersion: finished?.promptVersion ?? started?.promptVersion,
    } satisfies ThoughtStep;
  });

  let expandedSteps = expandCognitiveTrainSteps(run, steps, stepOrder);
  attachArticleLlmCalls(expandedSteps, run);

  // Chain inputs: each step takes the prior step's output as its input view.
  for (let i = 1; i < expandedSteps.length; i++) {
    expandedSteps[i].input = expandedSteps[i - 1].output;
  }

  const currentStepId = resolveCurrentStepId(run, expandedSteps, stepOrder, currentIdx);

  const keyword = run.artifacts.brief?.primaryKeyword.phrase;
  const startedAt = run.events[0]?.startedAt ?? run.createdAt;
  const finishedAt = allDone || run.status === 'failed' ? run.updatedAt : undefined;

  const outputArtifact = run.artifacts.template
    ? json('template', 'Article template', run.artifacts.template)
    : run.artifacts.metadata
      ? json('metadata', 'Metadata', run.artifacts.metadata)
      : undefined;

  return {
    id: run.id,
    thinkerKind: 'writer',
    title: keyword ? `Article · ${keyword}` : 'Article run',
    summary: `Writer pipeline · ${run.articleType.replace(/_/g, ' ')}`,
    totalCostUsd: sumCosts(expandedSteps.map((s) => s.costUsd)),
    status: runStatus(run),
    currentStepId,
    steps: expandedSteps,
    inputs: [
      {
        portId: 'keyword',
        label: 'Keyword',
        artifact: keyword ? text('keyword', 'Keyword', keyword) : undefined,
      },
    ],
    outputs: [
      {
        portId: 'article',
        label: 'Article',
        artifact: outputArtifact,
      },
    ],
    startedAt,
    finishedAt,
  } satisfies Thought;
}

function formatReviewScore(score: number): string {
  return Number.isFinite(score) ? score.toFixed(2) : '—';
}

function formatSelfHealDetail(
  heal: ArticleGenerationRunDto['artifacts']['selfHealProgress'],
  review?: ArticleGenerationReview,
): string {
  if (!heal) {
    const n = review?.failingSections.length ?? 0;
    return n > 0 ? `${n} section(s) flagged` : 'Only when review fails threshold';
  }
  if (heal.skippedSectionIndices?.length) {
    return `Redrafting ${heal.redraftSectionIndices.length}/${heal.failingSectionIndices.length} failing section(s)`;
  }
  switch (heal.phase) {
    case 'redraft':
      return heal.totalToRedraft > 0
        ? `Redrafting ${heal.redraftedCount}/${heal.totalToRedraft}`
        : 'Preparing redraft…';
    case 're-assemble':
      return 'Merging healed sections into article';
    case 're-review':
      return 'Re-running quality review';
    case 'done':
      return 'Self-heal complete';
    default:
      return 'Self-heal';
  }
}

function selfHealPhaseStatus(
  heal: ArticleGenerationRunDto['artifacts']['selfHealProgress'],
  stepStatus: ThoughtStepStatus,
  phaseIndex: number,
  isReScore = false,
): ThoughtStepStatus {
  if (stepStatus === 'pending') return 'pending';
  if (!heal) return phaseStatus(phaseIndex, 3, stepStatus);
  if (stepStatus === 'failed') return 'failed';

  const order: Array<ArticleGenerationSelfHealProgress['phase']> = [
    'redraft',
    're-assemble',
    're-review',
    'done',
  ];
  const current = order.indexOf(heal.phase);
  const target = isReScore ? order.indexOf('re-review') : order.indexOf('redraft');

  if (stepStatus === 'running') {
    if (current < target) return 'complete';
    if (current === target || (isReScore && heal.phase === 're-review')) return 'running';
    if (isReScore && heal.phase === 'done') return 'complete';
    if (!isReScore && current > target) return 'complete';
    return 'pending';
  }

  return heal.phase === 'skipped' ? 'skipped' : 'complete';
}

function selfHealSectionStatus(
  heal: ArticleGenerationRunDto['artifacts']['selfHealProgress'],
  sectionIndex: number,
  stepStatus: ThoughtStepStatus,
): ThoughtStepStatus {
  if (stepStatus === 'pending') return 'pending';
  if (!heal?.redraftSectionIndices.includes(sectionIndex)) return 'skipped';
  if (stepStatus === 'failed') return 'failed';
  if (stepStatus !== 'running') return 'complete';

  const pos = heal.redraftSectionIndices.indexOf(sectionIndex);
  if (heal.phase !== 'redraft') return 'complete';
  if (pos < heal.redraftedCount) return 'complete';
  if (pos === heal.redraftedCount) return 'running';
  return 'pending';
}

function formatReviewViolations(review: ArticleGenerationReview): string {
  const lines: string[] = [];
  for (const v of review.violations) {
    lines.push(`- ${v}`);
  }
  for (const v of review.sectionViolations) {
    lines.push(`- [${v.sectionIndex}] ${v.h2}: ${v.message}`);
  }
  return lines.length ? lines.join('\n') : 'Review did not pass threshold.';
}
