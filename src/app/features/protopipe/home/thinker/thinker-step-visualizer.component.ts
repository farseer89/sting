import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { StepVisualizerView } from './article-run-visualizer.util';

@Component({
  selector: 'app-thinker-step-visualizer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './thinker-step-visualizer.component.html',
  styleUrl: './thinker-step-visualizer.component.scss',
})
export class ThinkerStepVisualizerComponent {
  readonly view = input.required<StepVisualizerView>();

  scoreWidth(score?: number): string {
    if (score == null || !Number.isFinite(score)) return '0%';
    return `${Math.max(0, Math.min(100, score))}%`;
  }

  scoreTone(score?: number): string {
    if (score == null) return 'neutral';
    if (score >= 80) return 'good';
    if (score >= 60) return 'mid';
    return 'low';
  }
}
