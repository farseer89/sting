import { Injectable, computed, inject, signal } from '@angular/core';
import type { ProtopipeSiteContentPlan } from '@hive/contracts';
import { ContentPlanService } from '../../content-plan/content-plan.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';

@Injectable({ providedIn: 'root' })
export class SiteHealthStore {
  private readonly api = inject(ContentPlanService);

  private readonly _siteId = signal<string | null>(null);
  private readonly _plan = signal<ProtopipeSiteContentPlan | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly plan = this._plan.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly audit = computed(() => this._plan()?.existingContent ?? null);
  readonly hasPlan = computed(() => this._plan() !== null);
  readonly hasAudit = computed(() => this.audit() !== null);

  async load(siteId: string): Promise<void> {
    if (this._siteId() === siteId && (this._plan() || this._loading())) return;
    this._siteId.set(siteId);
    await this.reload();
  }

  async reload(): Promise<void> {
    const siteId = this._siteId();
    if (!siteId) return;

    this._loading.set(true);
    this._error.set(null);
    try {
      const res = await this.api.getLatest(siteId);
      this._plan.set(res.plan);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load site health.'));
    } finally {
      this._loading.set(false);
    }
  }
}
