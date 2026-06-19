import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  CreateProtopipeContactRequest,
  ProtopipeContactResponse,
  ProtopipeContactsResponse,
  UpdateProtopipeContactRequest,
} from '@hive/contracts';
import { protopipeApiUrl } from '../protopipe-http.util';

const ENDPOINTS = {
  list: '/api/v2/protopipe/sites/:siteId/contacts',
  create: '/api/v2/protopipe/sites/:siteId/contacts',
  update: '/api/v2/protopipe/sites/:siteId/contacts/:contactId',
  delete: '/api/v2/protopipe/sites/:siteId/contacts/:contactId',
} as const;

@Injectable({ providedIn: 'root' })
export class ProtopipeContactsApiService {
  private readonly http = inject(HttpClient);

  list(siteId: string): Promise<ProtopipeContactsResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeContactsResponse>(protopipeApiUrl(ENDPOINTS.list, { siteId })),
    );
  }

  create(siteId: string, body: CreateProtopipeContactRequest): Promise<ProtopipeContactResponse> {
    return firstValueFrom(
      this.http.post<ProtopipeContactResponse>(
        protopipeApiUrl(ENDPOINTS.create, { siteId }),
        body,
      ),
    );
  }

  update(
    siteId: string,
    contactId: string,
    body: UpdateProtopipeContactRequest,
  ): Promise<ProtopipeContactResponse> {
    return firstValueFrom(
      this.http.patch<ProtopipeContactResponse>(
        protopipeApiUrl(ENDPOINTS.update, { siteId, contactId }),
        body,
      ),
    );
  }

  delete(siteId: string, contactId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(protopipeApiUrl(ENDPOINTS.delete, { siteId, contactId })),
    );
  }
}
