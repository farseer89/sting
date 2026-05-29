import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ProtopipeEndpoints } from '@hive/contracts';
import type {
  ArticleGenerationCreateRequest,
  ArticleGenerationCreateResponse,
  ArticleGenerationGetResponse,
  ArticleGenerationRerunStepResponse,
  ArticleGenerationSavePostResponse,
  ArticleGenerationStep,
} from '@hive/contracts';
import { firstValueFrom } from 'rxjs';
import { protopipeApiUrl } from '../../protopipe-http.util';

@Injectable({ providedIn: 'root' })
export class ArticlePipelineApiService {
  private readonly http = inject(HttpClient);

  create(
    siteId: string,
    body: ArticleGenerationCreateRequest,
  ): Promise<ArticleGenerationCreateResponse> {
    return firstValueFrom(
      this.http.post<ArticleGenerationCreateResponse>(
        protopipeApiUrl(ProtopipeEndpoints.articleGenerationsCreate.path, { siteId }),
        body,
      ),
    );
  }

  get(siteId: string, runId: string): Promise<ArticleGenerationGetResponse> {
    return firstValueFrom(
      this.http.get<ArticleGenerationGetResponse>(
        protopipeApiUrl(ProtopipeEndpoints.articleGenerationsGet.path, { siteId, runId }),
      ),
    );
  }

  rerunStep(
    siteId: string,
    runId: string,
    step: ArticleGenerationStep,
  ): Promise<ArticleGenerationRerunStepResponse> {
    return firstValueFrom(
      this.http.post<ArticleGenerationRerunStepResponse>(
        protopipeApiUrl(ProtopipeEndpoints.articleGenerationsRerunStep.path, {
          siteId,
          runId,
          step,
        }),
        {},
      ),
    );
  }

  savePost(siteId: string, runId: string): Promise<ArticleGenerationSavePostResponse> {
    return firstValueFrom(
      this.http.post<ArticleGenerationSavePostResponse>(
        protopipeApiUrl(ProtopipeEndpoints.articleGenerationsSavePost.path, {
          siteId,
          runId,
        }),
        {},
      ),
    );
  }
}
