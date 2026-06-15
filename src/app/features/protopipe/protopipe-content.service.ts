import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import type {
  ArticleIdeaDto,
  CreateContentPostRequest,
  ProtopipeContentBrief,
  ProtopipeContentPost,
  ProtopipeContentPostResponse,
  ProtopipeContentPostStatus,
  ProtopipeContentTemplate,
  ProtopipePublishContentRequest,
  ProtopipePublishContentResponse,
  ProtopipeKeywordDto,
  SeoValidationResult,
  UpdateContentPostRequest,
} from '@hive/contracts';
import { concatMap, first, forkJoin, from, map, of, switchMap, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  applyKeywordToTemplate,
  slugifyTitle,
} from './content/content-template-suggestions';
import type { ContentCatalog } from './content/content-catalog.model';
import { patchSectionWithBlocks } from './content/block-template.util';
import {
  cloneTemplate,
  type WritingSession,
} from './content/protopipe-writing-session';
import { parseProtopipeApiError } from './protopipe-http.util';
import { ProtopipeApiService } from './protopipe-api.service';
import { resolveBootstrapSiteId } from './resolve-bootstrap-site-id';

export type ContentTab = 'published' | 'scheduled' | 'draft';

export function emptyContentTemplate(): ProtopipeContentTemplate {
  return {
    primaryKeywordPhrase: '',
    title: '',
    h1: '',
    metaDescription: '',
    intro: '',
    sections: [{ h2: '', body: '', images: [], embeds: [] }],
    internalLinks: [],
    cta: { label: 'Get in touch', href: '/get-in-touch' },
  };
}

@Injectable({ providedIn: 'root' })
export class ProtopipeContentService {
  private readonly api = inject(ProtopipeApiService);

  private readonly _activeTab = signal<ContentTab>('draft');
  private readonly _saving = signal(false);
  private readonly _publishing = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _editingId = signal<string | null>(null);
  /** Site that owns the post being edited (may differ from bootstrap primary). */
  private readonly _editingSiteId = signal<string | null>(null);
  private readonly _dirty = signal(false);
  private readonly _seoValidation = signal<SeoValidationResult | null>(null);
  private readonly _publishReview = signal(false);
  private readonly _writingSession = signal<WritingSession | null>(null);
  /** True while the immersive pipeline writer owns the layout (shell hides global nav). */
  private readonly _writerImmersive = signal(false);
  /** Fires after a successful create (for editor route replace). */
  readonly saveCreatedId = signal<string | null>(null);
  readonly publishSucceeded = signal(false);
  readonly lastDeployStatus = signal<ProtopipePublishContentResponse['deployStatus'] | null>(null);
  readonly lastPublishedUrl = signal<string | null>(null);

  /** Reactive catalog load (bootstrap → posts + plan keywords). */
  readonly catalogResource = rxResource({
    stream: () =>
      this.api.bootstrap$().pipe(
        switchMap((boot) => {
          const siteId = resolveBootstrapSiteId(boot);
          if (!siteId) {
            return throwError(() => new Error('No site available'));
          }
          return forkJoin({
            posts: this.api.listContent$(siteId),
            plan: this.api.getPlan$(siteId),
          }).pipe(
            map(
              ({ posts, plan }): ContentCatalog => ({
                siteId,
                posts: posts.posts,
                keywords: plan.keywords,
              }),
            ),
          );
        }),
      ),
  });

  readonly catalog = computed(() => this.catalogResource.value());
  readonly siteId = computed(() => this._editingSiteId() ?? this.catalog()?.siteId ?? null);
  readonly posts = computed(() => this.catalog()?.posts ?? []);
  readonly planKeywords = computed(() => this.catalog()?.keywords ?? []);
  readonly loading = this.catalogResource.isLoading;
  readonly catalogReady = computed(() => this.catalogResource.hasValue());

  readonly activeTab = this._activeTab.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly publishing = this._publishing.asReadonly();
  readonly error = this._error.asReadonly();
  readonly editingId = this._editingId.asReadonly();
  readonly dirty = this._dirty.asReadonly();
  readonly seoValidation = this._seoValidation.asReadonly();
  readonly publishReview = this._publishReview.asReadonly();
  readonly writingSession = this._writingSession.asReadonly();
  readonly inWritingMode = computed(() => this._writingSession() !== null);
  readonly writerImmersive = this._writerImmersive.asReadonly();

  setWriterImmersive(active: boolean): void {
    this._writerImmersive.set(active);
  }

  readonly publishedPosts = computed(() =>
    this.posts().filter((p) => p.status === 'published'),
  );
  readonly scheduledPosts = computed(() =>
    this.posts().filter((p) => p.status === 'scheduled'),
  );
  readonly draftPosts = computed(() => this.posts().filter((p) => p.status === 'draft'));

  readonly filteredPosts = computed(() => {
    const tab = this._activeTab();
    if (tab === 'published') return this.publishedPosts();
    if (tab === 'scheduled') return this.scheduledPosts();
    return this.draftPosts();
  });

  readonly publishBlockers = computed(() => {
    const v = this._seoValidation();
    if (!v || !this._publishReview()) return [];
    return v.errors;
  });

  readonly loadError = computed(() => {
    const err = this.catalogResource.error();
    if (err) {
      return parseProtopipeApiError(err, 'Failed to load content');
    }
    return this._error();
  });

  reload(): void {
    this._error.set(null);
    this.catalogResource.reload();
  }

  ensureCatalogLoaded(): void {
    if (!this.catalogResource.hasValue()) {
      this.reload();
    }
  }

  /** Pin API calls to the site that owns the open post (multi-site accounts). */
  setEditingSiteId(siteId: string | null): void {
    this._editingSiteId.set(siteId);
  }

  /**
   * Load a post by id, trying preferredSiteId first then every bootstrap site.
   * Fixes 404 when primarySiteId ≠ the site that holds the draft.
   */
  findPost$(postId: string, preferredSiteId?: string | null) {
    return this.api.bootstrap$().pipe(
      switchMap((boot) => {
        const siteIds = boot.sites.map((s) => s.id);
        const ordered = preferredSiteId
          ? [preferredSiteId, ...siteIds.filter((id) => id !== preferredSiteId)]
          : siteIds;
        return from(ordered).pipe(
          concatMap((siteId) =>
            this.api.getContent$(siteId, postId).pipe(
              map((response) => {
                this._editingSiteId.set(response.post.siteId);
                return response;
              }),
              catchError(() => of(null)),
            ),
          ),
          first((response): response is ProtopipeContentPostResponse => response !== null),
        );
      }),
    );
  }

  setTab(tab: ContentTab): void {
    this._activeTab.set(tab);
  }

  startCreate(): void {
    this._editingId.set('new');
    this._dirty.set(true);
    this._seoValidation.set(null);
    this._publishReview.set(false);
  }

  startEdit(postId: string): void {
    this._editingId.set(postId);
    this._dirty.set(false);
    this._seoValidation.set(null);
    this._publishReview.set(false);
  }

  clearEditor(): void {
    this._editingId.set(null);
    this._editingSiteId.set(null);
    this._dirty.set(false);
    this._seoValidation.set(null);
    this._publishReview.set(false);
    this._writingSession.set(null);
    this.saveCreatedId.set(null);
    this.publishSucceeded.set(false);
  }

  consumePublishSucceeded(): boolean {
    if (!this.publishSucceeded()) return false;
    this.publishSucceeded.set(false);
    return true;
  }

  openWritingSession(
    session: Omit<WritingSession, 'focusedSectionIndex'> & { focusedSectionIndex?: number },
  ): void {
    this._writingSession.set({
      ...session,
      template: cloneTemplate(session.template),
      focusedSectionIndex: session.focusedSectionIndex ?? 0,
    });
  }

  updateWritingSession(patch: Partial<WritingSession>, options?: { markDirty?: boolean }): void {
    const current = this._writingSession();
    if (!current) return;
    this._writingSession.set({ ...current, ...patch });
    if (options?.markDirty !== false) {
      this.markDirty();
    }
  }

  patchWritingTemplate(partial: Partial<ProtopipeContentTemplate>): void {
    const s = this._writingSession();
    if (!s) return;
    this.updateWritingSession({ template: { ...s.template, ...partial } });
  }

  patchWritingSection(
    index: number,
    partial: Parameters<typeof patchSectionWithBlocks>[2],
  ): void {
    const s = this._writingSession();
    if (!s) return;
    this.updateWritingSession({ template: patchSectionWithBlocks(s.template, index, partial) });
  }

  reorderWritingSections(previousIndex: number, currentIndex: number): void {
    const s = this._writingSession();
    if (!s || previousIndex === currentIndex) return;
    const sections = [...s.template.sections];
    const [moved] = sections.splice(previousIndex, 1);
    sections.splice(currentIndex, 0, moved);
    let focused = s.focusedSectionIndex;
    if (focused === previousIndex) focused = currentIndex;
    else if (previousIndex < focused && currentIndex >= focused) focused -= 1;
    else if (previousIndex > focused && currentIndex <= focused) focused += 1;
    this.updateWritingSession({ template: { ...s.template, sections }, focusedSectionIndex: focused });
  }

  addWritingSection(): void {
    const s = this._writingSession();
    if (!s || s.readOnly) return;
    this.updateWritingSession({
      template: {
        ...s.template,
        sections: [...s.template.sections, { h2: '', body: '', images: [], embeds: [] }],
      },
      focusedSectionIndex: s.template.sections.length,
    });
  }

  removeWritingSection(index: number): void {
    const s = this._writingSession();
    if (!s || s.readOnly || s.template.sections.length <= 1) return;
    const sections = s.template.sections.filter((_, i) => i !== index);
    this.updateWritingSession({
      template: { ...s.template, sections },
      focusedSectionIndex: Math.min(s.focusedSectionIndex, sections.length - 1),
    });
  }

  applyKeywordToWriting(kw: ProtopipeKeywordDto): void {
    const s = this._writingSession();
    if (!s || s.readOnly) return;
    this.updateWritingSession({
      template: applyKeywordToTemplate(s.template, kw),
      selectedKeywordId: kw.id,
    });
  }

  setPrimaryKeyword(keywordId: string): void {
    const s = this._writingSession();
    if (!s || s.readOnly) return;
    const kw = this.planKeywords().find((k) => k.id === keywordId);
    const phrase = kw?.phrase ?? s.template.primaryKeywordPhrase;
    this.updateWritingSession({
      template: {
        ...s.template,
        primaryKeywordId: kw?.id ?? '',
        primaryKeywordPhrase: phrase,
      },
      brief: s.brief
        ? {
            ...s.brief,
            primaryKeywordPhrase: phrase || s.brief.primaryKeywordPhrase,
          }
        : s.brief,
      selectedKeywordId: kw?.id ?? null,
    });
  }

  setCognitivePackId(packId: string): void {
    const s = this._writingSession();
    if (!s || s.readOnly) return;
    const cognitivePackId = packId.trim() || 'none';
    this.updateWritingSession({
      cognitivePackId,
      brief: s.brief ? { ...s.brief, cognitivePackId } : s.brief,
    });
  }

  /** Apply a server-generated article idea to the writing session. */
  applyArticleIdeaDto(idea: ArticleIdeaDto): void {
    const s = this._writingSession();
    if (!s || s.readOnly) return;

    const sections = idea.outline.map((sec, i) => ({
      h2: sec.h2,
      body: s.template.sections[i]?.body ?? '',
      images: s.template.sections[i]?.images ?? [],
    }));

    const template: ProtopipeContentTemplate = {
      ...s.template,
      primaryKeywordId: idea.keywordId,
      primaryKeywordPhrase: idea.phrase,
      title: idea.title,
      h1: idea.h1,
      metaDescription: idea.metaDescription,
      intro: idea.intro,
      sections: sections.length ? sections : s.template.sections,
    };

    const slug =
      !s.slug.trim() || this._editingId() === 'new'
        ? slugifyTitle(template.title || template.h1)
        : s.slug;

    this.updateWritingSession({
      template,
      selectedKeywordId: idea.keywordId,
      slug,
      focusedSectionIndex: 0,
    });
  }

  /** Switch topic from the writing-tools panel — refresh title, SEO fields, and outline. */
  applyArticleIdeaToWriting(kw: ProtopipeKeywordDto, introAngle?: string): void {
    const s = this._writingSession();
    if (!s || s.readOnly) return;
    const template = applyKeywordToTemplate(s.template, kw, {
      mode: 'replace',
      introOverride: introAngle,
    });
    const slug =
      !s.slug.trim() || this._editingId() === 'new'
        ? slugifyTitle(template.title || template.h1)
        : s.slug;
    this.updateWritingSession({
      template,
      selectedKeywordId: kw.id,
      slug,
      focusedSectionIndex: 0,
    });
  }

  addImageToWritingSection(sectionIndex: number, url: string, alt: string): void {
    const s = this._writingSession();
    if (!s || s.readOnly) return;
    const section = s.template.sections[sectionIndex];
    if (!section) return;
    const images = [...(section.images ?? []), { url, alt }];
    this.patchWritingSection(sectionIndex, { images });
    this.updateWritingSession({ focusedSectionIndex: sectionIndex }, { markDirty: false });
  }

  setFocusedSection(index: number): void {
    const s = this._writingSession();
    if (!s) return;
    this._writingSession.set({ ...s, focusedSectionIndex: index });
  }

  getWritingSnapshot(): { slug: string; template: ProtopipeContentTemplate; scheduleAt: Date | null } | null {
    const s = this._writingSession();
    if (!s) return null;
    return { slug: s.slug, template: s.template, scheduleAt: s.scheduleAt };
  }

  dismissPublishReview(): void {
    this._publishReview.set(false);
  }

  markDirty(): void {
    this._dirty.set(true);
  }

  private patchCatalogPosts(updater: (posts: ProtopipeContentPost[]) => ProtopipeContentPost[]): void {
    const cat = this.catalog();
    if (!cat) return;
    this.catalogResource.set({ ...cat, posts: updater(cat.posts) });
  }

  saveFromWritingSession(): void {
    const s = this._writingSession();
    const snap = this.getWritingSnapshot();
    if (!snap || !s) return;
    this.savePost({
      slug: snap.slug,
      template: snap.template,
      scheduleAt: snap.scheduleAt?.toISOString(),
      brief: this.buildBriefForSave(s),
    });
  }

  private buildBriefForSave(session: WritingSession): ProtopipeContentBrief | undefined {
    const packId = session.cognitivePackId ?? 'none';
    if (session.brief) {
      return { ...session.brief, cognitivePackId: packId };
    }
    if (packId !== 'none') {
      return {
        primaryKeywordPhrase: session.template.primaryKeywordPhrase || '',
        secondaryKeywords: [],
        mustCoverTerms: [],
        contentGaps: [],
        competitorHeadings: [],
        cognitivePackId: packId,
      };
    }
    return undefined;
  }

  savePost(input: {
    slug: string;
    template: ProtopipeContentTemplate;
    scheduleAt?: string;
    brief?: ProtopipeContentBrief;
  }): void {
    const siteId = this.siteId();
    if (!siteId) {
      this._error.set('No site loaded');
      return;
    }

    const publishAt = input.scheduleAt?.trim() || undefined;
    const status: ProtopipeContentPostStatus | undefined = publishAt ? 'scheduled' : 'draft';

    const body: CreateContentPostRequest | UpdateContentPostRequest = {
      slug: input.slug.trim() || undefined,
      template: input.template,
      status,
      publishAt,
      ...(input.brief !== undefined ? { brief: input.brief } : {}),
    };

    this._saving.set(true);
    this._error.set(null);

    const editingId = this._editingId();
    const request$ =
      editingId === 'new'
        ? this.api.createContent$(siteId, body as CreateContentPostRequest)
        : editingId
          ? this.api.updateContent$(siteId, editingId, body)
          : null;

    if (!request$) {
      this._saving.set(false);
      return;
    }

    request$.subscribe({
      next: (response) => {
        if (editingId === 'new') {
          this.patchCatalogPosts((list) => [response.post, ...list]);
          this._editingId.set(response.post.id);
          this.saveCreatedId.set(response.post.id);
        } else {
          this.patchCatalogPosts((list) =>
            list.map((p) => (p.id === response.post.id ? response.post : p)),
          );
          this.saveCreatedId.set(null);
        }
        if (response.seoValidation) {
          this._seoValidation.set(response.seoValidation);
        }
        this._dirty.set(false);
        this._saving.set(false);
      },
      error: (err) => {
        this._error.set(parseProtopipeApiError(err, 'Failed to save post'));
        this._saving.set(false);
      },
    });
  }

  publishNow(postId: string, options: ProtopipePublishContentRequest = {}): void {
    const siteId = this.siteId();
    if (!siteId) {
      this._error.set('No site loaded');
      return;
    }

    this._publishing.set(true);
    this._error.set(null);
    this._publishReview.set(false);
    this.lastDeployStatus.set(null);
    this.lastPublishedUrl.set(null);

    this.api.publishContent$(siteId, postId, options).subscribe({
      next: (response: ProtopipePublishContentResponse) => {
        const { post } = response;
        this.patchCatalogPosts((list) => list.map((p) => (p.id === post.id ? post : p)));
        this._activeTab.set('published');
        this._seoValidation.set(null);
        this._publishing.set(false);
        this.lastDeployStatus.set(response.deployStatus ?? null);
        this.lastPublishedUrl.set(response.publishedUrl ?? post.publishedUrl ?? null);
        this.publishSucceeded.set(true);
      },
      error: (err) => {
        if (err instanceof HttpErrorResponse && err.status === 409) {
          const body = err.error as { seoValidation?: SeoValidationResult } | null;
          if (body?.seoValidation) {
            this._seoValidation.set(body.seoValidation);
            this._publishReview.set(true);
          }
          this._error.set(null);
        } else {
          this._error.set(parseProtopipeApiError(err, 'Failed to publish'));
        }
        this._publishing.set(false);
      },
    });
  }

  postById(id: string): ProtopipeContentPost | undefined {
    return this.posts().find((p) => p.id === id);
  }
}
