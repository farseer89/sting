import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ProtopipeAdminEndpoints, ProtopipeEndpoints, ShireEndpoints } from '@hive/contracts';
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
  ProtopipeGooglePlatformOAuthStatusResponse,
  ProtopipeGooglePlatformOAuthAdsProbeResponse,
  ProtopipeKeywordDiscoveryResponse,
  ProtopipeGetDiscoveryRunResponse,
  ProtopipeGetLatestDiscoveryRunResponse,
  ProtopipeStartDiscoveryResponse,
  ProtopipeConfirmKeywordsRequest,
  ProtopipeConfirmKeywordsResponse,
  ProtopipeStrategyConfirmRequest,
  ProtopipeStrategyConfirmResponse,
  ProtopipeResearchQueryRequest,
  ProtopipeResearchResponse,
  ProtopipeGeoTargetsSearchResponse,
  ProtopipeKeywordMetricHistoryResponse,
  ProtopipeMarketEnrichResponse,
  ProtopipeOnboardingRequest,
  ProtopipeOnboardingResponse,
  SaveOnboardingProgressRequest,
  SaveOnboardingProgressResponse,
  ProtopipeScanOfferRequest,
  ProtopipeScanOfferResponse,
  ProtopipeExpandOfferRequest,
  ProtopipeExpandOfferResponse,
  ProtopipeEnrichCustomerRequest,
  ProtopipeEnrichCustomerResponse,
  ProtopipeFanOutCompetitionRequest,
  ProtopipeFanOutCompetitionResponse,
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
  ProtopipeListArticleGenerationRunsResponse,
  ArticleGenerationRerunStepResponse,
  ArticleGenerationStep,
  ProtopipeSerpLocationsResponse,
  PutUserContentHelperRequest,
  SaveBrandIdentityRequest,
  SaveBrandIdentityResponse,
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
  ShireFormNotificationsResponse,
  ShireLeadsListResponse,
  ShireHostedSiteScanRequest,
  ShireHostedSiteScanResponse,
  ShirePatchFormNotificationsRequest,
  ShireAnalyticsReplayShareResponse,
  ShireSiteAnalyticsResponse,
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
  ProtopipeAudienceBookResponse,
  PutAudienceBookVoiceRequest,
  PutAudienceBookVoiceResponse,
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
  CreateResearchBookRunRequest,
  CreateResearchBookRunResponse,
  ListResearchBookRunsResponse,
  GetResearchBookRunResponse,
  PatchResearchBookFactRequest,
  PatchResearchBookFactResponse,
  CreateMerchBookRunRequest,
  CreateMerchBookRunResponse,
  GetMerchBookCatalogResponse,
  ListMerchBookRunsResponse,
  GetMerchBookRunResponse,
  PatchMerchBookLogoConceptRequest,
  PatchMerchBookLogoConceptResponse,
  GenerateMerchBookMockupsResponse,
  ListPrintfulCatalogCategoriesResponse,
  ListPrintfulCatalogProductsResponse,
  GetPrintfulCatalogProductResponse,
  ListMerchBookStationeryResponse,
  PresignMerchBookArtworkRequest,
  PresignMerchBookArtworkResponse,
  PreviewMerchBookStationeryRequest,
  PreviewMerchBookStationeryResponse,
} from '@hive/contracts';
import { Observable, firstValueFrom, shareReplay } from 'rxjs';
import { legacyProtopipeApiUrl, protopipeApiUrl } from './protopipe-http.util';
import { isShirePrimary, shireApiUrl } from './shire/shire-http.util';

@Injectable({ providedIn: 'root' })
export class ProtopipeApiService {
  private readonly http = inject(HttpClient);

  /** Shared in-flight + cached bootstrap payload to avoid rate-limit bursts. */
  private cachedBootstrap$: Observable<ProtopipeBootstrapResponse> | null = null;

  bootstrap$(): Observable<ProtopipeBootstrapResponse> {
    if (!this.cachedBootstrap$) {
      const url = isShirePrimary()
        ? shireApiUrl(ShireEndpoints.bootstrap)
        : protopipeApiUrl(ProtopipeEndpoints.bootstrap.path);
      this.cachedBootstrap$ = this.http
        .get<ProtopipeBootstrapResponse>(url)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    }
    return this.cachedBootstrap$;
  }

  /** Drop cached bootstrap after site create/delete or explicit refresh. */
  invalidateBootstrapCache(): void {
    this.cachedBootstrap$ = null;
  }

  bootstrap(): Promise<ProtopipeBootstrapResponse> {
    return firstValueFrom(this.bootstrap$());
  }

  getPlan$(siteId: string): Observable<ProtopipePlan> {
    const url = isShirePrimary()
      ? shireApiUrl(ShireEndpoints.sites.plan(siteId))
      : protopipeApiUrl(ProtopipeEndpoints.getPlan.path, { siteId });
    return this.http.get<ProtopipePlan>(url);
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

  saveBrandIdentity(
    siteId: string,
    body: SaveBrandIdentityRequest,
  ): Promise<SaveBrandIdentityResponse> {
    const url = isShirePrimary()
      ? shireApiUrl(ShireEndpoints.sites.brandIdentity(siteId))
      : protopipeApiUrl(ProtopipeEndpoints.saveBrandIdentity.path, { siteId });
    return firstValueFrom(this.http.patch<SaveBrandIdentityResponse>(url, body));
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

  saveOnboardingProgress(
    siteId: string,
    body: SaveOnboardingProgressRequest,
  ): Promise<SaveOnboardingProgressResponse> {
    return firstValueFrom(
      this.http.patch<SaveOnboardingProgressResponse>(
        protopipeApiUrl(ProtopipeEndpoints.saveOnboardingProgress.path, { siteId }),
        body,
      ),
    );
  }

  scanOffer(
    siteId: string,
    body: ProtopipeScanOfferRequest,
  ): Promise<ProtopipeScanOfferResponse> {
    return firstValueFrom(
      this.http.post<ProtopipeScanOfferResponse>(
        protopipeApiUrl(ProtopipeEndpoints.scanOffer.path, { siteId }),
        body,
      ),
    );
  }

  expandOffer(
    siteId: string,
    body: ProtopipeExpandOfferRequest,
  ): Promise<ProtopipeExpandOfferResponse> {
    return firstValueFrom(
      this.http.post<ProtopipeExpandOfferResponse>(
        protopipeApiUrl(ProtopipeEndpoints.expandOffer.path, { siteId }),
        body,
      ),
    );
  }

  enrichCustomer(
    siteId: string,
    body: ProtopipeEnrichCustomerRequest,
  ): Promise<ProtopipeEnrichCustomerResponse> {
    return firstValueFrom(
      this.http.post<ProtopipeEnrichCustomerResponse>(
        protopipeApiUrl(ProtopipeEndpoints.enrichCustomer.path, { siteId }),
        body,
      ),
    );
  }

  fanOutCompetition(
    siteId: string,
    body: ProtopipeFanOutCompetitionRequest,
  ): Promise<ProtopipeFanOutCompetitionResponse> {
    return firstValueFrom(
      this.http.post<ProtopipeFanOutCompetitionResponse>(
        protopipeApiUrl(ProtopipeEndpoints.fanOutCompetition.path, { siteId }),
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

  searchGeoTargets(
    query: string,
    countryCode?: string,
    limit = 12,
  ): Promise<ProtopipeGeoTargetsSearchResponse> {
    let params = new HttpParams().set('q', query).set('limit', String(limit));
    if (countryCode?.trim()) {
      params = params.set('countryCode', countryCode.trim());
    }
    return firstValueFrom(
      this.http.get<ProtopipeGeoTargetsSearchResponse>(
        protopipeApiUrl(ProtopipeEndpoints.googleGeoTargetsSearch.path),
        { params },
      ),
    );
  }

  /** Verifies bagend → DataForSEO credentials (JWT required; secrets stay on server). */
  dataForSeoStatus(): Promise<ProtopipeDataForSeoStatusResponse> {
    const url = isShirePrimary()
      ? shireApiUrl(ShireEndpoints.integrations.dataForSeo.status)
      : protopipeApiUrl(ProtopipeEndpoints.dataForSeoStatus.path);
    return firstValueFrom(
      this.http.get<ProtopipeDataForSeoStatusResponse>(url),
    );
  }

  spyFuStatus(): Promise<ProtopipeSpyFuStatusResponse> {
    const url = isShirePrimary()
      ? shireApiUrl(ShireEndpoints.integrations.spyFu.status)
      : protopipeApiUrl(ProtopipeEndpoints.spyFuStatus.path);
    return firstValueFrom(
      this.http.get<ProtopipeSpyFuStatusResponse>(url),
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
    const url = isShirePrimary()
      ? shireApiUrl(ShireEndpoints.research.query(siteId))
      : protopipeApiUrl(ProtopipeEndpoints.researchQuery.path, { siteId });
    return firstValueFrom(
      this.http.post<ProtopipeResearchResponse>(url, body),
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

  googlePlatformOAuthStatus(): Promise<ProtopipeGooglePlatformOAuthStatusResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeGooglePlatformOAuthStatusResponse>(
        protopipeApiUrl(ProtopipeAdminEndpoints.googleOAuthStatus.path),
      ),
    );
  }

  googlePlatformOAuthStatusUrl(): string {
    return protopipeApiUrl(ProtopipeAdminEndpoints.googleOAuthStatus.path);
  }

  googlePlatformOAuthStatusContractPath(): string {
    return ProtopipeAdminEndpoints.googleOAuthStatus.path;
  }

  googlePlatformOAuthAdsProbe(): Promise<ProtopipeGooglePlatformOAuthAdsProbeResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeGooglePlatformOAuthAdsProbeResponse>(
        protopipeApiUrl(ProtopipeAdminEndpoints.googleOAuthAdsProbe.path),
      ),
    );
  }

  googlePlatformOAuthAdsProbeUrl(): string {
    return protopipeApiUrl(ProtopipeAdminEndpoints.googleOAuthAdsProbe.path);
  }

  googlePlatformOAuthAdsProbeContractPath(): string {
    return ProtopipeAdminEndpoints.googleOAuthAdsProbe.path;
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
    const url = isShirePrimary()
      ? shireApiUrl(ShireEndpoints.keywordDiscovery.start(siteId))
      : protopipeApiUrl(ProtopipeEndpoints.keywordDiscoveryStart.path, { siteId });
    return firstValueFrom(this.http.post<ProtopipeStartDiscoveryResponse>(url, {}));
  }

  getKeywordDiscoveryRun(
    siteId: string,
    runId: string,
  ): Promise<ProtopipeGetDiscoveryRunResponse> {
    const url = isShirePrimary()
      ? shireApiUrl(ShireEndpoints.keywordDiscovery.get(siteId, runId))
      : protopipeApiUrl(ProtopipeEndpoints.keywordDiscoveryGetRun.path, { siteId, runId });
    return firstValueFrom(this.http.get<ProtopipeGetDiscoveryRunResponse>(url));
  }

  getLatestKeywordDiscoveryRun(siteId: string): Promise<ProtopipeGetLatestDiscoveryRunResponse> {
    const url = isShirePrimary()
      ? shireApiUrl(ShireEndpoints.keywordDiscovery.latest(siteId))
      : protopipeApiUrl(ProtopipeEndpoints.keywordDiscoveryGetLatestRun.path, { siteId });
    return firstValueFrom(this.http.get<ProtopipeGetLatestDiscoveryRunResponse>(url));
  }

  /** Keywords-only confirm → researchRankings (no audiences / content plan). */
  confirmKeywords(
    siteId: string,
    body: ProtopipeConfirmKeywordsRequest,
  ): Promise<ProtopipeConfirmKeywordsResponse> {
    const url = isShirePrimary()
      ? shireApiUrl(ShireEndpoints.keywordDiscovery.confirmKeywords(siteId))
      : protopipeApiUrl(ProtopipeEndpoints.keywordDiscoveryConfirmKeywords.path, { siteId });
    return firstValueFrom(this.http.post<ProtopipeConfirmKeywordsResponse>(url, body));
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

  getAudienceBook(siteId: string): Promise<ProtopipeAudienceBookResponse> {
    return firstValueFrom(
      this.http.get<ProtopipeAudienceBookResponse>(
        protopipeApiUrl(ProtopipeEndpoints.getAudienceBook.path, { siteId }),
      ),
    );
  }

  putAudienceBookVoice(
    siteId: string,
    body: PutAudienceBookVoiceRequest,
  ): Promise<PutAudienceBookVoiceResponse> {
    return firstValueFrom(
      this.http.put<PutAudienceBookVoiceResponse>(
        protopipeApiUrl(ProtopipeEndpoints.putAudienceBookVoice.path, { siteId }),
        body,
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
    ).then((res) => {
      this.invalidateBootstrapCache();
      return res;
    });
  }

  deleteSite(siteId: string): Promise<DeleteProtopipeSiteResponse> {
    return firstValueFrom(
      this.http.delete<DeleteProtopipeSiteResponse>(
        protopipeApiUrl(ProtopipeEndpoints.deleteSite.path, { siteId }),
      ),
    ).then((res) => {
      this.invalidateBootstrapCache();
      return res;
    });
  }

  getSitePage(siteId: string): Promise<SitePageResponse> {
    return firstValueFrom(
      this.http.get<SitePageResponse>(
        protopipeApiUrl(ProtopipeEndpoints.getSitePage.path, { siteId }),
      ),
    );
  }

  getLegacySitePage(siteId: string): Promise<SitePageResponse> {
    return firstValueFrom(
      this.http.get<SitePageResponse>(
        legacyProtopipeApiUrl(ProtopipeEndpoints.getSitePage.path, { siteId }),
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

  updateLegacySitePage(
    siteId: string,
    body: UpdateSitePageRequest,
  ): Promise<UpdateSitePageResponse> {
    return firstValueFrom(
      this.http.put<UpdateSitePageResponse>(
        legacyProtopipeApiUrl(ProtopipeEndpoints.updateSitePage.path, { siteId }),
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
    const url = isShirePrimary()
      ? shireApiUrl(ShireEndpoints.leads.listAccount)
      : protopipeApiUrl(ProtopipeEndpoints.leadsListAll.path);
    return firstValueFrom(this.http.get<ProtopipeLeadsListResponse | ShireLeadsListResponse>(url)).then(
      (res) => ({ leads: res.leads }),
    );
  }

  listLeads(siteId: string): Promise<ProtopipeLeadsListResponse> {
    const url = isShirePrimary()
      ? shireApiUrl(ShireEndpoints.leads.listSite(siteId))
      : protopipeApiUrl(ProtopipeEndpoints.leadsList.path, { siteId });
    return firstValueFrom(this.http.get<ProtopipeLeadsListResponse | ShireLeadsListResponse>(url)).then(
      (res) => ({ leads: res.leads }),
    );
  }

  getLead(siteId: string, leadId: string): Promise<ProtopipeLeadDetailResponse> {
    const url = isShirePrimary()
      ? shireApiUrl(ShireEndpoints.leads.get(siteId, leadId))
      : protopipeApiUrl(ProtopipeEndpoints.leadDetail.path, { siteId, leadId });
    return firstValueFrom(this.http.get<ProtopipeLeadDetailResponse>(url));
  }

  deleteLead(siteId: string, leadId: string): Promise<{ deleted: true; id: string }> {
    return firstValueFrom(
      this.http.delete<{ deleted: true; id: string }>(
        shireApiUrl(ShireEndpoints.leads.delete(siteId, leadId)),
      ),
    );
  }

  getHostedSiteAnalytics(siteId: string): Promise<ShireSiteAnalyticsResponse> {
    return firstValueFrom(
      this.http.get<ShireSiteAnalyticsResponse>(shireApiUrl(ShireEndpoints.analytics.get(siteId))),
    );
  }

  shareHostedReplay(
    siteId: string,
    recordingId: string,
  ): Promise<ShireAnalyticsReplayShareResponse> {
    return firstValueFrom(
      this.http.post<ShireAnalyticsReplayShareResponse>(
        shireApiUrl(ShireEndpoints.analytics.shareReplay(siteId, recordingId)),
        {},
      ),
    );
  }

  getFormNotifications(siteId: string): Promise<ShireFormNotificationsResponse> {
    return firstValueFrom(
      this.http.get<ShireFormNotificationsResponse>(
        shireApiUrl(ShireEndpoints.formNotifications.get(siteId)),
      ),
    );
  }

  patchFormNotifications(
    siteId: string,
    body: ShirePatchFormNotificationsRequest,
  ): Promise<ShireFormNotificationsResponse> {
    return firstValueFrom(
      this.http.patch<ShireFormNotificationsResponse>(
        shireApiUrl(ShireEndpoints.formNotifications.patch(siteId)),
        body,
      ),
    );
  }

  scanHostedSite(
    siteId: string,
    body: ShireHostedSiteScanRequest,
  ): Promise<ShireHostedSiteScanResponse> {
    return firstValueFrom(
      this.http.post<ShireHostedSiteScanResponse>(
        shireApiUrl(ShireEndpoints.hosting.scan(siteId)),
        body,
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

  createResearchBookRun(
    siteId: string,
    body: CreateResearchBookRunRequest,
  ): Promise<CreateResearchBookRunResponse> {
    return firstValueFrom(
      this.http.post<CreateResearchBookRunResponse>(
        protopipeApiUrl(ProtopipeEndpoints.researchBookCreateRun.path, { siteId }),
        body,
      ),
    );
  }

  listResearchBookRuns(siteId: string): Promise<ListResearchBookRunsResponse> {
    return firstValueFrom(
      this.http.get<ListResearchBookRunsResponse>(
        protopipeApiUrl(ProtopipeEndpoints.researchBookListRuns.path, { siteId }),
      ),
    );
  }

  getResearchBookRun(siteId: string, runId: string): Promise<GetResearchBookRunResponse> {
    return firstValueFrom(
      this.http.get<GetResearchBookRunResponse>(
        protopipeApiUrl(ProtopipeEndpoints.researchBookGetRun.path, { siteId, runId }),
      ),
    );
  }

  patchResearchBookFact(
    siteId: string,
    runId: string,
    factId: string,
    body: PatchResearchBookFactRequest,
  ): Promise<PatchResearchBookFactResponse> {
    return firstValueFrom(
      this.http.patch<PatchResearchBookFactResponse>(
        protopipeApiUrl(ProtopipeEndpoints.researchBookPatchFact.path, {
          siteId,
          runId,
          factId,
        }),
        body,
      ),
    );
  }

  getMerchBookCatalog(siteId: string): Promise<GetMerchBookCatalogResponse> {
    return firstValueFrom(
      this.http.get<GetMerchBookCatalogResponse>(
        protopipeApiUrl(ProtopipeEndpoints.merchBookGetCatalog.path, { siteId }),
      ),
    );
  }

  createMerchBookRun(
    siteId: string,
    body: CreateMerchBookRunRequest,
  ): Promise<CreateMerchBookRunResponse> {
    return firstValueFrom(
      this.http.post<CreateMerchBookRunResponse>(
        protopipeApiUrl(ProtopipeEndpoints.merchBookCreateRun.path, { siteId }),
        body,
      ),
    );
  }

  listMerchBookRuns(siteId: string): Promise<ListMerchBookRunsResponse> {
    return firstValueFrom(
      this.http.get<ListMerchBookRunsResponse>(
        protopipeApiUrl(ProtopipeEndpoints.merchBookListRuns.path, { siteId }),
      ),
    );
  }

  getMerchBookRun(siteId: string, runId: string): Promise<GetMerchBookRunResponse> {
    return firstValueFrom(
      this.http.get<GetMerchBookRunResponse>(
        protopipeApiUrl(ProtopipeEndpoints.merchBookGetRun.path, { siteId, runId }),
      ),
    );
  }

  patchMerchBookLogoConcept(
    siteId: string,
    runId: string,
    conceptId: string,
    body: PatchMerchBookLogoConceptRequest,
  ): Promise<PatchMerchBookLogoConceptResponse> {
    return firstValueFrom(
      this.http.patch<PatchMerchBookLogoConceptResponse>(
        protopipeApiUrl(ProtopipeEndpoints.merchBookPatchLogoConcept.path, {
          siteId,
          runId,
          conceptId,
        }),
        body,
      ),
    );
  }

  generateMerchBookMockups(
    siteId: string,
    runId: string,
  ): Promise<GenerateMerchBookMockupsResponse> {
    return firstValueFrom(
      this.http.post<GenerateMerchBookMockupsResponse>(
        protopipeApiUrl(ProtopipeEndpoints.merchBookGenerateMockups.path, { siteId, runId }),
        {},
      ),
    );
  }

  listPrintfulCatalogCategories(siteId: string): Promise<ListPrintfulCatalogCategoriesResponse> {
    return firstValueFrom(
      this.http.get<ListPrintfulCatalogCategoriesResponse>(
        protopipeApiUrl(ProtopipeEndpoints.merchBookListPrintfulCategories.path, { siteId }),
      ),
    );
  }

  listPrintfulCatalogProducts(
    siteId: string,
    params?: { limit?: number; offset?: number; categoryId?: number },
  ): Promise<ListPrintfulCatalogProductsResponse> {
    const query = new URLSearchParams();
    if (params?.limit != null) query.set('limit', String(params.limit));
    if (params?.offset != null) query.set('offset', String(params.offset));
    if (params?.categoryId != null) query.set('categoryId', String(params.categoryId));
    const qs = query.toString();
    const path = protopipeApiUrl(ProtopipeEndpoints.merchBookListPrintfulProducts.path, { siteId });
    return firstValueFrom(
      this.http.get<ListPrintfulCatalogProductsResponse>(qs ? `${path}?${qs}` : path),
    );
  }

  getPrintfulCatalogProduct(
    siteId: string,
    catalogProductId: number,
    params?: { variantLimit?: number; variantOffset?: number },
  ): Promise<GetPrintfulCatalogProductResponse> {
    const query = new URLSearchParams();
    if (params?.variantLimit != null) query.set('variantLimit', String(params.variantLimit));
    if (params?.variantOffset != null) query.set('variantOffset', String(params.variantOffset));
    const qs = query.toString();
    const path = protopipeApiUrl(ProtopipeEndpoints.merchBookGetPrintfulProduct.path, {
      siteId,
      catalogProductId: String(catalogProductId),
    });
    return firstValueFrom(
      this.http.get<GetPrintfulCatalogProductResponse>(qs ? `${path}?${qs}` : path),
    );
  }

  listMerchBookStationery(siteId: string): Promise<ListMerchBookStationeryResponse> {
    return firstValueFrom(
      this.http.get<ListMerchBookStationeryResponse>(
        protopipeApiUrl(ProtopipeEndpoints.merchBookListStationery.path, { siteId }),
      ),
    );
  }

  presignMerchBookStationeryArtwork(
    siteId: string,
    body: PresignMerchBookArtworkRequest,
  ): Promise<PresignMerchBookArtworkResponse> {
    return firstValueFrom(
      this.http.post<PresignMerchBookArtworkResponse>(
        protopipeApiUrl(ProtopipeEndpoints.merchBookPresignStationeryArtwork.path, { siteId }),
        body,
      ),
    );
  }

  previewMerchBookStationery(
    siteId: string,
    body: PreviewMerchBookStationeryRequest,
  ): Promise<PreviewMerchBookStationeryResponse> {
    return firstValueFrom(
      this.http.post<PreviewMerchBookStationeryResponse>(
        protopipeApiUrl(ProtopipeEndpoints.merchBookPreviewStationery.path, { siteId }),
        body,
      ),
    );
  }
}
