import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import type { ProtopipeSiteContentPlan } from '@hive/contracts';
import { StrategyContentMapComponent } from './strategy-content-map.component';
import { StrategyHeroComponent } from './strategy-hero.component';
import { calendarDateRange, formatPublishDate, strategyStats } from './strategy.helpers';

type CardId = 'pillars' | 'calendar' | 'wins' | 'keywords' | null;

@Component({
  selector: 'app-strategy-layout-c',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StrategyHeroComponent, StrategyContentMapComponent],
  templateUrl: './strategy-layout-c.component.html',
  styleUrl: './strategy-layout-c.component.scss',
})
export class StrategyLayoutCComponent {
  readonly plan = input.required<ProtopipeSiteContentPlan>();
  readonly siteLabel = input('');

  readonly openCard = signal<CardId>(null);

  formatDate = formatPublishDate;

  stats(plan: ProtopipeSiteContentPlan) {
    return strategyStats(plan);
  }

  dateRange(plan: ProtopipeSiteContentPlan) {
    return calendarDateRange(plan.calendar);
  }

  pillarSummary(plan: ProtopipeSiteContentPlan): string {
    return plan.pillars.map((p) => p.clusterName).join(' · ');
  }

  toggleCard(id: CardId): void {
    this.openCard.update((current) => (current === id ? null : id));
  }

  isCardOpen(id: CardId): boolean {
    return this.openCard() === id;
  }

  bestRanking(plan: ProtopipeSiteContentPlan): string | null {
    const rows = plan.existingContent?.alreadyRanking ?? [];
    if (rows.length === 0) return null;
    const best = [...rows].sort((a, b) => a.position - b.position)[0];
    return `#${best.position} "${best.phrase}"`;
  }
}
