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
import { Observable, firstValueFrom } from 'rxjs';
import { protopipeApiUrl } from './protopipe-http.util';

@Injectable({ providedIn: 'root' })
export class ProtopipeApiService {
  private readonly http = inject(HttpClient);

  bootstrap$(): Observable<ProtopipeBootstrapResponse> {
    return this.http.get<ProtopipeBootstrapResponse>(
      protopipeApiUrl(ProtopipeEndpoints.bootstrap.path),
    );
  }

  bootstrap(): Promise<ProtopipeBootstrapResponse> {
    return firstValueFrom(this.bootstrap$());
  }

  getPlan$(siteId: string): Observable<ProtopipePlan> {
    return this.http.get<ProtopipePlan>(
      protopipeApiUrl(ProtopipeEndpoints.getPlan.path, { siteId }),
    );
  }

  getPlan(siteId: string): Promise<ProtopipePlan> {
    return firstValueFrom(this.getPlan$(siteId));
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

  listContent$(siteId: string): Observable<ProtopipeContentListResponse> {
    return this.http.get<ProtopipeContentListResponse>(
      protopipeApiUrl(ProtopipeEndpoints.listContent.path, { siteId }),
    );
  }

  listContent(siteId: string): Promise<ProtopipeContentListResponse> {
    return firstValueFrom(this.listContent$(siteId));
  }

  getContent(siteId: string, postId: string): Promise<ProtopipeContentPostResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeContentPostResponse>(
        protopipeApiUrl(ProtopipeEndpoints.getContent.path, { siteId, postId }),
      ),
    );
  }

  createContent$(
    siteId: string,
    body: CreateContentPostRequest,
  ): Observable<ProtopipeContentPostResponse> {
    return this.http.post<ProtopipeContentPostResponse>(
      protopipeApiUrl(ProtopipeEndpoints.createContent.path, { siteId }),
      body,
    );
  }

  createContent(
    siteId: string,
    body: CreateContentPostRequest,
  ): Promise<ProtopipeContentPostResponse> {
    return firstValueFrom(this.createContent$(siteId, body));
  }

  updateContent$(
    siteId: string,
    postId: string,
    body: UpdateContentPostRequest,
  ): Observable<ProtopipeContentPostResponse> {
    return this.http.put<ProtopipeContentPostResponse>(
      protopipeApiUrl(ProtopipeEndpoints.updateContent.path, { siteId, postId }),
      body,
    );
  }

  updateContent(
    siteId: string,
    postId: string,
    body: UpdateContentPostRequest,
  ): Promise<ProtopipeContentPostResponse> {
    return firstValueFrom(this.updateContent$(siteId, postId, body));
  }

  publishContent$(siteId: string, postId: string): Observable<ProtopipePublishContentResponse> {
    return this.http.post<ProtopipePublishContentResponse>(
      protopipeApiUrl(ProtopipeEndpoints.publishContent.path, { siteId, postId }),
      {},
    );
  }

  publishContent(siteId: string, postId: string): Promise<ProtopipePublishContentResponse> {
    return firstValueFrom(this.publishContent$(siteId, postId));
  }
}
