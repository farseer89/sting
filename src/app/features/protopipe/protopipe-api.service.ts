import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ProtopipeAdminEndpoints, ProtopipeEndpoints } from '@hive/contracts';
import type {
  ProtopipeAccountGoogleDisconnectResponse,
  ProtopipeAccountGoogleStartResponse,
  ProtopipeAccountGoogleStatusResponse,
  ProtopipeAnalyticsPropertiesResponse,
  ProtopipeAnalyticsResponse,
  ProtopipeAnalyticsSetPropertyRequest,
  ProtopipeAnalyticsSetPropertyResponse,
  ProtopipeKeywordSerpResponse,
  AdminSitesListResponse,
  AgentRunResponse,
  ArticleIdeasResponse,
  ContentHelperIngestRequest,
  ContentHelperIngestResponse,
  CreateContentPostRequest,
  EnqueueAgentRunRequest,
  EnqueueAgentRunResponse,
  GlobalKnowledgeResponse,
  PatchGlobalKnowledgeRequest,
  PatchSiteKnowledgeRequest,
  ProtopipeBootstrapResponse,
  ProtopipeContentListResponse,
  ProtopipeContentPostResponse,
  ProtopipeDataForSeoStatusResponse,
  ProtopipeSpyFuStatusResponse,
  ProtopipeSiteCompetitorsResponse,
  ProtopipeCompetitorGapKeywordsResponse,
  ProtopipeGoogleIntegrationStatusResponse,
  ProtopipeGoogleOAuthConfigResponse,
  ProtopipeGoogleOAuthStartResponse,
  ProtopipeKeywordDiscoveryResponse,
  ProtopipeResearchQueryRequest,
  ProtopipeResearchResponse,
  ProtopipeKeywordMetricHistoryResponse,
  ProtopipeMarketEnrichResponse,
  ProtopipePlan,
  ProtopipePublishContentResponse,
  PutUserContentHelperRequest,
  SaveKeywordsRequest,
  SaveKeywordsResponse,
  SiteKnowledgeListResponse,
  UpdateContentPostRequest,
  UserContentHelperResponse,
  ProtopipeLeadsListResponse,
  ProtopipeLeadDetailResponse,
  ConvertLeadResponse,
  SiteBuilderComponentsResponse,
  SiteBuilderTemplatesResponse,
  SiteBuilderTemplateDetailResponse,
  CreateProtopipeSiteRequest,
  CreateProtopipeSiteResponse,
  DeleteProtopipeSiteResponse,
  SitePageResponse,
  UpdateSitePageRequest,
  UpdateSitePageResponse,
  PublishSiteResponse,
  PublishSiteCompleteRequest,
  PublishSiteCompleteResponse,
  ProtopipeSite,
} from '@hive/contracts';
import { Observable, firstValueFrom } from 'rxjs';
import { protopipeApiUrl } from './protopipe-http.util';

@Injectable({ providedIn: 'root' })
export class ProtopipeApiService {
  private readonly http = inject(HttpClient);

  bootstrap$(): Observable<ProtopipeBootstrapResponse> {
    return this.http.get<ProtopipeBootstrapResponse>(
      protopipeApiUrl(ProtopipeEndpoints.bootstrap.path),
    );
  }

  bootstrap(): Promise<ProtopipeBootstrapResponse> {
    return firstValueFrom(this.bootstrap$());
  }

  getPlan$(siteId: string): Observable<ProtopipePlan> {
    return this.http.get<ProtopipePlan>(
      protopipeApiUrl(ProtopipeEndpoints.getPlan.path, { siteId }),
    );
  }

  getPlan(siteId: string): Promise<ProtopipePlan> {
    return firstValueFrom(this.getPlan$(siteId));
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

  spyFuStatus(): Promise<ProtopipeSpyFuStatusResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeSpyFuStatusResponse>(
        protopipeApiUrl(ProtopipeEndpoints.spyFuStatus.path),
      ),
    );
  }

  siteCompetitors(
    siteId: string,
    options?: { limit?: number; hostname?: string },
  ): Promise<ProtopipeSiteCompetitorsResponse> {
    const params: Record<string, string> = {};
    if (options?.limit != null) params['limit'] = String(options.limit);
    if (options?.hostname) params['hostname'] = options.hostname;
    return firstValueFrom(
      this.http.get<ProtopipeSiteCompetitorsResponse>(
        protopipeApiUrl(ProtopipeEndpoints.siteCompetitors.path, { siteId }),
        Object.keys(params).length > 0 ? { params } : undefined,
      ),
    );
  }

  competitorGapKeywords(
    siteId: string,
    competitorDomain: string,
    options?: { limit?: number; hostname?: string },
  ): Promise<ProtopipeCompetitorGapKeywordsResponse> {
    const params: Record<string, string> = {};
    if (options?.limit != null) params['limit'] = String(options.limit);
    if (options?.hostname) params['hostname'] = options.hostname;
    return firstValueFrom(
      this.http.get<ProtopipeCompetitorGapKeywordsResponse>(
        protopipeApiUrl(ProtopipeEndpoints.competitorGapKeywords.path, {
          siteId,
          competitorDomain,
        }),
        Object.keys(params).length > 0 ? { params } : undefined,
      ),
    );
  }

  googleIntegrationStatus(): Promise<ProtopipeGoogleIntegrationStatusResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeGoogleIntegrationStatusResponse>(
        protopipeApiUrl(ProtopipeEndpoints.googleIntegrationStatus.path),
      ),
    );
  }

  researchQuery(siteId: string, body: ProtopipeResearchQueryRequest): Promise<ProtopipeResearchResponse> {
    return firstValueFrom(
      this.http.post<ProtopipeResearchResponse>(
        protopipeApiUrl(ProtopipeEndpoints.researchQuery.path, { siteId }),
        body,
      ),
    );
  }

  googleOAuthConfig(): Promise<ProtopipeGoogleOAuthConfigResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeGoogleOAuthConfigResponse>(
        protopipeApiUrl(ProtopipeAdminEndpoints.googleOAuthConfig.path),
      ),
    );
  }

  googleOAuthStart(): Promise<ProtopipeGoogleOAuthStartResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeGoogleOAuthStartResponse>(
        protopipeApiUrl(ProtopipeAdminEndpoints.googleOAuthStart.path),
      ),
    );
  }

    enrichMarket(siteId: string): Promise<ProtopipeMarketEnrichResponse> {
    return firstValueFrom(
      this.http.post<ProtopipeMarketEnrichResponse>(
        protopipeApiUrl(ProtopipeEndpoints.marketEnrich.path, { siteId }),
        {},
      ),
    );
  }

  discoverKeywords$(
    siteId: string,
    options?: { gscRowLimit?: number; rankedRowLimit?: number; adsLimit?: number },
  ): Observable<ProtopipeKeywordDiscoveryResponse> {
    const params: Record<string, string> = {};
    if (options?.gscRowLimit != null) params['gscRowLimit'] = String(options.gscRowLimit);
    if (options?.rankedRowLimit != null) params['rankedRowLimit'] = String(options.rankedRowLimit);
    if (options?.adsLimit != null) params['adsLimit'] = String(options.adsLimit);
    return this.http.get<ProtopipeKeywordDiscoveryResponse>(
      protopipeApiUrl(ProtopipeEndpoints.keywordDiscover.path, { siteId }),
      Object.keys(params).length > 0 ? { params } : undefined,
    );
  }

  discoverKeywords(
    siteId: string,
    options?: { gscRowLimit?: number; rankedRowLimit?: number; adsLimit?: number },
  ): Promise<ProtopipeKeywordDiscoveryResponse> {
    return firstValueFrom(this.discoverKeywords$(siteId, options));
  }

  getAccountGoogleStatus(): Promise<ProtopipeAccountGoogleStatusResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeAccountGoogleStatusResponse>(
        protopipeApiUrl(ProtopipeEndpoints.accountGoogleStatus.path),
      ),
    );
  }

  startAccountGoogleOAuth(returnTo?: string): Promise<ProtopipeAccountGoogleStartResponse> {
    let params = new HttpParams();
    if (returnTo) params = params.set('returnTo', returnTo);
    return firstValueFrom(
      this.http.get<ProtopipeAccountGoogleStartResponse>(
        protopipeApiUrl(ProtopipeEndpoints.accountGoogleStart.path),
        { params },
      ),
    );
  }

  disconnectAccountGoogle(): Promise<ProtopipeAccountGoogleDisconnectResponse> {
    return firstValueFrom(
      this.http.post<ProtopipeAccountGoogleDisconnectResponse>(
        protopipeApiUrl(ProtopipeEndpoints.accountGoogleDisconnect.path),
        {},
      ),
    );
  }

  getSiteAnalytics(
    siteId: string,
    range?: { startDate?: string; endDate?: string },
  ): Promise<ProtopipeAnalyticsResponse> {
    let params = new HttpParams();
    if (range?.startDate) params = params.set('startDate', range.startDate);
    if (range?.endDate) params = params.set('endDate', range.endDate);
    return firstValueFrom(
      this.http.get<ProtopipeAnalyticsResponse>(
        protopipeApiUrl(ProtopipeEndpoints.siteAnalytics.path, { siteId }),
        { params },
      ),
    );
  }

  listSiteAnalyticsProperties(siteId: string): Promise<ProtopipeAnalyticsPropertiesResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeAnalyticsPropertiesResponse>(
        protopipeApiUrl(ProtopipeEndpoints.siteAnalyticsProperties.path, { siteId }),
      ),
    );
  }

  setSiteAnalyticsProperty(
    siteId: string,
    body: ProtopipeAnalyticsSetPropertyRequest,
  ): Promise<ProtopipeAnalyticsSetPropertyResponse> {
    return firstValueFrom(
      this.http.put<ProtopipeAnalyticsSetPropertyResponse>(
        protopipeApiUrl(ProtopipeEndpoints.siteAnalyticsSetProperty.path, { siteId }),
        body,
      ),
    );
  }

  getKeywordMetricHistory(
    siteId: string,
    keywordId: string,
    limit = 24,
  ): Promise<ProtopipeKeywordMetricHistoryResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeKeywordMetricHistoryResponse>(
        protopipeApiUrl(ProtopipeEndpoints.keywordMetricHistory.path, { siteId, keywordId }),
        { params: { limit: String(limit) } },
      ),
    );
  }

  /**
   * Cached "first look" at the live SERP for a keyword. Returns a snapshot up
   * to 7 days old when one exists for {keywordId, location, device};
   * otherwise hits DataForSEO and persists a fresh row. Pass a
   * `locationCode` to override the site's default geo target (e.g. force
   * United States when the site default is Maui).
   */
  getKeywordSerp(
    siteId: string,
    keywordId: string,
    options?: { locationCode?: number },
  ): Promise<ProtopipeKeywordSerpResponse> {
    let params = new HttpParams();
    if (options?.locationCode != null) {
      params = params.set('locationCode', String(options.locationCode));
    }
    return firstValueFrom(
      this.http.get<ProtopipeKeywordSerpResponse>(
        protopipeApiUrl(ProtopipeEndpoints.keywordSerp.path, { siteId, keywordId }),
        { params },
      ),
    );
  }

  /** Force a fresh DFS fetch, bypassing the 7-day cache; counts against the daily cap. */
  refreshKeywordSerp(
    siteId: string,
    keywordId: string,
    options?: { locationCode?: number },
  ): Promise<ProtopipeKeywordSerpResponse> {
    let params = new HttpParams();
    if (options?.locationCode != null) {
      params = params.set('locationCode', String(options.locationCode));
    }
    return firstValueFrom(
      this.http.post<ProtopipeKeywordSerpResponse>(
        protopipeApiUrl(ProtopipeEndpoints.keywordSerpRefresh.path, { siteId, keywordId }),
        {},
        { params },
      ),
    );
  }

  listContent$(siteId: string): Observable<ProtopipeContentListResponse> {
    return this.http.get<ProtopipeContentListResponse>(
      protopipeApiUrl(ProtopipeEndpoints.listContent.path, { siteId }),
    );
  }

  listContent(siteId: string): Promise<ProtopipeContentListResponse> {
    return firstValueFrom(this.listContent$(siteId));
  }

  getContent(siteId: string, postId: string): Promise<ProtopipeContentPostResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeContentPostResponse>(
        protopipeApiUrl(ProtopipeEndpoints.getContent.path, { siteId, postId }),
      ),
    );
  }

  createContent$(
    siteId: string,
    body: CreateContentPostRequest,
  ): Observable<ProtopipeContentPostResponse> {
    return this.http.post<ProtopipeContentPostResponse>(
      protopipeApiUrl(ProtopipeEndpoints.createContent.path, { siteId }),
      body,
    );
  }

  createContent(
    siteId: string,
    body: CreateContentPostRequest,
  ): Promise<ProtopipeContentPostResponse> {
    return firstValueFrom(this.createContent$(siteId, body));
  }

  updateContent$(
    siteId: string,
    postId: string,
    body: UpdateContentPostRequest,
  ): Observable<ProtopipeContentPostResponse> {
    return this.http.put<ProtopipeContentPostResponse>(
      protopipeApiUrl(ProtopipeEndpoints.updateContent.path, { siteId, postId }),
      body,
    );
  }

  updateContent(
    siteId: string,
    postId: string,
    body: UpdateContentPostRequest,
  ): Promise<ProtopipeContentPostResponse> {
    return firstValueFrom(this.updateContent$(siteId, postId, body));
  }

  publishContent$(siteId: string, postId: string): Observable<ProtopipePublishContentResponse> {
    return this.http.post<ProtopipePublishContentResponse>(
      protopipeApiUrl(ProtopipeEndpoints.publishContent.path, { siteId, postId }),
      {},
    );
  }

  publishContent(siteId: string, postId: string): Promise<ProtopipePublishContentResponse> {
    return firstValueFrom(this.publishContent$(siteId, postId));
  }

  getArticleIdeas$(siteId: string) {
    return this.http.get<ArticleIdeasResponse>(
      protopipeApiUrl(ProtopipeEndpoints.getArticleIdeas.path, { siteId }),
    );
  }

  getArticleIdeas(siteId: string): Promise<ArticleIdeasResponse> {
    return firstValueFrom(this.getArticleIdeas$(siteId));
  }

  getAgentRun$(siteId: string, runId: string) {
    return this.http.get<AgentRunResponse>(
      protopipeApiUrl(ProtopipeEndpoints.getAgentRun.path, { siteId, runId }),
    );
  }

  enqueueAgentRun(
    siteId: string,
    body: EnqueueAgentRunRequest,
    idempotencyKey?: string,
  ): Promise<EnqueueAgentRunResponse> {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
    return firstValueFrom(
      this.http.post<EnqueueAgentRunResponse>(
        protopipeApiUrl(ProtopipeEndpoints.enqueueAgentRun.path, { siteId }),
        body,
        { headers },
      ),
    );
  }

  getContentHelper$(siteId: string) {
    return this.http.get<UserContentHelperResponse>(
      protopipeApiUrl(ProtopipeEndpoints.getContentHelper.path, { siteId }),
    );
  }

  putContentHelper(siteId: string, body: PutUserContentHelperRequest): Promise<UserContentHelperResponse> {
    return firstValueFrom(
      this.http.put<UserContentHelperResponse>(
        protopipeApiUrl(ProtopipeEndpoints.putContentHelper.path, { siteId }),
        body,
      ),
    );
  }

  ingestContentHelper(
    siteId: string,
    body: ContentHelperIngestRequest,
  ): Promise<ContentHelperIngestResponse> {
    return firstValueFrom(
      this.http.post<ContentHelperIngestResponse>(
        protopipeApiUrl(ProtopipeEndpoints.ingestContentHelper.path, { siteId }),
        body,
      ),
    );
  }

  getGlobalKnowledge(): Promise<GlobalKnowledgeResponse> {
    return firstValueFrom(
      this.http.get<GlobalKnowledgeResponse>(
        protopipeApiUrl(ProtopipeAdminEndpoints.getGlobalKnowledge.path),
      ),
    );
  }

  patchGlobalKnowledge(body: PatchGlobalKnowledgeRequest): Promise<GlobalKnowledgeResponse> {
    return firstValueFrom(
      this.http.patch<GlobalKnowledgeResponse>(
        protopipeApiUrl(ProtopipeAdminEndpoints.patchGlobalKnowledge.path),
        body,
      ),
    );
  }

  listAdminSites(): Promise<AdminSitesListResponse> {
    return firstValueFrom(
      this.http.get<AdminSitesListResponse>(protopipeApiUrl(ProtopipeAdminEndpoints.listSites.path)),
    );
  }

  getAdminSiteKnowledge(siteId: string): Promise<SiteKnowledgeListResponse> {
    return firstValueFrom(
      this.http.get<SiteKnowledgeListResponse>(
        protopipeApiUrl(ProtopipeAdminEndpoints.getSiteKnowledge.path, { siteId }),
      ),
    );
  }

  patchAdminSiteKnowledge(
    siteId: string,
    body: PatchSiteKnowledgeRequest,
  ): Promise<SiteKnowledgeListResponse> {
    return firstValueFrom(
      this.http.patch<SiteKnowledgeListResponse>(
        protopipeApiUrl(ProtopipeAdminEndpoints.patchSiteKnowledge.path, { siteId }),
        body,
      ),
    );
  }

  getSiteBuilderComponents(): Promise<SiteBuilderComponentsResponse> {
    return firstValueFrom(
      this.http.get<SiteBuilderComponentsResponse>(
        protopipeApiUrl(ProtopipeEndpoints.siteBuilderComponents.path),
      ),
    );
  }

  getSiteBuilderTemplates(): Promise<SiteBuilderTemplatesResponse> {
    return firstValueFrom(
      this.http.get<SiteBuilderTemplatesResponse>(
        protopipeApiUrl(ProtopipeEndpoints.siteBuilderTemplates.path),
      ),
    );
  }

  getSiteBuilderTemplate(templateId: string): Promise<SiteBuilderTemplateDetailResponse> {
    return firstValueFrom(
      this.http.get<SiteBuilderTemplateDetailResponse>(
        protopipeApiUrl(ProtopipeEndpoints.siteBuilderTemplateDetail.path, { templateId }),
      ),
    );
  }

  createSite(body: CreateProtopipeSiteRequest): Promise<CreateProtopipeSiteResponse> {
    return firstValueFrom(
      this.http.post<CreateProtopipeSiteResponse>(
        protopipeApiUrl(ProtopipeEndpoints.createSite.path),
        body,
      ),
    );
  }

  deleteSite(siteId: string): Promise<DeleteProtopipeSiteResponse> {
    return firstValueFrom(
      this.http.delete<DeleteProtopipeSiteResponse>(
        protopipeApiUrl(ProtopipeEndpoints.deleteSite.path, { siteId }),
      ),
    );
  }

  getSitePage(siteId: string): Promise<SitePageResponse> {
    return firstValueFrom(
      this.http.get<SitePageResponse>(
        protopipeApiUrl(ProtopipeEndpoints.getSitePage.path, { siteId }),
      ),
    );
  }

  updateSitePage(siteId: string, body: UpdateSitePageRequest): Promise<UpdateSitePageResponse> {
    return firstValueFrom(
      this.http.put<UpdateSitePageResponse>(
        protopipeApiUrl(ProtopipeEndpoints.updateSitePage.path, { siteId }),
        body,
      ),
    );
  }

  publishSite(siteId: string): Promise<PublishSiteResponse> {
    return firstValueFrom(
      this.http.post<PublishSiteResponse>(
        protopipeApiUrl(ProtopipeEndpoints.publishSite.path, { siteId }),
        {},
      ),
    );
  }

  publishSiteComplete(
    siteId: string,
    body: PublishSiteCompleteRequest,
  ): Promise<PublishSiteCompleteResponse> {
    return firstValueFrom(
      this.http.post<PublishSiteCompleteResponse>(
        protopipeApiUrl(ProtopipeEndpoints.publishSiteComplete.path, { siteId }),
        body,
      ),
    );
  }

  getSite(siteId: string): Promise<ProtopipeSite> {
    return firstValueFrom(
      this.http.get<ProtopipeSite>(protopipeApiUrl(ProtopipeEndpoints.getSite.path, { siteId })),
    );
  }

  listLeadsForAccount(): Promise<ProtopipeLeadsListResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeLeadsListResponse>(
        protopipeApiUrl(ProtopipeEndpoints.leadsListAll.path),
      ),
    );
  }

  listLeads(siteId: string): Promise<ProtopipeLeadsListResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeLeadsListResponse>(
        protopipeApiUrl(ProtopipeEndpoints.leadsList.path, { siteId }),
      ),
    );
  }

  getLead(siteId: string, leadId: string): Promise<ProtopipeLeadDetailResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeLeadDetailResponse>(
        protopipeApiUrl(ProtopipeEndpoints.leadDetail.path, { siteId, leadId }),
      ),
    );
  }

  convertLead(siteId: string, leadId: string): Promise<ConvertLeadResponse> {
    return firstValueFrom(
      this.http.post<ConvertLeadResponse>(
        protopipeApiUrl(ProtopipeEndpoints.leadConvert.path, { siteId, leadId }),
        {},
      ),
    );
  }
}
