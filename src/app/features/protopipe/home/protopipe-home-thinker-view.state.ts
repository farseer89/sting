import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  ArticleGenerationRunDto,
  ArticleGenerationStep,
  ProtopipeKeywordDiscoveryRunDto,
  ProtopipeSiteContentPlan,
} from '@hive/contracts';
import { firstValueFrom } from 'rxjs';
import {
  ARTICLE_RUN_POLL_MS,
  ArticleGenerationRunSession,
  type ArticleRunConnection,
} from '../article/article-generation-run-session.service';
import { ThoughtRunSession } from '../runs/thought-run-session.service';
import { isShireRunsEnabled } from '../shire/shire-http.util';
import { shireThoughtToUi } from '../shire/shire-thought.adapter';
import { ContentPlanService } from '../content-plan/content-plan.service';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { ProtopipeApiService } from '../protopipe-api.service';
import { ProtopipeContentService } from '../protopipe-content.service';
import { ProtopipeProspectorService } from '../prospector/protopipe-prospector.service';
import type { ProspectorRunDto } from '../prospector/prospector-run.model';

export type ThinkerRunKind = 'article' | 'content-plan' | 'keyword-discovery' | 'prospector';

const CONTENT_PLAN_POLL_MS = ARTICLE_RUN_POLL_MS;
const DISCOVERY_POLL_MS = 1800;

export interface ThinkerRunContext {
  siteId: string;
  postId: string;
  runId: string;
  workingTitle: string;
}

export interface OpenDiscoveryRunOptions {
  /** When false, do not switch home activeView to thinker (keyword book embed). */
  enterFocus?: boolean;
}

const PROSPECTOR_POLL_MS = 1500;

@Injectable()
export class ProtopipeHomeThinkerViewState {
  private readonly session = inject(ArticleGenerationRunSession);
  private readonly shireSession = inject(ThoughtRunSession);
  private readonly contentPlanApi = inject(ContentPlanService);
  private readonly content = inject(ProtopipeContentService);
  private readonly api = inject(ProtopipeApiService);
  private readonly prospectorApi = inject(ProtopipeProspectorService);

  private enterThinkerFocus: (() => void) | null = null;
  private enterWriterFocus: (() => void) | null = null;
  private exitThinkerFocus: (() => void) | null = null;

  private readonly _focusBackLabel = signal('Back');
  readonly focusBackLabel = this._focusBackLabel.asReadonly();

  private readonly _runKind = signal<ThinkerRunKind>('article');
  private readonly _siteId = signal<string | null>(null);
  private readonly _postId = signal<string | null>(null);
  private readonly _runId = signal<string | null>(null);
  private readonly _workingTitle = signal('');
  private readonly _contentPlanRun = signal<ProtopipeSiteContentPlan | null>(null);
  private readonly _contentPlanLoadError = signal<string | null>(null);
  private readonly _contentPlanConnection = signal<ArticleRunConnection>('idle');
  private readonly _discoveryRun = signal<ProtopipeKeywordDiscoveryRunDto | null>(null);
  private readonly _discoveryLoadError = signal<string | null>(null);
  private readonly _discoveryConnection = signal<ArticleRunConnection>('idle');
  private readonly _prospectorRun = signal<ProspectorRunDto | null>(null);
  private readonly _prospectorLoadError = signal<string | null>(null);
  private readonly _prospectorConnection = signal<ArticleRunConnection>('idle');

  private contentPlanPollTimer: ReturnType<typeof setTimeout> | null = null;
  private discoveryPollTimer: ReturnType<typeof setTimeout> | null = null;
  private prospectorPollTimer: ReturnType<typeof setTimeout> | null = null;

  readonly runKind = this._runKind.asReadonly();
  readonly siteId = this._siteId.asReadonly();
  readonly postId = this._postId.asReadonly();
  readonly runId = this._runId.asReadonly();
  readonly workingTitle = this._workingTitle.asReadonly();
  readonly contentPlanRun = this._contentPlanRun.asReadonly();
  readonly discoveryRun = this._discoveryRun.asReadonly();
  readonly prospectorRun = this._prospectorRun.asReadonly();
  readonly run = this.session.run;
  readonly shireThought = computed(() => {
    const thought = this.shireSession.thought();
    return thought ? shireThoughtToUi(thought) : null;
  });
  readonly loadError = computed(() => {
    if (isShireRunsEnabled() && this._runKind() !== 'prospector') {
      return this.shireSession.loadError();
    }
    if (this._runKind() === 'content-plan') return this._contentPlanLoadError();
    if (this._runKind() === 'keyword-discovery') return this._discoveryLoadError();
    if (this._runKind() === 'prospector') return this._prospectorLoadError();
    return this.session.loadError();
  });
  readonly connection = computed(() => {
    if (isShireRunsEnabled() && this._runKind() !== 'prospector') {
      return this.shireSession.connection();
    }
    if (this._runKind() === 'content-plan') return this._contentPlanConnection();
    if (this._runKind() === 'keyword-discovery') return this._discoveryConnection();
    if (this._runKind() === 'prospector') return this._prospectorConnection();
    return this.session.connection();
  });
  readonly isActive = computed(() => {
    if (isShireRunsEnabled() && this._runKind() !== 'prospector') {
      return this.shireSession.isActive();
    }
    if (this._runKind() === 'content-plan') {
      const plan = this._contentPlanRun();
      return plan?.status === 'running' || plan?.status === 'pending';
    }
    if (this._runKind() === 'keyword-discovery') {
      const run = this._discoveryRun();
      return run?.status === 'pending' || run?.status === 'discovering';
    }
    if (this._runKind() === 'prospector') {
      const run = this._prospectorRun();
      return run?.status === 'pending' || run?.status === 'running';
    }
    return this.session.isActive();
  });

  setEnterThinkerHandler(handler: () => void): void {
    this.enterThinkerFocus = handler;
  }

  setEnterWriterHandler(handler: () => void): void {
    this.enterWriterFocus = handler;
  }

  setExitHandler(handler: () => void): void {
    this.exitThinkerFocus = handler;
  }

  setFocusBackLabel(label: string): void {
    this._focusBackLabel.set(label.trim() || 'Back');
  }

  /** Leave the runner and return to the view that opened it. */
  requestExit(): void {
    this.exitThinkerFocus?.();
  }

  /** Open the content-plan pipeline run that built the current strategy. */
  openContentPlanRun(siteId: string, plan: ProtopipeSiteContentPlan): void {
    this.clearArticleSession();
    this.clearDiscoverySession();
    this._runKind.set('content-plan');
    this._siteId.set(siteId);
    this._postId.set(null);
    this._runId.set(plan.id);
    this._workingTitle.set(plan.narrative?.headline ?? `Content plan v${plan.version}`);
    this._contentPlanLoadError.set(null);
    this._contentPlanRun.set(plan);
    this.content.setEditingSiteId(siteId);
    // Plan DTO powers the content-plan runbook (visualizer + step I/O). Keep it fresh
    // even when Shire is primary for Thought polling.
    if (isShireRunsEnabled()) {
      void this.shireSession.loadRun(siteId, plan.id);
    }
    this.maybePollContentPlan(plan);
    void this.reloadContentPlanRun();
    this.enterThinkerFocus?.();
  }

  /** Attach a keyword discovery run for the home runner (embedded in keyword book). */
  openDiscoveryRun(
    siteId: string,
    run: ProtopipeKeywordDiscoveryRunDto,
    options?: OpenDiscoveryRunOptions,
  ): void {
    this.clearArticleSession();
    this.clearContentPlanSession();
    this._runKind.set('keyword-discovery');
    this._siteId.set(siteId);
    this._postId.set(null);
    this._runId.set(run.id);
    this._workingTitle.set(
      run.artifacts.profile?.services?.[0]
        ? `Discovery · ${run.artifacts.profile.services[0]}`
        : 'Keyword discovery',
    );
    this._discoveryLoadError.set(null);
    this._discoveryRun.set(run);
    this.content.setEditingSiteId(siteId);
    if (isShireRunsEnabled()) {
      void this.shireSession.loadRun(siteId, run.id);
    } else {
      this.maybePollDiscovery(run);
    }
    if (options?.enterFocus !== false) {
      this.enterThinkerFocus?.();
    }
  }

  /** Refresh discovery run snapshot from the picker store poll loop. */
  updateDiscoveryRun(run: ProtopipeKeywordDiscoveryRunDto): void {
    if (this._runKind() !== 'keyword-discovery') {
      const siteId = this._siteId();
      if (siteId) {
        this.openDiscoveryRun(siteId, run, { enterFocus: false });
      }
      return;
    }
    this._discoveryRun.set(run);
    if (!isShireRunsEnabled()) {
      this.maybePollDiscovery(run);
    }
  }

  openRun(ctx: ThinkerRunContext): void {
    this.clearContentPlanSession();
    this.clearDiscoverySession();
    this._runKind.set('article');
    this._siteId.set(ctx.siteId);
    this._postId.set(ctx.postId);
    this._runId.set(ctx.runId);
    this._workingTitle.set(ctx.workingTitle);
    this.content.setEditingSiteId(ctx.siteId);
    if (isShireRunsEnabled()) {
      void this.shireSession.loadRun(ctx.siteId, ctx.runId);
    } else {
      void this.session.loadRun(ctx.siteId, ctx.runId);
    }
    this.enterThinkerFocus?.();
  }

  attachRun(ctx: ThinkerRunContext, run: ArticleGenerationRunDto): void {
    this.clearContentPlanSession();
    this.clearDiscoverySession();
    this._runKind.set('article');
    this._siteId.set(ctx.siteId);
    this._postId.set(ctx.postId);
    this._runId.set(ctx.runId);
    this._workingTitle.set(ctx.workingTitle);
    this.content.setEditingSiteId(ctx.siteId);
    if (isShireRunsEnabled()) {
      void this.shireSession.loadRun(ctx.siteId, ctx.runId);
    } else {
      this.session.attach(ctx.siteId, ctx.runId, run);
    }
    this.enterThinkerFocus?.();
  }

  /** Resume an existing run or start a fresh pipeline for a plan-backed post. */
  async openForGeneration(
    siteId: string,
    postId: string,
    workingTitle: string,
  ): Promise<'thinker' | 'writer' | 'failed'> {
    this.clearContentPlanSession();
    this.clearDiscoverySession();
    this._runKind.set('article');
    this.content.setEditingSiteId(siteId);
    try {
      const { post } = await firstValueFrom(this.content.findPost$(postId, siteId));
      const existingRunId = post.articleGenerationRunId;

      if (existingRunId) {
        const run = isShireRunsEnabled()
          ? await this.shireSession.loadRun(siteId, existingRunId)
          : await this.session.loadRun(siteId, existingRunId);
        if (!run) return 'failed';

        this._siteId.set(siteId);
        this._postId.set(postId);
        this._runId.set(existingRunId);
        this._workingTitle.set(workingTitle || post.title || 'Article');

        const status = isShireRunsEnabled()
          ? (run as { status: string }).status
          : (run as ArticleGenerationRunDto).status;
        if (status === 'complete') {
          return 'writer';
        }
        this.enterThinkerFocus?.();
        return 'thinker';
      }

      const run = isShireRunsEnabled()
        ? await this.shireSession.enqueueRun(siteId, {
            thinkerKind: 'article_generation',
            params: { contentPostId: postId },
          })
        : await this.session.startGenerate(siteId, postId);
      if (!run) return 'failed';

      this._siteId.set(siteId);
      this._postId.set(postId);
      this._runId.set(run.id);
      this._workingTitle.set(workingTitle || post.title || 'Article');

      const status = isShireRunsEnabled()
        ? (run as { status: string }).status
        : (run as ArticleGenerationRunDto).status;
      if (status === 'complete') {
        // Recovered an existing complete run (or enqueue was a no-op) — open writer.
        this.content.reload();
        return 'writer';
      }

      this.enterThinkerFocus?.();
      return 'thinker';
    } catch {
      return 'failed';
    }
  }

  openInWriter(): void {
    const postId = this._postId();
    if (postId) {
      this.enterWriterFocus?.();
    }
  }

  /** Open a prospector run in the thinker binder (fullscreen immersive). */
  openProspectorRun(run: ProspectorRunDto): void {
    this._loadProspectorRun(run);
    this.enterThinkerFocus?.();
  }

  /** Load a prospector run into the thinker state without triggering a focus takeover.
   *  Used by the embedded binder inside the Prospector book. */
  setProspectorRunEmbedded(run: ProspectorRunDto): void {
    this._loadProspectorRun(run);
  }

  private _loadProspectorRun(run: ProspectorRunDto): void {
    this.clearArticleSession();
    this.clearContentPlanSession();
    this.clearDiscoverySession();
    this._runKind.set('prospector');
    this._siteId.set(null);
    this._postId.set(null);
    this._runId.set(run.id);
    this._workingTitle.set(`${run.input.category} · ${run.input.location}`);
    this._prospectorLoadError.set(null);
    this._prospectorRun.set(run);
    this.maybePollProspector(run);
  }

  clearSession(): void {
    this.clearArticleSession();
    this.clearContentPlanSession();
    this.clearDiscoverySession();
    this.clearProspectorSession();
    this._runKind.set('article');
  }

  exitFocus(): void {
    this.requestExit();
  }

  retryPoll(): void {
    if (isShireRunsEnabled() && this._runKind() !== 'prospector') {
      this.shireSession.retryPoll();
      return;
    }
    if (this._runKind() === 'content-plan') {
      void this.reloadContentPlanRun();
      return;
    }
    if (this._runKind() === 'keyword-discovery') {
      void this.reloadDiscoveryRun();
      return;
    }
    if (this._runKind() === 'prospector') {
      void this.reloadProspectorRun();
      return;
    }
    this.session.retryPoll();
  }

  rerunArticleStep(step: ArticleGenerationStep) {
    if (isShireRunsEnabled()) {
      return this.shireSession.rerunStep(step);
    }
    return this.session.rerunStep(step);
  }

  private clearArticleSession(): void {
    this.session.stop();
    if (isShireRunsEnabled()) {
      this.shireSession.stop();
    }
    this._siteId.set(null);
    this._postId.set(null);
    this._runId.set(null);
    this._workingTitle.set('');
  }

  private clearContentPlanSession(): void {
    this.stopContentPlanPolling();
    this._contentPlanRun.set(null);
    this._contentPlanLoadError.set(null);
    this._contentPlanConnection.set('idle');
  }

  private clearDiscoverySession(): void {
    this.stopDiscoveryPolling();
    this._discoveryRun.set(null);
    this._discoveryLoadError.set(null);
    this._discoveryConnection.set('idle');
  }

  private maybePollContentPlan(plan: ProtopipeSiteContentPlan): void {
    if (plan.status === 'running' || plan.status === 'pending') {
      this._contentPlanConnection.set('live');
      this.scheduleContentPlanPoll(CONTENT_PLAN_POLL_MS);
    } else {
      this._contentPlanConnection.set('idle');
      this.stopContentPlanPolling();
    }
  }

  private maybePollDiscovery(run: ProtopipeKeywordDiscoveryRunDto): void {
    if (run.status === 'pending' || run.status === 'discovering') {
      this._discoveryConnection.set('live');
      this.scheduleDiscoveryPoll(DISCOVERY_POLL_MS);
    } else {
      this._discoveryConnection.set('idle');
      this.stopDiscoveryPolling();
    }
  }

  private scheduleContentPlanPoll(delayMs: number): void {
    this.stopContentPlanPolling();
    this.contentPlanPollTimer = setTimeout(() => {
      void this.reloadContentPlanRun();
    }, delayMs);
  }

  private scheduleDiscoveryPoll(delayMs: number): void {
    this.stopDiscoveryPolling();
    this.discoveryPollTimer = setTimeout(() => {
      void this.reloadDiscoveryRun();
    }, delayMs);
  }

  private async reloadContentPlanRun(): Promise<void> {
    const siteId = this._siteId();
    const planId = this._runId();
    if (!siteId || !planId || this._runKind() !== 'content-plan') return;

    try {
      const { plan } = await this.contentPlanApi.getRun(siteId, planId);
      if (!plan) {
        this._contentPlanLoadError.set('Content plan run not found.');
        this._contentPlanConnection.set('idle');
        this.stopContentPlanPolling();
        return;
      }
      this._contentPlanLoadError.set(null);
      this._contentPlanRun.set(plan);
      this.maybePollContentPlan(plan);
    } catch (err) {
      this._contentPlanConnection.set('idle');
      this._contentPlanLoadError.set(parseProtopipeApiError(err, 'Could not load content plan run.'));
      this.stopContentPlanPolling();
    }
  }

  private async reloadDiscoveryRun(): Promise<void> {
    const siteId = this._siteId();
    const runId = this._runId();
    if (!siteId || !runId || this._runKind() !== 'keyword-discovery') return;

    try {
      const { run } = await this.api.getKeywordDiscoveryRun(siteId, runId);
      if (!run) {
        this._discoveryLoadError.set('Keyword discovery run not found.');
        this._discoveryConnection.set('idle');
        this.stopDiscoveryPolling();
        return;
      }
      this._discoveryLoadError.set(null);
      this._discoveryRun.set(run);
      this.maybePollDiscovery(run);
    } catch (err) {
      this._discoveryConnection.set('idle');
      this._discoveryLoadError.set(parseProtopipeApiError(err, 'Could not load keyword discovery run.'));
      this.stopDiscoveryPolling();
    }
  }

  private stopContentPlanPolling(): void {
    if (this.contentPlanPollTimer) {
      clearTimeout(this.contentPlanPollTimer);
      this.contentPlanPollTimer = null;
    }
  }

  private stopDiscoveryPolling(): void {
    if (this.discoveryPollTimer) {
      clearTimeout(this.discoveryPollTimer);
      this.discoveryPollTimer = null;
    }
  }

  private clearProspectorSession(): void {
    this.stopProspectorPolling();
    this._prospectorRun.set(null);
    this._prospectorLoadError.set(null);
    this._prospectorConnection.set('idle');
  }

  private maybePollProspector(run: ProspectorRunDto): void {
    if (run.status === 'pending' || run.status === 'running') {
      this._prospectorConnection.set('live');
      this.scheduleProspectorPoll(PROSPECTOR_POLL_MS);
    } else {
      this._prospectorConnection.set('idle');
      this.stopProspectorPolling();
    }
  }

  private scheduleProspectorPoll(delayMs: number): void {
    this.stopProspectorPolling();
    this.prospectorPollTimer = setTimeout(() => {
      void this.reloadProspectorRun();
    }, delayMs);
  }

  private async reloadProspectorRun(): Promise<void> {
    const runId = this._runId();
    if (!runId || this._runKind() !== 'prospector') return;

    try {
      const run = await this.prospectorApi.getRun(runId);
      this._prospectorLoadError.set(null);
      this._prospectorRun.set(run);
      this.maybePollProspector(run);
    } catch (err) {
      this._prospectorConnection.set('idle');
      this._prospectorLoadError.set(parseProtopipeApiError(err, 'Could not load prospector run.'));
      this.stopProspectorPolling();
    }
  }

  private stopProspectorPolling(): void {
    if (this.prospectorPollTimer) {
      clearTimeout(this.prospectorPollTimer);
      this.prospectorPollTimer = null;
    }
  }
}
