import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ProtopipeSiteContentPlan } from '@hive/contracts';
import { strategyStats } from './strategy.helpers';

@Component({
  selector: 'app-strategy-content-strategy',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './strategy-content-strategy.component.html',
  styleUrl: './strategy-content-strategy.component.scss',
})
export class StrategyContentStrategyComponent {
  readonly plan = input.required<ProtopipeSiteContentPlan>();

  readonly stats = computed(() => strategyStats(this.plan()));

  readonly intel = computed(() => this.plan().strategyIntel);

  readonly strategyIntelEvent = computed(() =>
    (this.plan().events ?? []).find(
      (event) => event.step === 'strategy_intel' && event.status === 'completed',
    ),
  );

  avatarLabel(plan: ProtopipeSiteContentPlan, avatarId: string): string {
    const avatar = plan.keywordStrategySnapshot?.confirmedAvatars?.find((a) => a.id === avatarId);
    if (!avatar) return avatarId;
    return avatar.intentCluster || avatar.description.slice(0, 48);
  }
}
