import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  ArticleIdeaDto,
  ArticleIdeasResponse,
  PutUserContentHelperRequest,
  UserContentHelperDto,
} from '@hive/contracts';
import { parseProtopipeApiError } from './protopipe-http.util';
import { ProtopipeApiService } from './protopipe-api.service';
import { ProtopipeStrategyService } from './protopipe-strategy.service';

@Injectable({ providedIn: 'root' })
export class ProtopipeAgentService {
  private readonly api = inject(ProtopipeApiService);
  private readonly strategy = inject(ProtopipeStrategyService);

  private readonly _ideasLoading = signal(false);
  private readonly _ideasError = signal<string | null>(null);
  private readonly _ideas = signal<ArticleIdeaDto[]>([]);
  private readonly _ideasPending = signal(false);

  private readonly _helperLoading = signal(false);
  private readonly _helperSaving = signal(false);
  private readonly _helperError = signal<string | null>(null);
  private readonly _helper = signal<UserContentHelperDto | null>(null);
  private readonly _helperDirty = signal(false);
  private readonly _ingestLoading = signal(false);

  readonly ideasLoading = this._ideasLoading.asReadonly();
  readonly ideasError = this._ideasError.asReadonly();
  readonly ideas = this._ideas.asReadonly();
  readonly ideasPending = this._ideasPending.asReadonly();

  readonly helperLoading = this._helperLoading.asReadonly();
  readonly helperSaving = this._helperSaving.asReadonly();
  readonly helperError = this._helperError.asReadonly();
  readonly helper = this._helper.asReadonly();
  readonly helperDirty = this._helperDirty.asReadonly();
  readonly ingestLoading = this._ingestLoading.asReadonly();

  private siteId(): string | null {
    return this.strategy.siteId();
  }

  async loadArticleIdeas(): Promise<void> {
    const siteId = this.siteId();
    if (!siteId) return;

    this._ideasLoading.set(true);
    this._ideasError.set(null);

    try {
      let res = await this.api.getArticleIdeas(siteId);
      if (res.pending && res.runId) {
        this._ideasPending.set(true);
        res = await this.pollArticleIdeas(siteId, res.runId);
        this._ideasPending.set(false);
      }
      this._ideas.set(res.ideas ?? []);
    } catch (err) {
      this._ideasError.set(parseProtopipeApiError(err, 'Could not load article ideas'));
      this._ideas.set([]);
    } finally {
      this._ideasLoading.set(false);
    }
  }

  private async pollArticleIdeas(siteId: string, runId: string): Promise<ArticleIdeasResponse> {
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const run = await firstValueFrom(this.api.getAgentRun$(siteId, runId));
      if (run?.run.status === 'succeeded') {
        const fresh = await this.api.getArticleIdeas(siteId);
        return fresh;
      }
      if (run?.run.status === 'failed') {
        throw new Error('Idea generation failed');
      }
    }
    throw new Error('Idea generation timed out');
  }

  async refreshArticleIdeas(): Promise<void> {
    const siteId = this.siteId();
    if (!siteId) return;

    this._ideasLoading.set(true);
    this._ideasError.set(null);
    this._ideasPending.set(true);

    try {
      const { run } = await this.api.enqueueAgentRun(siteId, { type: 'article_ideas' });
      const res = await this.pollArticleIdeas(siteId, run.id);
      this._ideas.set(res.ideas ?? []);
    } catch (err) {
      this._ideasError.set(parseProtopipeApiError(err, 'Could not refresh ideas'));
    } finally {
      this._ideasLoading.set(false);
      this._ideasPending.set(false);
    }
  }

  async loadContentHelper(): Promise<void> {
    const siteId = this.siteId();
    if (!siteId) return;

    this._helperLoading.set(true);
    this._helperError.set(null);

    try {
      const { helper } = await firstValueFrom(this.api.getContentHelper$(siteId));
      this._helper.set(helper ?? null);
      this._helperDirty.set(false);
    } catch (err) {
      this._helperError.set(parseProtopipeApiError(err, 'Could not load content helper'));
    } finally {
      this._helperLoading.set(false);
    }
  }

  patchHelperDraft(patch: Partial<PutUserContentHelperRequest>): void {
    const current = this._helper();
    if (!current) return;
    this._helper.set({
      ...current,
      voice: { ...current.voice, ...patch.voice },
      examples: patch.examples ?? current.examples,
    });
    this._helperDirty.set(true);
  }

  async saveContentHelper(): Promise<boolean> {
    const siteId = this.siteId();
    const helper = this._helper();
    if (!siteId || !helper || !this._helperDirty()) return true;

    this._helperSaving.set(true);
    this._helperError.set(null);

    try {
      const { helper: saved } = await this.api.putContentHelper(siteId, {
        voice: helper.voice,
        examples: helper.examples,
      });
      this._helper.set(saved);
      this._helperDirty.set(false);
      return true;
    } catch (err) {
      this._helperError.set(parseProtopipeApiError(err, 'Save failed'));
      return false;
    } finally {
      this._helperSaving.set(false);
    }
  }

  async ingestReference(input: { url?: string; text?: string }): Promise<void> {
    const siteId = this.siteId();
    if (!siteId) return;

    this._ingestLoading.set(true);
    this._helperError.set(null);

    try {
      await this.api.ingestContentHelper(siteId, input);
      await this.loadContentHelper();
    } catch (err) {
      this._helperError.set(parseProtopipeApiError(err, 'Could not add reference'));
    } finally {
      this._ingestLoading.set(false);
    }
  }
}
