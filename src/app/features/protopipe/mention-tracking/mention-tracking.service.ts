import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ProtopipeEndpoints } from '@hive/contracts';
import type {
  ProtopipeGetMentionTrackingResponse,
  ProtopipeGetMentionTrackingRunResponse,
  ProtopipeListMentionTrackingRunsResponse,
  ProtopipeRunMentionTrackingRequest,
  ProtopipeRunMentionTrackingResponse,
} from '@hive/contracts';
import { firstValueFrom } from 'rxjs';
import { protopipeApiUrl } from '../protopipe-http.util';

@Injectable({ providedIn: 'root' })
export class MentionTrackingService {
  private readonly http = inject(HttpClient);

  getLatest(siteId: string): Promise<ProtopipeGetMentionTrackingResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeGetMentionTrackingResponse>(
        protopipeApiUrl(ProtopipeEndpoints.mentionTrackingGet.path, { siteId }),
      ),
    );
  }

  run(
    siteId: string,
    body: ProtopipeRunMentionTrackingRequest = {},
  ): Promise<ProtopipeRunMentionTrackingResponse> {
    return firstValueFrom(
      this.http.post<ProtopipeRunMentionTrackingResponse>(
        protopipeApiUrl(ProtopipeEndpoints.mentionTrackingRun.path, { siteId }),
        body,
      ),
    );
  }

  listRuns(siteId: string): Promise<ProtopipeListMentionTrackingRunsResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeListMentionTrackingRunsResponse>(
        protopipeApiUrl(ProtopipeEndpoints.mentionTrackingListRuns.path, { siteId }),
      ),
    );
  }

  getRun(siteId: string, runId: string): Promise<ProtopipeGetMentionTrackingRunResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeGetMentionTrackingRunResponse>(
        protopipeApiUrl(ProtopipeEndpoints.mentionTrackingGetRun.path, { siteId, runId }),
      ),
    );
  }
}
