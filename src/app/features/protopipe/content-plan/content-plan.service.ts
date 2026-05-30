import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ProtopipeEndpoints } from '@hive/contracts';
import type {
  ProtopipeGenerateContentPlanResponse,
  ProtopipeGetContentPlanResponse,
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
}
