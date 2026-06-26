import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  ProtopipeContentPlanProgress,
  ProtopipeContentPlanRunSummary,
  ProtopipeContentPlanStepEvent,
  ProtopipeSiteContentPlan,
} from '@hive/contracts';
import { AuthService } from '../../../core/auth/auth.service';
import { isShirePrimary } from '../shire/shire-http.util';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { ContentPlanService } from './content-plan.service';

const POLL_INTERVAL_MS = 1200;
/** Pending runs should start within a few minutes; running runs should heartbeat via updatedAt/events. */
const PENDING_STALL_MS = 3 * 60 * 1000;
const RUNNING_STALL_MS = 10 * 60 * 1000;

function lastPlanActivityMs(plan: ProtopipeSiteContentPlan): number {
  const events = plan.events ?? [];
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];
    const stamp = event.finishedAt ?? event.startedAt;
    if (stamp) {
      const ms = new Date(stamp).getTime();
      if (!Number.isNaN(ms)) return ms;
    }
  }
  const fallback = plan.updatedAt || plan.createdAt;
  const ms = new Date(fallback).getTime();
  return Number.isNaN(ms) ? Date.now() : ms;
}

@Injectable({ providedIn: 'root' })
export class ContentPlanStore {
  private readonly api = inject(ContentPlanService);
  private readonly auth = inject(AuthService);

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
  readonly isStalled = computed(() => {
    const plan = this._plan();
    if (!plan) return false;
    if (plan.status !== 'pending' && plan.status !== 'running') return false;
    const idleMs = Date.now() - lastPlanActivityMs(plan);
    if (plan.status === 'pending') return idleMs > PENDING_STALL_MS;
    return idleMs > RUNNING_STALL_MS;
  });
  readonly needsBuildRestart = computed(
    () => this.hasFailed() || this.isStalled() || Boolean(this.planError() && !this.isComplete()),
  );

  readonly currentStep = computed(() => this._plan()?.currentStep ?? null);
  readonly progress = computed<ProtopipeContentPlanProgress | null>(
    () => this._plan()?.progress ?? null,
  );
  readonly planError = computed(() => this._plan()?.error ?? null);
  readonly events = computed<ProtopipeContentPlanStepEvent[]>(
    () => this._plan()?.events ?? [],
  );

  setSiteId(siteId: string): void {
    this._siteId.set(siteId);
  }

  async loadLatest(): Promise<void> {
    const siteId = this._siteId();
    if (!siteId) return;
    if (isShirePrimary()) return;
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
    if (isShirePrimary()) return;
    this._starting.set(true);
    this._error.set(null);
    this._selectedRunId.set(null);
    this.stopPolling();
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

  /** Start a fresh content-plan run (supersedes any stuck pending/running build on the server). */
  async restartBuild(): Promise<void> {
    await this.generate();
  }

  /**
   * Confirm the current plan: server materializes calendar items into draft
   * posts and returns the plan with contentPostId back-links. Returns the
   * created/skipped counts for a user-facing message, or null on failure.
   */
  async confirmCalendarItem(
    item: { proposedPublishAt: string; workingTitle: string },
  ): Promise<{ contentPostId: string; created: boolean } | null> {
    const siteId = this._siteId();
    if (!siteId) return null;
    if (isShirePrimary()) return null;
    this._error.set(null);
    try {
      const res = await this.api.confirmItem(siteId, item);
      this._plan.set(res.plan);
      return { contentPostId: res.contentPostId, created: res.created };
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to open article in writer'));
      return null;
    }
  }

  async confirm(): Promise<{ createdCount: number; skippedCount: number } | null> {
    const siteId = this._siteId();
    if (!siteId) return null;
    if (isShirePrimary()) return null;
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
    if (isShirePrimary()) return;
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
    if (isShirePrimary()) return;
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
    if (!(await this.ensureAuthenticated())) {
      this.pollTimer = setTimeout(() => this.pollOnce(), POLL_INTERVAL_MS * 2);
      return;
    }
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
      this._error.set(null);
      if (res.plan?.status === 'failed') {
        this.stopPolling();
        void this.loadRuns();
        return;
      }
      if (res.plan && (res.plan.status === 'running' || res.plan.status === 'pending')) {
        this.pollTimer = setTimeout(() => this.pollOnce(), POLL_INTERVAL_MS);
      } else {
        this.stopPolling();
        // Refresh the picker so a freshly-finished run shows its final status.
        void this.loadRuns();
      }
    } catch (err) {
      const message = parseProtopipeApiError(err, 'Failed to poll content plan');
      this._error.set(message);
      if (this._plan()?.status === 'failed') {
        this.stopPolling();
        return;
      }
      if (this.auth.hasStoredProfile()) {
        this.pollTimer = setTimeout(() => this.pollOnce(), POLL_INTERVAL_MS * 2);
        return;
      }
      this.stopPolling();
    }
  }

  private async ensureAuthenticated(): Promise<boolean> {
    if (this.auth.hasValidAccessToken()) return true;
    if (!this.auth.hasStoredProfile()) return false;
    return this.auth.bootstrapSession();
  }
}
