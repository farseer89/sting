import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  ShireEndpoints,
  type AiVisibilityLatestResponse,
  type CaptureAiVisibilityRequest,
  type CaptureAiVisibilityResponse,
  type EnqueueRunRequest,
  type KeywordAlignmentLatestResponse,
  type KeywordRankingsListResponse,
  type PageOptimizationLatestResponse,
  type PageSpeedLatestResponse,
  type RunResponse,
  type SiteAuditLatestResponse,
  type ThinkerKind,
} from '@hive/contracts';
import { Observable } from 'rxjs';
import { shireApiUrl } from './shire-http.util';

@Injectable({ providedIn: 'root' })
export class ShireApiService {
  private readonly http = inject(HttpClient);

  getRun$(siteId: string, runId: string): Observable<RunResponse> {
    return this.http.get<RunResponse>(shireApiUrl(ShireEndpoints.runs.get(siteId, runId)));
  }

  getLatestRun$(siteId: string, thinkerKind?: ThinkerKind): Observable<RunResponse> {
    const params = thinkerKind ? { thinkerKind } : undefined;
    return this.http.get<RunResponse>(shireApiUrl(ShireEndpoints.runs.latest(siteId)), {
      params,
    });
  }

  enqueueRun$(siteId: string, body: EnqueueRunRequest): Observable<RunResponse> {
    return this.http.post<RunResponse>(shireApiUrl(ShireEndpoints.runs.enqueue(siteId)), body);
  }

  listRankings$(siteId: string): Observable<KeywordRankingsListResponse> {
    return this.http.get<KeywordRankingsListResponse>(
      shireApiUrl(ShireEndpoints.rankings.list(siteId)),
    );
  }

  getLatestSiteAudit$(siteId: string): Observable<SiteAuditLatestResponse> {
    return this.http.get<SiteAuditLatestResponse>(
      shireApiUrl(ShireEndpoints.siteAudits.latest(siteId)),
    );
  }

  getLatestKeywordAlignment$(siteId: string): Observable<KeywordAlignmentLatestResponse> {
    return this.http.get<KeywordAlignmentLatestResponse>(
      shireApiUrl(ShireEndpoints.keywordAlignments.latest(siteId)),
    );
  }

  getLatestPageOptimization$(siteId: string): Observable<PageOptimizationLatestResponse> {
    return this.http.get<PageOptimizationLatestResponse>(
      shireApiUrl(ShireEndpoints.pageOptimizations.latest(siteId)),
    );
  }

  getLatestPageSpeed$(siteId: string): Observable<PageSpeedLatestResponse> {
    return this.http.get<PageSpeedLatestResponse>(
      shireApiUrl(ShireEndpoints.pageSpeed.latest(siteId)),
    );
  }

  getLatestAiVisibility$(siteId: string): Observable<AiVisibilityLatestResponse> {
    return this.http.get<AiVisibilityLatestResponse>(
      shireApiUrl(ShireEndpoints.aiVisibility.latest(siteId)),
    );
  }

  captureAiVisibility$(
    siteId: string,
    body: CaptureAiVisibilityRequest,
  ): Observable<CaptureAiVisibilityResponse> {
    return this.http.post<CaptureAiVisibilityResponse>(
      shireApiUrl(ShireEndpoints.aiVisibility.capture(siteId)),
      body,
    );
  }

  /** Back-compat for builds that POST here instead of /runs. */
  researchRankings$(siteId: string): Observable<{ runId: string }> {
    return this.http.post<{ runId: string }>(
      shireApiUrl(ShireEndpoints.rankings.research(siteId)),
      {},
    );
  }

  rerunStep$(siteId: string, runId: string, stepId: string): Observable<RunResponse> {
    return this.http.post<RunResponse>(
      shireApiUrl(ShireEndpoints.runs.rerunStep(siteId, runId, stepId)),
      {},
    );
  }
}
