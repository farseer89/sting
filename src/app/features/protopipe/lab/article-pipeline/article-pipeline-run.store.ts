import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  ArticleGenerationRunDto,
  ArticleGenerationStep,
  ArticleGenerationType,
} from '@hive/contracts';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ArticlePipelineApiService } from './article-pipeline-api.service';

const POLL_INTERVAL_MS = 800;
const GENERATION_STEPS: ArticleGenerationStep[] = [
  'infer_type',
  'analyse_competition',
  'content_plan',
  'research',
  'build_brief',
  'outline',
  'draft',
  'review',
  'metadata',
  'assemble',
];

@Injectable({ providedIn: 'root' })
export class ArticlePipelineRunStore {
  private readonly api = inject(ArticlePipelineApiService);

  private readonly _siteId = signal<string | null>(null);
  private readonly _run = signal<ArticleGenerationRunDto | null>(null);
  private readonly _starting = signal(false);
  private readonly _saving = signal(false);
  private readonly _error = signal<string | null>(null);
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  readonly run = this._run.asReadonly();
  readonly starting = this._starting.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly error = this._error.asReadonly();

  readonly status = computed(() => this._run()?.status ?? 'idle');
  readonly currentStep = computed(() => this._run()?.currentStep ?? null);
  readonly isRunning = computed(() => this._run()?.status === 'running');
  readonly isComplete = computed(() => this._run()?.status === 'complete');
  readonly hasFailed = computed(() => this._run()?.status === 'failed');

  setSiteId(siteId: string): void {
    this._siteId.set(siteId);
  }

  async startRun(input: {
    keywordId: string;
    articleType?: ArticleGenerationType;
  }): Promise<void> {
    const siteId = this._siteId();
    if (!siteId) {
      this._error.set('No site selected');
      return;
    }

    this._starting.set(true);
    this._error.set(null);
    try {
      const res = await this.api.create(siteId, {
        keywordId: input.keywordId,
        articleType: input.articleType,
      });
      this._run.set(res.run);
      this.startPolling();
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to start article generation'));
    } finally {
      this._starting.set(false);
    }
  }

  async rerunStep(step: ArticleGenerationStep): Promise<void> {
    const siteId = this._siteId();
    const runId = this._run()?.id;
    if (!siteId || !runId) return;

    this._error.set(null);
    try {
      const res = await this.api.rerunStep(siteId, runId, step);
      this._run.set(res.run);
      this.startPolling();
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to rerun step'));
    }
  }

  async saveAsPost(): Promise<{ contentPostId: string } | null> {
    const siteId = this._siteId();
    const runId = this._run()?.id;
    if (!siteId || !runId) return null;

    this._saving.set(true);
    this._error.set(null);
    try {
      const res = await this.api.savePost(siteId, runId);
      this._run.set(res.run);
      return { contentPostId: res.contentPostId };
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to save as scheduled post'));
      return null;
    } finally {
      this._saving.set(false);
    }
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  reset(): void {
    this.stopPolling();
    this._run.set(null);
    this._error.set(null);
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollTimer = setTimeout(() => this.pollOnce(), POLL_INTERVAL_MS);
  }

  private async pollOnce(): Promise<void> {
    const siteId = this._siteId();
    const runId = this._run()?.id;
    if (!siteId || !runId) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      this.pollTimer = setTimeout(() => this.pollOnce(), POLL_INTERVAL_MS * 4);
      return;
    }

    try {
      const res = await this.api.get(siteId, runId);
      this._run.set(res.run);
      if (res.run.status === 'running' || res.run.status === 'pending') {
        this.pollTimer = setTimeout(() => this.pollOnce(), POLL_INTERVAL_MS);
      } else {
        this.stopPolling();
      }
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to poll run'));
      this.stopPolling();
    }
  }
}

export { GENERATION_STEPS };
