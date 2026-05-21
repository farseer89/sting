import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  CreateContentPostRequest,
  ProtopipeContentPost,
  ProtopipeContentPostResponse,
  ProtopipeContentPostStatus,
  ProtopipeContentTemplate,
  ProtopipeKeywordDto,
  SeoValidationResult,
  UpdateContentPostRequest,
} from '@hive/contracts';
import { parseProtopipeApiError } from './protopipe-http.util';
import { ProtopipeApiService } from './protopipe-api.service';

export type ContentTab = 'published' | 'scheduled' | 'draft';

export function emptyContentTemplate(): ProtopipeContentTemplate {
  return {
    primaryKeywordPhrase: '',
    title: '',
    h1: '',
    metaDescription: '',
    intro: '',
    sections: [{ h2: '', body: '', images: [] }],
    internalLinks: [],
    cta: { label: 'Get in touch', href: '/get-in-touch' },
  };
}

@Injectable({ providedIn: 'root' })
export class ProtopipeContentService {
  private readonly api = inject(ProtopipeApiService);

  private readonly _siteId = signal<string | null>(null);
  private readonly _posts = signal<ProtopipeContentPost[]>([]);
  private readonly _planKeywords = signal<ProtopipeKeywordDto[]>([]);
  private readonly _activeTab = signal<ContentTab>('draft');
  private readonly _loading = signal(false);
  private readonly _saving = signal(false);
  private readonly _publishing = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _editingId = signal<string | null>(null);
  private readonly _dirty = signal(false);
  private readonly _seoValidation = signal<SeoValidationResult | null>(null);

  readonly posts = this._posts.asReadonly();
  readonly planKeywords = this._planKeywords.asReadonly();
  readonly activeTab = this._activeTab.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly publishing = this._publishing.asReadonly();
  readonly error = this._error.asReadonly();
  readonly editingId = this._editingId.asReadonly();
  readonly dirty = this._dirty.asReadonly();
  readonly seoValidation = this._seoValidation.asReadonly();

  readonly publishedPosts = computed(() =>
    this._posts().filter((p) => p.status === 'published'),
  );
  readonly scheduledPosts = computed(() =>
    this._posts().filter((p) => p.status === 'scheduled'),
  );
  readonly draftPosts = computed(() => this._posts().filter((p) => p.status === 'draft'));

  readonly filteredPosts = computed(() => {
    const tab = this._activeTab();
    if (tab === 'published') return this.publishedPosts();
    if (tab === 'scheduled') return this.scheduledPosts();
    return this.draftPosts();
  });

  readonly seoChecklist = computed(() => {
    const v = this._seoValidation();
    if (!v) return [];
    return [...v.errors, ...v.warnings];
  });

  async ensureLoaded(): Promise<void> {
    if (this._siteId() && this._posts().length > 0) {
      return;
    }
    await this.reload();
  }

  async reload(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const boot = await this.api.bootstrap();
      const siteId = boot.primarySiteId || boot.sites[0]?.id;
      if (!siteId) {
        throw new Error('No site available');
      }
      this._siteId.set(siteId);
      const [{ posts }, plan] = await Promise.all([
        this.api.listContent(siteId),
        this.api.getPlan(siteId),
      ]);
      this._posts.set(posts);
      this._planKeywords.set(plan.keywords);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to load content'));
    } finally {
      this._loading.set(false);
    }
  }

  setTab(tab: ContentTab): void {
    this._activeTab.set(tab);
  }

  startCreate(): void {
    this._editingId.set('new');
    this._dirty.set(true);
    this._seoValidation.set(null);
  }

  startEdit(postId: string): void {
    this._editingId.set(postId);
    this._dirty.set(false);
    const post = this.postById(postId);
    this._seoValidation.set(post?.seoValidation ?? null);
  }

  cancelEdit(): void {
    this._editingId.set(null);
    this._dirty.set(false);
    this._seoValidation.set(null);
  }

  markDirty(): void {
    this._dirty.set(true);
  }

  async savePost(input: {
    slug: string;
    template: ProtopipeContentTemplate;
    scheduleAt?: string;
  }): Promise<boolean> {
    const siteId = this._siteId();
    if (!siteId) {
      this._error.set('No site loaded');
      return false;
    }

    const publishAt = input.scheduleAt?.trim() || undefined;
    const status: ProtopipeContentPostStatus | undefined = publishAt ? 'scheduled' : 'draft';

    const body: CreateContentPostRequest | UpdateContentPostRequest = {
      slug: input.slug.trim() || undefined,
      template: input.template,
      status,
      publishAt,
    };

    this._saving.set(true);
    this._error.set(null);
    try {
      const editingId = this._editingId();
      let response: ProtopipeContentPostResponse;
      if (editingId === 'new') {
        response = await this.api.createContent(siteId, body as CreateContentPostRequest);
        this._posts.update((list) => [response.post, ...list]);
        this._editingId.set(response.post.id);
      } else if (editingId) {
        response = await this.api.updateContent(siteId, editingId, body);
        this._posts.update((list) => list.map((p) => (p.id === response.post.id ? response.post : p)));
      } else {
        return false;
      }
      this._seoValidation.set(response.seoValidation ?? null);
      this._dirty.set(false);
      return true;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to save post'));
      return false;
    } finally {
      this._saving.set(false);
    }
  }

  async publishNow(postId: string): Promise<boolean> {
    const siteId = this._siteId();
    if (!siteId) {
      this._error.set('No site loaded');
      return false;
    }

    this._publishing.set(true);
    this._error.set(null);
    try {
      const { post } = await this.api.publishContent(siteId, postId);
      this._posts.update((list) => list.map((p) => (p.id === post.id ? post : p)));
      this._activeTab.set('published');
      this._seoValidation.set(post.seoValidation ?? null);
      return true;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409) {
        const body = err.error as { seoValidation?: SeoValidationResult } | null;
        if (body?.seoValidation) {
          this._seoValidation.set(body.seoValidation);
        }
      }
      this._error.set(parseProtopipeApiError(err, 'Failed to publish'));
      return false;
    } finally {
      this._publishing.set(false);
    }
  }

  postById(id: string): ProtopipeContentPost | undefined {
    return this._posts().find((p) => p.id === id);
  }
}
