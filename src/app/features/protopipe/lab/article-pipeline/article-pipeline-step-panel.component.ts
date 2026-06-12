import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type {
  ArticleGenerationBrief,
  ArticleGenerationClusterContext,
  ArticleGenerationCompetitionAnalysis,
  ArticleGenerationContentStrategy,
  ArticleGenerationPageProfile,
  ArticleGenerationDraftedSection,
  ArticleGenerationInformationGain,
  ArticleGenerationMetadata,
  ArticleGenerationOutline,
  ArticleGenerationProfileSnapshot,
  ArticleGenerationResearch,
  ArticleGenerationResearchLensMeta,
  ArticleGenerationReview,
  ArticleGenerationRunDto,
  ArticleGenerationStep,
  ArticleGenerationTopicalAuthority,
  ArticleGenerationType,
  ProtopipeContentTemplate,
} from '@hive/contracts';
import { STEP_LABELS } from '../../article-pipeline-steps';

interface KeywordFact {
  label: string;
  value: string;
  hint?: string;
}

interface LensRow {
  label: string;
  state: string;
  tier: string;
  detail?: string;
}

const ARTICLE_TYPE_LABEL: Record<ArticleGenerationType, string> = {
  local_service: 'Local service page',
  faq: 'FAQ',
  pillar: 'Pillar guide',
  comparison: 'Comparison',
  howto: 'How-to',
  project_case_study: 'Project case study',
};

const ARTICLE_TYPE_DESCRIPTION: Record<ArticleGenerationType, string> = {
  local_service:
    'Optimized to rank for "[service] in [city]"-style queries with strong service and proof sections.',
  faq:
    'Direct-answer focused with concise Q/A blocks and FAQ schema for People-Also-Ask coverage.',
  pillar:
    'Wide, evergreen guide that covers a topic end-to-end and links out to supporting articles.',
  comparison:
    'Side-by-side comparison with a verdict-up-front pattern and structured pros/cons.',
  howto:
    'Step-by-step instructions with HowTo schema, designed to satisfy procedural intent.',
  project_case_study:
    'Narrative-driven case study highlighting outcomes, with proof points and visuals.',
};

const STEP_TITLES: Record<ArticleGenerationStep, string> = {
  infer_type: 'Inferred article type',
  analyse_competition: 'Competitor X-ray',
  content_plan: 'Content plan',
  research: 'Research bundle',
  build_brief: 'SEO brief',
  compile_context: 'Writing context',
  outline: 'Outline',
  draft: 'Drafts',
  review: 'Review',
  metadata: 'Metadata',
  assemble: 'Assembled post preview',
  generate_images: 'Generated images',
};

interface ScoreRow {
  key: string;
  label: string;
  value: number;
}

@Component({
  selector: 'app-article-pipeline-step-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './article-pipeline-step-panel.component.html',
  styleUrl: './article-pipeline-step-panel.component.scss',
})
export class ArticlePipelineStepPanelComponent {
  readonly run = input<ArticleGenerationRunDto | null>(null);
  readonly activeStep = input<ArticleGenerationStep>('infer_type');

  readonly stepLabel = computed(() => STEP_LABELS[this.activeStep()]);
  readonly stepTitle = computed(() => STEP_TITLES[this.activeStep()]);

  readonly articleType = computed<ArticleGenerationType | null>(
    () => this.run()?.articleType ?? null,
  );

  readonly articleTypeLabel = computed(() => {
    const t = this.articleType();
    return t ? ARTICLE_TYPE_LABEL[t] : null;
  });

  readonly articleTypeDescription = computed(() => {
    const t = this.articleType();
    return t ? ARTICLE_TYPE_DESCRIPTION[t] : null;
  });

  readonly competitionAnalysis = computed<ArticleGenerationCompetitionAnalysis | null>(
    () => this.run()?.artifacts?.competitionAnalysis ?? null,
  );

  /** The profiled pages (top-10 organic results). */
  readonly competitorPages = computed<ArticleGenerationPageProfile[]>(
    () => this.competitionAnalysis()?.pages ?? [],
  );

  /** The #1 anchor page — the only one carrying the rich LLM interpretation. */
  readonly anchorPage = computed<ArticleGenerationPageProfile | null>(
    () => this.competitorPages()[0] ?? null,
  );

  readonly contentStrategy = computed<ArticleGenerationContentStrategy | null>(
    () => this.run()?.artifacts?.contentStrategy ?? null,
  );

  readonly research = computed<ArticleGenerationResearch | null>(
    () => this.run()?.artifacts?.research ?? null,
  );

  readonly researchSignalChips = computed<string[]>(() => {
    const r = this.research();
    if (!r) return [];
    const chips: string[] = [r.signals.intent, r.signals.priority];
    if (r.signals.hasGeoModifier) chips.push('geo modifier');
    if (r.signals.questionWord) chips.push(`question: ${r.signals.questionWord}`);
    if (r.signals.hasComparison) chips.push('comparison');
    if (r.signals.hasHowto) chips.push('how-to');
    if (r.signals.monthlySearchVolume != null) {
      chips.push(`${r.signals.monthlySearchVolume.toLocaleString()} MSV`);
    }
    return chips;
  });

  readonly researchSources = computed<{ label: string; value: string }[]>(() => {
    const r = this.research();
    if (!r) return [];
    const entries: { label: string; value: string }[] = [];
    if (r.sources.serp) entries.push({ label: 'SERP', value: r.sources.serp });
    if (r.sources.paa) entries.push({ label: 'PAA', value: r.sources.paa });
    if (r.sources.related) entries.push({ label: 'Related', value: r.sources.related });
    if (r.sources.competitorOutlines)
      entries.push({ label: 'Competitor outlines', value: r.sources.competitorOutlines });
    if (r.sources.gsc) entries.push({ label: 'GSC', value: r.sources.gsc });
    if (r.sources.siteKnowledge)
      entries.push({ label: 'Site knowledge', value: r.sources.siteKnowledge });
    return entries;
  });

  readonly profile = computed<ArticleGenerationProfileSnapshot | null>(
    () => this.research()?.profile ?? null,
  );

  readonly topicalAuthority = computed<ArticleGenerationTopicalAuthority | null>(
    () => this.profile()?.topicalAuthority ?? null,
  );

  readonly clusterContext = computed<ArticleGenerationClusterContext | null>(
    () => this.research()?.clusterContext ?? null,
  );

  readonly informationGain = computed<ArticleGenerationInformationGain | null>(
    () => this.research()?.informationGain ?? null,
  );

  /** Headline facts driving the decision to write this article. */
  readonly keywordFacts = computed<KeywordFact[]>(() => {
    const r = this.research();
    if (!r) return [];
    const facts: KeywordFact[] = [];
    const k = r.keyword;
    facts.push({ label: 'Search intent', value: k.intent });
    facts.push({ label: 'Priority', value: k.priority });
    if (k.monthlySearchVolume != null) {
      facts.push({
        label: 'Monthly volume',
        value: k.monthlySearchVolume.toLocaleString(),
        hint: 'searches / mo',
      });
    }
    if (k.difficulty != null) {
      facts.push({ label: 'Difficulty', value: String(k.difficulty), hint: '/ 100' });
    }
    if (k.cpc != null) {
      facts.push({ label: 'CPC', value: `$${k.cpc.toFixed(2)}` });
    }
    facts.push({ label: 'SERP geo', value: r.serpGeo.locationName });
    return facts;
  });

  /** Provenance rows: every data lens this report drew on, with its status. */
  readonly lensRows = computed<LensRow[]>(() => {
    const r = this.research();
    if (!r) return [];
    const rows: LensRow[] = [];
    const push = (
      label: string,
      meta: ArticleGenerationResearchLensMeta | undefined,
      detail?: string,
    ) => {
      if (meta) rows.push({ label, state: meta.state, tier: meta.tier, detail });
    };
    const lm = r.lensMeta;
    if (lm) {
      push('SERP', lm.serp);
      push('Questions (PAA)', lm.questions);
      push('Demand', lm.demand);
      push('Own performance', lm.queryPerformance);
      push('Competitor gap', lm.queryGap);
      push('Information gain', lm.informationGain);
      push('Site knowledge', lm.siteKnowledge);
    }
    const pm = r.profile?.lensMeta;
    if (pm) {
      push('Topical authority', pm.topicalAuthority);
      push('Positioning', pm.positioning);
      push('Competitive landscape', pm.competitiveLandscape);
      push('Strategic plan', pm.strategicPlan);
    }
    return rows;
  });

  readonly brief = computed<ArticleGenerationBrief | null>(
    () => this.run()?.artifacts?.brief ?? null,
  );

  readonly outline = computed<ArticleGenerationOutline | null>(
    () => this.run()?.artifacts?.outline ?? null,
  );

  readonly draftedSections = computed<ArticleGenerationDraftedSection[]>(
    () => this.run()?.artifacts?.sections ?? [],
  );

  readonly review = computed<ArticleGenerationReview | null>(
    () => this.run()?.artifacts?.review ?? null,
  );

  readonly metadata = computed<ArticleGenerationMetadata | null>(
    () => this.run()?.artifacts?.metadata ?? null,
  );

  readonly template = computed<ProtopipeContentTemplate | null>(
    () => this.run()?.artifacts?.template ?? null,
  );

  readonly reviewScoreRows = computed<ScoreRow[]>(() => {
    const r = this.review();
    if (!r) return [];
    return [
      { key: 'keywordIntegration', label: 'Keyword integration', value: r.scores.keywordIntegration },
      { key: 'voiceMatch', label: 'Voice match', value: r.scores.voiceMatch },
      { key: 'structuralAdherence', label: 'Structural adherence', value: r.scores.structuralAdherence },
      { key: 'specificity', label: 'Specificity', value: r.scores.specificity },
      { key: 'readability', label: 'Readability', value: r.scores.readability },
      { key: 'eeatSignal', label: 'E-E-A-T signal', value: r.scores.eeatSignal },
    ];
  });

  readonly schemaPretty = computed<string>(() => {
    const m = this.metadata();
    if (!m) return '';
    try {
      return JSON.stringify(m.schema, null, 2);
    } catch {
      return '';
    }
  });

  readonly hasRun = computed(() => !!this.run());

  readonly hasArtifactForStep = computed(() => {
    const step = this.activeStep();
    const run = this.run();
    if (!run) return false;
    switch (step) {
      case 'infer_type':
        return !!run.articleType;
      case 'analyse_competition':
        return !!run.artifacts?.competitionAnalysis;
      case 'content_plan':
        return !!run.artifacts?.contentStrategy;
      case 'research':
        return !!run.artifacts?.research;
      case 'build_brief':
      case 'compile_context':
        return !!run.artifacts?.brief;
      case 'outline':
        return !!run.artifacts?.outline;
      case 'draft':
        return (run.artifacts?.sections?.length ?? 0) > 0;
      case 'review':
        return !!run.artifacts?.review;
      case 'metadata':
        return !!run.artifacts?.metadata;
      case 'assemble':
        return !!run.artifacts?.template;
      case 'generate_images':
        return !!run.artifacts?.imageGeneration;
      default:
        return false;
    }
  });

  formatCollectedAt(iso: string): string {
    try {
      return new Date(iso).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  sourceClass(value: string): string {
    if (value === 'live') return 'is-live';
    if (value === 'cache') return 'is-cache';
    if (value === 'admin') return 'is-admin';
    return 'is-stub';
  }

  lensStateClass(state: string): string {
    switch (state) {
      case 'loaded_live':
        return 'is-live';
      case 'loaded_cache':
        return 'is-cache';
      case 'admin':
        return 'is-admin';
      case 'error':
        return 'is-error';
      case 'not_loaded':
        return 'is-pending';
      default:
        return 'is-stub';
    }
  }

  lensStateLabel(state: string): string {
    switch (state) {
      case 'loaded_live':
        return 'live';
      case 'loaded_cache':
        return 'cached';
      case 'admin':
        return 'admin';
      case 'not_loaded':
        return 'enrich to load';
      case 'error':
        return 'error';
      default:
        return 'stub';
    }
  }

  coverageColor(value: number): string {
    if (value >= 70) return '#8be7b5';
    if (value >= 35) return '#f3d28a';
    return '#fca5a5';
  }

  missionStatusLabel(status: string): string {
    if (status === 'established') return 'Established';
    if (status === 'building') return 'Building';
    return 'Planned';
  }

  scoreWidth(value: number): string {
    const clamped = Math.max(0, Math.min(100, value));
    return `${clamped}%`;
  }

  scoreColor(value: number): string {
    if (value >= 80) return '#8be7b5';
    if (value >= 60) return '#f3d28a';
    return '#fca5a5';
  }

  formatDay(iso?: string): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  fetchStatusLabel(status: string): string {
    if (status === 'ok') return 'fetched';
    if (status === 'blocked') return 'blocked';
    return 'error';
  }

  fetchStatusClass(status: string): string {
    if (status === 'ok') return 'is-live';
    if (status === 'blocked') return 'is-admin';
    return 'is-error';
  }

  headingIndent(level: number): string {
    return `${(level - 1) * 14}px`;
  }

  coveredCount(page: ArticleGenerationPageProfile): number {
    return page.entityCoverage.filter((e) => e.present).length;
  }
}
