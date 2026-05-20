import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ProtopipeEndpoints } from '@hive/contracts';
import type {
  ProtopipeBootstrapResponse,
  ProtopipeDataForSeoStatusResponse,
  ProtopipePlan,
  SaveKeywordsRequest,
  SaveKeywordsResponse,
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
}
