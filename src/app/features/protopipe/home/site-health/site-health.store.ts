import { Injectable, computed, inject, signal } from '@angular/core';
import type { ProtopipeContentAudit } from '@hive/contracts';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ShireApiService } from '../../shire/shire-api.service';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SiteHealthStore {
  private readonly api = inject(ShireApiService);

  private readonly _siteId = signal<string | null>(null);
  private readonly _audit = signal<ProtopipeContentAudit | null>(null);
  private readonly _capturedAt = signal<string | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly audit = this._audit.asReadonly();
  readonly capturedAt = this._capturedAt.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly hasAudit = computed(() => this.audit() !== null);

  async load(siteId: string): Promise<void> {
    if (this._siteId() === siteId && (this._audit() || this._loading())) return;
    this._siteId.set(siteId);
    await this.reload();
  }

  async reload(): Promise<void> {
    const siteId = this._siteId();
    if (!siteId) return;

    this._loading.set(true);
    this._error.set(null);
    try {
      const res = await firstValueFrom(this.api.getLatestSiteAudit$(siteId));
      this._audit.set(res.audit);
      this._capturedAt.set(res.capturedAt ?? null);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load site health.'));
    } finally {
      this._loading.set(false);
    }
  }
}
