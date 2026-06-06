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
import { generationStepsForRun, STEP_LABELS } from '../../article-pipeline-steps';

interface StepRailEntry {
  step: ArticleGenerationStep;
  index: number;
  label: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
}

@Component({
  selector: 'app-article-pipeline-outline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './article-pipeline-outline.component.html',
  styleUrl: './article-pipeline-outline.component.scss',
})
export class ArticlePipelineOutlineComponent {
  readonly run = input<ArticleGenerationRunDto | null>(null);
  readonly activeStep = input<ArticleGenerationStep>('infer_type');
  readonly stepSelected = output<ArticleGenerationStep>();

  readonly entries = computed<StepRailEntry[]>(() => {
    const run = this.run();
    const steps = run ? generationStepsForRun(run) : generationStepsForRun({ pipelineVersion: 1 });
    return steps.map((step, index) => ({
      step,
      index: index + 1,
      label: STEP_LABELS[step],
      status: this.deriveStatus(run, step),
    }));
  });

  selectStep(step: ArticleGenerationStep): void {
    this.stepSelected.emit(step);
  }

  isActive(step: ArticleGenerationStep): boolean {
    return this.activeStep() === step;
  }

  private deriveStatus(
    run: ArticleGenerationRunDto | null,
    step: ArticleGenerationStep,
  ): StepRailEntry['status'] {
    if (!run) return 'pending';

    if (run.error?.step === step) return 'failed';

    if (run.currentStep === 'done') return 'complete';

    const steps = generationStepsForRun(run);
    const stepOrder = steps.indexOf(step);
    const currentOrder = steps.indexOf(run.currentStep as ArticleGenerationStep);

    if (stepOrder < currentOrder) return 'complete';
    if (stepOrder === currentOrder) {
      return run.status === 'running' ? 'running' : 'pending';
    }
    return 'pending';
  }
}
