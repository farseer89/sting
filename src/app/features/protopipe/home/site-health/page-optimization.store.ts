import { Injectable, computed, inject, signal } from '@angular/core';
import {
  RUN_POLL_BACKOFF_MS,
  RUN_POLL_INTERVAL_MS,
  isTerminalRunStatus,
  type PageOptimizationSnapshot,
  type Thought,
} from '@hive/contracts';
import { firstValueFrom } from 'rxjs';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ShireApiService } from '../../shire/shire-api.service';
import { reloadSnapshotWithRetry } from './run-snapshot-reload.util';

const STAGE_PERCENT: Record<string, number> = {
  load_context: 22,
  analyze_pages: 64,
  persist: 86,
  finalize: 96,
};
const MAX_POLL_FAILURES = 6;

@Injectable({ providedIn: 'root' })
export class PageOptimizationStore {
  private readonly api = inject(ShireApiService);

  private readonly _siteId = signal<string | null>(null);
  private readonly _snapshot = signal<PageOptimizationSnapshot | null>(null);
  private readonly _loadingLatest = signal(false);
  private readonly _starting = signal(false);
  private readonly _run = signal<Thought | null>(null);
  private readonly _error = signal<string | null>(null);
  private readonly _hasCheckedLatest = signal(false);
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollFailures = 0;
  private initializedSiteId: string | null = null;

  readonly snapshot = this._snapshot.asReadonly();
  readonly run = this._run.asReadonly();
  readonly error = this._error.asReadonly();
  readonly hasCheckedLatest = this._hasCheckedLatest.asReadonly();
  readonly refreshingLatest = this._loadingLatest.asReadonly();
  readonly hasSnapshot = computed(() => this.snapshot() !== null);
  readonly running = computed(() => {
    const run = this._run();
    return run?.status === 'pending' || run?.status === 'running';
  });
  readonly showProgress = computed(() => this._starting() || this.running());
  readonly canStart = computed(() => this._hasCheckedLatest() && !this.showProgress());
  readonly progressPercent = computed(() => {
    if (this._starting()) return 8;
    const run = this._run();
    if (!run) return 0;
    if (run.status === 'complete') return 100;
    if (run.status === 'pending') return 8;
    if (run.status === 'failed') return 0;
    return STAGE_PERCENT[run.currentStepId ?? ''] ?? 28;
  });
  readonly progressLabel = computed(() => {
    if (this._starting()) return 'Starting page optimization audit...';
    const run = this._run();
    if (!run || run.status === 'pending') return 'Preparing page optimization...';
    if (run.status === 'complete') return 'Page optimization complete';
    if (run.status === 'failed') return 'Page optimization failed';
    switch (run.currentStepId) {
      case 'load_context':
        return 'Loading pages and keyword goals...';
      case 'analyze_pages':
        return 'Checking titles, H1s, metadata, and internal links...';
      case 'persist':
        return 'Saving page recommendations...';
      case 'finalize':
        return 'Finalizing page optimization...';
      default:
        return 'Running page optimization...';
    }
  });
  readonly progressDetail = computed(() => {
    if (this._starting()) {
      return 'Creating a page optimization run for existing-page SEO recommendations.';
    }
    const run = this._run();
    return run?.steps.find((step) => step.id === run.currentStepId)?.summary ?? run?.summary ?? '';
  });

  async load(siteId: string): Promise<void> {
    if (this.initializedSiteId === siteId) return;
    if (this._siteId() !== siteId) {
      this.stopPolling();
      this._run.set(null);
      this.pollFailures = 0;
      this.initializedSiteId = null;
      this._hasCheckedLatest.set(false);
    }
    this._siteId.set(siteId);
    this.initializedSiteId = siteId;
    await this.reload();
  }

  async reload(): Promise<void> {
    const siteId = this._siteId();
    if (!siteId) return;
    this._loadingLatest.set(true);
    this._error.set(null);
    try {
      const res = await firstValueFrom(this.api.getLatestPageOptimization$(siteId));
      this._snapshot.set(res.snapshot);
      this._hasCheckedLatest.set(true);
      if (res.snapshot) {
        this._run.set(null);
        this.stopPolling();
        return;
      }
      await this.tryResumeRun(siteId);
    } catch (err) {
      this._hasCheckedLatest.set(true);
      this._error.set(parseProtopipeApiError(err, 'Could not load page optimization.'));
    } finally {
      this._loadingLatest.set(false);
    }
  }

  async start(): Promise<void> {
    const siteId = this._siteId();
    if (!siteId || this.showProgress()) return;
    this._error.set(null);
    try {
      const resumed = await this.tryResumeRun(siteId);
      if (!resumed) {
        this._starting.set(true);
        try {
          const { run } = await firstValueFrom(
            this.api.enqueueRun$(siteId, {
              thinkerKind: 'page_optimization_audit',
              params: { source: 'siteHealth' },
            }),
          );
          this.attachRun(siteId, run);
        } finally {
          this._starting.set(false);
        }
      }
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not start page optimization.'));
    }
  }

  private async tryResumeRun(siteId: string): Promise<boolean> {
    try {
      const { run } = await firstValueFrom(this.api.getLatestRun$(siteId, 'page_optimization_audit'));
      if (run.status === 'pending' || run.status === 'running') {
        this.attachRun(siteId, run);
        return true;
      }
      if (run.status === 'failed') {
        this._run.set(run);
        this._error.set(run.summary || 'Page optimization failed.');
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  private attachRun(siteId: string, run: Thought): void {
    this._siteId.set(siteId);
    this._run.set(run);
    this.pollFailures = 0;
    if (run.status === 'pending' || run.status === 'running') this.schedulePoll(RUN_POLL_INTERVAL_MS);
  }

  private schedulePoll(delayMs: number): void {
    this.stopPolling();
    this.pollTimer = setTimeout(() => this.poll(), delayMs);
  }

  private poll(): void {
    const siteId = this._siteId();
    const run = this._run();
    if (!siteId || !run) return;
    this.api.getRun$(siteId, run.id).subscribe({
      next: ({ run: nextRun }) => {
        this.pollFailures = 0;
        this._run.set(nextRun);
        if (!isTerminalRunStatus(nextRun.status)) {
          this.schedulePoll(RUN_POLL_INTERVAL_MS);
          return;
        }
        this.stopPolling();
        if (nextRun.status === 'complete') void this.reloadAfterRunComplete();
        if (nextRun.status === 'failed') this._error.set(nextRun.summary || 'Page optimization failed.');
      },
      error: () => {
        this.pollFailures += 1;
        if (this.pollFailures >= MAX_POLL_FAILURES) {
          this.stopPolling();
          this._error.set('Lost connection while waiting for page optimization.');
          return;
        }
        const backoff =
          RUN_POLL_BACKOFF_MS[Math.min(this.pollFailures - 1, RUN_POLL_BACKOFF_MS.length - 1)] ??
          RUN_POLL_INTERVAL_MS;
        this.schedulePoll(backoff);
      },
    });
  }

  private async reloadAfterRunComplete(): Promise<void> {
    const saved = await reloadSnapshotWithRetry(
      () => this.fetchLatestSnapshot(),
      () => this.hasSnapshot(),
    );
    this._run.set(null);
    if (!saved) this._error.set('Page optimization finished, but no snapshot is available yet. Try Refresh.');
  }

  private async fetchLatestSnapshot(): Promise<void> {
    const siteId = this._siteId();
    if (!siteId) return;
    const res = await firstValueFrom(this.api.getLatestPageOptimization$(siteId));
    this._snapshot.set(res.snapshot);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
