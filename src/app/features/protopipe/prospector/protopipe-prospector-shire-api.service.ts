import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  ShireEndpoints,
  type GooglePlaceLocationsResponse,
  type ProspectingCampaignsListResponse,
  type ProspectsListResponse,
  type SaveProspectingCampaignsRequest,
  type SaveProspectsRequest,
} from '@hive/contracts';
import { firstValueFrom } from 'rxjs';
import { shireApiUrl } from '../shire/shire-http.util';

@Injectable({ providedIn: 'root' })
export class ProtopipeProspectorShireApiService {
  private readonly http = inject(HttpClient);

  listCampaigns(siteId: string): Promise<ProspectingCampaignsListResponse> {
    return firstValueFrom(
      this.http.get<ProspectingCampaignsListResponse>(
        shireApiUrl(ShireEndpoints.sites.prospectingCampaigns(siteId)),
      ),
    );
  }

  saveCampaigns(
    siteId: string,
    body: SaveProspectingCampaignsRequest,
  ): Promise<ProspectingCampaignsListResponse> {
    return firstValueFrom(
      this.http.put<ProspectingCampaignsListResponse>(
        shireApiUrl(ShireEndpoints.sites.prospectingCampaigns(siteId)),
        body,
      ),
    );
  }

  listProspects(siteId: string): Promise<ProspectsListResponse> {
    return firstValueFrom(
      this.http.get<ProspectsListResponse>(shireApiUrl(ShireEndpoints.sites.prospects(siteId))),
    );
  }

  saveProspects(siteId: string, body: SaveProspectsRequest): Promise<ProspectsListResponse> {
    return firstValueFrom(
      this.http.put<ProspectsListResponse>(
        shireApiUrl(ShireEndpoints.sites.prospects(siteId)),
        body,
      ),
    );
  }

  searchPlaceLocations(q: string, limit = 8): Promise<GooglePlaceLocationsResponse> {
    const params = new URLSearchParams({ q, limit: String(limit) });
    return firstValueFrom(
      this.http.get<GooglePlaceLocationsResponse>(
        shireApiUrl(`${ShireEndpoints.integrations.googlePlaces.locations}?${params.toString()}`),
      ),
    );
  }
}
