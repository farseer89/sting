import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import type { ProtopipeSiteContentPlan } from '@hive/contracts';
import { StrategyContentMapComponent } from './strategy-content-map.component';
import { StrategyHeroComponent } from './strategy-hero.component';

type AccordionId = 'wins' | null;

@Component({
  selector: 'app-strategy-layout-a',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StrategyHeroComponent, StrategyContentMapComponent],
  templateUrl: './strategy-layout-a.component.html',
  styleUrl: './strategy-layout-a.component.scss',
})
export class StrategyLayoutAComponent {
  readonly plan = input.required<ProtopipeSiteContentPlan>();
  readonly siteLabel = input('');

  readonly accordion = signal<AccordionId>(null);

  toggleAccordion(id: AccordionId): void {
    this.accordion.update((current) => (current === id ? null : id));
  }

  isOpen(id: AccordionId): boolean {
    return this.accordion() === id;
  }
}
