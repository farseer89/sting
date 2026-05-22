import { Injectable, inject, signal } from '@angular/core';
import type { ProtopipeLead } from '@hive/contracts';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { ProtopipeApiService } from '../protopipe-api.service';

@Injectable({ providedIn: 'root' })
export class ProtopipeLeadsService {
  private readonly api = inject(ProtopipeApiService);

  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _leads = signal<ProtopipeLead[]>([]);
  private readonly _selected = signal<ProtopipeLead | null>(null);
  private readonly _converting = signal(false);
  private readonly _convertResult = signal<string | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly leads = this._leads.asReadonly();
  readonly selected = this._selected.asReadonly();
  readonly converting = this._converting.asReadonly();
  readonly convertResult = this._convertResult.asReadonly();

  async ensureLoaded(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const res = await this.api.listLeadsForAccount();
      this._leads.set(res.leads);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load leads.'));
    } finally {
      this._loading.set(false);
    }
  }

  selectLead(lead: ProtopipeLead | null): void {
    this._selected.set(lead);
    this._convertResult.set(null);
  }

  async convertSelected(): Promise<void> {
    const lead = this._selected();
    if (!lead) return;

    this._converting.set(true);
    this._error.set(null);
    try {
      const res = await this.api.convertLead(lead.siteId, lead.id);
      this._convertResult.set(res.magicLinkUrl);
      await this.ensureLoaded();
      const updated = this._leads().find((l) => l.id === lead.id);
      if (updated) this._selected.set(updated);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not convert lead.'));
    } finally {
      this._converting.set(false);
    }
  }
}
