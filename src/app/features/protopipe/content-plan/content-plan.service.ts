import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ProtopipeEndpoints } from '@hive/contracts';
import type {
  ProtopipeConfirmContentPlanItemRequest,
  ProtopipeConfirmContentPlanItemResponse,
  ProtopipeConfirmContentPlanResponse,
  ProtopipeGenerateContentPlanResponse,
  ProtopipeGetContentPlanResponse,
  ProtopipeGetContentPlanRunResponse,
  ProtopipeListContentPlanRunsResponse,
} from '@hive/contracts';
import { firstValueFrom } from 'rxjs';
import { protopipeApiUrl } from '../protopipe-http.util';

@Injectable({ providedIn: 'root' })
export class ContentPlanService {
  private readonly http = inject(HttpClient);

  generate(siteId: string): Promise<ProtopipeGenerateContentPlanResponse> {
    return firstValueFrom(
      this.http.post<ProtopipeGenerateContentPlanResponse>(
        protopipeApiUrl(ProtopipeEndpoints.contentPlanGenerate.path, { siteId }),
        {},
      ),
    );
  }

  getLatest(siteId: string): Promise<ProtopipeGetContentPlanResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeGetContentPlanResponse>(
        protopipeApiUrl(ProtopipeEndpoints.contentPlanGet.path, { siteId }),
      ),
    );
  }

  listRuns(siteId: string): Promise<ProtopipeListContentPlanRunsResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeListContentPlanRunsResponse>(
        protopipeApiUrl(ProtopipeEndpoints.contentPlanListRuns.path, { siteId }),
      ),
    );
  }

  getRun(siteId: string, planId: string): Promise<ProtopipeGetContentPlanRunResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeGetContentPlanRunResponse>(
        protopipeApiUrl(ProtopipeEndpoints.contentPlanGetRun.path, { siteId, planId }),
      ),
    );
  }

  confirm(siteId: string): Promise<ProtopipeConfirmContentPlanResponse> {
    return firstValueFrom(
      this.http.post<ProtopipeConfirmContentPlanResponse>(
        protopipeApiUrl(ProtopipeEndpoints.contentPlanConfirm.path, { siteId }),
        {},
      ),
    );
  }

  confirmItem(
    siteId: string,
    body: ProtopipeConfirmContentPlanItemRequest,
  ): Promise<ProtopipeConfirmContentPlanItemResponse> {
    return firstValueFrom(
      this.http.post<ProtopipeConfirmContentPlanItemResponse>(
        protopipeApiUrl(ProtopipeEndpoints.contentPlanConfirmItem.path, { siteId }),
        body,
      ),
    );
  }
}
