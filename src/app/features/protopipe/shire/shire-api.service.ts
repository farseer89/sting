import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  ShireEndpoints,
  type EnqueueRunRequest,
  type KeywordRankingsListResponse,
  type RunResponse,
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
