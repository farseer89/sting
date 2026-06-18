import { Injectable, inject, signal } from '@angular/core';
import type {
  PitchMediaAssetDto,
  PitchMediaKind,
  PitchMediaSlot,
  PitchPrepContextDto,
} from '@hive/contracts';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { ProtopipeApiService } from '../protopipe-api.service';

@Injectable({ providedIn: 'root' })
export class ProtopipePitchPrepService {
  private readonly api = inject(ProtopipeApiService);

  private readonly _loading = signal(false);
  private readonly _generating = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _context = signal<PitchPrepContextDto | null>(null);
  private readonly _assets = signal<PitchMediaAssetDto[]>([]);

  readonly loading = this._loading.asReadonly();
  readonly generating = this._generating.asReadonly();
  readonly error = this._error.asReadonly();
  readonly context = this._context.asReadonly();
  readonly assets = this._assets.asReadonly();

  async loadContext(siteId: string): Promise<void> {
    this._error.set(null);
    try {
      const { context } = await this.api.getPitchPrepContext(siteId);
      this._context.set(context);
    } catch {
      this._context.set(null);
    }
  }

  async ingest(siteId: string, sourceUrl?: string): Promise<PitchPrepContextDto | null> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const { context } = await this.api.ingestPitchPrep(siteId, { sourceUrl });
      this._context.set(context);
      return context;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not ingest website'));
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  async generatePack(siteId: string): Promise<PitchMediaAssetDto[]> {
    this._generating.set(true);
    this._error.set(null);
    try {
      const { assets } = await this.api.generatePitchPack(siteId);
      this._assets.set(assets);
      return assets;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not generate pitch pack'));
      return [];
    } finally {
      this._generating.set(false);
    }
  }

  async loadMedia(siteId: string): Promise<void> {
    this._error.set(null);
    try {
      const { assets } = await this.api.listPitchMedia(siteId);
      this._assets.set(assets);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load media library'));
    }
  }

  async regenerate(
    siteId: string,
    slot: PitchMediaSlot,
    kind: PitchMediaKind,
    notes: string,
  ): Promise<PitchMediaAssetDto | null> {
    this._error.set(null);
    try {
      const { asset } = await this.api.regeneratePitchAsset(siteId, { slot, kind, notes });
      this._assets.update((list) => [asset, ...list]);
      return asset;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not regenerate image'));
      return null;
    }
  }

  async selectAsset(siteId: string, assetId: string): Promise<void> {
    const { asset } = await this.api.patchPitchMediaAsset(siteId, assetId, { selected: true });
    this._assets.update((list) =>
      list.map((a) =>
        a.slot === asset.slot ? { ...a, selected: a.id === asset.id } : a,
      ),
    );
  }

  async saveStyle(siteId: string, templateId: string, theme?: string): Promise<boolean> {
    this._error.set(null);
    try {
      await this.api.patchPitchPrepStyle(siteId, { templateId, theme });
      return true;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not save site style'));
      return false;
    }
  }

  patchContext(patch: Partial<PitchPrepContextDto>): void {
    const current = this._context();
    if (!current) return;
    this._context.set({ ...current, ...patch });
  }
}
