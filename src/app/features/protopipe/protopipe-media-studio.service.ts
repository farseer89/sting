import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import type {
  AdminMediaStudioGenerateResponse,
  MediaStudioConfigResponse,
  MediaStudioHistoryEntry,
  MediaStudioHistoryResponse,
  MediaStudioImageSize,
  MediaStudioKind,
  MediaStudioKindOption,
} from '@hive/contracts';
import { parseProtopipeApiError } from './protopipe-http.util';
import { ProtopipeApiService } from './protopipe-api.service';
import { MEDIA_STUDIO_FALLBACK_CONFIG } from './media-studio-fallback.config';
import { ProtopipeStrategyService } from './protopipe-strategy.service';
import {
  ProtopipeMediaShireApiService,
  type ShireMediaAssetDto,
  type ShireMediaGenerateResponseDto,
} from './shire/protopipe-media-shire-api.service';

@Injectable({ providedIn: 'root' })
export class ProtopipeMediaStudioService {
  private readonly api = inject(ProtopipeApiService);
  private readonly shireApi = inject(ProtopipeMediaShireApiService);
  private readonly strategy = inject(ProtopipeStrategyService);

  private readonly _loadingConfig = signal(false);
  private readonly _loadingHistory = signal(false);
  private readonly _generating = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _config = signal<MediaStudioConfigResponse | null>(null);
  private readonly _lastResult = signal<AdminMediaStudioGenerateResponse | null>(null);
  private readonly _usingFallbackConfig = signal(false);
  private readonly _history = signal<MediaStudioHistoryResponse | null>(null);
  private readonly _assets = signal<ShireMediaAssetDto[]>([]);

  readonly loadingConfig = this._loadingConfig.asReadonly();
  readonly loadingHistory = this._loadingHistory.asReadonly();
  readonly generating = this._generating.asReadonly();
  readonly error = this._error.asReadonly();
  readonly config = this._config.asReadonly();
  readonly lastResult = this._lastResult.asReadonly();
  readonly usingFallbackConfig = this._usingFallbackConfig.asReadonly();
  readonly history = this._history.asReadonly();
  readonly assets = this._assets.asReadonly();

  readonly historyItems = computed(() => this._history()?.items ?? []);
  readonly totalCostUsd = computed(() => this._history()?.totalCostUsd ?? 0);
  readonly totalGenerations = computed(() => this._history()?.totalGenerations ?? 0);
  readonly historyCurrency = computed(() => this._history()?.currency ?? 'USD');

  kindOption(kind: MediaStudioKind): MediaStudioKindOption | undefined {
    return this._config()?.kinds?.find((k) => k.kind === kind);
  }

  async loadConfig(): Promise<void> {
    this._loadingConfig.set(true);
    this._error.set(null);
    this._usingFallbackConfig.set(false);
    try {
      const siteId = this.strategy.siteId();
      this._config.set(
        siteId ? await this.shireApi.getConfig(siteId) : await this.api.getMediaStudioConfig(),
      );
    } catch (err) {
      const message = this.describeConfigError(err);
      this._error.set(message);
      this._config.set(MEDIA_STUDIO_FALLBACK_CONFIG);
      this._usingFallbackConfig.set(true);
    } finally {
      this._loadingConfig.set(false);
    }
  }

  async loadHistory(): Promise<void> {
    this._loadingHistory.set(true);
    try {
      const siteId = this.strategy.siteId();
      this._history.set(
        siteId ? await this.shireApi.getHistory(siteId) : await this.api.getMediaStudioHistory(),
      );
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load generation history'));
    } finally {
      this._loadingHistory.set(false);
    }
  }

  async generate(input: {
    kind: MediaStudioKind;
    prompt: string;
    model?: string;
    imageSize?: MediaStudioImageSize;
    numImages?: number;
  }): Promise<ShireMediaGenerateResponseDto | AdminMediaStudioGenerateResponse | null> {
    this._generating.set(true);
    this._error.set(null);
    try {
      const siteId = this.strategy.siteId();
      const result = siteId
        ? await this.shireApi.generate(siteId, input)
        : await this.api.generateMediaStudio(input);
      this._lastResult.set(result);
      const generatedAssets = this.generatedAssetsFromResult(result);
      if (generatedAssets.length) {
        this._assets.update((assets) => [
          ...generatedAssets,
          ...assets.filter((asset) => !generatedAssets.some((next) => next.id === asset.id)),
        ]);
      }
      this.prependHistoryEntry(result);
      return result;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Generation failed'));
      return null;
    } finally {
      this._generating.set(false);
    }
  }

  private prependHistoryEntry(result: AdminMediaStudioGenerateResponse): void {
    if (!result.id || !result.createdAt) {
      void this.loadHistory();
      return;
    }

    const entry: MediaStudioHistoryEntry = {
      id: result.id,
      kind: result.kind,
      model: result.model,
      prompt: result.prompt,
      imageSize: result.imageSize,
      numImages: result.numImages,
      images: result.images,
      cost: result.cost,
      createdAt: result.createdAt,
    };

    const current = this._history();
    if (!current) {
      void this.loadHistory();
      return;
    }

    this._history.set({
      ...current,
      items: [entry, ...current.items.filter((item) => item.id !== entry.id)],
      totalGenerations: current.totalGenerations + 1,
      totalCostUsd: Math.round((current.totalCostUsd + result.cost.totalUsd) * 10_000) / 10_000,
    });
  }

  private generatedAssetsFromResult(
    result: ShireMediaGenerateResponseDto | AdminMediaStudioGenerateResponse,
  ): ShireMediaAssetDto[] {
    return 'assets' in result && Array.isArray(result.assets) ? result.assets : [];
  }

  async loadAssets(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    try {
      this._assets.set((await this.shireApi.listAssets(siteId)).assets);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load site image library'));
    }
  }

  async upload(file: File): Promise<ShireMediaAssetDto | null> {
    const siteId = this.strategy.siteId();
    if (!siteId) {
      this._error.set('No active site is available for image upload.');
      return null;
    }
    this._error.set(null);
    try {
      const result = await this.shireApi.upload(siteId, file);
      this._assets.update((assets) => [
        result.asset,
        ...assets.filter((asset) => asset.id !== result.asset.id),
      ]);
      return result.asset;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Image upload failed'));
      return null;
    }
  }

  private describeConfigError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 404) {
        return 'Media Studio API is not available yet — showing offline defaults. Generation will work once the server restarts.';
      }
      if (err.status === 401) {
        return 'Session expired. Sign in again to load live model pricing.';
      }
    }
    return parseProtopipeApiError(err, 'Could not load Media Studio — showing offline defaults.');
  }
}
