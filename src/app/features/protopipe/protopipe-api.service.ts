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
  AdminMediaStudioGenerateRequest,
  AdminMediaStudioGenerateResponse,
  MediaStudioConfigResponse,
  MediaStudioHistoryResponse,
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
  ProtopipeGetDiscoveryRunResponse,
  ProtopipeGetLatestDiscoveryRunResponse,
  ProtopipeStartDiscoveryResponse,
  ProtopipeStrategyConfirmRequest,
  ProtopipeStrategyConfirmResponse,
  ProtopipeResearchQueryRequest,
  ProtopipeResearchResponse,
  ProtopipeKeywordMetricHistoryResponse,
  ProtopipeMarketEnrichResponse,
  ProtopipeOnboardingRequest,
  ProtopipeOnboardingResponse,
  ProtopipeUpdateTargetCustomersRequest,
  ProtopipeUpdateTargetCustomersResponse,
  ProtopipePlan,
  ProtopipePublishContentRequest,
  ProtopipePublishContentResponse,
  ProtopipeContentPreviewRequest,
  ProtopipeContentPreviewResponse,
  ProtopipeListSiteConnectionsResponse,
  ProtopipeSiteConnectionResponse,
  ProtopipeUpsertWordPressConnectionRequest,
  ProtopipeContentGenerateResponse,
  ProtopipeContentMediaPresignRequest,
  ProtopipeContentMediaPresignResponse,
  ArticleGenerationGetResponse,
  ArticleGenerationRunSummary,
  ProtopipeListArticleGenerationRunsResponse,
  ArticleGenerationRerunStepResponse,
  ArticleGenerationStep,
  ProtopipeSerpLocationsResponse,
  PutUserContentHelperRequest,
  SaveKeywordsRequest,
  SaveKeywordsResponse,
  SiteKnowledgeListResponse,
  UpdateContentPostRequest,
  UserContentHelperResponse,
  ProtopipeBrandBookResponse,
  PutProtopipeBrandBookRequest,
  BrandBookInspirationIngestRequest,
  BrandBookInspirationIngestResponse,
  ProtopipeLeadsListResponse,
  ProtopipeLeadDetailResponse,
  ConvertLeadResponse,
  ListContextCardsResponse,
  PatchContextCardRequest,
  PatchContextCardResponse,
  ListOfferingsResponse,
  CreateOfferingRequest,
  CreateOfferingResponse,
  PatchOfferingRequest,
  PatchOfferingResponse,
  ActivateOfferingResponse,
  ListProjectsResponse,
  ListAudiencesResponse,
  UpsertAudienceRequest,
  UpsertAudienceResponse,
  DeleteAudienceRequest,
  DeleteAudienceResponse,
  CreateProjectRequest,
  CreateProjectResponse,
  GetProjectResponse,
  PatchProjectRequest,
  PatchProjectResponse,
  CreateProjectCaptureRequest,
  CreateProjectCaptureResponse,
  ProjectMediaPresignRequest,
  ProjectMediaPresignResponse,
  GenerateProjectShareLinkResponse,
  GenerateProjectStoryResponse,
  GetProjectShareResponse,
  SiteBuilderComponentsResponse,
  SiteBuilderTemplatesResponse,
  SiteBuilderTemplateDetailResponse,
  CreateProtopipeSiteRequest,
  CreateProtopipeSiteResponse,
  DeleteProtopipeSiteResponse,
  SitePageResponse,
  UpdateSitePageRequest,
  UpdateSitePageResponse,
  DraftPreviewTokenResponse,
  PatchSitePageFieldRequest,
  PatchSitePageFieldResponse,
  InsertSitePageSectionRequest,
  InsertSitePageSectionResponse,
  PublishSiteResponse,
  PublishSiteCompleteRequest,
  PublishSiteCompleteResponse,
  ProtopipeSite,
  CreatePitchProspectRequest,
  CreatePitchProspectResponse,
  ListPitchProspectsResponse,
  GetPitchProspectResponse,
  PatchPitchProspectRequest,
  PatchPitchProspectResponse,
  PitchPrepIngestRequest,
  PitchPrepIngestResponse,
  PitchPrepContextResponse,
  PitchPrepGeneratePackRequest,
  PitchPrepGeneratePackResponse,
  PitchPrepDistillPromptRequest,
  PitchPrepDistillPromptResponse,
  PitchPrepRegenerateRequest,
  PitchPrepRegenerateResponse,
  PitchPrepMediaListResponse,
  PitchPrepStyleRequest,
  PitchPrepStyleResponse,
  PatchPitchMediaAssetRequest,
  PatchPitchMediaAssetResponse,
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

  completeOnboarding(
    siteId: string,
    body: ProtopipeOnboardingRequest,
  ): Promise<ProtopipeOnboardingResponse> {
    return firstValueFrom(
      this.http.patch<ProtopipeOnboardingResponse>(
        protopipeApiUrl(ProtopipeEndpoints.siteOnboarding.path, { siteId }),
        body,
      ),
    );
  }

  updateTargetCustomers(
    siteId: string,
    body: ProtopipeUpdateTargetCustomersRequest,
  ): Promise<ProtopipeUpdateTargetCustomersResponse> {
    return firstValueFrom(
      this.http.patch<ProtopipeUpdateTargetCustomersResponse>(
        protopipeApiUrl(ProtopipeEndpoints.updateTargetCustomers.path, { siteId }),
        body,
      ),
    );
  }

  updateTargetCustomers$(
    siteId: string,
    body: ProtopipeUpdateTargetCustomersRequest,
  ): Observable<ProtopipeUpdateTargetCustomersResponse> {
    return this.http.patch<ProtopipeUpdateTargetCustomersResponse>(
      protopipeApiUrl(ProtopipeEndpoints.updateTargetCustomers.path, { siteId }),
      body,
    );
  }

  searchSerpLocations(query: string, limit = 8): Promise<ProtopipeSerpLocationsResponse> {
    const params = new HttpParams().set('q', query).set('limit', String(limit));
    return firstValueFrom(
      this.http.get<ProtopipeSerpLocationsResponse>(
        protopipeApiUrl(ProtopipeEndpoints.serpLocationsSearch.path),
        { params },
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

  startKeywordDiscoveryRun(siteId: string): Promise<ProtopipeStartDiscoveryResponse> {
    return firstValueFrom(
      this.http.post<ProtopipeStartDiscoveryResponse>(
        protopipeApiUrl(ProtopipeEndpoints.keywordDiscoveryStart.path, { siteId }),
        {},
      ),
    );
  }

  getKeywordDiscoveryRun(
    siteId: string,
    runId: string,
  ): Promise<ProtopipeGetDiscoveryRunResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeGetDiscoveryRunResponse>(
        protopipeApiUrl(ProtopipeEndpoints.keywordDiscoveryGetRun.path, { siteId, runId }),
      ),
    );
  }

  getLatestKeywordDiscoveryRun(siteId: string): Promise<ProtopipeGetLatestDiscoveryRunResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeGetLatestDiscoveryRunResponse>(
        protopipeApiUrl(ProtopipeEndpoints.keywordDiscoveryGetLatestRun.path, { siteId }),
      ),
    );
  }

  confirmKeywordStrategy(
    siteId: string,
    body: ProtopipeStrategyConfirmRequest,
  ): Promise<ProtopipeStrategyConfirmResponse> {
    return firstValueFrom(
      this.http.post<ProtopipeStrategyConfirmResponse>(
        protopipeApiUrl(ProtopipeEndpoints.keywordDiscoveryConfirm.path, { siteId }),
        body,
      ),
    );
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

  getContent$(siteId: string, postId: string): Observable<ProtopipeContentPostResponse> {
    return this.http.get<ProtopipeContentPostResponse>(
      protopipeApiUrl(ProtopipeEndpoints.getContent.path, { siteId, postId }),
    );
  }

  getContent(siteId: string, postId: string): Promise<ProtopipeContentPostResponse> {
    return firstValueFrom(this.getContent$(siteId, postId));
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

  publishContent$(
    siteId: string,
    postId: string,
    body: ProtopipePublishContentRequest = {},
  ): Observable<ProtopipePublishContentResponse> {
    return this.http.post<ProtopipePublishContentResponse>(
      protopipeApiUrl(ProtopipeEndpoints.publishContent.path, { siteId, postId }),
      body,
    );
  }

  publishContent(
    siteId: string,
    postId: string,
    body: ProtopipePublishContentRequest = {},
  ): Promise<ProtopipePublishContentResponse> {
    return firstValueFrom(this.publishContent$(siteId, postId, body));
  }

  previewContent$(
    siteId: string,
    body: ProtopipeContentPreviewRequest,
  ): Observable<ProtopipeContentPreviewResponse> {
    return this.http.post<ProtopipeContentPreviewResponse>(
      protopipeApiUrl(ProtopipeEndpoints.previewContent.path, { siteId }),
      body,
    );
  }

  previewContent(
    siteId: string,
    body: ProtopipeContentPreviewRequest,
  ): Promise<ProtopipeContentPreviewResponse> {
    return firstValueFrom(this.previewContent$(siteId, body));
  }

  previewContentPost$(
    siteId: string,
    postId: string,
  ): Observable<ProtopipeContentPreviewResponse> {
    return this.http.get<ProtopipeContentPreviewResponse>(
      protopipeApiUrl(ProtopipeEndpoints.previewContentPost.path, { siteId, postId }),
    );
  }

  listSiteConnections$(siteId: string): Observable<ProtopipeListSiteConnectionsResponse> {
    return this.http.get<ProtopipeListSiteConnectionsResponse>(
      protopipeApiUrl(ProtopipeEndpoints.listSiteConnections.path, { siteId }),
    );
  }

  listSiteConnections(siteId: string): Promise<ProtopipeListSiteConnectionsResponse> {
    return firstValueFrom(this.listSiteConnections$(siteId));
  }

  upsertWordPressConnection$(
    siteId: string,
    body: ProtopipeUpsertWordPressConnectionRequest,
  ): Observable<ProtopipeSiteConnectionResponse> {
    return this.http.put<ProtopipeSiteConnectionResponse>(
      protopipeApiUrl(ProtopipeEndpoints.upsertWordPressConnection.path, { siteId }),
      body,
    );
  }

  upsertWordPressConnection(
    siteId: string,
    body: ProtopipeUpsertWordPressConnectionRequest,
  ): Promise<ProtopipeSiteConnectionResponse> {
    return firstValueFrom(this.upsertWordPressConnection$(siteId, body));
  }

  deleteSiteConnection$(
    siteId: string,
    connectionId: string,
  ): Observable<ProtopipeSiteConnectionResponse> {
    return this.http.delete<ProtopipeSiteConnectionResponse>(
      protopipeApiUrl(ProtopipeEndpoints.deleteSiteConnection.path, { siteId, connectionId }),
    );
  }

  deleteSiteConnection(
    siteId: string,
    connectionId: string,
  ): Promise<ProtopipeSiteConnectionResponse> {
    return firstValueFrom(this.deleteSiteConnection$(siteId, connectionId));
  }

  /** Launch (or relaunch) an ArticleGeneration run wired to a content post. */
  generateContent$(siteId: string, postId: string): Observable<ProtopipeContentGenerateResponse> {
    return this.http.post<ProtopipeContentGenerateResponse>(
      protopipeApiUrl(ProtopipeEndpoints.generateContent.path, { siteId, postId }),
      {},
    );
  }

  presignContentMedia$(
    siteId: string,
    postId: string,
    body: ProtopipeContentMediaPresignRequest,
  ): Observable<ProtopipeContentMediaPresignResponse> {
    return this.http.post<ProtopipeContentMediaPresignResponse>(
      protopipeApiUrl(ProtopipeEndpoints.presignContentMedia.path, { siteId, postId }),
      body,
    );
  }

  presignContentMedia(
    siteId: string,
    postId: string,
    body: ProtopipeContentMediaPresignRequest,
  ): Promise<ProtopipeContentMediaPresignResponse> {
    return firstValueFrom(this.presignContentMedia$(siteId, postId, body));
  }

  /** Poll a single ArticleGeneration run (for the writer's pipeline inspector). */
  getArticleRun$(siteId: string, runId: string): Observable<ArticleGenerationGetResponse> {
    return this.http.get<ArticleGenerationGetResponse>(
      protopipeApiUrl(ProtopipeEndpoints.articleGenerationsGet.path, { siteId, runId }),
    );
  }

  listArticleGenerationRuns(
    siteId: string,
  ): Promise<ProtopipeListArticleGenerationRunsResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeListArticleGenerationRunsResponse>(
        protopipeApiUrl(ProtopipeEndpoints.articleGenerationsListRuns.path, { siteId }),
      ),
    );
  }

  /** Rerun a single pipeline step and everything downstream of it. */
  rerunArticleStep$(
    siteId: string,
    runId: string,
    step: ArticleGenerationStep,
  ): Observable<ArticleGenerationRerunStepResponse> {
    return this.http.post<ArticleGenerationRerunStepResponse>(
      protopipeApiUrl(ProtopipeEndpoints.articleGenerationsRerunStep.path, {
        siteId,
        runId,
        step,
      }),
      {},
    );
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

  getBrandBook(siteId: string): Promise<ProtopipeBrandBookResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeBrandBookResponse>(
        protopipeApiUrl(ProtopipeEndpoints.getBrandBook.path, { siteId }),
      ),
    );
  }

  putBrandBook(
    siteId: string,
    body: PutProtopipeBrandBookRequest,
  ): Promise<ProtopipeBrandBookResponse> {
    return firstValueFrom(
      this.http.put<ProtopipeBrandBookResponse>(
        protopipeApiUrl(ProtopipeEndpoints.putBrandBook.path, { siteId }),
        body,
      ),
    );
  }

  ingestBrandBookInspiration(
    siteId: string,
    body: BrandBookInspirationIngestRequest,
  ): Promise<BrandBookInspirationIngestResponse> {
    return firstValueFrom(
      this.http.post<BrandBookInspirationIngestResponse>(
        protopipeApiUrl(ProtopipeEndpoints.ingestBrandBookInspiration.path, { siteId }),
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

  getMediaStudioConfig(): Promise<MediaStudioConfigResponse> {
    return firstValueFrom(
      this.http.get<MediaStudioConfigResponse>(
        protopipeApiUrl(ProtopipeEndpoints.mediaStudioConfig.path),
      ),
    );
  }

  generateMediaStudio(
    body: AdminMediaStudioGenerateRequest,
  ): Promise<AdminMediaStudioGenerateResponse> {
    return firstValueFrom(
      this.http.post<AdminMediaStudioGenerateResponse>(
        protopipeApiUrl(ProtopipeEndpoints.mediaStudioGenerate.path),
        body,
      ),
    );
  }

  getMediaStudioHistory(limit = 50): Promise<MediaStudioHistoryResponse> {
    const params = new HttpParams().set('limit', String(limit));
    return firstValueFrom(
      this.http.get<MediaStudioHistoryResponse>(
        protopipeApiUrl(ProtopipeEndpoints.mediaStudioHistory.path),
        { params },
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

  createDraftPreviewToken(siteId: string): Promise<DraftPreviewTokenResponse> {
    return firstValueFrom(
      this.http.post<DraftPreviewTokenResponse>(
        protopipeApiUrl(ProtopipeEndpoints.createDraftPreviewToken.path, { siteId }),
        {},
      ),
    );
  }

  patchSitePageField(
    siteId: string,
    body: PatchSitePageFieldRequest,
  ): Promise<PatchSitePageFieldResponse> {
    return firstValueFrom(
      this.http.patch<PatchSitePageFieldResponse>(
        protopipeApiUrl(ProtopipeEndpoints.patchSitePageField.path, { siteId }),
        body,
      ),
    );
  }

  insertSitePageSection(
    siteId: string,
    body: InsertSitePageSectionRequest,
  ): Promise<InsertSitePageSectionResponse> {
    return firstValueFrom(
      this.http.post<InsertSitePageSectionResponse>(
        protopipeApiUrl(ProtopipeEndpoints.insertSitePageSection.path, { siteId }),
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

  listContextCards$(
    siteId: string,
    query?: {
      status?: string;
      type?: string;
      geoSignal?: boolean;
      articleId?: string;
      projectId?: string;
    },
  ) {
    let params = new HttpParams();
    if (query?.status) params = params.set('status', query.status);
    if (query?.type) params = params.set('type', query.type);
    if (query?.geoSignal != null) params = params.set('geoSignal', String(query.geoSignal));
    if (query?.articleId) params = params.set('articleId', query.articleId);
    if (query?.projectId) params = params.set('projectId', query.projectId);
    return this.http.get<ListContextCardsResponse>(
      protopipeApiUrl(ProtopipeEndpoints.listContextCards.path, { siteId }),
      { params },
    );
  }

  patchContextCard$(
    siteId: string,
    cardId: string,
    body: PatchContextCardRequest,
  ) {
    return this.http.patch<PatchContextCardResponse>(
      protopipeApiUrl(ProtopipeEndpoints.patchContextCard.path, { siteId, cardId }),
      body,
    );
  }

  listOfferings$(siteId: string, query?: { status?: string }) {
    let params = new HttpParams();
    if (query?.status) params = params.set('status', query.status);
    return this.http.get<ListOfferingsResponse>(
      protopipeApiUrl(ProtopipeEndpoints.listOfferings.path, { siteId }),
      { params },
    );
  }

  createOffering$(siteId: string, body: CreateOfferingRequest) {
    return this.http.post<CreateOfferingResponse>(
      protopipeApiUrl(ProtopipeEndpoints.createOffering.path, { siteId }),
      body,
    );
  }

  patchOffering$(siteId: string, offeringId: string, body: PatchOfferingRequest) {
    return this.http.patch<PatchOfferingResponse>(
      protopipeApiUrl(ProtopipeEndpoints.patchOffering.path, { siteId, offeringId }),
      body,
    );
  }

  activateOffering$(siteId: string, offeringId: string) {
    return this.http.post<ActivateOfferingResponse>(
      protopipeApiUrl(ProtopipeEndpoints.activateOffering.path, { siteId, offeringId }),
      {},
    );
  }

  listProjects$(siteId: string, query?: { status?: string }) {
    let params = new HttpParams();
    if (query?.status) params = params.set('status', query.status);
    return this.http.get<ListProjectsResponse>(
      protopipeApiUrl(ProtopipeEndpoints.listProjects.path, { siteId }),
      { params },
    );
  }

  listAudiences$(siteId: string) {
    return this.http.get<ListAudiencesResponse>(
      protopipeApiUrl(ProtopipeEndpoints.listAudiences.path, { siteId }),
    );
  }

  upsertAudience$(siteId: string, audienceId: string, body: UpsertAudienceRequest) {
    return this.http.put<UpsertAudienceResponse>(
      protopipeApiUrl(ProtopipeEndpoints.upsertAudience.path, { siteId, audienceId }),
      body,
    );
  }

  deleteAudience$(siteId: string, audienceId: string, body: DeleteAudienceRequest) {
    return this.http.request<DeleteAudienceResponse>(
      'DELETE',
      protopipeApiUrl(ProtopipeEndpoints.deleteAudience.path, { siteId, audienceId }),
      { body },
    );
  }

  createProject$(siteId: string, body: CreateProjectRequest) {
    return this.http.post<CreateProjectResponse>(
      protopipeApiUrl(ProtopipeEndpoints.createProject.path, { siteId }),
      body,
    );
  }

  getProject$(siteId: string, projectId: string) {
    return this.http.get<GetProjectResponse>(
      protopipeApiUrl(ProtopipeEndpoints.getProject.path, { siteId, projectId }),
    );
  }

  patchProject$(siteId: string, projectId: string, body: PatchProjectRequest) {
    return this.http.patch<PatchProjectResponse>(
      protopipeApiUrl(ProtopipeEndpoints.patchProject.path, { siteId, projectId }),
      body,
    );
  }

  createProjectCapture$(siteId: string, projectId: string, body: CreateProjectCaptureRequest) {
    return this.http.post<CreateProjectCaptureResponse>(
      protopipeApiUrl(ProtopipeEndpoints.createProjectCapture.path, { siteId, projectId }),
      body,
    );
  }

  presignProjectMedia$(siteId: string, projectId: string, body: ProjectMediaPresignRequest) {
    return this.http.post<ProjectMediaPresignResponse>(
      protopipeApiUrl(ProtopipeEndpoints.projectMediaPresign.path, { siteId, projectId }),
      body,
    );
  }

  generateProjectShareLink$(siteId: string, projectId: string) {
    return this.http.post<GenerateProjectShareLinkResponse>(
      protopipeApiUrl(ProtopipeEndpoints.generateProjectShareLink.path, { siteId, projectId }),
      {},
    );
  }

  generateProjectStory$(siteId: string, projectId: string) {
    return this.http.post<GenerateProjectStoryResponse>(
      protopipeApiUrl(ProtopipeEndpoints.generateProjectStory.path, { siteId, projectId }),
      {},
    );
  }

  disableProjectShareLink$(siteId: string, projectId: string) {
    return this.http.delete<PatchProjectResponse>(
      protopipeApiUrl(ProtopipeEndpoints.disableProjectShareLink.path, { siteId, projectId }),
    );
  }

  getProjectShare$(token: string) {
    return this.http.get<GetProjectShareResponse>(
      protopipeApiUrl(ProtopipeEndpoints.getProjectShare.path, { token }),
    );
  }

  presignProjectShareMedia$(token: string, body: ProjectMediaPresignRequest) {
    return this.http.post<ProjectMediaPresignResponse>(
      protopipeApiUrl(ProtopipeEndpoints.projectShareMediaPresign.path, { token }),
      body,
    );
  }

  createProjectShareCapture$(token: string, body: CreateProjectCaptureRequest) {
    return this.http.post<CreateProjectCaptureResponse>(
      protopipeApiUrl(ProtopipeEndpoints.projectShareCapture.path, { token }),
      body,
    );
  }

  listPitchProspects(): Promise<ListPitchProspectsResponse> {
    return firstValueFrom(
      this.http.get<ListPitchProspectsResponse>(
        protopipeApiUrl(ProtopipeEndpoints.pitchProspectsList.path),
      ),
    );
  }

  createPitchProspect(body: CreatePitchProspectRequest): Promise<CreatePitchProspectResponse> {
    return firstValueFrom(
      this.http.post<CreatePitchProspectResponse>(
        protopipeApiUrl(ProtopipeEndpoints.pitchProspectCreate.path),
        body,
      ),
    );
  }

  getPitchProspect(prospectId: string): Promise<GetPitchProspectResponse> {
    return firstValueFrom(
      this.http.get<GetPitchProspectResponse>(
        protopipeApiUrl(ProtopipeEndpoints.pitchProspectDetail.path, { prospectId }),
      ),
    );
  }

  patchPitchProspect(
    prospectId: string,
    body: PatchPitchProspectRequest,
  ): Promise<PatchPitchProspectResponse> {
    return firstValueFrom(
      this.http.patch<PatchPitchProspectResponse>(
        protopipeApiUrl(ProtopipeEndpoints.pitchProspectPatch.path, { prospectId }),
        body,
      ),
    );
  }

  ingestPitchPrep(siteId: string, body: PitchPrepIngestRequest = {}): Promise<PitchPrepIngestResponse> {
    return firstValueFrom(
      this.http.post<PitchPrepIngestResponse>(
        protopipeApiUrl(ProtopipeEndpoints.pitchPrepIngest.path, { siteId }),
        body,
      ),
    );
  }

  getPitchPrepContext(siteId: string): Promise<PitchPrepContextResponse> {
    return firstValueFrom(
      this.http.get<PitchPrepContextResponse>(
        protopipeApiUrl(ProtopipeEndpoints.pitchPrepContext.path, { siteId }),
      ),
    );
  }

  generatePitchPack(
    siteId: string,
    body: PitchPrepGeneratePackRequest = {},
  ): Promise<PitchPrepGeneratePackResponse> {
    return firstValueFrom(
      this.http.post<PitchPrepGeneratePackResponse>(
        protopipeApiUrl(ProtopipeEndpoints.pitchPrepGeneratePack.path, { siteId }),
        body,
      ),
    );
  }

  distillPitchPrompt(
    siteId: string,
    body: PitchPrepDistillPromptRequest,
  ): Promise<PitchPrepDistillPromptResponse> {
    return firstValueFrom(
      this.http.post<PitchPrepDistillPromptResponse>(
        protopipeApiUrl(ProtopipeEndpoints.pitchPrepDistillPrompt.path, { siteId }),
        body,
      ),
    );
  }

  regeneratePitchAsset(
    siteId: string,
    body: PitchPrepRegenerateRequest,
  ): Promise<PitchPrepRegenerateResponse> {
    return firstValueFrom(
      this.http.post<PitchPrepRegenerateResponse>(
        protopipeApiUrl(ProtopipeEndpoints.pitchPrepRegenerate.path, { siteId }),
        body,
      ),
    );
  }

  listPitchMedia(siteId: string): Promise<PitchPrepMediaListResponse> {
    return firstValueFrom(
      this.http.get<PitchPrepMediaListResponse>(
        protopipeApiUrl(ProtopipeEndpoints.pitchPrepMediaList.path, { siteId }),
      ),
    );
  }

  patchPitchMediaAsset(
    siteId: string,
    assetId: string,
    body: PatchPitchMediaAssetRequest,
  ): Promise<PatchPitchMediaAssetResponse> {
    return firstValueFrom(
      this.http.patch<PatchPitchMediaAssetResponse>(
        protopipeApiUrl(ProtopipeEndpoints.pitchPrepMediaPatch.path, { siteId, assetId }),
        body,
      ),
    );
  }

  patchPitchPrepStyle(
    siteId: string,
    body: PitchPrepStyleRequest,
  ): Promise<PitchPrepStyleResponse> {
    return firstValueFrom(
      this.http.patch<PitchPrepStyleResponse>(
        protopipeApiUrl(ProtopipeEndpoints.pitchPrepStyle.path, { siteId }),
        body,
      ),
    );
  }
}
