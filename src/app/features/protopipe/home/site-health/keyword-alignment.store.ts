import { Injectable, computed, inject, signal } from '@angular/core';
import {
  RUN_POLL_BACKOFF_MS,
  RUN_POLL_INTERVAL_MS,
  isTerminalRunStatus,
  type KeywordAlignmentSnapshot,
  type Thought,
} from '@hive/contracts';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ShireApiService } from '../../shire/shire-api.service';
import { firstValueFrom } from 'rxjs';
import { reloadSnapshotWithRetry } from './run-snapshot-reload.util';
import {
  keywordAlignmentProgressDetail,
  keywordAlignmentProgressLabel,
  keywordAlignmentProgressPercent,
} from './keyword-alignment-progress';

const MAX_POLL_FAILURES = 6;

@Injectable({ providedIn: 'root' })
export class KeywordAlignmentStore {
  private readonly api = inject(ShireApiService);

  private readonly _siteId = signal<string | null>(null);
  private readonly _snapshot = signal<KeywordAlignmentSnapshot | null>(null);
  private readonly _loadingLatest = signal(false);
  private readonly _starting = signal(false);
  private readonly _alignmentRun = signal<Thought | null>(null);
  private readonly _error = signal<string | null>(null);
  private readonly _hasCheckedLatest = signal(false);
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollFailures = 0;
  private initializedSiteId: string | null = null;

  readonly snapshot = this._snapshot.asReadonly();
  readonly alignmentRun = this._alignmentRun.asReadonly();
  readonly error = this._error.asReadonly();
  readonly hasCheckedLatest = this._hasCheckedLatest.asReadonly();
  readonly refreshingLatest = this._loadingLatest.asReadonly();
  readonly hasSnapshot = computed(() => this.snapshot() !== null);
  readonly runningAlignment = computed(() => {
    const run = this._alignmentRun();
    return run?.status === 'pending' || run?.status === 'running';
  });
  readonly showAlignmentProgress = computed(() => this._starting() || this.runningAlignment());
  readonly canStartAlignment = computed(
    () => this._hasCheckedLatest() && !this.hasSnapshot() && !this.showAlignmentProgress(),
  );
  readonly loading = computed(() => !this._hasCheckedLatest() || this.showAlignmentProgress());
  readonly alignmentProgressPercent = computed(() => {
    if (this._starting()) return 8;
    return keywordAlignmentProgressPercent(this._alignmentRun());
  });
  readonly alignmentProgressLabel = computed(() => {
    if (this._starting()) return 'Starting keyword alignment…';
    return keywordAlignmentProgressLabel(this._alignmentRun());
  });
  readonly alignmentProgressDetail = computed(() => {
    if (this._starting()) {
      return 'Creating a keyword alignment run to score confirmed keywords against audited pages.';
    }
    return keywordAlignmentProgressDetail(this._alignmentRun());
  });

  async load(siteId: string): Promise<void> {
    if (this.initializedSiteId === siteId) return;
    if (this._siteId() !== siteId) {
      this.stopPolling();
      this._alignmentRun.set(null);
      this.pollFailures = 0;
      this.initializedSiteId = null;
      this._hasCheckedLatest.set(false);
    }
    this._siteId.set(siteId);
    this.initializedSiteId = siteId;
    await this.reload();
  }

  async reload(options: { startIfMissing?: boolean } = {}): Promise<void> {
    const startIfMissing = options.startIfMissing ?? false;
    const siteId = this._siteId();
    if (!siteId) return;

    this._loadingLatest.set(true);
    this._error.set(null);
    try {
      const res = await firstValueFrom(this.api.getLatestKeywordAlignment$(siteId));
      this._snapshot.set(res.snapshot);
      this._hasCheckedLatest.set(true);
      if (res.snapshot) {
        this._alignmentRun.set(null);
        this.stopPolling();
        return;
      }

      const resumed = await this.tryResumeAlignmentRun(siteId);
      if (!resumed && startIfMissing) {
        await this.startAlignmentRun(siteId);
      }
    } catch (err) {
      this._hasCheckedLatest.set(true);
      this._error.set(parseProtopipeApiError(err, 'Could not load keyword alignment.'));
    } finally {
      this._loadingLatest.set(false);
    }
  }

  async startAlignment(): Promise<void> {
    const siteId = this._siteId();
    if (!siteId || this.showAlignmentProgress()) return;

    this._error.set(null);
    try {
      const resumed = await this.tryResumeAlignmentRun(siteId);
      if (!resumed) {
        await this.startAlignmentRun(siteId);
      }
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not start keyword alignment.'));
    }
  }

  private async startAlignmentRun(siteId: string): Promise<void> {
    this._starting.set(true);
    try {
      await this.enqueueAlignmentRun(siteId);
    } finally {
      this._starting.set(false);
    }
  }

  private async tryResumeAlignmentRun(siteId: string): Promise<boolean> {
    const latest = await this.fetchLatestAlignmentRun(siteId);
    if (!latest) return false;
    if (latest.status === 'pending' || latest.status === 'running') {
      this.attachAlignmentRun(siteId, latest);
      return true;
    }
    if (latest.status === 'failed') {
      this._alignmentRun.set(latest);
      this._error.set(latest.summary || 'Keyword alignment failed.');
      return true;
    }
    this._alignmentRun.set(null);
    return false;
  }

  private async enqueueAlignmentRun(siteId: string): Promise<void> {
    const { run } = await firstValueFrom(
      this.api.enqueueRun$(siteId, {
        thinkerKind: 'keyword_alignment_audit',
        params: { source: 'siteHealth' },
      }),
    );
    this.attachAlignmentRun(siteId, run);
  }

  private async fetchLatestAlignmentRun(siteId: string): Promise<Thought | null> {
    try {
      const { run } = await firstValueFrom(
        this.api.getLatestRun$(siteId, 'keyword_alignment_audit'),
      );
      return run;
    } catch {
      return null;
    }
  }

  private attachAlignmentRun(siteId: string, run: Thought): void {
    this._siteId.set(siteId);
    this._alignmentRun.set(run);
    this.pollFailures = 0;
    if (run.status === 'pending' || run.status === 'running') {
      this.schedulePoll(RUN_POLL_INTERVAL_MS);
    }
  }

  private schedulePoll(delayMs: number): void {
    this.stopPolling();
    this.pollTimer = setTimeout(() => this.poll(), delayMs);
  }

  private poll(): void {
    const siteId = this._siteId();
    const run = this._alignmentRun();
    if (!siteId || !run) return;

    this.api.getRun$(siteId, run.id).subscribe({
      next: ({ run: nextRun }) => {
        this.pollFailures = 0;
        this._alignmentRun.set(nextRun);
        if (!isTerminalRunStatus(nextRun.status)) {
          this.schedulePoll(RUN_POLL_INTERVAL_MS);
          return;
        }
        this.stopPolling();
        if (nextRun.status === 'complete') {
          void this.reloadAfterRunComplete();
          return;
        }
        if (nextRun.status === 'failed') {
          this._error.set(nextRun.summary || 'Keyword alignment failed.');
        }
      },
      error: () => {
        this.pollFailures += 1;
        if (this.pollFailures >= MAX_POLL_FAILURES) {
          this.stopPolling();
          this._error.set('Lost connection while waiting for keyword alignment.');
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
      () => this.fetchLatestAlignmentSnapshot(),
      () => this.hasSnapshot(),
    );
    if (saved) {
      this._alignmentRun.set(null);
      this.stopPolling();
      return;
    }
    this._alignmentRun.set(null);
    this._error.set(
      'Keyword alignment finished, but no snapshot is available yet. Try Refresh or run alignment again.',
    );
  }

  private async fetchLatestAlignmentSnapshot(): Promise<void> {
    const siteId = this._siteId();
    if (!siteId) return;
    const res = await firstValueFrom(this.api.getLatestKeywordAlignment$(siteId));
    this._snapshot.set(res.snapshot);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
