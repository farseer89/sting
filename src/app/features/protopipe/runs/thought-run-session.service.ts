import { Injectable, computed, inject, signal } from '@angular/core';
import {
  RUN_POLL_BACKOFF_MS,
  RUN_POLL_INTERVAL_MS,
  isTerminalRunStatus,
  type EnqueueRunRequest,
  type RunConnection,
  type Thought,
} from '@hive/contracts';
import { firstValueFrom } from 'rxjs';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { ShireApiService } from '../shire/shire-api.service';

const MAX_POLL_FAILURES = 6;

/**
 * Polls a single Shire Thought run for the home Thinker binder and lab routes.
 * One active session at a time — replaces per-pipeline bagend poll loops when
 * `environment.SHIRE_BASE_URL` is set.
 */
@Injectable()
export class ThoughtRunSession {
  private readonly api = inject(ShireApiService);

  private readonly _thought = signal<Thought | null>(null);
  private readonly _loadError = signal<string | null>(null);
  private readonly _connection = signal<RunConnection>('idle');

  private siteId = '';
  private runId = '';
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollFailures = 0;

  readonly thought = this._thought.asReadonly();
  readonly loadError = this._loadError.asReadonly();
  readonly connection = this._connection.asReadonly();

  readonly isActive = computed(() => {
    const run = this._thought();
    if (!run) return false;
    return run.status === 'running' || run.status === 'pending';
  });

  readonly isComplete = computed(() => this._thought()?.status === 'complete');
  readonly isFailed = computed(() => this._thought()?.status === 'failed');

  attach(siteId: string, runId: string, thought: Thought): void {
    this.siteId = siteId;
    this.runId = runId;
    this.pollFailures = 0;
    this._loadError.set(null);
    this._thought.set(thought);
    this.maybePoll(thought);
  }

  async loadRun(siteId: string, runId: string): Promise<Thought | null> {
    this.siteId = siteId;
    this.runId = runId;
    this.pollFailures = 0;
    this._loadError.set(null);
    try {
      const { run } = await firstValueFrom(this.api.getRun$(siteId, runId));
      this._thought.set(run);
      this.maybePoll(run);
      return run;
    } catch (err) {
      this._connection.set('idle');
      this._loadError.set(parseProtopipeApiError(err, 'Could not load run.'));
      return null;
    }
  }

  async enqueueRun(siteId: string, body: EnqueueRunRequest): Promise<Thought | null> {
    this.siteId = siteId;
    this.pollFailures = 0;
    this._loadError.set(null);
    try {
      const { run } = await firstValueFrom(this.api.enqueueRun$(siteId, body));
      this.runId = run.id;
      this._thought.set(run);
      this.maybePoll(run);
      return run;
    } catch (err) {
      this._connection.set('idle');
      this._loadError.set(parseProtopipeApiError(err, 'Could not start run.'));
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

  async rerunStep(stepId: string): Promise<{ ok: true } | { ok: false; message: string }> {
    if (!this.siteId || !this.runId) {
      return { ok: false, message: 'No active run.' };
    }
    this.stopPolling();
    this._loadError.set(null);
    try {
      const { run } = await firstValueFrom(this.api.rerunStep$(this.siteId, this.runId, stepId));
      this._thought.set(run);
      this.maybePoll(run);
      return { ok: true };
    } catch (err) {
      const current = this._thought();
      if (current) this.maybePoll(current);
      return { ok: false, message: parseProtopipeApiError(err, 'Failed to rerun step.') };
    }
  }

  stop(): void {
    this.stopPolling();
    this.siteId = '';
    this.runId = '';
    this._thought.set(null);
    this._loadError.set(null);
    this._connection.set('idle');
    this.pollFailures = 0;
  }

  private maybePoll(thought: Thought): void {
    if (thought.status === 'running' || thought.status === 'pending') {
      this._connection.set('live');
      this.schedulePoll(RUN_POLL_INTERVAL_MS);
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
    this.api.getRun$(this.siteId, this.runId).subscribe({
      next: ({ run }) => {
        this.pollFailures = 0;
        this._thought.set(run);
        if (isTerminalRunStatus(run.status)) {
          this._connection.set('idle');
          this.stopPolling();
          return;
        }
        this.maybePoll(run);
      },
      error: () => {
        this.pollFailures += 1;
        if (this.pollFailures >= MAX_POLL_FAILURES) {
          this._connection.set('lost');
          this.stopPolling();
          return;
        }
        this._connection.set('reconnecting');
        const backoff =
          RUN_POLL_BACKOFF_MS[Math.min(this.pollFailures - 1, RUN_POLL_BACKOFF_MS.length - 1)] ??
          RUN_POLL_INTERVAL_MS;
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
