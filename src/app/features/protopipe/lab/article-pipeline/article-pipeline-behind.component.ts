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

interface StepEventRow {
  status: string;
  startedAt: string;
  durationMs?: number;
  promptVersion?: string;
  error?: string;
}

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

const STEP_TO_ARTIFACT_KEY: Record<ArticleGenerationStep, keyof ArticleGenerationRunDto['artifacts'] | null> = {
  infer_type: null,
  research: 'research',
  build_brief: 'brief',
  outline: 'outline',
  draft: 'sections',
  review: 'review',
  metadata: 'metadata',
  assemble: 'template',
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
