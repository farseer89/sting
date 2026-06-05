import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { protopipeApiUrl } from '../../protopipe-http.util';
import type { KeywordDiscoveryRunDto } from './keyword-discovery-run.types';

/**
 * API client for the live keyword-discovery pipeline. The backend routes land
 * in Phase 2 of the refactor; until then the lab runs entirely off fixtures and
 * these methods are dormant. Endpoint templates are kept local here and move to
 * `ProtopipeEndpoints` in `@hive/contracts` when the backend is wired.
 */

const ENDPOINTS = {
  start: '/api/v2/protopipe/sites/:siteId/keyword-discovery/runs',
  get: '/api/v2/protopipe/sites/:siteId/keyword-discovery/runs/:runId',
  rerunStep: '/api/v2/protopipe/sites/:siteId/keyword-discovery/runs/:runId/rerun/:step',
} as const;

interface DiscoveryRunResponse {
  run: KeywordDiscoveryRunDto;
}

@Injectable({ providedIn: 'root' })
export class KeywordDiscoveryLabApiService {
  private readonly http = inject(HttpClient);

  startRun$(siteId: string): Observable<DiscoveryRunResponse> {
    return this.http.post<DiscoveryRunResponse>(
      protopipeApiUrl(ENDPOINTS.start, { siteId }),
      {},
    );
  }

  getRun$(siteId: string, runId: string): Observable<DiscoveryRunResponse> {
    return this.http.get<DiscoveryRunResponse>(
      protopipeApiUrl(ENDPOINTS.get, { siteId, runId }),
    );
  }

  rerunStep$(siteId: string, runId: string, step: string): Observable<DiscoveryRunResponse> {
    return this.http.post<DiscoveryRunResponse>(
      protopipeApiUrl(ENDPOINTS.rerunStep, { siteId, runId, step }),
      {},
    );
  }
}
