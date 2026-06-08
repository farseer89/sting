import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import type { ProtopipeSiteContentPlan } from '@hive/contracts';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { StrategyContentMapComponent } from './strategy-content-map.component';
import { StrategyHeroComponent } from './strategy-hero.component';
import { StrategyOffersComponent } from './strategy-offers.component';

type AccordionId = 'wins' | null;

@Component({
  selector: 'app-strategy-layout-a',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    StrategyHeroComponent,
    StrategyContentMapComponent,
    StrategyOffersComponent,
  ],
  templateUrl: './strategy-layout-a.component.html',
  styleUrl: './strategy-layout-a.component.scss',
})
export class StrategyLayoutAComponent {
  private readonly strategy = inject(ProtopipeStrategyService);

  readonly plan = input.required<ProtopipeSiteContentPlan>();
  readonly siteLabel = input('');
  readonly siteId = this.strategy.siteId;

  readonly accordion = signal<AccordionId>(null);

  toggleAccordion(id: AccordionId): void {
    this.accordion.update((current) => (current === id ? null : id));
  }

  isOpen(id: AccordionId): boolean {
    return this.accordion() === id;
  }
}
