import { Injectable, computed, inject, signal } from '@angular/core';
import type { ProtopipeBootstrapResponse } from '@hive/contracts';
import { ProtopipeApiService } from '../protopipe-api.service';

/**
 * Caches the bootstrap response so the onboarding guard does not refetch
 * on every navigation. Invalidated by the wizard after a successful save.
 */
@Injectable({ providedIn: 'root' })
export class ProtopipeOnboardingStateService {
  private readonly api = inject(ProtopipeApiService);
  private pending: Promise<ProtopipeBootstrapResponse> | null = null;
  private cached: ProtopipeBootstrapResponse | null = null;
  private readonly _onboardingCompletedAt = signal<string | null | undefined>(undefined);

  readonly onboardingCompletedAt = this._onboardingCompletedAt.asReadonly();
  readonly onboardingCompletionKnown = computed(() => this._onboardingCompletedAt() !== undefined);
  readonly onboardingCompleted = computed(() => Boolean(this._onboardingCompletedAt()));

  async load(): Promise<ProtopipeBootstrapResponse> {
    if (this.cached) return this.cached;
    if (!this.pending) {
      this.pending = this.api.bootstrap().then((res) => {
        this.cached = res;
        this._onboardingCompletedAt.set(res.onboardingCompletedAt);
        this.pending = null;
        return res;
      });
    }
    return this.pending;
  }

  invalidate(): void {
    this.cached = null;
    this.pending = null;
    this._onboardingCompletedAt.set(undefined);
  }

  /** Keep bootstrap cache in sync after complete-onboarding without a full refetch. */
  applyOnboardingCompleted(at: string | null): void {
    this._onboardingCompletedAt.set(at);
    if (this.cached) {
      this.cached = { ...this.cached, onboardingCompletedAt: at };
    }
  }

  /** Synchronous read for components that have already triggered load(). */
  peek(): ProtopipeBootstrapResponse | null {
    return this.cached;
  }
}
