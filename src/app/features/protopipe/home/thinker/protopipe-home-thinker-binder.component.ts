import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { ContentPlanStore } from '../../content-plan/content-plan.store';
import { contentPlanRunToThought, formatContentPlanMastheadDeck } from '../../lab/content-plan/content-plan-run-to-thought';
import {
  discoveryRunToThought,
  formatDiscoveryMastheadDeck,
} from '../../lab/keyword-discovery/discovery-run-to-thought';
import { articleRunToThought } from '../../lab/thinker/article-run-to-thought';
import { formatThinkerCostUsd, sumCosts } from '../../lab/thinker/thinker-cost';
import { exportThoughtRunbookPdf } from '../../lab/thinker/thought-runbook-pdf';
import { ProtopipeHomeThinkerViewState } from '../protopipe-home-thinker-view.state';
import { isShireRunsEnabled } from '../../shire/shire-http.util';
import { ProtopipeHomeWriterViewState } from '../protopipe-home-writer-view.state';
import {
  canRerunArticleRun,
  rerunBlockedReason,
} from '../../article/article-run-rerun.util';
import type { ArticleGenerationStep } from '@hive/contracts';
import {
  buildArticlePreviewVisualizer,
  buildArticleStepVisualizer,
  buildThoughtStepVisualizer,
} from './article-run-visualizer.util';
import {
  buildContentPlanStepVisualizer,
  type ContentPlanVisualizerStep,
} from './content-plan-visualizer.util';
import {
  buildDiscoveryStepVisualizer,
  type DiscoveryVisualizerStep,
} from './discovery-run-visualizer.util';
import {
  isDiscoveryNavPhaseId,
  isDiscoveryResultStepId,
  mapDiscoveryNavPhases,
  mapDiscoveryResultNavStep,
  resolveDiscoveryBinderNavStepId,
} from './discovery-binder.util';
import {
  annotateProspectorApiMeta,
  isProspectorResultStepId,
  mapProspectorResultNavStep,
  resolveProspectorBinderNavStepId,
} from './prospector-binder.util';
import { prospectorRunToThought, formatProspectorMastheadDeck } from '../../lab/prospector/prospector-run-to-thought';
import { buildProspectorStepVisualizer } from './prospector-run-visualizer.util';
import {
  isStrategyIntelNavStepId,
  isStrategyResultStepId,
  mapFoundationSteps,
  mapStrategyIntelNavSteps,
  mapStrategyResultNavStep,
  resolveContentPlanNavStepId,
} from './content-plan-binder.util';
import {
  mapThoughtStep,
  runStatusClass,
  runStatusLabel,
  type BinderStepStatus,
  type BinderStepView,
} from './thinker-binder.mapper';
import { ThinkerStepVisualizerComponent } from './thinker-step-visualizer.component';

type ThinkerTab = 'visualizer' | 'article' | 'output' | 'steps' | 'prompt' | 'query' | 'events' | 'raw';

const ARTICLE_PIPELINE_STEP_IDS = new Set<string>([
  'infer_type',
  'analyse_competition',
  'content_plan',
  'research',
  'build_brief',
  'compile_context',
  'cognitive_pass',
  'outline',
  'draft',
  'audience_review',
  'draft_faq',
  'layout_plan',
  'review',
  'metadata',
  'assemble',
  'generate_images',
]);

export interface BinderAspectNavItem {
  id: string;
  label: string;
  status: BinderStepStatus;
  detail?: string;
}

@Component({
  selector: 'app-protopipe-home-thinker-binder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThinkerStepVisualizerComponent],
  templateUrl: './protopipe-home-thinker-binder.component.html',
  styleUrl: './protopipe-home-thinker-binder.component.scss',
})
export class ProtopipeHomeThinkerBinderComponent {
  /** Embedded in keyword book — hides exit/back chrome. */
  readonly embedded = input(false);

  private readonly thinkerView = inject(ProtopipeHomeThinkerViewState);
  private readonly writerView = inject(ProtopipeHomeWriterViewState);
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly contentPlan = inject(ContentPlanStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly activeStepId = signal<string | null>(null);
  readonly activeAspectId = signal<string | null>(null);
  readonly activeTab = signal<ThinkerTab>('visualizer');
  private readonly _lastThoughtId = signal<string | null>(null);
  readonly exportingRunbook = signal(false);
  readonly exportError = signal<string | null>(null);
  readonly rerunning = signal(false);
  readonly rerunError = signal<string | null>(null);

  readonly runKind = this.thinkerView.runKind;
  readonly run = this.thinkerView.run;
  readonly loadError = this.thinkerView.loadError;
  readonly connection = this.thinkerView.connection;
  readonly workingTitle = this.thinkerView.workingTitle;
  readonly isActive = this.thinkerView.isActive;

  readonly thought = computed(() => {
    // Content-plan runbook projects from the plan DTO (outputs, intel phases), not the
    // flat Shire Thought — Shire steps lack subSteps / per-step artifacts.
    if (this.runKind() === 'content-plan') {
      const plan = this.thinkerView.contentPlanRun();
      return plan ? contentPlanRunToThought(plan) : null;
    }
    if (isShireRunsEnabled() && this.runKind() !== 'prospector') {
      return this.thinkerView.shireThought();
    }
    if (this.runKind() === 'keyword-discovery') {
      const run = this.thinkerView.discoveryRun();
      return run ? discoveryRunToThought(run as never) : null;
    }
    if (this.runKind() === 'prospector') {
      const run = this.thinkerView.prospectorRun();
      return run ? prospectorRunToThought(run) : null;
    }
    const r = this.run();
    return r ? articleRunToThought(r) : null;
  });

  readonly steps = computed((): BinderStepView[] => {
    const t = this.thought();
    if (!t) return [];
    const mapped = t.steps.map((step, index) => mapThoughtStep(step, index));
    if (this.runKind() === 'prospector') {
      const run = this.thinkerView.prospectorRun();
      if (run) return annotateProspectorApiMeta(mapped, run);
    }
    return mapped;
  });

  readonly foundationSteps = computed(() => mapFoundationSteps(this.steps()));

  readonly strategyIntelSteps = computed((): BinderStepView[] => {
    if (this.runKind() !== 'content-plan') return [];
    const plan = this.thinkerView.contentPlanRun();
    if (!plan) return [];
    const intelThought = this.thought()?.steps.find((s) => s.id === 'strategy_intel');
    const intelMapped = this.steps().find((s) => s.id === 'strategy_intel');
    return mapStrategyIntelNavSteps(plan, intelThought, intelMapped);
  });

  readonly strategyResultStep = computed((): BinderStepView | undefined => {
    if (this.runKind() !== 'content-plan') return undefined;
    const plan = this.thinkerView.contentPlanRun();
    if (!plan) return undefined;
    return mapStrategyResultNavStep(plan, this.steps());
  });

  readonly discoveryNavPhases = computed((): BinderStepView[] => {
    if (this.runKind() !== 'keyword-discovery') return [];
    const run = this.thinkerView.discoveryRun();
    if (!run) return [];
    return mapDiscoveryNavPhases(run, this.steps());
  });

  readonly discoveryResultStep = computed((): BinderStepView | undefined => {
    if (this.runKind() !== 'keyword-discovery') return undefined;
    const run = this.thinkerView.discoveryRun();
    if (!run) return undefined;
    return mapDiscoveryResultNavStep(run, this.steps());
  });

  readonly prospectorResultStep = computed((): BinderStepView | undefined => {
    if (this.runKind() !== 'prospector') return undefined;
    const run = this.thinkerView.prospectorRun();
    if (!run) return undefined;
    return mapProspectorResultNavStep(run, this.steps());
  });

  readonly railSteps = computed(() => {
    if (this.runKind() === 'content-plan') return this.foundationSteps();
    if (this.runKind() === 'keyword-discovery') return [];
    return this.steps();
  });

  readonly activeStep = computed((): BinderStepView | undefined => {
    const id = this.activeStepId() ?? this.defaultStepId();
    if (!id) return undefined;

    if (this.runKind() === 'content-plan' && isStrategyIntelNavStepId(id)) {
      return this.strategyIntelSteps().find((s) => s.id === id);
    }

    if (this.runKind() === 'content-plan' && isStrategyResultStepId(id)) {
      return this.strategyResultStep();
    }

    if (this.runKind() === 'keyword-discovery' && isDiscoveryNavPhaseId(id)) {
      return this.discoveryNavPhases().find((s) => s.id === id);
    }

    if (this.runKind() === 'keyword-discovery' && isDiscoveryResultStepId(id)) {
      return this.discoveryResultStep();
    }

    if (this.runKind() === 'prospector' && isProspectorResultStepId(id)) {
      return this.prospectorResultStep();
    }

    return this.railSteps().find((s) => s.id === id) ?? this.steps().find((s) => s.id === id);
  });

  readonly stepVisualizer = computed(() => {
    const step = this.activeStep();
    if (!step) {
      return { title: 'Visualizer', emptyMessage: 'Select a pipeline step.', blocks: [] };
    }

    if (this.runKind() === 'content-plan') {
      const plan = this.thinkerView.contentPlanRun();
      if (!plan) {
        return { title: 'Visualizer', emptyMessage: 'Select a pipeline step.', blocks: [] };
      }
      return buildContentPlanStepVisualizer(
        plan,
        step.id as ContentPlanVisualizerStep,
        step.status,
      );
    }

    if (this.runKind() === 'keyword-discovery') {
      const run = this.thinkerView.discoveryRun();
      if (!run) {
        return { title: 'Visualizer', emptyMessage: 'Select a pipeline step.', blocks: [] };
      }
      return buildDiscoveryStepVisualizer(
        run,
        step.id as DiscoveryVisualizerStep,
        step.status,
      );
    }

    if (this.runKind() === 'prospector') {
      const run = this.thinkerView.prospectorRun();
      if (!run) {
        return { title: 'Visualizer', emptyMessage: 'Select a pipeline step.', blocks: [] };
      }
      return buildProspectorStepVisualizer(run, step.id, step.status);
    }

    const run = this.run();
    const thoughtStep = this.thought()?.steps.find((s) => s.id === step.id);
    if (!run || !ARTICLE_PIPELINE_STEP_IDS.has(step.id)) {
      return thoughtStep
        ? buildThoughtStepVisualizer(thoughtStep)
        : { title: 'Visualizer', emptyMessage: 'Select a pipeline step.', blocks: [] };
    }
    return buildArticleStepVisualizer(run, step.id as ArticleGenerationStep, step.status);
  });

  readonly articlePreview = computed(() =>
    buildArticlePreviewVisualizer({ run: this.run(), thought: this.thought() }),
  );

  /** Article compile-context tabs only — not used for strategy builds. */
  readonly aspectNav = computed((): BinderAspectNavItem[] => {
    if (this.runKind() !== 'article') return [];
    const viz = this.stepVisualizer();
    const step = this.activeStep();
    if (!viz.tabs?.length) return [];

    const subById = new Map((step?.subSteps ?? []).map((sub) => [sub.id, sub]));

    return viz.tabs.map((tab) => {
      const sub = subById.get(tab.id);
      const hasContent = tab.blocks.length > 0;
      let status: BinderStepStatus = 'pending';
      if (sub) {
        status = sub.status;
      } else if (hasContent) {
        status = 'done';
      } else if (step?.status === 'running') {
        status = 'pending';
      }
      return {
        id: tab.id,
        label: tab.label,
        status,
        detail: sub?.detail ?? (hasContent ? 'Ready' : undefined),
      };
    });
  });

  readonly showAspectNav = computed(
    () => this.runKind() === 'article' && this.aspectNav().length > 0,
  );

  readonly visualizerTabId = computed((): string | null => {
    const aspects = this.aspectNav();
    if (!aspects.length) return null;
    const current = this.activeAspectId();
    if (current && aspects.some((aspect) => aspect.id === current)) return current;
    const viz = this.stepVisualizer();
    const preferred = viz.defaultTabId ?? aspects.find((aspect) => aspect.status === 'done')?.id;
    return preferred ?? aspects[0]?.id ?? null;
  });

  readonly progress = computed(() => {
    if (this.runKind() === 'content-plan') {
      const foundation = this.foundationSteps();
      const intel = this.strategyIntelSteps();
      const result = this.strategyResultStep();
      const all = [...foundation, ...intel, ...(result ? [result] : [])];
      if (all.length === 0) return 0;
      const done = all.filter((s) => s.status === 'done').length;
      return Math.round((done / all.length) * 100);
    }
    if (this.runKind() === 'keyword-discovery') {
      const phases = this.discoveryNavPhases();
      const result = this.discoveryResultStep();
      const all = [...phases, ...(result ? [result] : [])];
      if (all.length === 0) return 0;
      const done = all.filter((s) => s.status === 'done').length;
      return Math.round((done / all.length) * 100);
    }
    if (this.runKind() === 'prospector') {
      const steps = this.steps();
      const result = this.prospectorResultStep();
      const all = [...steps, ...(result ? [result] : [])];
      if (all.length === 0) return 0;
      const done = all.filter((s) => s.status === 'done').length;
      return Math.round((done / all.length) * 100);
    }
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
    if (this.runKind() === 'keyword-discovery') {
      return runStatusLabel(this.thinkerView.discoveryRun()?.status);
    }
    if (this.runKind() === 'prospector') {
      return runStatusLabel(this.thinkerView.prospectorRun()?.status);
    }
    return runStatusLabel(this.run()?.status);
  });
  readonly statusClass = computed(() => {
    if (this.runKind() === 'content-plan') {
      return runStatusClass(this.thinkerView.contentPlanRun()?.status);
    }
    if (this.runKind() === 'keyword-discovery') {
      return runStatusClass(this.thinkerView.discoveryRun()?.status);
    }
    if (this.runKind() === 'prospector') {
      return runStatusClass(this.thinkerView.prospectorRun()?.status);
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

    if (this.runKind() === 'keyword-discovery') {
      const run = this.thinkerView.discoveryRun();
      if (!run) return `Keyword discovery · ${label}`;
      return formatDiscoveryMastheadDeck(run as never, label);
    }

    if (this.runKind() === 'prospector') {
      const run = this.thinkerView.prospectorRun();
      if (!run) return 'Prospector';
      return formatProspectorMastheadDeck(run);
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

  readonly showRerunArticleStep = computed(() => this.runKind() === 'article' && Boolean(this.run()));

  readonly canRerunArticleStep = computed(
    () => !this.rerunning() && canRerunArticleRun(this.run()),
  );

  readonly rerunBlockedHint = computed(() => rerunBlockedReason(this.run()));

  readonly rerunStepLabel = computed(() => {
    const step = this.activeStep();
    return step ? `Rerun from ${step.label}` : 'Rerun step';
  });

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
    if (this.runKind() === 'keyword-discovery') {
      return Boolean(this.thinkerView.discoveryRun());
    }
    if (this.runKind() === 'prospector') {
      return Boolean(this.thinkerView.prospectorRun());
    }
    return Boolean(this.thinkerView.runId()) || Boolean(this.run());
  });

  readonly focusBackLabel = this.thinkerView.focusBackLabel;

  constructor() {
    effect(() => {
      const t = this.thought();
      if (!t) {
        this._lastThoughtId.set(null);
        return;
      }

      // Reset active step whenever the run itself changes (same step IDs across runs).
      const prevId = this._lastThoughtId();
      if (prevId !== t.id) {
        this._lastThoughtId.set(t.id);
        this.activeStepId.set(null);
        this.activeTab.set(this.defaultActiveTab(t.status));
        return;
      }
      this._lastThoughtId.set(t.id);

      const current = this.activeStepId();
      const validIds = new Set([
        ...this.foundationSteps().map((s) => s.id),
        ...this.strategyIntelSteps().map((s) => s.id),
        ...(this.strategyResultStep() ? [this.strategyResultStep()!.id] : []),
        ...this.discoveryNavPhases().map((s) => s.id),
        ...(this.discoveryResultStep() ? [this.discoveryResultStep()!.id] : []),
        ...(this.prospectorResultStep() ? [this.prospectorResultStep()!.id] : []),
        ...this.steps().map((s) => s.id),
      ]);
      if (current && validIds.has(current)) return;
      const next = this.defaultStepId();
      if (next) this.activeStepId.set(next);
    });

    effect(() => {
      if (this.runKind() === 'content-plan') return;
      const stepId = this.activeStep()?.id;
      const aspects = this.aspectNav();
      void stepId;

      if (!aspects.length) {
        this.activeAspectId.set(null);
        return;
      }

      const current = this.activeAspectId();
      if (current && aspects.some((aspect) => aspect.id === current)) return;

      const viz = this.stepVisualizer();
      const next =
        viz.defaultTabId ??
        aspects.find((aspect) => aspect.status === 'done')?.id ??
        aspects[0]?.id ??
        null;
      this.activeAspectId.set(next);
    });

    this.destroyRef.onDestroy(() => {
      // Session lifecycle is owned by ProtopipeHomeThinkerViewState / user-home focus handlers.
    });
  }

  selectStep(id: string): void {
    this.activeStepId.set(id);
    this.activeAspectId.set(null);
    this.activeTab.set('visualizer');
  }

  selectAspect(id: string): void {
    this.activeAspectId.set(id);
    this.activeTab.set('visualizer');
  }

  isAspectNavItem(subId: string): boolean {
    return this.aspectNav().some((aspect) => aspect.id === subId);
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

  rerunActiveStep(): void {
    if (this.runKind() !== 'article' || this.rerunning() || !this.canRerunArticleStep()) return;

    const run = this.run();
    const step = this.activeStep();
    const stepId = (run?.error?.step ?? step?.id) as ArticleGenerationStep | undefined;
    if (!stepId) return;

    this.rerunning.set(true);
    this.rerunError.set(null);
    void this.thinkerView.rerunArticleStep(stepId).then((result) => {
      this.rerunning.set(false);
      if (!result.ok) {
        this.rerunError.set(result.message);
      }
    });
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
    if (this.runKind() === 'content-plan') {
      const plan = this.thinkerView.contentPlanRun();
      const thought = this.thought();
      if (plan && thought) {
        return resolveContentPlanNavStepId(plan, thought.currentStepId);
      }
    }

    if (this.runKind() === 'keyword-discovery') {
      const run = this.thinkerView.discoveryRun();
      const thought = this.thought();
      if (run && thought) {
        return resolveDiscoveryBinderNavStepId(run, thought.currentStepId);
      }
    }

    if (this.runKind() === 'prospector') {
      const run = this.thinkerView.prospectorRun();
      if (run) {
        return resolveProspectorBinderNavStepId(run);
      }
    }

    const t = this.thought();
    if (!t) return undefined;
    if (t.currentStepId) return t.currentStepId;
    const running = t.steps.find((s) => s.status === 'running');
    if (running) return running.id;
    const lastDone = [...t.steps].reverse().find((s) => s.status !== 'pending');
    return lastDone?.id ?? t.steps[0]?.id;
  }

  private defaultActiveTab(status: string): ThinkerTab {
    return this.runKind() === 'article' && status === 'complete' ? 'article' : 'visualizer';
  }
}
