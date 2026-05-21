import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
  computed,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Toast } from 'primeng/toast';
import { map } from 'rxjs/operators';
import {
  PROTOPIPE_CONTENT_META_MAX,
  PROTOPIPE_CONTENT_META_MIN,
} from '../protopipe.constants';
import {
  ProtopipeContentService,
  emptyContentTemplate,
} from '../protopipe-content.service';
import {
  buildKeywordSuggestions,
  serpPreview,
  writingHints,
} from './content-template-suggestions';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

@Component({
  selector: 'app-protopipe-content-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Button, DatePicker, ProgressSpinner, Toast],
  providers: [MessageService],
  templateUrl: './protopipe-content-editor.component.html',
  styleUrl: './protopipe-content-editor.component.scss',
})
export class ProtopipeContentEditorComponent {
  protected readonly content = inject(ProtopipeContentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);

  readonly loading = this.content.loading;
  readonly saving = this.content.saving;
  readonly publishing = this.content.publishing;
  readonly error = this.content.loadError;
  readonly session = this.content.writingSession;
  readonly publishBlockers = this.content.publishBlockers;
  readonly publishReview = this.content.publishReview;

  readonly seoOpen = signal(false);
  private readonly publishAfterSave = signal(false);

  private readonly isCreateRoute = toSignal(
    this.route.data.pipe(map((d) => d['mode'] === 'create')),
    { initialValue: false },
  );

  private readonly routePostId = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('postId'))),
    { initialValue: null as string | null },
  );

  private readonly editorBootKey = computed(
    () => `${this.isCreateRoute()}:${this.routePostId() ?? ''}`,
  );

  private readonly bootstrappedKey = signal<string | null>(null);

  readonly metaMin = PROTOPIPE_CONTENT_META_MIN;
  readonly metaMax = PROTOPIPE_CONTENT_META_MAX;

  readonly writingHints = computed(() => {
    const t = this.session()?.template;
    return t ? writingHints(t) : [];
  });

  readonly serp = computed(() => {
    const s = this.session();
    if (!s) return null;
    return serpPreview({
      title: s.template.title,
      metaDescription: s.template.metaDescription,
      slug: s.slug,
      siteHost: 'destinationweddingpainter.com',
    });
  });

  readonly saveLabel = computed(() => {
    if (this.saving()) return 'Saving…';
    if (this.content.dirty()) return 'Save draft';
    return 'Saved';
  });

  readonly introSuggestion = computed(() => {
    const s = this.session();
    if (!s) return null;
    const kw = this.content.planKeywords().find((k) => k.id === s.selectedKeywordId);
    if (!kw || s.template.intro.trim()) return null;
    return buildKeywordSuggestions(kw).intro;
  });

  constructor() {
    this.content.ensureCatalogLoaded();

    effect(() => {
      if (!this.content.catalogReady()) return;

      const key = this.editorBootKey();
      if (this.bootstrappedKey() === key) return;

      untracked(() => this.bootstrapEditor(key));
    });

    effect(() => {
      const createdId = this.content.saveCreatedId();
      if (!createdId || !this.isCreateRoute()) return;

      untracked(() => {
        void this.router.navigate(['/protopipe/content', createdId], { replaceUrl: true });
        this.content.saveCreatedId.set(null);
        this.bootstrappedKey.set(createdId);
      });
    });

    effect(() => {
      if (this.publishAfterSave() && !this.content.saving() && !this.content.dirty()) {
        const postId = this.content.editingId();
        if (postId && postId !== 'new') {
          untracked(() => {
            this.publishAfterSave.set(false);
            this.content.publishNow(postId);
          });
        }
      }
    });

    effect(() => {
      if (!this.content.publishSucceeded()) return;

      untracked(() => {
        if (this.content.consumePublishSucceeded()) {
          this.messages.add({
            severity: 'success',
            summary: 'Published',
            detail: 'Your site will update via GitHub Actions.',
            life: 5000,
          });
          this.content.clearEditor();
          void this.router.navigate(['/protopipe/content']);
        }
      });
    });
  }

  private bootstrapEditor(key: string): void {
    if (this.isCreateRoute()) {
      this.content.startCreate();
      this.content.openWritingSession({
        template: emptyContentTemplate(),
        slug: '',
        scheduleAt: null,
        selectedKeywordId: null,
        readOnly: false,
      });
      this.bootstrappedKey.set(key);
      return;
    }

    const id = this.routePostId();
    if (!id) {
      void this.router.navigate(['/protopipe/content']);
      return;
    }

    const post = this.content.postById(id);
    if (!post) {
      void this.router.navigate(['/protopipe/content']);
      return;
    }

    this.content.startEdit(id);
    this.content.openWritingSession({
      template: post.template ?? emptyContentTemplate(),
      slug: post.slug,
      scheduleAt: post.publishAt ? new Date(post.publishAt) : null,
      selectedKeywordId: post.template?.primaryKeywordId ?? null,
      readOnly: post.status === 'published',
    });
    this.bootstrappedKey.set(key);
  }

  backToLibrary(): void {
    this.content.clearEditor();
    this.bootstrappedKey.set(null);
    void this.router.navigate(['/protopipe/content']);
  }

  insertIntroSuggestion(): void {
    const text = this.introSuggestion();
    if (text) this.content.patchWritingTemplate({ intro: text });
  }

  onHeadlineInput(value: string): void {
    const s = this.session();
    if (!s) return;
    const title = s.template.title || value;
    const slug =
      !s.slug || this.content.editingId() === 'new' ? slugify(value || title) : s.slug;
    this.content.updateWritingSession({
      slug,
      template: { ...s.template, h1: value, title },
    });
  }

  patchTemplate(partial: Parameters<typeof this.content.patchWritingTemplate>[0]): void {
    this.content.patchWritingTemplate(partial);
  }

  patchSection(
    index: number,
    partial: Parameters<typeof this.content.patchWritingSection>[1],
  ): void {
    this.content.patchWritingSection(index, partial);
  }

  addSection(): void {
    this.content.addWritingSection();
  }

  removeSection(index: number): void {
    this.content.removeWritingSection(index);
  }

  setSchedule(date: Date | null): void {
    this.content.updateWritingSession({ scheduleAt: date });
  }

  setSlug(slug: string): void {
    this.content.updateWritingSession({ slug });
  }

  toggleSeoPanel(): void {
    this.seoOpen.update((v) => !v);
  }

  dismissPublishReview(): void {
    this.content.dismissPublishReview();
  }

  saveDraft(): void {
    this.content.saveFromWritingSession();
  }

  publish(): void {
    if (this.content.dirty()) {
      this.publishAfterSave.set(true);
      this.content.saveFromWritingSession();
      return;
    }
    const postId = this.content.editingId();
    if (!postId || postId === 'new') {
      this.messages.add({
        severity: 'warn',
        summary: 'Save first',
        detail: 'Save your draft before publishing.',
        life: 4000,
      });
      return;
    }
    this.content.publishNow(postId);
  }

  isReadOnly(): boolean {
    return this.session()?.readOnly ?? false;
  }

  focusSection(index: number): void {
    this.content.setFocusedSection(index);
  }
}
