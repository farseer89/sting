import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  ShireEndpoints,
  type CreateShireSiteRequest,
  type PatchShireSiteRequest,
  type ShirePublishSiteCompleteRequest,
  type ShirePublishSiteRequest,
  type ShirePublishSiteResponse,
  type ShireSiteResponse,
} from '@hive/contracts';
import { firstValueFrom } from 'rxjs';
import { shireApiUrl } from '../shire/shire-http.util';

@Injectable({ providedIn: 'root' })
export class ProtopipeShireSitesApiService {
  private readonly http = inject(HttpClient);

  create(body: CreateShireSiteRequest): Promise<ShireSiteResponse> {
    return firstValueFrom(
      this.http.post<ShireSiteResponse>(shireApiUrl(ShireEndpoints.sites.create), body),
    );
  }

  get(siteId: string): Promise<ShireSiteResponse> {
    return firstValueFrom(
      this.http.get<ShireSiteResponse>(shireApiUrl(ShireEndpoints.sites.get(siteId))),
    );
  }

  patch(siteId: string, body: PatchShireSiteRequest): Promise<ShireSiteResponse> {
    return firstValueFrom(
      this.http.patch<ShireSiteResponse>(shireApiUrl(ShireEndpoints.sites.patch(siteId)), body),
    );
  }

  publish(siteId: string, body: ShirePublishSiteRequest): Promise<ShirePublishSiteResponse> {
    return firstValueFrom(
      this.http.post<ShirePublishSiteResponse>(shireApiUrl(ShireEndpoints.sites.publish(siteId)), body),
    );
  }

  completePublish(
    siteId: string,
    body: ShirePublishSiteCompleteRequest,
  ): Promise<{ site: ShireSiteResponse; publishStatus: string }> {
    return firstValueFrom(
      this.http.post<{ site: ShireSiteResponse; publishStatus: string }>(
        shireApiUrl(ShireEndpoints.sites.publishComplete(siteId)),
        body,
      ),
    );
  }
}
