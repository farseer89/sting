import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, type Observable } from 'rxjs';
import type {
  OpenProtopipeIntakeConversationRequest,
  OpenProtopipeIntakeConversationResponse,
  ProtopipeInboundMessagesResponse,
  ProtopipeIntakeConversationResponse,
  ProtopipeIntakeConversationsResponse,
  ProtopipeIntakeHealthResponse,
} from '@hive/contracts';
import { protopipeApiUrl } from '../../protopipe-http.util';

/**
 * API client for the intake observability read surface (Phase 6). Mirrors the
 * `ProtopipeEndpoints` intake* entries in @hive/contracts. The lab falls back
 * to fixtures when no siteId is selected, so these calls are only issued for a
 * real site.
 */

const ENDPOINTS = {
  conversations: '/api/v2/protopipe/sites/:siteId/intake/conversations',
  conversation: '/api/v2/protopipe/sites/:siteId/intake/conversations/:conversationId',
  inboundMessages: '/api/v2/protopipe/sites/:siteId/intake/inbound-messages',
  health: '/api/v2/protopipe/sites/:siteId/intake/health',
} as const;

@Injectable({ providedIn: 'root' })
export class IntakeStudioApiService {
  private readonly http = inject(HttpClient);

  openConversation$(
    siteId: string,
    body: OpenProtopipeIntakeConversationRequest,
  ) {
    return this.http.post<OpenProtopipeIntakeConversationResponse>(
      protopipeApiUrl(ENDPOINTS.conversations, { siteId }),
      body,
    );
  }

  openConversation(
    siteId: string,
    body: OpenProtopipeIntakeConversationRequest,
  ): Promise<OpenProtopipeIntakeConversationResponse> {
    return firstValueFrom(this.openConversation$(siteId, body));
  }

  listConversations$(siteId: string): Observable<ProtopipeIntakeConversationsResponse> {
    return this.http.get<ProtopipeIntakeConversationsResponse>(
      protopipeApiUrl(ENDPOINTS.conversations, { siteId }),
    );
  }

  getConversation$(
    siteId: string,
    conversationId: string,
  ): Observable<ProtopipeIntakeConversationResponse> {
    return this.http.get<ProtopipeIntakeConversationResponse>(
      protopipeApiUrl(ENDPOINTS.conversation, { siteId, conversationId }),
    );
  }

  getConversation(
    siteId: string,
    conversationId: string,
  ): Promise<ProtopipeIntakeConversationResponse> {
    return firstValueFrom(this.getConversation$(siteId, conversationId));
  }

  listInboundMessages$(siteId: string): Observable<ProtopipeInboundMessagesResponse> {
    return this.http.get<ProtopipeInboundMessagesResponse>(
      protopipeApiUrl(ENDPOINTS.inboundMessages, { siteId }),
    );
  }

  getHealth$(siteId: string): Observable<ProtopipeIntakeHealthResponse> {
    return this.http.get<ProtopipeIntakeHealthResponse>(
      protopipeApiUrl(ENDPOINTS.health, { siteId }),
    );
  }
}
