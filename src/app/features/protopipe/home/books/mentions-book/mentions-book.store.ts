import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  ProtopipeMentionPromptType,
  ProtopipeMentionTrackingRunSummary,
  ProtopipeSiteMentionSnapshot,
} from '@hive/contracts';
import { parseProtopipeApiError } from '../../../protopipe-http.util';
import { MentionTrackingService } from '../../../mention-tracking/mention-tracking.service';

const POLL_INTERVAL_MS = 1500;
const POLL_MAX = 120;

export type MentionsBookSection = 'overview' | 'brief' | 'by-type' | 'history';

export const MENTION_PROMPT_TYPE_LABELS: Record<ProtopipeMentionPromptType, string> = {
  generic: 'Generic',
  local: 'Local',
  comparison: 'Comparison',
  brand_defense: 'Brand defense',
};

@Injectable()
export class MentionsBookStore {
  private readonly api = inject(MentionTrackingService);

  private readonly _siteId = signal<string | null>(null);
  private readonly _snapshot = signal<ProtopipeSiteMentionSnapshot | null>(null);
  private readonly _previousSnapshot = signal<ProtopipeSiteMentionSnapshot | null>(null);
  private readonly _runs = signal<ProtopipeMentionTrackingRunSummary[]>([]);
  private readonly _loading = signal(false);
  private readonly _running = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _forceAvailable = signal(false);
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  readonly snapshot = this._snapshot.asReadonly();
  readonly previousSnapshot = this._previousSnapshot.asReadonly();
  readonly runs = this._runs.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly running = this._running.asReadonly();
  readonly error = this._error.asReadonly();
  readonly forceAvailable = this._forceAvailable.asReadonly();

  readonly status = computed(() => this._snapshot()?.status ?? 'idle');
  readonly isRunning = computed(
    () => this._snapshot()?.status === 'running' || this._snapshot()?.status === 'pending',
  );
  readonly isComplete = computed(() => this._snapshot()?.status === 'complete');
  readonly output = computed(() => this._snapshot()?.output ?? null);
  readonly currentStep = computed(() => this._snapshot()?.currentStep ?? null);

  setSiteId(siteId: string): void {
    this._siteId.set(siteId);
  }

  async loadLatest(): Promise<void> {
    const siteId = this._siteId();
    if (!siteId) return;

    this._loading.set(true);
    this._error.set(null);
    try {
      const res = await this.api.getLatest(siteId);
      this._snapshot.set(res.snapshot);
      void this.loadRuns();
      if (res.snapshot && (res.snapshot.status === 'running' || res.snapshot.status === 'pending')) {
        this.startPolling(res.snapshot.id);
      }
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to load mention tracking'));
    } finally {
      this._loading.set(false);
    }
  }

  async loadRuns(): Promise<void> {
    const siteId = this._siteId();
    if (!siteId) return;
    try {
      const res = await this.api.listRuns(siteId);
      this._runs.set(res.runs);
      await this.loadPreviousCompleteRun(res.runs);
    } catch {
      // History is best-effort.
    }
  }

  async runCheck(force = false): Promise<void> {
    const siteId = this._siteId();
    if (!siteId || this._running()) return;

    this._running.set(true);
    this._error.set(null);
    if (force) {
      this._forceAvailable.set(false);
    }

    try {
      const res = await this.api.run(siteId, force ? { force: true } : {});
      this._snapshot.set(res.snapshot);
      this.startPolling(res.snapshot.id);
      void this.loadRuns();
    } catch (err) {
      const msg = parseProtopipeApiError(err, 'Failed to start mention check');
      if (msg.includes('recently') || msg.includes('force')) {
        this._forceAvailable.set(true);
      }
      this._error.set(msg);
    } finally {
      this._running.set(false);
    }
  }

  private startPolling(runId: string): void {
    this.stopPolling();
    void this.pollRun(runId, 0);
  }

  private async pollRun(runId: string, attempt: number): Promise<void> {
    const siteId = this._siteId();
    if (!siteId) return;

    if (attempt >= POLL_MAX) {
      this._error.set('Mention check timed out — try again in a moment.');
      return;
    }

    try {
      const res = await this.api.getRun(siteId, runId);
      if (res.snapshot) {
        this._snapshot.set(res.snapshot);
      }
      const status = res.snapshot?.status;
      if (status === 'complete' || status === 'failed') {
        void this.loadRuns();
        return;
      }
    } catch {
      // Keep polling on transient errors.
    }

    this.pollTimer = setTimeout(() => void this.pollRun(runId, attempt + 1), POLL_INTERVAL_MS);
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async loadPreviousCompleteRun(
    runs: ProtopipeMentionTrackingRunSummary[],
  ): Promise<void> {
    const siteId = this._siteId();
    const currentId = this._snapshot()?.id;
    if (!siteId || !currentId) {
      this._previousSnapshot.set(null);
      return;
    }

    const previousRun = runs
      .filter((run) => run.status === 'complete' && run.id !== currentId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

    if (!previousRun) {
      this._previousSnapshot.set(null);
      return;
    }

    try {
      const res = await this.api.getRun(siteId, previousRun.id);
      this._previousSnapshot.set(res.snapshot?.output ? res.snapshot : null);
    } catch {
      this._previousSnapshot.set(null);
    }
  }
}
