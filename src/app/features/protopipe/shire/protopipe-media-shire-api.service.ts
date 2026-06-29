import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  AdminMediaStudioGenerateResponse,
  MediaStudioConfigResponse,
  MediaStudioHistoryResponse,
  MediaStudioImageSize,
  MediaStudioKind,
} from '@hive/contracts';
import { shireApiUrl } from './shire-http.util';

export interface ShireMediaAssetDto {
  id: string;
  source: 'generated' | 'uploaded';
  url: string;
  width?: number;
  height?: number;
  prompt?: string;
  model?: string;
  imageSize?: MediaStudioImageSize;
  originalFilename?: string;
  contentType?: string;
  label?: string;
  selected: boolean;
  createdAt?: string;
}

export interface ShireMediaAssetsResponseDto {
  assets: ShireMediaAssetDto[];
}

export interface ShireMediaGenerateResponseDto extends AdminMediaStudioGenerateResponse {
  assets: ShireMediaAssetDto[];
}

@Injectable({ providedIn: 'root' })
export class ProtopipeMediaShireApiService {
  private readonly http = inject(HttpClient);

  getConfig(siteId: string): Promise<MediaStudioConfigResponse> {
    return firstValueFrom(
      this.http.get<MediaStudioConfigResponse>(
        shireApiUrl(`/api/sites/${encodeURIComponent(siteId)}/media-studio/config`),
      ),
    );
  }

  getHistory(siteId: string, limit = 50): Promise<MediaStudioHistoryResponse> {
    const params = new HttpParams().set('limit', String(limit));
    return firstValueFrom(
      this.http.get<MediaStudioHistoryResponse>(
        shireApiUrl(`/api/sites/${encodeURIComponent(siteId)}/media-studio/history`),
        { params },
      ),
    );
  }

  generate(
    siteId: string,
    body: {
      kind: MediaStudioKind;
      prompt: string;
      model?: string;
      imageSize?: MediaStudioImageSize;
      numImages?: number;
    },
  ): Promise<ShireMediaGenerateResponseDto> {
    return firstValueFrom(
      this.http.post<ShireMediaGenerateResponseDto>(
        shireApiUrl(`/api/sites/${encodeURIComponent(siteId)}/media-studio/generate`),
        body,
      ),
    );
  }

  listAssets(siteId: string): Promise<ShireMediaAssetsResponseDto> {
    return firstValueFrom(
      this.http.get<ShireMediaAssetsResponseDto>(
        shireApiUrl(`/api/sites/${encodeURIComponent(siteId)}/media-assets`),
      ),
    );
  }

  upload(siteId: string, file: File): Promise<{ asset: ShireMediaAssetDto }> {
    const form = new FormData();
    form.append('file', file);
    return firstValueFrom(
      this.http.post<{ asset: ShireMediaAssetDto }>(
        shireApiUrl(`/api/sites/${encodeURIComponent(siteId)}/media-assets/uploads`),
        form,
      ),
    );
  }
}
