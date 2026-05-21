import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Toast } from 'primeng/toast';
import type { ProtopipeContentSection, ProtopipeContentTemplate, ProtopipeKeywordDto } from '@hive/contracts';
import {
  PROTOPIPE_CONTENT_META_MAX,
  PROTOPIPE_CONTENT_META_MIN,
} from '../protopipe.constants';
import {
  ProtopipeContentService,
  emptyContentTemplate,
} from '../protopipe-content.service';
import {
  applyKeywordToTemplate,
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
  imports: [FormsModule, RouterLink, Button, DatePicker, ProgressSpinner, Toast],
  providers: [MessageService],
  templateUrl: './protopipe-content-editor.component.html',
  styleUrl: './protopipe-content-editor.component.scss',
})
export class ProtopipeContentEditorComponent implements OnInit {
  protected readonly content = inject(ProtopipeContentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);

  readonly loading = this.content.loading;
  readonly saving = this.content.saving;
  readonly publishing = this.content.publishing;
  readonly error = this.content.error;
  readonly planKeywords = this.content.planKeywords;
  readonly publishBlockers = this.content.publishBlockers;
  readonly publishReview = this.content.publishReview;

  readonly editSlug = signal('');
  readonly editScheduleAt = signal<Date | null>(null);
  readonly editTemplate = signal<ProtopipeContentTemplate>(emptyContentTemplate());
  readonly selectedKeywordId = signal<string | null>(null);
  readonly seoPanelOpen = signal(false);

  readonly metaMin = PROTOPIPE_CONTENT_META_MIN;
  readonly metaMax = PROTOPIPE_CONTENT_META_MAX;

  readonly writingHints = computed(() => writingHints(this.editTemplate()));
  readonly serp = computed(() =>
    serpPreview({
      title: this.editTemplate().title,
      metaDescription: this.editTemplate().metaDescription,
      slug: this.editSlug(),
      siteHost: 'destinationweddingpainter.com',
    }),
  );

  readonly saveLabel = computed(() => {
    if (this.saving()) return 'Saving…';
    if (this.content.dirty()) return 'Save draft';
    return 'Saved';
  });

  readonly selectedKeyword = computed(() => {
    const id = this.selectedKeywordId();
    return this.planKeywords().find((k) => k.id === id);
  });

  readonly introSuggestion = computed(() => {
    const kw = this.selectedKeyword();
    if (!kw || this.editTemplate().intro.trim()) return null;
    return buildKeywordSuggestions(kw).intro;
  });

  /** Exposed for template section-heading chips. */
  readonly buildKeywordSuggestions = buildKeywordSuggestions;

  ngOnInit(): void {
    void this.initFromRoute();
  }

  private async initFromRoute(): Promise<void> {
    await this.content.ensureLoaded();
    const id = this.route.snapshot.paramMap.get('postId');
    if (id === 'new') {
      this.content.startCreate();
      this.resetEditorState(emptyContentTemplate(), '', null, null);
      return;
    }
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
    this.resetEditorState(
      post.template ?? emptyContentTemplate(),
      post.slug,
      post.publishAt ? new Date(post.publishAt) : null,
      post.template?.primaryKeywordId ?? null,
    );
  }

  private resetEditorState(
    template: ProtopipeContentTemplate,
    slug: string,
    schedule: Date | null,
    keywordId: string | null,
  ): void {
    this.editTemplate.set(template);
    this.editSlug.set(slug);
    this.editScheduleAt.set(schedule);
    this.selectedKeywordId.set(keywordId);
  }

  backToLibrary(): void {
    this.content.clearEditor();
    void this.router.navigate(['/protopipe/content']);
  }

  selectKeyword(kw: ProtopipeKeywordDto): void {
    this.selectedKeywordId.set(kw.id);
    this.editTemplate.update((t) => applyKeywordToTemplate(t, kw));
    this.content.markDirty();
  }

  clearKeyword(): void {
    this.selectedKeywordId.set(null);
    this.patchTemplate({ primaryKeywordId: undefined, primaryKeywordPhrase: '' });
  }

  insertIntroSuggestion(): void {
    const text = this.introSuggestion();
    if (text) {
      this.patchTemplate({ intro: text });
      this.content.markDirty();
    }
  }

  onHeadlineInput(value: string): void {
    const t = this.editTemplate();
    const updates: Partial<ProtopipeContentTemplate> = { h1: value, title: t.title || value };
    if (!this.editSlug() || this.content.editingId() === 'new') {
      this.editSlug.set(slugify(value || t.title));
    }
    this.patchTemplate(updates);
    this.content.markDirty();
  }

  patchTemplate(partial: Partial<ProtopipeContentTemplate>): void {
    this.editTemplate.update((t) => ({ ...t, ...partial }));
  }

  patchSection(index: number, partial: Partial<ProtopipeContentSection>): void {
    this.editTemplate.update((t) => {
      const sections = [...t.sections];
      sections[index] = { ...sections[index], ...partial };
      return { ...t, sections };
    });
    this.content.markDirty();
  }

  addSection(): void {
    this.editTemplate.update((t) => ({
      ...t,
      sections: [...t.sections, { h2: '', body: '', images: [] }],
    }));
    this.content.markDirty();
  }

  removeSection(index: number): void {
    if (this.editTemplate().sections.length <= 1) return;
    this.editTemplate.update((t) => ({
      ...t,
      sections: t.sections.filter((_, i) => i !== index),
    }));
    this.content.markDirty();
  }

  applySectionHeading(index: number, heading: string): void {
    this.patchSection(index, { h2: heading });
  }

  toggleSeoPanel(): void {
    this.seoPanelOpen.update((v) => !v);
  }

  dismissPublishReview(): void {
    this.content.dismissPublishReview();
  }

  async saveDraft(): Promise<boolean> {
    const ok = await this.content.savePost({
      slug: this.editSlug(),
      template: this.editTemplate(),
      scheduleAt: this.editScheduleAt()?.toISOString(),
    });
    if (ok) {
      const id = this.content.editingId();
      if (id && id !== 'new' && this.route.snapshot.paramMap.get('postId') === 'new') {
        void this.router.navigate(['/protopipe/content', id], { replaceUrl: true });
      }
    }
    return ok;
  }

  async publish(): Promise<void> {
    if (this.content.dirty()) {
      const saved = await this.saveDraft();
      if (!saved) return;
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
    const ok = await this.content.publishNow(postId);
    if (ok) {
      this.messages.add({
        severity: 'success',
        summary: 'Published',
        detail: 'Your site will update via GitHub Actions.',
        life: 5000,
      });
      this.content.clearEditor();
      void this.router.navigate(['/protopipe/content']);
    }
  }

  isReadOnly(): boolean {
    const id = this.content.editingId();
    if (!id || id === 'new') return false;
    return this.content.postById(id)?.status === 'published';
  }
}
