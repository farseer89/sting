import { Injectable, computed, inject, signal } from '@angular/core';
import type { ArticleGenerationRunDto, ProtopipeSiteContentPlan } from '@hive/contracts';
import { firstValueFrom } from 'rxjs';
import {
  ARTICLE_RUN_POLL_MS,
  ArticleGenerationRunSession,
  type ArticleRunConnection,
} from '../article/article-generation-run-session.service';
import { ContentPlanService } from '../content-plan/content-plan.service';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { ProtopipeContentService } from '../protopipe-content.service';

export type ThinkerRunKind = 'article' | 'content-plan';

const CONTENT_PLAN_POLL_MS = ARTICLE_RUN_POLL_MS;

export interface ThinkerRunContext {
  siteId: string;
  postId: string;
  runId: string;
  workingTitle: string;
}

@Injectable()
export class ProtopipeHomeThinkerViewState {
  private readonly session = inject(ArticleGenerationRunSession);
  private readonly contentPlanApi = inject(ContentPlanService);
  private readonly content = inject(ProtopipeContentService);

  private enterThinkerFocus: (() => void) | null = null;
  private enterWriterFocus: (() => void) | null = null;

  private readonly _runKind = signal<ThinkerRunKind>('article');
  private readonly _siteId = signal<string | null>(null);
  private readonly _postId = signal<string | null>(null);
  private readonly _runId = signal<string | null>(null);
  private readonly _workingTitle = signal('');
  private readonly _contentPlanRun = signal<ProtopipeSiteContentPlan | null>(null);
  private readonly _contentPlanLoadError = signal<string | null>(null);
  private readonly _contentPlanConnection = signal<ArticleRunConnection>('idle');

  private contentPlanPollTimer: ReturnType<typeof setTimeout> | null = null;

  readonly runKind = this._runKind.asReadonly();
  readonly siteId = this._siteId.asReadonly();
  readonly postId = this._postId.asReadonly();
  readonly runId = this._runId.asReadonly();
  readonly workingTitle = this._workingTitle.asReadonly();
  readonly contentPlanRun = this._contentPlanRun.asReadonly();
  readonly run = this.session.run;
  readonly loadError = computed(() =>
    this._runKind() === 'content-plan'
      ? this._contentPlanLoadError()
      : this.session.loadError(),
  );
  readonly connection = computed(() =>
    this._runKind() === 'content-plan'
      ? this._contentPlanConnection()
      : this.session.connection(),
  );
  readonly isActive = computed(() => {
    if (this._runKind() === 'content-plan') {
      const plan = this._contentPlanRun();
      return plan?.status === 'running' || plan?.status === 'pending';
    }
    return this.session.isActive();
  });

  setEnterThinkerHandler(handler: () => void): void {
    this.enterThinkerFocus = handler;
  }

  setEnterWriterHandler(handler: () => void): void {
    this.enterWriterFocus = handler;
  }

  /** Open the content-plan pipeline run that built the current strategy. */
  openContentPlanRun(siteId: string, plan: ProtopipeSiteContentPlan): void {
    this.clearArticleSession();
    this._runKind.set('content-plan');
    this._siteId.set(siteId);
    this._postId.set(null);
    this._runId.set(plan.id);
    this._workingTitle.set(plan.narrative?.headline ?? `Content plan v${plan.version}`);
    this._contentPlanLoadError.set(null);
    this._contentPlanRun.set(plan);
    this.content.setEditingSiteId(siteId);
    this.maybePollContentPlan(plan);
    void this.reloadContentPlanRun();
    this.enterThinkerFocus?.();
  }

  openRun(ctx: ThinkerRunContext): void {
    this.clearContentPlanSession();
    this._runKind.set('article');
    this._siteId.set(ctx.siteId);
    this._postId.set(ctx.postId);
    this._runId.set(ctx.runId);
    this._workingTitle.set(ctx.workingTitle);
    this.content.setEditingSiteId(ctx.siteId);
    void this.session.loadRun(ctx.siteId, ctx.runId);
    this.enterThinkerFocus?.();
  }

  attachRun(ctx: ThinkerRunContext, run: ArticleGenerationRunDto): void {
    this.clearContentPlanSession();
    this._runKind.set('article');
    this._siteId.set(ctx.siteId);
    this._postId.set(ctx.postId);
    this._runId.set(ctx.runId);
    this._workingTitle.set(ctx.workingTitle);
    this.content.setEditingSiteId(ctx.siteId);
    this.session.attach(ctx.siteId, ctx.runId, run);
    this.enterThinkerFocus?.();
  }

  /** Resume an existing run or start a fresh pipeline for a plan-backed post. */
  async openForGeneration(
    siteId: string,
    postId: string,
    workingTitle: string,
  ): Promise<'thinker' | 'writer' | 'failed'> {
    this.clearContentPlanSession();
    this._runKind.set('article');
    this.content.setEditingSiteId(siteId);
    try {
      const { post } = await firstValueFrom(this.content.findPost$(postId, siteId));
      const existingRunId = post.articleGenerationRunId;

      if (existingRunId) {
        const run = await this.session.loadRun(siteId, existingRunId);
        if (!run) return 'failed';

        this._siteId.set(siteId);
        this._postId.set(postId);
        this._runId.set(existingRunId);
        this._workingTitle.set(workingTitle || post.title || 'Article');

        if (run.status === 'complete') {
          return 'writer';
        }
        this.enterThinkerFocus?.();
        return 'thinker';
      }

      const run = await this.session.startGenerate(siteId, postId);
      if (!run) return 'failed';

      this._siteId.set(siteId);
      this._postId.set(postId);
      this._runId.set(run.id);
      this._workingTitle.set(workingTitle || post.title || 'Article');
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

  clearSession(): void {
    this.clearArticleSession();
    this.clearContentPlanSession();
    this._runKind.set('article');
  }

  exitFocus(): void {
    this.clearSession();
  }

  retryPoll(): void {
    if (this._runKind() === 'content-plan') {
      void this.reloadContentPlanRun();
      return;
    }
    this.session.retryPoll();
  }

  private clearArticleSession(): void {
    this.session.stop();
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

  private maybePollContentPlan(plan: ProtopipeSiteContentPlan): void {
    if (plan.status === 'running' || plan.status === 'pending') {
      this._contentPlanConnection.set('live');
      this.scheduleContentPlanPoll(CONTENT_PLAN_POLL_MS);
    } else {
      this._contentPlanConnection.set('idle');
      this.stopContentPlanPolling();
    }
  }

  private scheduleContentPlanPoll(delayMs: number): void {
    this.stopContentPlanPolling();
    this.contentPlanPollTimer = setTimeout(() => {
      void this.reloadContentPlanRun();
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

  private stopContentPlanPolling(): void {
    if (this.contentPlanPollTimer) {
      clearTimeout(this.contentPlanPollTimer);
      this.contentPlanPollTimer = null;
    }
  }
}
