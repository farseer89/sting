import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ProtopipeEndpoints } from '@hive/contracts';
import type {
  CreateContentPostRequest,
  ProtopipeBootstrapResponse,
  ProtopipeContentListResponse,
  ProtopipeContentPostResponse,
  ProtopipeDataForSeoStatusResponse,
  ProtopipeKeywordMetricHistoryResponse,
  ProtopipeMarketEnrichResponse,
  ProtopipePlan,
  ProtopipePublishContentResponse,
  SaveKeywordsRequest,
  SaveKeywordsResponse,
  UpdateContentPostRequest,
} from '@hive/contracts';
import { firstValueFrom } from 'rxjs';
import { protopipeApiUrl } from './protopipe-http.util';

@Injectable({ providedIn: 'root' })
export class ProtopipeApiService {
  private readonly http = inject(HttpClient);

  bootstrap(): Promise<ProtopipeBootstrapResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeBootstrapResponse>(
        protopipeApiUrl(ProtopipeEndpoints.bootstrap.path),
      ),
    );
  }

  getPlan(siteId: string): Promise<ProtopipePlan> {
    return firstValueFrom(
      this.http.get<ProtopipePlan>(
        protopipeApiUrl(ProtopipeEndpoints.getPlan.path, { siteId }),
      ),
    );
  }

  saveKeywords(siteId: string, body: SaveKeywordsRequest): Promise<SaveKeywordsResponse> {
    return firstValueFrom(
      this.http.put<SaveKeywordsResponse>(
        protopipeApiUrl(ProtopipeEndpoints.saveKeywords.path, { siteId }),
        body,
      ),
    );
  }

  /** Verifies bagend → DataForSEO credentials (JWT required; secrets stay on server). */
  dataForSeoStatus(): Promise<ProtopipeDataForSeoStatusResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeDataForSeoStatusResponse>(
        protopipeApiUrl(ProtopipeEndpoints.dataForSeoStatus.path),
      ),
    );
  }

  enrichMarket(siteId: string): Promise<ProtopipeMarketEnrichResponse> {
    return firstValueFrom(
      this.http.post<ProtopipeMarketEnrichResponse>(
        protopipeApiUrl(ProtopipeEndpoints.marketEnrich.path, { siteId }),
        {},
      ),
    );
  }

  getKeywordMetricHistory(
    siteId: string,
    keywordId: string,
    limit = 24,
  ): Promise<ProtopipeKeywordMetricHistoryResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeKeywordMetricHistoryResponse>(
        protopipeApiUrl(ProtopipeEndpoints.keywordMetricHistory.path, { siteId, keywordId }),
        { params: { limit: String(limit) } },
      ),
    );
  }

  listContent(siteId: string): Promise<ProtopipeContentListResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeContentListResponse>(
        protopipeApiUrl(ProtopipeEndpoints.listContent.path, { siteId }),
      ),
    );
  }

  getContent(siteId: string, postId: string): Promise<ProtopipeContentPostResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeContentPostResponse>(
        protopipeApiUrl(ProtopipeEndpoints.getContent.path, { siteId, postId }),
      ),
    );
  }

  createContent(
    siteId: string,
    body: CreateContentPostRequest,
  ): Promise<ProtopipeContentPostResponse> {
    return firstValueFrom(
      this.http.post<ProtopipeContentPostResponse>(
        protopipeApiUrl(ProtopipeEndpoints.createContent.path, { siteId }),
        body,
      ),
    );
  }

  updateContent(
    siteId: string,
    postId: string,
    body: UpdateContentPostRequest,
  ): Promise<ProtopipeContentPostResponse> {
    return firstValueFrom(
      this.http.put<ProtopipeContentPostResponse>(
        protopipeApiUrl(ProtopipeEndpoints.updateContent.path, { siteId, postId }),
        body,
      ),
    );
  }

  publishContent(siteId: string, postId: string): Promise<ProtopipePublishContentResponse> {
    return firstValueFrom(
      this.http.post<ProtopipePublishContentResponse>(
        protopipeApiUrl(ProtopipeEndpoints.publishContent.path, { siteId, postId }),
        {},
      ),
    );
  }
}
