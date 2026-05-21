import { Injectable, inject, signal } from '@angular/core';
import type { SiteBuilderComponentEntry } from '@hive/contracts';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { ProtopipeApiService } from '../protopipe-api.service';

@Injectable({ providedIn: 'root' })
export class ProtopipeSiteBuilderService {
  private readonly api = inject(ProtopipeApiService);

  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _components = signal<SiteBuilderComponentEntry[]>([]);
  private readonly _stats = signal({ total: 0, interactive: 0, adminTabled: 0 });
  private readonly _loaded = signal(false);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly components = this._components.asReadonly();
  readonly stats = this._stats.asReadonly();

  async ensureLoaded(): Promise<void> {
    if (this._loaded()) return;
    this._loading.set(true);
    this._error.set(null);
    try {
      const res = await this.api.getSiteBuilderComponents();
      this._components.set(res.components);
      this._stats.set(res.stats);
      this._loaded.set(true);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load component library.'));
    } finally {
      this._loading.set(false);
    }
  }

  getComponentById(id: string): SiteBuilderComponentEntry | undefined {
    return this._components().find((c) => c.id === id);
  }
}
