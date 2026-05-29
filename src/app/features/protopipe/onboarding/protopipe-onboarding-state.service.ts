import { Injectable, inject } from '@angular/core';
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

  async load(): Promise<ProtopipeBootstrapResponse> {
    if (this.cached) return this.cached;
    if (!this.pending) {
      this.pending = this.api.bootstrap().then((res) => {
        this.cached = res;
        this.pending = null;
        return res;
      });
    }
    return this.pending;
  }

  invalidate(): void {
    this.cached = null;
    this.pending = null;
  }

  /** Synchronous read for components that have already triggered load(). */
  peek(): ProtopipeBootstrapResponse | null {
    return this.cached;
  }
}
