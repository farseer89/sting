import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  ShireEndpoints,
  type EnqueueRunRequest,
  type KeywordRankingsListResponse,
  type RunResponse,
} from '@hive/contracts';
import { Observable } from 'rxjs';
import { shireApiUrl } from './shire-http.util';

@Injectable({ providedIn: 'root' })
export class ShireApiService {
  private readonly http = inject(HttpClient);

  getRun$(siteId: string, runId: string): Observable<RunResponse> {
    return this.http.get<RunResponse>(shireApiUrl(ShireEndpoints.runs.get(siteId, runId)));
  }

  enqueueRun$(siteId: string, body: EnqueueRunRequest): Observable<RunResponse> {
    return this.http.post<RunResponse>(shireApiUrl(ShireEndpoints.runs.enqueue(siteId)), body);
  }

  listRankings$(siteId: string): Observable<KeywordRankingsListResponse> {
    return this.http.get<KeywordRankingsListResponse>(
      shireApiUrl(ShireEndpoints.rankings.list(siteId)),
    );
  }

  rerunStep$(siteId: string, runId: string, stepId: string): Observable<RunResponse> {
    return this.http.post<RunResponse>(
      shireApiUrl(ShireEndpoints.runs.rerunStep(siteId, runId, stepId)),
      {},
    );
  }
}
