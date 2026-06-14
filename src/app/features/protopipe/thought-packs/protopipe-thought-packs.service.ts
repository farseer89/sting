import { Injectable, computed, inject, signal } from '@angular/core';
import type { CognitivePackCatalogItem } from '@hive/contracts';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { ProtopipeStrategyService } from '../protopipe-strategy.service';
import { ProtopipeThoughtPacksApiService } from './protopipe-thought-packs-api.service';

@Injectable({ providedIn: 'root' })
export class ProtopipeThoughtPacksService {
  private readonly api = inject(ProtopipeThoughtPacksApiService);
  private readonly strategy = inject(ProtopipeStrategyService);

  private readonly _catalog = signal<CognitivePackCatalogItem[]>([]);
  private readonly _loading = signal(false);
  private readonly _saving = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _saveMessage = signal<string | null>(null);

  readonly catalog = this._catalog.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly error = this._error.asReadonly();
  readonly saveMessage = this._saveMessage.asReadonly();

  readonly siteDefaultPackId = computed(() => this.strategy.defaultCognitivePackId());

  readonly catalogById = computed(() => {
    const map = new Map<string, CognitivePackCatalogItem>();
    for (const pack of this._catalog()) {
      map.set(pack.id, pack);
    }
    return map;
  });

  async ensureCatalogLoaded(): Promise<void> {
    if (this._catalog().length > 0 || this._loading()) {
      return;
    }
    await this.loadCatalog();
  }

  async loadCatalog(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const res = await this.api.listCognitivePacks();
      this._catalog.set(res.packs);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to load thought packs'));
    } finally {
      this._loading.set(false);
    }
  }

  getPackById(id: string): CognitivePackCatalogItem | undefined {
    return this.catalogById().get(id);
  }

  async setSiteDefault(pack: CognitivePackCatalogItem): Promise<boolean> {
    const siteId = this.strategy.siteId();
    if (!siteId) {
      this._error.set('No site loaded');
      return false;
    }

    this._saving.set(true);
    this._error.set(null);
    this._saveMessage.set(null);
    try {
      const res = await this.api.setSiteDefaultCognitivePack(siteId, {
        cognitivePackId: pack.id,
      });
      this.strategy.applyDefaultCognitivePackId(res.defaultCognitivePackId);
      this._saveMessage.set(`${pack.label} is now your site default.`);
      return true;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to set site default'));
      return false;
    } finally {
      this._saving.set(false);
    }
  }

  clearSaveMessage(): void {
    this._saveMessage.set(null);
  }
}
