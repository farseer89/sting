import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { ContentPlanStore } from '../../content-plan/content-plan.store';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';

@Component({
  selector: 'app-protopipe-home-plan-progress',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-home-plan-progress.component.html',
  styleUrl: './protopipe-home-plan-progress.component.scss',
})
export class ProtopipeHomePlanProgressComponent implements OnInit {
  private readonly store = inject(ContentPlanStore);
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly destroyRef = inject(DestroyRef);

  readonly plan = this.store.plan;
  readonly loading = this.store.loading;
  readonly error = this.store.error;
  readonly isRunning = this.store.isRunning;
  readonly isComplete = this.store.isComplete;
  readonly hasFailed = this.store.hasFailed;
  readonly starting = this.store.starting;
  readonly events = this.store.events;
  readonly currentStep = this.store.currentStep;

  readonly progressPct = computed(() => {
    const p = this.plan()?.progress;
    if (!p || p.total <= 0) return 0;
    return Math.round((p.scanned / p.total) * 100);
  });

  readonly tierSummary = computed(() => {
    const tiers = this.plan()?.keywordTiers;
    if (!tiers) return null;
    return {
      immediate: tiers.immediateFocus?.length ?? 0,
      longTerm: tiers.longTerm?.length ?? 0,
      longTail: tiers.longTail?.length ?? 0,
    };
  });

  readonly recentEvents = computed(() => this.events().slice(-6).reverse());

  async ngOnInit(): Promise<void> {
    this.destroyRef.onDestroy(() => this.store.stopPolling());
    await this.strategy.ensureLoaded();
    const siteId = this.strategy.siteId();
    if (siteId) {
      this.store.setSiteId(siteId);
      await this.store.loadLatest();
    }
  }

  retry(): void {
    void this.store.generate();
  }
}
