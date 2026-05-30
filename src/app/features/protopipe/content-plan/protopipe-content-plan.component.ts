import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type {
  ArticleGenerationContentStrategy,
  KeywordPriority,
  ProtopipeContentPlanCalendarItem,
  ProtopipeContentPlanCurrentStep,
  ProtopipeContentPlanRunSummary,
  ProtopipeContentPlanStep,
  ProtopipeContentPlanStepEvent,
  ProtopipeScoredKeyword,
} from '@hive/contracts';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ProgressBar } from 'primeng/progressbar';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { Tag } from 'primeng/tag';
import { Tooltip } from 'primeng/tooltip';
import { prioritySeverity } from '../protopipe-keyword-display';
import { ProtopipeStrategyService } from '../protopipe-strategy.service';
import { ContentPlanStore } from './content-plan.store';

type PlanSection =
  | 'overview'
  | 'calendar'
  | 'keywords'
  | 'clusters'
  | 'audit'
  | 'process';

interface PlanSectionDef {
  id: PlanSection;
  label: string;
  icon: string;
}

type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

type StepStatus = 'pending' | 'running' | 'complete' | 'failed';

interface PlanStepDef {
  step: ProtopipeContentPlanStep;
  label: string;
  icon: string;
}

interface PlanStepEntry extends PlanStepDef {
  index: number;
  status: StepStatus;
}

const PLAN_STEPS: PlanStepDef[] = [
  { step: 'audit', label: 'Audit existing', icon: 'pi pi-file' },
  { step: 'score_tier', label: 'Score & tier', icon: 'pi pi-sort-amount-down' },
  { step: 'cluster', label: 'Cluster', icon: 'pi pi-sitemap' },
  { step: 'deep_scan', label: 'Deep scan', icon: 'pi pi-search' },
  { step: 'unify', label: 'Unify', icon: 'pi pi-compass' },
];

const STEP_ORDER: ProtopipeContentPlanStep[] = [
  'audit',
  'score_tier',
  'cluster',
  'deep_scan',
  'unify',
];

@Component({
  selector: 'app-protopipe-content-plan',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    Card,
    Button,
    Tag,
    TableModule,
    TabsModule,
    ProgressBar,
    Tooltip,
  ],
  templateUrl: './protopipe-content-plan.component.html',
  styleUrl: './protopipe-content-plan.component.scss',
})
export class ProtopipeContentPlanComponent implements OnInit {
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly store = inject(ContentPlanStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly activeTab = signal<PlanSection>('overview');
  readonly sections: PlanSectionDef[] = [
    { id: 'overview', label: 'Overview', icon: 'pi pi-compass' },
    { id: 'calendar', label: 'Calendar', icon: 'pi pi-calendar' },
    { id: 'keywords', label: 'Keywords', icon: 'pi pi-list' },
    { id: 'clusters', label: 'Clusters', icon: 'pi pi-sitemap' },
    { id: 'audit', label: 'Existing content', icon: 'pi pi-file' },
    { id: 'process', label: 'Process', icon: 'pi pi-cog' },
  ];

  /** The step whose artifact + log is expanded in the Process tab. */
  readonly processStep = signal<ProtopipeContentPlanStep>('audit');

  readonly plan = this.store.plan;
  readonly starting = this.store.starting;
  readonly loading = this.store.loading;
  readonly error = this.store.error;
  readonly isRunning = this.store.isRunning;
  readonly isComplete = this.store.isComplete;
  readonly hasFailed = this.store.hasFailed;
  readonly runs = this.store.runs;
  readonly selectedRunId = this.store.selectedRunId;
  readonly currentStep = this.store.currentStep;
  readonly events = this.store.events;

  readonly tiers = computed(() => this.plan()?.keywordTiers);
  readonly clusters = computed(() => this.plan()?.clusters ?? []);
  readonly calendar = computed(() => this.plan()?.calendar ?? []);
  readonly pillars = computed(() => this.plan()?.pillars ?? []);
  readonly audit = computed(() => this.plan()?.existingContent);
  readonly narrative = computed(() => this.plan()?.narrative);

  readonly focusStrategies = computed<ArticleGenerationContentStrategy[]>(
    () => this.plan()?.focusStrategies ?? [],
  );

  readonly stepEntries = computed<PlanStepEntry[]>(() =>
    PLAN_STEPS.map((def, index) => ({
      ...def,
      index: index + 1,
      status: this.deriveStepStatus(def.step),
    })),
  );

  readonly stepEvents = computed<ProtopipeContentPlanStepEvent[]>(() =>
    this.events().filter((e) => e.step === this.processStep()),
  );

  readonly progressPct = computed(() => {
    const p = this.plan()?.progress;
    if (!p || p.total <= 0) return 0;
    return Math.round((p.scanned / p.total) * 100);
  });

  async ngOnInit(): Promise<void> {
    this.destroyRef.onDestroy(() => this.store.stopPolling());
    await this.strategy.ensureLoaded();
    const siteId = this.strategy.siteId();
    if (siteId) {
      this.store.setSiteId(siteId);
      await this.store.loadLatest();
    }
  }

  generate(): void {
    void this.store.generate();
  }

  sectionCount(id: PlanSection): number | null {
    switch (id) {
      case 'calendar':
        return this.calendar().length || null;
      case 'keywords': {
        const t = this.tiers();
        if (!t) return null;
        return (
          t.immediateFocus.length + t.longTerm.length + t.longTail.length || null
        );
      }
      case 'clusters':
        return this.clusters().length || null;
      case 'audit':
        return this.audit()?.scannedCount || null;
      default:
        return null;
    }
  }

  // ---- display helpers ----

  tierKeywords(tier: 'immediateFocus' | 'longTerm' | 'longTail'): ProtopipeScoredKeyword[] {
    return this.tiers()?.[tier] ?? [];
  }

  prioritySeverity(priority?: KeywordPriority): TagSeverity {
    return priority ? prioritySeverity(priority) : 'secondary';
  }

  volumeBadge(kw: ProtopipeScoredKeyword): string {
    return kw.volumeSource === 'google_ads' ? 'ads' : kw.volumeSource === 'dataforseo' ? 'dfs' : '—';
  }

  cpcRange(kw: ProtopipeScoredKeyword): string | null {
    const ads = kw.googleAds;
    if (!ads || (ads.cpcLow == null && ads.cpcHigh == null)) return null;
    const lo = ads.cpcLow != null ? `$${ads.cpcLow.toFixed(2)}` : '?';
    const hi = ads.cpcHigh != null ? `$${ads.cpcHigh.toFixed(2)}` : '?';
    return `${lo}–${hi}`;
  }

  calendarByCluster(): { cluster: string; items: ProtopipeContentPlanCalendarItem[] }[] {
    const groups = new Map<string, ProtopipeContentPlanCalendarItem[]>();
    for (const item of this.calendar()) {
      const key = item.clusterName ?? 'Unassigned';
      const arr = groups.get(key) ?? [];
      arr.push(item);
      groups.set(key, arr);
    }
    return [...groups.entries()].map(([cluster, items]) => ({ cluster, items }));
  }

  // ---- process / stepper helpers ----

  selectProcessStep(step: ProtopipeContentPlanStep): void {
    this.processStep.set(step);
  }

  selectRun(planId: string | null): void {
    void this.store.selectRun(planId);
  }

  isLatestRun(): boolean {
    return this.selectedRunId() === null;
  }

  stepStatusSeverity(status: StepStatus): TagSeverity {
    switch (status) {
      case 'complete':
        return 'success';
      case 'running':
        return 'info';
      case 'failed':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  eventStatusSeverity(status: ProtopipeContentPlanStepEvent['status']): TagSeverity {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  /** Cost of a step = the cost stamped on its last completed event. */
  stepCost(step: ProtopipeContentPlanStep): number | null {
    const ev = [...this.events()]
      .reverse()
      .find((e) => e.step === step && e.status === 'completed' && e.costUsd != null);
    return ev?.costUsd ?? null;
  }

  /** Wall-clock duration of a step = its last completed event's durationMs. */
  stepDurationMs(step: ProtopipeContentPlanStep): number | null {
    const ev = [...this.events()]
      .reverse()
      .find((e) => e.step === step && e.status === 'completed' && e.durationMs != null);
    return ev?.durationMs ?? null;
  }

  private deriveStepStatus(step: ProtopipeContentPlanStep): StepStatus {
    const p = this.plan();
    if (!p) return 'pending';

    const failedHere = (p.events ?? []).some(
      (e) => e.step === step && e.status === 'failed',
    );
    if (failedHere) return 'failed';

    const current: ProtopipeContentPlanCurrentStep | undefined = p.currentStep;
    if (p.status === 'complete' || current === 'done') return 'complete';
    if (!current) return 'pending';

    const stepOrder = STEP_ORDER.indexOf(step);
    const currentOrder = STEP_ORDER.indexOf(current as ProtopipeContentPlanStep);
    if (stepOrder < currentOrder) return 'complete';
    if (stepOrder === currentOrder) {
      return p.status === 'running' ? 'running' : 'pending';
    }
    return 'pending';
  }
}
