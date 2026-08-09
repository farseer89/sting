import { Injectable, computed, inject, signal } from '@angular/core';
import {
  RUN_POLL_BACKOFF_MS,
  RUN_POLL_INTERVAL_MS,
  isTerminalRunStatus,
  type ProtopipeContentAudit,
  type Thought,
} from '@hive/contracts';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ShireApiService } from '../../shire/shire-api.service';
import { firstValueFrom } from 'rxjs';

const AUDIT_STAGE_PERCENT: Record<string, number> = {
  load_site: 18,
  crawl_site: 58,
  persist: 84,
  finalize: 96,
};
const MAX_POLL_FAILURES = 6;

@Injectable({ providedIn: 'root' })
export class SiteHealthStore {
  private readonly api = inject(ShireApiService);

  private readonly _siteId = signal<string | null>(null);
  private readonly _audit = signal<ProtopipeContentAudit | null>(null);
  private readonly _capturedAt = signal<string | null>(null);
  private readonly _loadingLatest = signal(false);
  private readonly _startingAudit = signal(false);
  private readonly _auditRun = signal<Thought | null>(null);
  private readonly _error = signal<string | null>(null);
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollFailures = 0;

  readonly audit = this._audit.asReadonly();
  readonly capturedAt = this._capturedAt.asReadonly();
  readonly auditRun = this._auditRun.asReadonly();
  readonly error = this._error.asReadonly();
  readonly hasAudit = computed(() => this.audit() !== null);
  readonly runningAudit = computed(() => {
    const run = this._auditRun();
    return run?.status === 'pending' || run?.status === 'running';
  });
  readonly loading = computed(() => this._loadingLatest() || this._startingAudit() || this.runningAudit());
  readonly canStartAudit = computed(() => !this.hasAudit() && !this.loading());
  readonly auditProgressPercent = computed(() => {
    if (this._loadingLatest()) return 10;
    if (this._startingAudit()) return 8;
    const run = this._auditRun();
    if (!run) return 0;
    if (run.status === 'complete') return 100;
    if (run.status === 'pending') return 8;
    if (run.status === 'failed') return 0;
    return AUDIT_STAGE_PERCENT[run.currentStepId ?? ''] ?? 28;
  });
  readonly auditProgressLabel = computed(() => {
    if (this._loadingLatest()) return 'Loading latest site audit…';
    if (this._startingAudit()) return 'Starting site audit…';
    const run = this._auditRun();
    if (!run) return 'Preparing site audit…';
    if (run.status === 'pending') return 'Starting site audit…';
    if (run.status === 'complete') return 'Site audit complete';
    if (run.status === 'failed') return 'Site audit failed';
    switch (run.currentStepId) {
      case 'load_site':
        return 'Loading site crawl context…';
      case 'crawl_site':
        return 'Crawling pages and extracting signals…';
      case 'persist':
        return 'Saving site audit snapshot…';
      case 'finalize':
        return 'Finalizing site health…';
      default:
        return 'Running site audit…';
    }
  });
  readonly auditProgressDetail = computed(() => {
    const run = this._auditRun();
    if (this._loadingLatest()) {
      return 'Checking for a persisted crawl snapshot before starting new work.';
    }
    if (this._startingAudit()) {
      return 'Creating a site audit run so we can crawl the site and store a fresh snapshot.';
    }
    if (!run || run.status === 'pending') {
      return 'If no saved audit exists, we will crawl the site and store a fresh snapshot.';
    }
    return (
      run.steps.find((step) => step.id === run.currentStepId)?.summary ||
      run.summary ||
      'Building crawl coverage, refresh candidates, and Site Health inventory.'
    );
  });

  async load(siteId: string): Promise<void> {
    if (this._siteId() === siteId && (this._audit() || this.loading())) return;
    if (this._siteId() !== siteId) {
      this.stopPolling();
      this._auditRun.set(null);
      this.pollFailures = 0;
    }
    this._siteId.set(siteId);
    await this.reload();
  }

  async reload(options: { startIfMissing?: boolean } = {}): Promise<void> {
    const startIfMissing = options.startIfMissing ?? true;
    const siteId = this._siteId();
    if (!siteId) return;

    this._loadingLatest.set(true);
    this._error.set(null);
    try {
      const res = await firstValueFrom(this.api.getLatestSiteAudit$(siteId));
      this._audit.set(res.audit);
      this._capturedAt.set(res.capturedAt ?? null);
      if (res.audit) {
        this._auditRun.set(null);
        this.stopPolling();
        return;
      }
      if (startIfMissing) {
        await this.attachOrStartAuditRun(siteId);
      }
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load site health.'));
    } finally {
      this._loadingLatest.set(false);
    }
  }

  async startAudit(): Promise<void> {
    const siteId = this._siteId();
    if (!siteId || this.loading()) return;

    this._startingAudit.set(true);
    this._error.set(null);
    try {
      await this.attachOrStartAuditRun(siteId);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not start a site audit.'));
    } finally {
      this._startingAudit.set(false);
    }
  }

  private async attachOrStartAuditRun(siteId: string): Promise<void> {
    const latest = await this.loadLatestActiveAuditRun(siteId);
    if (latest) return;

    const { run } = await firstValueFrom(
      this.api.enqueueRun$(siteId, {
        thinkerKind: 'site_audit',
        params: { source: 'siteHealth' },
      }),
    );
    this.attachAuditRun(siteId, run);
  }

  private async loadLatestActiveAuditRun(siteId: string): Promise<Thought | null> {
    try {
      const { run } = await firstValueFrom(this.api.getLatestRun$(siteId, 'site_audit'));
      if (run.status === 'pending' || run.status === 'running') {
        this.attachAuditRun(siteId, run);
        return run;
      }
    } catch {
      // No prior site_audit run exists yet.
    }
    return null;
  }

  private attachAuditRun(siteId: string, run: Thought): void {
    this._siteId.set(siteId);
    this._auditRun.set(run);
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
    const run = this._auditRun();
    if (!siteId || !run) return;

    this.api.getRun$(siteId, run.id).subscribe({
      next: ({ run: nextRun }) => {
        this.pollFailures = 0;
        this._auditRun.set(nextRun);
        if (!isTerminalRunStatus(nextRun.status)) {
          this.schedulePoll(RUN_POLL_INTERVAL_MS);
          return;
        }
        this.stopPolling();
        if (nextRun.status === 'complete') {
          void this.reload({ startIfMissing: false });
          return;
        }
        if (nextRun.status === 'failed') {
          this._error.set(nextRun.summary || 'Site audit failed.');
        }
      },
      error: () => {
        this.pollFailures += 1;
        if (this.pollFailures >= MAX_POLL_FAILURES) {
          this.stopPolling();
          this._error.set('Lost connection while waiting for the site audit.');
          return;
        }
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
