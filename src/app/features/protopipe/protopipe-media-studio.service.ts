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

@Injectable({ providedIn: 'root' })
export class ProtopipeMediaStudioService {
  private readonly api = inject(ProtopipeApiService);

  private readonly _loadingConfig = signal(false);
  private readonly _loadingHistory = signal(false);
  private readonly _generating = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _config = signal<MediaStudioConfigResponse | null>(null);
  private readonly _lastResult = signal<AdminMediaStudioGenerateResponse | null>(null);
  private readonly _usingFallbackConfig = signal(false);
  private readonly _history = signal<MediaStudioHistoryResponse | null>(null);

  readonly loadingConfig = this._loadingConfig.asReadonly();
  readonly loadingHistory = this._loadingHistory.asReadonly();
  readonly generating = this._generating.asReadonly();
  readonly error = this._error.asReadonly();
  readonly config = this._config.asReadonly();
  readonly lastResult = this._lastResult.asReadonly();
  readonly usingFallbackConfig = this._usingFallbackConfig.asReadonly();
  readonly history = this._history.asReadonly();

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
      this._config.set(await this.api.getMediaStudioConfig());
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
      this._history.set(await this.api.getMediaStudioHistory());
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
  }): Promise<AdminMediaStudioGenerateResponse | null> {
    this._generating.set(true);
    this._error.set(null);
    try {
      const result = await this.api.generateMediaStudio(input);
      this._lastResult.set(result);
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
