import { Injectable, inject, signal } from '@angular/core';
import type { ArticleGenerationRunDto } from '@hive/contracts';
import { firstValueFrom } from 'rxjs';
import { ArticleGenerationRunSession } from '../article/article-generation-run-session.service';
import { ProtopipeContentService } from '../protopipe-content.service';

export interface ThinkerRunContext {
  siteId: string;
  postId: string;
  runId: string;
  workingTitle: string;
}

@Injectable()
export class ProtopipeHomeThinkerViewState {
  private readonly session = inject(ArticleGenerationRunSession);
  private readonly content = inject(ProtopipeContentService);

  private enterThinkerFocus: (() => void) | null = null;
  private enterWriterFocus: (() => void) | null = null;

  private readonly _siteId = signal<string | null>(null);
  private readonly _postId = signal<string | null>(null);
  private readonly _runId = signal<string | null>(null);
  private readonly _workingTitle = signal('');

  readonly siteId = this._siteId.asReadonly();
  readonly postId = this._postId.asReadonly();
  readonly runId = this._runId.asReadonly();
  readonly workingTitle = this._workingTitle.asReadonly();
  readonly run = this.session.run;
  readonly loadError = this.session.loadError;
  readonly connection = this.session.connection;
  readonly isActive = this.session.isActive;

  setEnterThinkerHandler(handler: () => void): void {
    this.enterThinkerFocus = handler;
  }

  setEnterWriterHandler(handler: () => void): void {
    this.enterWriterFocus = handler;
  }

  openRun(ctx: ThinkerRunContext): void {
    this._siteId.set(ctx.siteId);
    this._postId.set(ctx.postId);
    this._runId.set(ctx.runId);
    this._workingTitle.set(ctx.workingTitle);
    this.content.setEditingSiteId(ctx.siteId);
    void this.session.loadRun(ctx.siteId, ctx.runId);
    this.enterThinkerFocus?.();
  }

  attachRun(ctx: ThinkerRunContext, run: ArticleGenerationRunDto): void {
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
    this.session.stop();
    this._siteId.set(null);
    this._postId.set(null);
    this._runId.set(null);
    this._workingTitle.set('');
  }

  exitFocus(): void {
    this.clearSession();
  }

  retryPoll(): void {
    this.session.retryPoll();
  }
}
