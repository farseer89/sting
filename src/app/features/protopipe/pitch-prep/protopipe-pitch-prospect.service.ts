import { Injectable, inject, signal } from '@angular/core';
import type { CreatePitchProspectRequest, PitchProspectDto } from '@hive/contracts';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { ProtopipeApiService } from '../protopipe-api.service';

@Injectable({ providedIn: 'root' })
export class ProtopipePitchProspectService {
  private readonly api = inject(ProtopipeApiService);

  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _prospects = signal<PitchProspectDto[]>([]);
  private readonly _current = signal<PitchProspectDto | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly prospects = this._prospects.asReadonly();
  readonly current = this._current.asReadonly();

  async loadList(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const { prospects } = await this.api.listPitchProspects();
      this._prospects.set(prospects);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load prospects'));
    } finally {
      this._loading.set(false);
    }
  }

  async create(body: CreatePitchProspectRequest): Promise<PitchProspectDto | null> {
    this._error.set(null);
    try {
      const { prospect } = await this.api.createPitchProspect(body);
      this._prospects.update((list) => [prospect, ...list]);
      return prospect;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not create prospect'));
      return null;
    }
  }

  async loadOne(prospectId: string): Promise<PitchProspectDto | null> {
    this._error.set(null);
    try {
      const { prospect } = await this.api.getPitchProspect(prospectId);
      this._current.set(prospect);
      return prospect;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load prospect'));
      return null;
    }
  }

  async markReady(prospectId: string): Promise<void> {
    const { prospect } = await this.api.patchPitchProspect(prospectId, { status: 'ready' });
    this._current.set(prospect);
    this._prospects.update((list) =>
      list.map((p) => (p.id === prospect.id ? prospect : p)),
    );
  }
}
