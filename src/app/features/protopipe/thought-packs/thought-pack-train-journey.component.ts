import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import type { CognitivePackTrainRef } from './cognitive-pack.model';

export interface ThoughtPackJourneyStep {
  id: string;
  label: string;
  detail: string;
  kind: 'start' | 'train' | 'finish';
}

@Component({
  selector: 'app-thought-pack-train-journey',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './thought-pack-train-journey.component.html',
  styleUrl: './thought-pack-train-journey.component.scss',
})
export class ThoughtPackTrainJourneyComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly trains = input.required<CognitivePackTrainRef[]>();
  readonly accentColor = input('#0a9396');
  readonly packLabel = input('Thought pack');

  protected readonly activeStep = signal(0);
  protected readonly isPlaying = signal(true);

  protected readonly steps = computed<ThoughtPackJourneyStep[]>(() => {
    const trainSteps: ThoughtPackJourneyStep[] = this.trains().map((train) => ({
      id: train.slug,
      label: train.label,
      detail: train.mechanism,
      kind: 'train',
    }));

    if (trainSteps.length === 0) {
      return [
        {
          id: 'brief',
          label: 'Plan brief',
          detail: 'Your content plan angle and SERP context.',
          kind: 'start',
        },
        {
          id: 'writer',
          label: 'Writer',
          detail: 'Outline and draft — no extra cognitive pass.',
          kind: 'finish',
        },
      ];
    }

    return [
      {
        id: 'brief',
        label: 'Brief',
        detail: 'Keyword, SERP gaps, and business context load in.',
        kind: 'start',
      },
      ...trainSteps,
      {
        id: 'thesis',
        label: 'Thesis',
        detail: 'Parallel rails merge into one defensible angle.',
        kind: 'train',
      },
      {
        id: 'writer',
        label: 'Writer',
        detail: 'Outline and draft inherit the hardened thesis.',
        kind: 'finish',
      },
    ];
  });

  protected readonly stepCount = computed(() => this.steps().length);

  protected readonly activeDetail = computed(() => {
    const list = this.steps();
    const idx = this.activeStep();
    return list[idx] ?? list[0];
  });

  protected readonly trainProgress = computed(() => {
    const count = this.stepCount();
    if (count <= 1) return 0;
    return (this.activeStep() / (count - 1)) * 100;
  });

  constructor() {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      this.isPlaying.set(false);
      return;
    }

    const timer = window.setInterval(() => {
      if (!this.isPlaying()) return;
      const count = this.stepCount();
      this.activeStep.update((current) => (current + 1) % count);
    }, 2800);

    this.destroyRef.onDestroy(() => window.clearInterval(timer));
  }

  protected goToStep(index: number): void {
    this.activeStep.set(index);
  }

  protected togglePlayback(): void {
    this.isPlaying.update((v) => !v);
  }
}
