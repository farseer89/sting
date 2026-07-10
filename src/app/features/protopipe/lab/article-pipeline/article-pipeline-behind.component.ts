import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import type {
  ArticleGenerationRunDto,
  ArticleGenerationStep,
} from '@hive/contracts';
import { STEP_LABELS } from '../../article-pipeline-steps';

interface StepEventRow {
  status: string;
  startedAt: string;
  durationMs?: number;
  promptVersion?: string;
  error?: string;
}

interface ModelField {
  label: string;
  origin: 'deterministic' | 'llm' | 'lens';
  description: string;
}

interface ModelGroup {
  group: string;
  fields: ModelField[];
}

/**
 * The canonical PageProfile measurement model. This is the unified feature set
 * recorded for every page we scan — competitors now, our own articles later —
 * so the corpus is ML-ready. `deterministic` = parsed from HTML, `llm` =
 * interpreted by the model, `lens` = loaded by a separate (deferred) data lens.
 */
const PAGE_PROFILE_MODEL: ModelGroup[] = [
  {
    group: 'Targeting',
    fields: [
      { label: 'titleTag / titleLength', origin: 'deterministic', description: 'Title tag text and length.' },
      { label: 'metaDescription', origin: 'deterministic', description: 'Meta description text and length.' },
      { label: 'h1 / slug', origin: 'deterministic', description: 'Primary H1 and URL slug.' },
      { label: 'keywordIn{Title,H1,First100,Slug}', origin: 'deterministic', description: 'Where the target keyword appears.' },
    ],
  },
  {
    group: 'Depth & structure',
    fields: [
      { label: 'wordCount', origin: 'deterministic', description: 'Words in the main content area.' },
      { label: 'headingOutline / h2Count / h3Count', origin: 'deterministic', description: 'Full heading tree and counts.' },
      { label: 'listCount / tableCount', origin: 'deterministic', description: 'Lists and tables in content.' },
      { label: 'hasFaqSection / TOC / keyTakeaways', origin: 'deterministic', description: 'Structural feature flags.' },
    ],
  },
  {
    group: 'On-page keywords & entities',
    fields: [
      { label: 'keywordCount / keywordDensity', origin: 'deterministic', description: 'Target-phrase occurrences and % of total words.' },
      { label: 'keywordInHeadingsCount', origin: 'deterministic', description: 'Headings containing the target keyword.' },
      { label: 'entityCoverage[]', origin: 'deterministic', description: 'PAA/related/gap demand terms and whether the page covers each.' },
    ],
  },
  {
    group: 'E-E-A-T & freshness',
    fields: [
      { label: 'authorName / hasAuthorBio', origin: 'deterministic', description: 'Authorship signals.' },
      { label: 'publishedDate / modifiedDate', origin: 'deterministic', description: 'Freshness signals.' },
      { label: 'externalCitationCount / notableCitationDomains', origin: 'deterministic', description: 'Outbound citations and authority domains.' },
      { label: 'schemaTypes', origin: 'deterministic', description: 'JSON-LD @type values present.' },
    ],
  },
  {
    group: 'Media & linking',
    fields: [
      { label: 'imageCount / imagesWithAltCount', origin: 'deterministic', description: 'Images and alt coverage.' },
      { label: 'videoCount', origin: 'deterministic', description: 'Embedded video/iframe count.' },
      { label: 'internalLinkCount / externalLinkCount', origin: 'deterministic', description: 'Link profile.' },
    ],
  },
  {
    group: 'Interpretation (LLM)',
    fields: [
      { label: 'detectedFormat / featuredSnippetReadiness', origin: 'llm', description: 'Page archetype and snippet fit.' },
      { label: 'rankingRationale / recommendedAngle', origin: 'llm', description: 'Why it ranks + the wedge to beat it.' },
      { label: 'dominantIntent / intentGaps', origin: 'llm', description: 'Intent served and unmet sub-intents.' },
      { label: 'contentAngles / uniqueCoverage', origin: 'llm', description: 'Angles and differentiated coverage.' },
      { label: 'eeatSignals / weaknesses', origin: 'llm', description: 'Trust signals and beatable gaps.' },
      { label: 'topicsCovered / topicGaps', origin: 'llm', description: 'Structured inventory of topics addressed vs. missed.' },
      { label: 'articleIdeas[]', origin: 'llm', description: 'Spin-off article ideas (title, keyword, type, intent) for the content plan.' },
      { label: 'openObservations / surprises', origin: 'llm', description: 'Free-text insights + hypothesis seeds.' },
    ],
  },
  {
    group: 'Off-page authority',
    fields: [
      { label: 'authority {domainRating, referringDomains, traffic}', origin: 'lens', description: 'Loaded by a later off-page lens; not_loaded for now.' },
    ],
  },
  {
    group: 'Provenance',
    fields: [
      { label: 'source / featureSchemaVersion', origin: 'deterministic', description: 'competitor|self + schema version, for ML labelling.' },
      { label: 'serpPosition', origin: 'deterministic', description: 'Rank — the training label we learn against.' },
      { label: 'fetchStatus / httpStatus / fetchedAt', origin: 'deterministic', description: 'Fetch outcome and timestamp.' },
    ],
  },
];

/**
 * The ContentStrategy measurement model (content_plan step). Consensus is
 * computed deterministically across the scanned set; the ideas + angle come
 * from a single LLM consolidation pass.
 */
const CONTENT_STRATEGY_MODEL: ModelGroup[] = [
  {
    group: 'Consensus (deterministic)',
    fields: [
      { label: 'consensus.medianWordCount', origin: 'deterministic', description: 'Median body depth across the scanned competitors.' },
      { label: 'consensus.commonHeadings', origin: 'deterministic', description: 'Sections most competitors share (table-stakes structure).' },
      { label: 'consensus.commonSchemaTypes', origin: 'deterministic', description: 'Schema.org types common across the set.' },
      { label: 'demandConsensus[]', origin: 'deterministic', description: 'Each demand term + how many competitors cover it; majority => table-stakes.' },
    ],
  },
  {
    group: 'Strategy (LLM)',
    fields: [
      { label: 'recommendedPillarAngle', origin: 'llm', description: 'One-line angle for the pillar that wins this cluster.' },
      { label: 'positioningSummary', origin: 'llm', description: 'How to position the cluster vs the SERP.' },
      { label: 'topicGaps[]', origin: 'llm', description: 'Topics nobody covers well — our wedge.' },
    ],
  },
  {
    group: 'Article ideas (LLM)',
    fields: [
      { label: 'articleIdeas[].workingTitle / suggestedKeyword', origin: 'llm', description: 'The idea and the keyword it targets.' },
      { label: 'articleIdeas[].clusterRole / relationToSeed', origin: 'llm', description: 'Placement: pillar vs supporting, and relation to the seed.' },
      { label: 'articleIdeas[].intent / articleType / priority', origin: 'llm', description: 'Idea classification + ranking.' },
      { label: 'articleIdeas[].targetWordCount / mandatorySections', origin: 'llm', description: 'Brief-lite specs for the article.' },
      { label: 'articleIdeas[].rationale', origin: 'llm', description: 'Why it strengthens topical authority.' },
    ],
  },
];

const STEP_TO_ARTIFACT_KEY: Record<ArticleGenerationStep, keyof ArticleGenerationRunDto['artifacts'] | null> = {
  infer_type: null,
  analyse_competition: 'competitionAnalysis',
  content_plan: 'contentStrategy',
  research: 'research',
  build_brief: 'brief',
  compile_context: 'writingContext',
  source_voice_research: 'sourceVoiceResearch',
  cognitive_pass: 'cognitiveRun',
  outline: 'outline',
  draft: 'sections',
  audience_review: 'audienceReview',
  draft_faq: 'faqItems',
  layout_plan: 'layoutPlan',
  review: 'review',
  metadata: 'metadata',
  assemble: 'template',
  generate_images: 'imageGeneration',
  voice_pass: 'voicePass',
};

@Component({
  selector: 'app-article-pipeline-behind',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './article-pipeline-behind.component.html',
  styleUrl: './article-pipeline-behind.component.scss',
})
export class ArticlePipelineBehindComponent {
  readonly run = input<ArticleGenerationRunDto | null>(null);
  readonly activeStep = input<ArticleGenerationStep>('infer_type');
  readonly rerun = output<ArticleGenerationStep>();

  readonly activeStepLabel = computed(() => STEP_LABELS[this.activeStep()]);

  readonly showMeasurementModel = computed(
    () =>
      this.activeStep() === 'analyse_competition' ||
      this.activeStep() === 'content_plan',
  );

  readonly measurementModel = computed<ModelGroup[]>(() =>
    this.activeStep() === 'content_plan'
      ? CONTENT_STRATEGY_MODEL
      : PAGE_PROFILE_MODEL,
  );

  readonly artifactJson = computed<string | null>(() => {
    const run = this.run();
    if (!run) return null;

    const step = this.activeStep();
    if (step === 'infer_type') {
      return JSON.stringify(
        {
          articleType: run.articleType,
          note: 'Inferred at create time from keyword signals. Rationale persistence lands with the real panel.',
        },
        null,
        2,
      );
    }

    const key = STEP_TO_ARTIFACT_KEY[step];
    if (!key) return null;
    const artifact = run.artifacts?.[key];
    if (artifact === undefined || artifact === null) return null;
    return JSON.stringify(artifact, null, 2);
  });

  readonly stepEvents = computed<StepEventRow[]>(() => {
    const run = this.run();
    if (!run) return [];
    return run.events
      .filter((e) => e.step === this.activeStep())
      .map((e) => ({
        status: e.status,
        startedAt: e.startedAt,
        durationMs: e.durationMs,
        promptVersion: e.promptVersion,
        error: e.error,
      }));
  });

  readonly hasArtifact = computed(() => this.artifactJson() !== null);
  readonly canRerun = computed(() => {
    const run = this.run();
    return !!run && run.status !== 'running';
  });

  triggerRerun(): void {
    this.rerun.emit(this.activeStep());
  }

  formatStarted(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour12: false });
    } catch {
      return iso;
    }
  }
}
