import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type {
  ArticleGenerationBrief,
  ArticleGenerationDraftedSection,
  ArticleGenerationMetadata,
  ArticleGenerationOutline,
  ArticleGenerationResearch,
  ArticleGenerationReview,
  ArticleGenerationRunDto,
  ArticleGenerationStep,
  ArticleGenerationType,
  ProtopipeContentTemplate,
} from '@hive/contracts';

const STEP_LABELS: Record<ArticleGenerationStep, string> = {
  infer_type: 'Infer type',
  research: 'Research',
  build_brief: 'Build brief',
  outline: 'Outline',
  draft: 'Drafts',
  review: 'Review',
  metadata: 'Metadata',
  assemble: 'Assemble',
};

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
  research: 'Research bundle',
  build_brief: 'SEO brief',
  outline: 'Outline',
  draft: 'Drafts',
  review: 'Review',
  metadata: 'Metadata',
  assemble: 'Assembled post preview',
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
      case 'research':
        return !!run.artifacts?.research;
      case 'build_brief':
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

  scoreWidth(value: number): string {
    const clamped = Math.max(0, Math.min(100, value));
    return `${clamped}%`;
  }

  scoreColor(value: number): string {
    if (value >= 80) return '#8be7b5';
    if (value >= 60) return '#f3d28a';
    return '#fca5a5';
  }
}
