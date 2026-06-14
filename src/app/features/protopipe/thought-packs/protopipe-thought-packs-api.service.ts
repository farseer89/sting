import { Injectable, inject } from '@angular/core';
import { ProtopipeEndpoints } from '@hive/contracts';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type {
  ListCognitivePacksResponse,
  SetSiteDefaultCognitivePackRequest,
  SetSiteDefaultCognitivePackResponse,
} from '@hive/contracts';
import { protopipeApiUrl } from '../protopipe-http.util';

@Injectable({ providedIn: 'root' })
export class ProtopipeThoughtPacksApiService {
  private readonly http = inject(HttpClient);

  listCognitivePacks(): Promise<ListCognitivePacksResponse> {
    return firstValueFrom(
      this.http.get<ListCognitivePacksResponse>(
        protopipeApiUrl(ProtopipeEndpoints.listCognitivePacks.path),
      ),
    );
  }

  setSiteDefaultCognitivePack(
    siteId: string,
    body: SetSiteDefaultCognitivePackRequest,
  ): Promise<SetSiteDefaultCognitivePackResponse> {
    return firstValueFrom(
      this.http.patch<SetSiteDefaultCognitivePackResponse>(
        protopipeApiUrl(ProtopipeEndpoints.setSiteDefaultCognitivePack.path, { siteId }),
        body,
      ),
    );
  }
}
