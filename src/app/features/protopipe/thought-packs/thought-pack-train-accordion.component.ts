import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import type { CognitivePackTrainRef } from './cognitive-pack.model';

@Component({
  selector: 'app-thought-pack-train-accordion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './thought-pack-train-accordion.component.html',
  styleUrl: './thought-pack-train-accordion.component.scss',
})
export class ThoughtPackTrainAccordionComponent {
  readonly trains = input.required<CognitivePackTrainRef[]>();

  protected readonly openSlug = signal<string | null>(null);

  protected toggle(slug: string): void {
    this.openSlug.update((current) => (current === slug ? null : slug));
  }

  protected isOpen(slug: string): boolean {
    return this.openSlug() === slug;
  }
}
