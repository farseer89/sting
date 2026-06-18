import { Injectable, inject, signal } from '@angular/core';
import type {
  AdminMediaStudioGenerateResponse,
  MediaStudioConfigResponse,
  MediaStudioImageSize,
  MediaStudioKind,
  MediaStudioKindOption,
} from '@hive/contracts';
import { parseProtopipeApiError } from './protopipe-http.util';
import { ProtopipeApiService } from './protopipe-api.service';

@Injectable({ providedIn: 'root' })
export class ProtopipeMediaStudioService {
  private readonly api = inject(ProtopipeApiService);

  private readonly _loadingConfig = signal(false);
  private readonly _generating = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _config = signal<MediaStudioConfigResponse | null>(null);
  private readonly _lastResult = signal<AdminMediaStudioGenerateResponse | null>(null);

  readonly loadingConfig = this._loadingConfig.asReadonly();
  readonly generating = this._generating.asReadonly();
  readonly error = this._error.asReadonly();
  readonly config = this._config.asReadonly();
  readonly lastResult = this._lastResult.asReadonly();

  kindOption(kind: MediaStudioKind): MediaStudioKindOption | undefined {
    return this._config()?.kinds.find((k) => k.kind === kind);
  }

  async loadConfig(): Promise<void> {
    this._loadingConfig.set(true);
    this._error.set(null);
    try {
      this._config.set(await this.api.getMediaStudioConfig());
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load Media Studio'));
      this._config.set(null);
    } finally {
      this._loadingConfig.set(false);
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
      return result;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Generation failed'));
      return null;
    } finally {
      this._generating.set(false);
    }
  }
}
