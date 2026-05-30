import { Injectable, computed, inject, signal } from '@angular/core';
import type { ProtopipeSiteContentPlan } from '@hive/contracts';
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
  private readonly _error = signal<string | null>(null);
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  readonly plan = this._plan.asReadonly();
  readonly starting = this._starting.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly status = computed(() => this._plan()?.status ?? 'idle');
  readonly isRunning = computed(
    () => this._plan()?.status === 'running' || this._plan()?.status === 'pending',
  );
  readonly isComplete = computed(() => this._plan()?.status === 'complete');
  readonly hasFailed = computed(() => this._plan()?.status === 'failed');

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
      this._plan.set(res.plan);
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
    try {
      const res = await this.api.generate(siteId);
      this._plan.set(res.plan);
      this.startPolling();
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to generate content plan'));
    } finally {
      this._starting.set(false);
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
      const res = await this.api.getLatest(siteId);
      this._plan.set(res.plan);
      if (res.plan && (res.plan.status === 'running' || res.plan.status === 'pending')) {
        this.pollTimer = setTimeout(() => this.pollOnce(), POLL_INTERVAL_MS);
      } else {
        this.stopPolling();
      }
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to poll content plan'));
      this.stopPolling();
    }
  }
}
