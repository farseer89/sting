import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type {
  ArticleGenerationRunDto,
  ArticleGenerationStep,
} from '@hive/contracts';
import { MessageService } from 'primeng/api';
import { DatePicker } from 'primeng/datepicker';
import { Toast } from 'primeng/toast';
import { map } from 'rxjs/operators';
import {
  PROTOPIPE_CONTENT_META_MAX,
  PROTOPIPE_CONTENT_META_MIN,
} from '../../protopipe.constants';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import {
  ProtopipeContentService,
  emptyContentTemplate,
} from '../../protopipe-content.service';
import {
  buildKeywordSuggestions,
  serpPreview,
  slugifyTitle,
  writingHints,
} from '../content-template-suggestions';

type InspectorPanel = 'brief' | 'preview' | 'hints' | 'seo' | 'behind';

type PipelineStepStatus = 'pending' | 'running' | 'complete' | 'failed';

interface PipelineStepView {
  step: ArticleGenerationStep;
  label: string;
  status: PipelineStepStatus;
}

const PIPELINE_STEP_LABELS: ReadonlyArray<{ step: ArticleGenerationStep; label: string }> = [
  { step: 'infer_type', label: 'Classify' },
  { step: 'analyse_competition', label: 'Competition' },
  { step: 'content_plan', label: 'Strategy' },
  { step: 'research', label: 'Research' },
  { step: 'build_brief', label: 'Brief' },
  { step: 'outline', label: 'Outline' },
  { step: 'draft', label: 'Draft' },
  { step: 'review', label: 'Review' },
  { step: 'metadata', label: 'Metadata' },
  { step: 'assemble', label: 'Assemble' },
];

/**
 * Immersive "pipeline" content writer. Mirrors the lab void-writer LAYOUT
 * (top bar · left tool-rail · centered canvas · right inspector) but renders
 * with the current app theme. Loads real ContentPosts by id and surfaces the
 * research brief. Supersedes the prototype ProtopipeContentEditorComponent.
 */
@Component({
  selector: 'app-protopipe-writer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DatePicker, Toast],
  providers: [MessageService],
  templateUrl: './protopipe-writer.component.html',
  styleUrl: './protopipe-writer.component.scss',
})
export class ProtopipeWriterComponent implements OnDestroy {
  protected readonly content = inject(ProtopipeContentService);
  private readonly api = inject(ProtopipeApiService);
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

  readonly metaMin = PROTOPIPE_CONTENT_META_MIN;
  readonly metaMax = PROTOPIPE_CONTENT_META_MAX;

  /** The plan keyword currently linked to this post (drives generation). */
  readonly linkedKeywordId = computed(
    () => this.session()?.template.primaryKeywordId ?? '',
  );

  /** Local fetch state for the by-id load (separate from catalog loading). */
  readonly loadingPost = signal(false);

  /** Which inspector panels are expanded in the right rail. */
  private readonly openPanels = signal<Set<InspectorPanel>>(
    new Set<InspectorPanel>(['hints']),
  );

  private readonly publishAfterSave = signal(false);

  /** Behind-the-curtain pipeline run wired to this post. */
  readonly run = signal<ArticleGenerationRunDto | null>(null);
  readonly generating = signal(false);
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private polling = false;

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

  readonly brief = computed(() => this.session()?.brief ?? null);

  readonly hasBrief = computed(() => {
    const b = this.brief();
    if (!b) return false;
    return Boolean(
      b.mustCoverTerms.length ||
        b.contentGaps.length ||
        b.secondaryKeywords.length ||
        b.competitorHeadings.length ||
        b.targetWordCount ||
        b.positioningSummary ||
        b.recommendedAngle,
    );
  });

  readonly briefSource = computed(() => {
    const b = this.brief();
    return b?.sourceClusterName?.trim() || b?.primaryKeywordPhrase?.trim() || 'the content plan';
  });

  readonly topicLabel = computed(() => {
    const s = this.session();
    if (!s) return null;
    const fromBrief = s.brief?.primaryKeywordPhrase?.trim();
    if (fromBrief) return fromBrief;
    const kw = this.content.planKeywords().find((k) => k.id === s.selectedKeywordId);
    if (kw) return kw.phrase;
    return s.template.primaryKeywordPhrase?.trim() || null;
  });

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

  readonly metaLen = computed(() => this.session()?.template.metaDescription.length ?? 0);

  readonly metaWarn = computed(() => {
    const len = this.metaLen();
    return len > 0 && (len < this.metaMin || len > this.metaMax);
  });

  readonly saveLabel = computed(() => {
    if (this.saving()) return 'Saving…';
    if (this.content.dirty()) return 'Unsaved changes';
    return 'Saved';
  });

  readonly introSuggestion = computed(() => {
    const s = this.session();
    if (!s) return null;
    const kw = this.content.planKeywords().find((k) => k.id === s.selectedKeywordId);
    if (!kw || s.template.intro.trim()) return null;
    return buildKeywordSuggestions(kw).intro;
  });

  // --- pipeline (behind the curtain) ----------------------------------------

  readonly runStatus = computed(() => this.run()?.status ?? null);
  readonly runIsActive = computed(() => {
    const st = this.runStatus();
    return st === 'running' || st === 'pending';
  });
  readonly runComplete = computed(() => this.runStatus() === 'complete');
  readonly runFailed = computed(() => this.runStatus() === 'failed');

  readonly pipelineSteps = computed<PipelineStepView[]>(() => {
    const run = this.run();
    if (!run) return [];
    const currentIdx = PIPELINE_STEP_LABELS.findIndex((s) => s.step === run.currentStep);
    const done = run.status === 'complete' || run.currentStep === 'done';
    return PIPELINE_STEP_LABELS.map(({ step, label }, idx) => {
      let status: PipelineStepStatus;
      if (run.status === 'failed' && run.error?.step === step) {
        status = 'failed';
      } else if (done) {
        status = 'complete';
      } else if (currentIdx < 0) {
        status = 'pending';
      } else if (idx < currentIdx) {
        status = 'complete';
      } else if (idx === currentIdx) {
        status = run.status === 'running' ? 'running' : 'pending';
      } else {
        status = 'pending';
      }
      if (
        step === 'review' &&
        run.artifacts?.review &&
        !run.artifacts.review.passesThreshold &&
        status === 'complete'
      ) {
        status = 'failed';
      }
      return { step, label, status };
    });
  });

  readonly generationReview = computed(() => this.run()?.artifacts?.review ?? null);

  readonly generationReviewFailed = computed(() => {
    const review = this.generationReview();
    return review != null && !review.passesThreshold;
  });

  readonly generationReviewBlockers = computed(() => {
    const review = this.generationReview();
    if (!review || review.passesThreshold) return [];
    const lines: string[] = [...review.violations];
    for (const v of review.sectionViolations) {
      lines.push(`${v.h2}: ${v.message}`);
    }
    return lines;
  });

  readonly generationReviewScoreLabel = computed(() => {
    const review = this.generationReview();
    return review && Number.isFinite(review.overallScore)
      ? review.overallScore.toFixed(2)
      : '';
  });

  readonly runEvents = computed(() => {
    const events = this.run()?.events ?? [];
    return [...events].slice(-12).reverse();
  });

  readonly generatedReady = computed(() => {
    const run = this.run();
    if (!run || run.status !== 'complete') return false;
    const a = run.artifacts ?? {};
    return Boolean(a.template || (a.sections && a.sections.length) || a.outline);
  });

  constructor() {
    this.content.ensureCatalogLoaded();
    this.content.setWriterImmersive(true);

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

  ngOnDestroy(): void {
    this.content.setWriterImmersive(false);
    this.stopPolling();
  }

  private bootstrapEditor(key: string): void {
    if (this.isCreateRoute()) {
      this.content.startCreate();
      this.content.openWritingSession({
        template: emptyContentTemplate(),
        brief: null,
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

    const siteId = this.content.siteId();
    if (!siteId) {
      void this.router.navigate(['/protopipe/content']);
      return;
    }

    // Load fresh by id (fixes the stale-catalog draft -> list redirect).
    this.loadingPost.set(true);
    this.api.getContent$(siteId, id).subscribe({
      next: ({ post }) => {
        this.content.startEdit(id);
        this.content.openWritingSession({
          template: post.template ?? emptyContentTemplate(),
          brief: post.brief ?? null,
          slug: post.slug,
          scheduleAt: post.publishAt ? new Date(post.publishAt) : null,
          selectedKeywordId: post.template?.primaryKeywordId ?? null,
          readOnly: post.status === 'published',
        });
        this.bootstrappedKey.set(key);
        this.loadingPost.set(false);
        this.run.set(null);
        if (post.articleGenerationRunId) {
          this.loadRun(post.articleGenerationRunId);
        }
      },
      error: () => {
        this.loadingPost.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'Could not open',
          detail: 'That post could not be loaded.',
          life: 4000,
        });
        void this.router.navigate(['/protopipe/content']);
      },
    });
  }

  // --- inspector panels -----------------------------------------------------

  isPanelOpen(panel: InspectorPanel): boolean {
    return this.openPanels().has(panel);
  }

  togglePanel(panel: InspectorPanel): void {
    const next = new Set(this.openPanels());
    if (next.has(panel)) next.delete(panel);
    else next.add(panel);
    this.openPanels.set(next);
  }

  // --- canvas editing -------------------------------------------------------

  isReadOnly(): boolean {
    return this.session()?.readOnly ?? false;
  }

  onHeadlineInput(value: string): void {
    const s = this.session();
    if (!s) return;
    const title = s.template.title || value;
    const slug =
      !s.slug || this.content.editingId() === 'new' ? slugifyTitle(value || title) : s.slug;
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

  /** Insert an empty section at a specific index (between blocks). */
  insertSection(atIndex: number): void {
    const s = this.session();
    if (!s || s.readOnly) return;
    const sections = [...s.template.sections];
    sections.splice(atIndex, 0, { h2: '', body: '', images: [] });
    this.content.patchWritingTemplate({ sections });
    this.content.setFocusedSection(atIndex);
  }

  removeSection(index: number): void {
    this.content.removeWritingSection(index);
  }

  focusSection(index: number): void {
    this.content.setFocusedSection(index);
  }

  insertIntroSuggestion(): void {
    const text = this.introSuggestion();
    if (text) this.content.patchWritingTemplate({ intro: text });
  }

  setSlug(slug: string): void {
    this.content.updateWritingSession({ slug });
  }

  setSchedule(date: Date | null): void {
    this.content.updateWritingSession({ scheduleAt: date });
  }

  // --- top bar actions ------------------------------------------------------

  backToLibrary(): void {
    this.content.clearEditor();
    this.bootstrappedKey.set(null);
    void this.router.navigate(['/protopipe/content']);
  }

  saveDraft(): void {
    if (this.promptIfIncomplete()) return;
    this.content.saveFromWritingSession();
  }

  /**
   * The server requires a non-empty title, meta description and body. Prompt for
   * whatever is missing (and reveal the relevant panel) instead of firing a save
   * that would fail server-side validation.
   */
  private promptIfIncomplete(): boolean {
    const s = this.session();
    if (!s || s.readOnly) return false;
    const t = s.template;

    let blocker: { detail: string; panel?: InspectorPanel } | null = null;
    if (!t.title.trim()) {
      blocker = { detail: 'Add a title before saving.' };
    } else if (!t.metaDescription.trim()) {
      blocker = {
        detail: 'Add a meta description before saving — it’s required.',
        panel: 'seo',
      };
    } else if (!t.intro.trim() && t.sections.every((sec) => !sec.body.trim())) {
      blocker = { detail: 'Write some body content before saving.' };
    }

    if (!blocker) return false;

    if (blocker.panel) {
      const panel = blocker.panel;
      this.openPanels.update((set) => new Set(set).add(panel));
    }
    this.messages.add({
      severity: 'warn',
      summary: 'Almost there',
      detail: blocker.detail,
      life: 5000,
    });
    return true;
  }

  /** Link or clear the post's primary plan keyword. */
  linkKeyword(keywordId: string): void {
    this.content.setPrimaryKeyword(keywordId);
  }

  publish(): void {
    if (this.promptIfIncomplete()) return;
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

  dismissPublishReview(): void {
    this.content.dismissPublishReview();
  }

  // --- pipeline actions -----------------------------------------------------

  /** Launch (or relaunch) an ArticleGeneration run for this post. */
  generateWithPipeline(): void {
    const siteId = this.content.siteId();
    const postId = this.content.editingId();
    if (!siteId || !postId || postId === 'new') {
      this.messages.add({
        severity: 'warn',
        summary: 'Save first',
        detail: 'Save the draft before generating with the pipeline.',
        life: 4000,
      });
      return;
    }
    if (this.content.dirty()) {
      this.messages.add({
        severity: 'warn',
        summary: 'Save first',
        detail: 'Save your changes before generating with the pipeline.',
        life: 4000,
      });
      return;
    }

    this.generating.set(true);
    this.api.generateContent$(siteId, postId).subscribe({
      next: ({ run }) => {
        this.run.set(run);
        this.generating.set(false);
        this.openPanels.update((set) => new Set(set).add('behind'));
        if (run.status === 'running' || run.status === 'pending') {
          this.startPolling();
        }
      },
      error: (err) => {
        this.generating.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'Could not generate',
          detail: parseProtopipeApiError(
            err,
            'Make sure this post has a linked keyword, then try again.',
          ),
          life: 6000,
        });
      },
    });
  }

  private loadRun(runId: string): void {
    const siteId = this.content.siteId();
    if (!siteId) return;
    this.api.getArticleRun$(siteId, runId).subscribe({
      next: ({ run }) => {
        this.run.set(run);
        if (run.status === 'running' || run.status === 'pending') {
          this.startPolling();
        }
      },
      error: () => {
        /* run may have been pruned; leave the CTA to relaunch */
      },
    });
  }

  private startPolling(): void {
    if (this.polling) return;
    this.polling = true;
    this.schedulePoll();
  }

  private schedulePoll(): void {
    this.pollTimer = setTimeout(() => this.poll(), 1500);
  }

  private poll(): void {
    const siteId = this.content.siteId();
    const runId = this.run()?.id;
    if (!siteId || !runId) {
      this.stopPolling();
      return;
    }
    this.api.getArticleRun$(siteId, runId).subscribe({
      next: ({ run }) => {
        this.run.set(run);
        if (run.status === 'running' || run.status === 'pending') {
          this.schedulePoll();
        } else {
          this.stopPolling();
          if (run.status === 'complete') {
            this.messages.add({
              severity: 'success',
              summary: 'Pipeline finished',
              detail: 'Open the inspector to pull the draft into your document.',
              life: 5000,
            });
          }
        }
      },
      error: () => this.stopPolling(),
    });
  }

  private stopPolling(): void {
    this.polling = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /** Open the live run in the generic Thinker view (Thought stepper). */
  openInThinker(): void {
    const siteId = this.content.siteId();
    const runId = this.run()?.id;
    if (!siteId || !runId) return;
    const postId = this.content.editingId();
    void this.router.navigate(['/protopipe/lab/thinker/run', siteId, runId], {
      queryParams: postId && postId !== 'new' ? { postId } : undefined,
    });
  }

  /** Pull the generated outline/draft (assembled template) into the document. */
  applyGenerated(): void {
    const run = this.run();
    const s = this.session();
    if (!run || !s || s.readOnly) return;

    const artifacts = run.artifacts ?? {};
    const tpl = artifacts.template;

    if (tpl) {
      this.content.updateWritingSession({
        template: {
          ...s.template,
          h1: tpl.h1 || s.template.h1,
          title: tpl.title || s.template.title,
          intro: tpl.intro || s.template.intro,
          metaDescription: tpl.metaDescription || s.template.metaDescription,
          sections: (tpl.sections ?? []).map((sec) => ({
            h2: sec.h2 ?? '',
            body: sec.body ?? '',
            images: sec.images ?? [],
          })),
        },
      });
    } else {
      const outline = artifacts.outline;
      const drafted = artifacts.sections ?? [];
      const sections = (outline?.sections ?? []).map((sec, i) => ({
        h2: sec.h2,
        body: drafted[i]?.prose ?? '',
        images: [] as { url: string; alt: string }[],
      }));
      this.content.updateWritingSession({
        template: {
          ...s.template,
          h1: outline?.h1 || s.template.h1,
          sections: sections.length ? sections : s.template.sections,
        },
      });
    }

    this.messages.add({
      severity: 'success',
      summary: 'Draft applied',
      detail: 'Review the pulled-in sections, then save.',
      life: 4000,
    });
  }
}
