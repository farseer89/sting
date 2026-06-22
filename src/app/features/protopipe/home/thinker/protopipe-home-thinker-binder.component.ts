import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { ContentPlanStore } from '../../content-plan/content-plan.store';
import { contentPlanRunToThought, formatContentPlanMastheadDeck } from '../../lab/content-plan/content-plan-run-to-thought';
import { articleRunToThought } from '../../lab/thinker/article-run-to-thought';
import { formatThinkerCostUsd, sumCosts } from '../../lab/thinker/thinker-cost';
import { exportThoughtRunbookPdf } from '../../lab/thinker/thought-runbook-pdf';
import { ProtopipeHomeThinkerViewState } from '../protopipe-home-thinker-view.state';
import { ProtopipeHomeWriterViewState } from '../protopipe-home-writer-view.state';
import type { ArticleGenerationStep } from '@hive/contracts';
import { buildArticleStepVisualizer } from './article-run-visualizer.util';
import {
  mapThoughtStep,
  runStatusClass,
  runStatusLabel,
  type BinderStepView,
} from './thinker-binder.mapper';
import { ThinkerStepVisualizerComponent } from './thinker-step-visualizer.component';

type ThinkerTab = 'visualizer' | 'output' | 'steps' | 'prompt' | 'events' | 'raw';

@Component({
  selector: 'app-protopipe-home-thinker-binder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThinkerStepVisualizerComponent],
  templateUrl: './protopipe-home-thinker-binder.component.html',
  styleUrl: './protopipe-home-thinker-binder.component.scss',
})
export class ProtopipeHomeThinkerBinderComponent {
  private readonly thinkerView = inject(ProtopipeHomeThinkerViewState);
  private readonly writerView = inject(ProtopipeHomeWriterViewState);
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly contentPlan = inject(ContentPlanStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly activeStepId = signal<string | null>(null);
  readonly activeTab = signal<ThinkerTab>('visualizer');
  readonly exportingRunbook = signal(false);
  readonly exportError = signal<string | null>(null);

  readonly runKind = this.thinkerView.runKind;
  readonly run = this.thinkerView.run;
  readonly loadError = this.thinkerView.loadError;
  readonly connection = this.thinkerView.connection;
  readonly workingTitle = this.thinkerView.workingTitle;
  readonly isActive = this.thinkerView.isActive;

  readonly thought = computed(() => {
    if (this.runKind() === 'content-plan') {
      const plan = this.thinkerView.contentPlanRun();
      return plan ? contentPlanRunToThought(plan) : null;
    }
    const r = this.run();
    return r ? articleRunToThought(r) : null;
  });

  readonly steps = computed((): BinderStepView[] => {
    const t = this.thought();
    if (!t) return [];
    return t.steps.map((step, index) => mapThoughtStep(step, index));
  });

  readonly activeStep = computed((): BinderStepView | undefined => {
    const steps = this.steps();
    const id = this.activeStepId() ?? this.defaultStepId();
    return steps.find((s) => s.id === id) ?? steps[0];
  });

  readonly stepVisualizer = computed(() => {
    if (this.runKind() !== 'article') {
      return {
        title: 'Visualizer',
        emptyMessage: 'Article previews appear here for writer runs. Strategy builds use the output tab.',
        blocks: [],
      };
    }
    const run = this.run();
    const step = this.activeStep();
    if (!run || !step) {
      return { title: 'Visualizer', emptyMessage: 'Select a pipeline step.', blocks: [] };
    }
    return buildArticleStepVisualizer(run, step.id as ArticleGenerationStep, step.status);
  });

  readonly progress = computed(() => {
    const steps = this.steps();
    if (steps.length === 0) return 0;
    const done = steps.filter((s) => s.status === 'done').length;
    return Math.round((done / steps.length) * 100);
  });

  readonly totalCost = computed(() => {
    const formatted = formatThinkerCostUsd(sumCosts(this.steps().map((s) => s.costUsd)));
    return formatted ?? '$0.000';
  });

  readonly statusLabel = computed(() => {
    if (this.runKind() === 'content-plan') {
      return runStatusLabel(this.thinkerView.contentPlanRun()?.status);
    }
    return runStatusLabel(this.run()?.status);
  });
  readonly statusClass = computed(() => {
    if (this.runKind() === 'content-plan') {
      return runStatusClass(this.thinkerView.contentPlanRun()?.status);
    }
    return runStatusClass(this.run()?.status);
  });

  readonly mastheadDeck = computed(() => {
    const site = this.strategy.site();
    const label = site?.displayName?.trim() || site?.hostname?.trim() || 'Your site';

    if (this.runKind() === 'content-plan') {
      const plan = this.thinkerView.contentPlanRun();
      if (!plan) return `Strategy build · ${label}`;
      return formatContentPlanMastheadDeck(plan, label);
    }

    const started = this.run()?.createdAt;
    if (!started) return `Article generation · ${label}`;
    const time = new Date(started).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `Article generation · ${label} · started ${time}`;
  });

  readonly showOpenWriter = computed(
    () => this.runKind() === 'article' && this.run()?.status === 'complete',
  );

  readonly canExportRunbook = computed(() => Boolean(this.thought()));

  readonly showRestartStrategyBuild = computed(
    () =>
      this.runKind() === 'content-plan' &&
      (this.thinkerView.contentPlanRun()?.status === 'failed' || this.contentPlan.needsBuildRestart()),
  );

  readonly restartingStrategyBuild = this.contentPlan.starting;

  readonly hasSession = computed(() => {
    if (this.runKind() === 'content-plan') {
      return Boolean(this.thinkerView.contentPlanRun());
    }
    return Boolean(this.thinkerView.runId()) || Boolean(this.run());
  });

  readonly focusBackLabel = this.thinkerView.focusBackLabel;

  constructor() {
    effect(() => {
      const t = this.thought();
      if (!t) return;
      const current = this.activeStepId();
      if (current && t.steps.some((s) => s.id === current)) return;
      const next = t.currentStepId ?? t.steps.find((s) => s.status === 'running')?.id ?? t.steps[0]?.id;
      if (next) this.activeStepId.set(next);
    });

    this.destroyRef.onDestroy(() => {
      // Session lifecycle is owned by ProtopipeHomeThinkerViewState / user-home focus handlers.
    });
  }

  selectStep(id: string): void {
    this.activeStepId.set(id);
    this.activeTab.set('visualizer');
  }

  exitRunner(): void {
    this.thinkerView.requestExit();
  }

  retryConnection(): void {
    this.thinkerView.retryPoll();
  }

  restartStrategyBuild(): void {
    const siteId = this.thinkerView.siteId() ?? this.strategy.siteId();
    if (siteId) {
      this.contentPlan.setSiteId(siteId);
    }
    void this.contentPlan.restartBuild().then(() => {
      const plan = this.contentPlan.plan();
      if (plan && siteId) {
        this.thinkerView.openContentPlanRun(siteId, plan);
      }
    });
  }

  openInWriter(): void {
    const postId = this.thinkerView.postId();
    if (!postId) return;
    this.writerView.openPost(postId);
    this.thinkerView.openInWriter();
  }

  async exportRunbook(): Promise<void> {
    const thought = this.thought();
    const siteId = this.thinkerView.siteId();
    const runId = this.thinkerView.runId();
    if (!thought || !siteId || !runId || this.exportingRunbook()) return;

    this.exportingRunbook.set(true);
    this.exportError.set(null);
    try {
      await exportThoughtRunbookPdf(thought, { runId, siteId });
    } catch {
      this.exportError.set('Could not export runbook PDF. Try again in a moment.');
    } finally {
      this.exportingRunbook.set(false);
    }
  }

  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  formatCost(usd?: number): string {
    return formatThinkerCostUsd(usd) ?? '';
  }

  private defaultStepId(): string | undefined {
    const t = this.thought();
    if (!t) return undefined;
    if (t.currentStepId) return t.currentStepId;
    const running = t.steps.find((s) => s.status === 'running');
    if (running) return running.id;
    const lastDone = [...t.steps].reverse().find((s) => s.status !== 'pending');
    return lastDone?.id ?? t.steps[0]?.id;
  }
}
