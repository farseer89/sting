import { Injectable, computed, inject, signal } from '@angular/core';
import type { ArticleGenerationRunDto } from '@hive/contracts';
import { firstValueFrom } from 'rxjs';
import { ProtopipeApiService } from '../protopipe-api.service';
import { parseProtopipeApiError } from '../protopipe-http.util';
import type { ArticleGenerationStep } from '@hive/contracts';

/** Matches the backend orphan-takeover window for stuck "running" runs. */
export const ARTICLE_RUN_STALE_MS = 4 * 60 * 1000;
/** Base interval between status polls while a run is active. */
export const ARTICLE_RUN_POLL_MS = 1800;
/** Consecutive poll failures tolerated before we declare the link lost. */
export const ARTICLE_RUN_MAX_POLL_FAILURES = 6;

export type ArticleRunConnection = 'idle' | 'live' | 'reconnecting' | 'lost';

/**
 * Polls a single ArticleGenerationRun for the home Thinker binder (and other
 * embedded views). One active session at a time.
 */
@Injectable()
export class ArticleGenerationRunSession {
  private readonly api = inject(ProtopipeApiService);

  private readonly _run = signal<ArticleGenerationRunDto | null>(null);
  private readonly _loadError = signal<string | null>(null);
  private readonly _connection = signal<ArticleRunConnection>('idle');

  private siteId = '';
  private runId = '';
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollFailures = 0;

  readonly run = this._run.asReadonly();
  readonly loadError = this._loadError.asReadonly();
  readonly connection = this._connection.asReadonly();

  readonly isActive = computed(() => {
    const r = this._run();
    return r?.status === 'running' || r?.status === 'pending';
  });

  readonly isComplete = computed(() => this._run()?.status === 'complete');
  readonly isFailed = computed(() => this._run()?.status === 'failed');

  attach(siteId: string, runId: string, run: ArticleGenerationRunDto): void {
    this.siteId = siteId;
    this.runId = runId;
    this.pollFailures = 0;
    this._loadError.set(null);
    this._run.set(run);
    this.maybePoll(run);
  }

  async loadRun(siteId: string, runId: string): Promise<ArticleGenerationRunDto | null> {
    this.siteId = siteId;
    this.runId = runId;
    this.pollFailures = 0;
    this._loadError.set(null);
    try {
      const { run } = await firstValueFrom(this.api.getArticleRun$(siteId, runId));
      this._run.set(run);
      this.maybePoll(run);
      return run;
    } catch (err) {
      this._connection.set('idle');
      this._loadError.set(parseProtopipeApiError(err, 'Could not load run.'));
      return null;
    }
  }

  async startGenerate(siteId: string, postId: string): Promise<ArticleGenerationRunDto | null> {
    this.siteId = siteId;
    this.pollFailures = 0;
    this._loadError.set(null);
    try {
      const { run } = await firstValueFrom(this.api.generateContent$(siteId, postId));
      this.runId = run.id;
      this._run.set(run);
      this.maybePoll(run);
      return run;
    } catch (err) {
      this._connection.set('idle');
      this._loadError.set(parseProtopipeApiError(err, 'Could not start generation.'));
      return null;
    }
  }

  retryPoll(): void {
    if (!this.siteId || !this.runId) return;
    this._loadError.set(null);
    this.pollFailures = 0;
    this._connection.set('reconnecting');
    void this.loadRun(this.siteId, this.runId);
  }

  async rerunStep(step: ArticleGenerationStep): Promise<{ ok: true } | { ok: false; message: string }> {
    if (!this.siteId || !this.runId) {
      return { ok: false, message: 'No active run.' };
    }
    this.stopPolling();
    this._loadError.set(null);
    try {
      const { run } = await firstValueFrom(
        this.api.rerunArticleStep$(this.siteId, this.runId, step),
      );
      this._run.set(run);
      this.maybePoll(run);
      return { ok: true };
    } catch (err) {
      const current = this._run();
      if (current) this.maybePoll(current);
      return { ok: false, message: parseProtopipeApiError(err, 'Failed to rerun step.') };
    }
  }

  stop(): void {
    this.stopPolling();
    this.siteId = '';
    this.runId = '';
    this._run.set(null);
    this._loadError.set(null);
    this._connection.set('idle');
    this.pollFailures = 0;
  }

  private maybePoll(run: ArticleGenerationRunDto): void {
    if (run.status === 'running' || run.status === 'pending') {
      this._connection.set('live');
      this.schedulePoll(ARTICLE_RUN_POLL_MS);
    } else {
      this._connection.set('idle');
      this.stopPolling();
    }
  }

  private schedulePoll(delayMs: number): void {
    this.stopPolling();
    this.pollTimer = setTimeout(() => this.poll(), delayMs);
  }

  private poll(): void {
    if (!this.siteId || !this.runId) return;
    this.api.getArticleRun$(this.siteId, this.runId).subscribe({
      next: ({ run }) => {
        this.pollFailures = 0;
        this._run.set(run);
        this.maybePoll(run);
      },
      error: () => {
        this.pollFailures += 1;
        if (this.pollFailures >= ARTICLE_RUN_MAX_POLL_FAILURES) {
          this._connection.set('lost');
          this.stopPolling();
          return;
        }
        this._connection.set('reconnecting');
        const backoff = ARTICLE_RUN_POLL_MS * Math.min(this.pollFailures + 1, 5);
        this.schedulePoll(backoff);
      },
    });
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
