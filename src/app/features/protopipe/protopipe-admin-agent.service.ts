import { Injectable, inject, signal } from '@angular/core';
import type {
  AdminSiteSummaryDto,
  GlobalKnowledgeDto,
  SiteKnowledgeChunkDto,
} from '@hive/contracts';
import { parseProtopipeApiError } from './protopipe-http.util';
import { ProtopipeApiService } from './protopipe-api.service';

@Injectable({ providedIn: 'root' })
export class ProtopipeAdminAgentService {
  private readonly api = inject(ProtopipeApiService);

  private readonly _loading = signal(false);
  private readonly _saving = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _global = signal<GlobalKnowledgeDto | null>(null);
  private readonly _sites = signal<AdminSiteSummaryDto[]>([]);
  private readonly _selectedSiteId = signal<string | null>(null);
  private readonly _siteChunks = signal<SiteKnowledgeChunkDto[]>([]);
  private readonly _globalDirty = signal(false);

  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly error = this._error.asReadonly();
  readonly global = this._global.asReadonly();
  readonly sites = this._sites.asReadonly();
  readonly selectedSiteId = this._selectedSiteId.asReadonly();
  readonly siteChunks = this._siteChunks.asReadonly();
  readonly globalDirty = this._globalDirty.asReadonly();

  async loadControlPanel(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const [globalRes, sitesRes] = await Promise.all([
        this.api.getGlobalKnowledge(),
        this.api.listAdminSites(),
      ]);
      this._global.set(globalRes.knowledge);
      this._sites.set(sitesRes.sites);
      this._globalDirty.set(false);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load agent control'));
    } finally {
      this._loading.set(false);
    }
  }

  setGlobalRules(rules: string[]): void {
    const g = this._global();
    if (!g) return;
    this._global.set({ ...g, rules });
    this._globalDirty.set(true);
  }

  async saveGlobal(): Promise<boolean> {
    const g = this._global();
    if (!g || !this._globalDirty()) return true;

    this._saving.set(true);
    this._error.set(null);

    try {
      const { knowledge } = await this.api.patchGlobalKnowledge({
        rules: g.rules,
        chunks: g.chunks.map((c) => ({
          id: c.id,
          type: c.type,
          title: c.title,
          body: c.body,
        })),
      });
      this._global.set(knowledge);
      this._globalDirty.set(false);
      return true;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Save failed'));
      return false;
    } finally {
      this._saving.set(false);
    }
  }

  async selectSite(siteId: string): Promise<void> {
    this._selectedSiteId.set(siteId);
    this._error.set(null);

    try {
      const { chunks } = await this.api.getAdminSiteKnowledge(siteId);
      this._siteChunks.set(chunks);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load site knowledge'));
      this._siteChunks.set([]);
    }
  }
}
