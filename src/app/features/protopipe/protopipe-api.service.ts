import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ProtopipeAdminEndpoints, ProtopipeEndpoints } from '@hive/contracts';
import type {
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
  ProtopipeGoogleIntegrationStatusResponse,
  ProtopipeGoogleOAuthConfigResponse,
  ProtopipeGoogleOAuthStartResponse,
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
