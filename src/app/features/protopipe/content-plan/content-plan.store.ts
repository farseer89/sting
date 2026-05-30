import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  ProtopipeContentPlanRunSummary,
  ProtopipeContentPlanStepEvent,
  ProtopipeSiteContentPlan,
} from '@hive/contracts';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { ContentPlanService } from './content-plan.service';

const POLL_INTERVAL_MS = 1200;

@Injectable({ providedIn: 'root' })
export class ContentPlanStore {
  private readonly api = inject(ContentPlanService);

  private readonly _siteId = signal<string | null>(null);
  private readonly _plan = signal<ProtopipeSiteContentPlan | null>(null);
  private readonly _starting = signal(false);
  private readonly _loading = signal(false);
  private readonly _confirming = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _runs = signal<ProtopipeContentPlanRunSummary[]>([]);
  /** null = follow the latest run; otherwise a pinned run id being replayed. */
  private readonly _selectedRunId = signal<string | null>(null);
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  readonly plan = this._plan.asReadonly();
  readonly starting = this._starting.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly confirming = this._confirming.asReadonly();
  readonly error = this._error.asReadonly();
  readonly runs = this._runs.asReadonly();
  readonly selectedRunId = this._selectedRunId.asReadonly();

  readonly status = computed(() => this._plan()?.status ?? 'idle');
  readonly isRunning = computed(
    () => this._plan()?.status === 'running' || this._plan()?.status === 'pending',
  );
  readonly isComplete = computed(() => this._plan()?.status === 'complete');
  readonly hasFailed = computed(() => this._plan()?.status === 'failed');

  readonly currentStep = computed(() => this._plan()?.currentStep ?? null);
  readonly events = computed<ProtopipeContentPlanStepEvent[]>(
    () => this._plan()?.events ?? [],
  );

  setSiteId(siteId: string): void {
    this._siteId.set(siteId);
  }

  async loadLatest(): Promise<void> {
    const siteId = this._siteId();
    if (!siteId) return;
    this._loading.set(true);
    this._error.set(null);
    this._selectedRunId.set(null);
    try {
      const res = await this.api.getLatest(siteId);
      this._plan.set(res.plan);
      void this.loadRuns();
      if (res.plan && (res.plan.status === 'running' || res.plan.status === 'pending')) {
        this.startPolling();
      }
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to load content plan'));
    } finally {
      this._loading.set(false);
    }
  }

  async generate(): Promise<void> {
    const siteId = this._siteId();
    if (!siteId) {
      this._error.set('No site selected');
      return;
    }
    this._starting.set(true);
    this._error.set(null);
    this._selectedRunId.set(null);
    try {
      const res = await this.api.generate(siteId);
      this._plan.set(res.plan);
      void this.loadRuns();
      this.startPolling();
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to generate content plan'));
    } finally {
      this._starting.set(false);
    }
  }

  /**
   * Confirm the current plan: server materializes calendar items into draft
   * posts and returns the plan with contentPostId back-links. Returns the
   * created/skipped counts for a user-facing message, or null on failure.
   */
  async confirm(): Promise<{ createdCount: number; skippedCount: number } | null> {
    const siteId = this._siteId();
    if (!siteId) return null;
    this._confirming.set(true);
    this._error.set(null);
    try {
      const res = await this.api.confirm(siteId);
      this._plan.set(res.plan);
      return { createdCount: res.createdCount, skippedCount: res.skippedCount };
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to confirm content plan'));
      return null;
    } finally {
      this._confirming.set(false);
    }
  }

  async loadRuns(): Promise<void> {
    const siteId = this._siteId();
    if (!siteId) return;
    try {
      const res = await this.api.listRuns(siteId);
      this._runs.set(res.runs);
    } catch {
      // Run list is supplementary; failures shouldn't block the main view.
    }
  }

  /** Pin and load a specific run for replay, or pass null to follow latest. */
  async selectRun(planId: string | null): Promise<void> {
    const siteId = this._siteId();
    if (!siteId) return;
    this.stopPolling();
    this._selectedRunId.set(planId);
    if (planId === null) {
      await this.loadLatest();
      return;
    }
    this._loading.set(true);
    this._error.set(null);
    try {
      const res = await this.api.getRun(siteId, planId);
      this._plan.set(res.plan);
      if (res.plan && (res.plan.status === 'running' || res.plan.status === 'pending')) {
        this.startPolling();
      }
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to load plan run'));
    } finally {
      this._loading.set(false);
    }
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollTimer = setTimeout(() => this.pollOnce(), POLL_INTERVAL_MS);
  }

  private async pollOnce(): Promise<void> {
    const siteId = this._siteId();
    if (!siteId) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      this.pollTimer = setTimeout(() => this.pollOnce(), POLL_INTERVAL_MS * 4);
      return;
    }
    try {
      const selectedRunId = this._selectedRunId();
      const res = selectedRunId
        ? await this.api.getRun(siteId, selectedRunId)
        : await this.api.getLatest(siteId);
      this._plan.set(res.plan);
      if (res.plan && (res.plan.status === 'running' || res.plan.status === 'pending')) {
        this.pollTimer = setTimeout(() => this.pollOnce(), POLL_INTERVAL_MS);
      } else {
        this.stopPolling();
        // Refresh the picker so a freshly-finished run shows its final status.
        void this.loadRuns();
      }
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to poll content plan'));
      this.stopPolling();
    }
  }
}
