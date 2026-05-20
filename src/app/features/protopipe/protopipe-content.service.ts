import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  CreateContentPostRequest,
  ProtopipeContentPost,
  ProtopipeContentPostStatus,
  UpdateContentPostRequest,
} from '@hive/contracts';
import { parseProtopipeApiError } from './protopipe-http.util';
import { ProtopipeApiService } from './protopipe-api.service';

export type ContentTab = 'published' | 'scheduled' | 'draft';

@Injectable({ providedIn: 'root' })
export class ProtopipeContentService {
  private readonly api = inject(ProtopipeApiService);

  private readonly _siteId = signal<string | null>(null);
  private readonly _posts = signal<ProtopipeContentPost[]>([]);
  private readonly _activeTab = signal<ContentTab>('draft');
  private readonly _loading = signal(false);
  private readonly _saving = signal(false);
  private readonly _publishing = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _editingId = signal<string | null>(null);
  private readonly _dirty = signal(false);

  readonly posts = this._posts.asReadonly();
  readonly activeTab = this._activeTab.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly publishing = this._publishing.asReadonly();
  readonly error = this._error.asReadonly();
  readonly editingId = this._editingId.asReadonly();
  readonly dirty = this._dirty.asReadonly();

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

  async ensureLoaded(): Promise<void> {
    if (this._siteId() && this._posts().length >= 0 && !this._error()) {
      if (this._posts().length > 0 || this._loading()) {
        return;
      }
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
      const { posts } = await this.api.listContent(siteId);
      this._posts.set(posts);
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
  }

  startEdit(postId: string): void {
    this._editingId.set(postId);
    this._dirty.set(false);
  }

  cancelEdit(): void {
    this._editingId.set(null);
    this._dirty.set(false);
  }

  markDirty(): void {
    this._dirty.set(true);
  }

  async savePost(input: {
    title: string;
    slug: string;
    description: string;
    bodyMarkdown: string;
    scheduleAt?: string;
  }): Promise<boolean> {
    const siteId = this._siteId();
    if (!siteId) {
      this._error.set('No site loaded');
      return false;
    }

    const publishAt = input.scheduleAt?.trim() || undefined;
    const status: ProtopipeContentPostStatus | undefined = publishAt
      ? 'scheduled'
      : 'draft';

    const body: CreateContentPostRequest | UpdateContentPostRequest = {
      title: input.title.trim(),
      slug: input.slug.trim() || undefined,
      description: input.description.trim(),
      bodyMarkdown: input.bodyMarkdown.trim(),
      status,
      publishAt,
    };

    this._saving.set(true);
    this._error.set(null);
    try {
      const editingId = this._editingId();
      if (editingId === 'new') {
        const { post } = await this.api.createContent(siteId, body as CreateContentPostRequest);
        this._posts.update((list) => [post, ...list]);
        this._editingId.set(post.id);
      } else if (editingId) {
        const { post } = await this.api.updateContent(siteId, editingId, body);
        this._posts.update((list) => list.map((p) => (p.id === post.id ? post : p)));
      }
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
      return true;
    } catch (err) {
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
