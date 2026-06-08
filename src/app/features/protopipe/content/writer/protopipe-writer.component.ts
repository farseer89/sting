import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  DestroyRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { ProtopipeHomeSidePanelService } from '../../home/protopipe-home-side-panel.service';
import { ProtopipeHomeWriterViewState } from '../../home/protopipe-home-writer-view.state';
import { ProtopipeWriterInspectorBridge } from './protopipe-writer-inspector.bridge';
import {
  type WriterInspectorPanelId,
  writerInspectorPanelLabel,
} from './protopipe-writer-panels';
import { ProtopipeWriterSidePanelService } from './protopipe-writer-side-panel.service';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type {
  ArticleGenerationFlaggedFact,
  ArticleGenerationRunDto,
  ArticleGenerationStep,
  ProtopipeContentEmbedKind,
  ProtopipeContentSectionEmbed,
  ProtopipeContentTemplate,
  ProtopipeContextCard,
  ProtopipeFactResolution,
  ProtopipeFactReview,
  ProtopipePublishTarget,
  ProtopipeSiteConnection,
} from '@hive/contracts';
import { MessageService } from 'primeng/api';
import { DatePicker } from 'primeng/datepicker';
import { Toast } from 'primeng/toast';
import { map } from 'rxjs/operators';
import {
  generationStepsForRun,
  STEP_SHORT_LABELS,
} from '../../article-pipeline-steps';
import {
  PROTOPIPE_CONTENT_META_MAX,
  PROTOPIPE_CONTENT_META_MIN,
} from '../../protopipe.constants';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
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
import {
  articleTypeLabel,
  computeTypeReadiness,
  type TypeReadinessItem,
} from '../type-readiness.util';
import { ProseEditorComponent } from './prose-editor/prose-editor.component';
import {
  getHeroImageBlock,
  imagePlaceholderHint,
  patchBlock,
  proseBlocksForSections,
  syncTemplateImagesToSections,
} from '../block-template.util';
import { ProtopipeBlockSlotsPanelComponent } from './block-slots-panel/block-slots-panel.component';
import { ProtopipeImagePlaceholderComponent } from './image-placeholder/image-placeholder.component';
import type { Editor } from '@tiptap/core';
import type { FactHighlightItem } from './prose-editor/fact-highlight.extension';
import type {
  ProseSelectionEvent,
  ProseSlashEvent,
} from './prose-editor/prose-editor.component';
import {
  bodyForTarget,
  enrichFact,
  hashCacheKey,
  hashContentFieldAsync,
  resolveFactTarget,
  templateContentFingerprint,
} from './fact-review.util';

type AiPanelKind = 'research' | 'ideas' | 'links';

interface AiPanelItem {
  label: string;
  detail?: string;
  /** Optional value to insert into the editor (markdown). */
  insert?: string;
}

interface AiPanelState {
  kind: AiPanelKind;
  title: string;
  loading: boolean;
  error: string | null;
  items: AiPanelItem[];
  /** Editor + range the inserts target. */
  editor: Editor;
  range: { from: number; to: number } | null;
  /** Links applied to an existing selection (setLink) vs inserted as text. */
  linkSelection?: boolean;
}

interface SlashCommand {
  id: string;
  label: string;
  icon: string;
  keywords: string;
}

interface MarginNote {
  id: string;
  anchor: 'intro' | 'section';
  sectionIndex?: number;
  label: string;
  peek: string;
  text: string;
  /** When present, "Apply" inserts this markdown into the target. */
  apply?: { target: 'intro' | 'section'; sectionIndex?: number; text: string };
}

const SLASH_COMMANDS: SlashCommand[] = [
  { id: 'research', label: 'Research a phrase', icon: 'pi pi-search', keywords: 'research search keyword' },
  { id: 'link', label: 'Insert internal link', icon: 'pi pi-link', keywords: 'link internal url' },
  { id: 'idea', label: 'Article ideas', icon: 'pi pi-lightbulb', keywords: 'idea topic angle' },
  { id: 'bullet', label: 'Bullet list', icon: 'pi pi-list', keywords: 'bullet list unordered' },
  { id: 'quote', label: 'Quote', icon: 'pi pi-comment', keywords: 'quote blockquote' },
];

type InspectorPanel = WriterInspectorPanelId;

function detectEmbedKind(url: string): ProtopipeContentEmbedKind {
  const lower = url.trim().toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('vimeo.com')) return 'vimeo';
  return 'url';
}

type PipelineStepStatus = 'pending' | 'running' | 'complete' | 'failed';

type FactResolution = 'confirmed' | 'dismissed';

interface PipelineStepView {
  step: ArticleGenerationStep;
  label: string;
  status: PipelineStepStatus;
}

interface FlaggedFactView extends ArticleGenerationFlaggedFact {
  /** Stable key for tracking + resolution state. */
  id: string;
  resolution: FactResolution | null;
  stale: boolean;
  addressedInText: boolean;
  offsetsReliable: boolean;
}

interface HighlightSegment {
  text: string;
  flagged: boolean;
}

interface FlaggedSectionView {
  sectionIndex: number;
  h2: string;
  segments: HighlightSegment[];
  facts: FlaggedFactView[];
}

const FACT_CATEGORY_LABELS: Record<ArticleGenerationFlaggedFact['category'], string> = {
  business_specific: 'Needs your facts',
  industry_norm: 'General guidance',
  broken_link: 'Broken link',
  scope: 'Scope / length',
};

function flaggedFactId(fact: ArticleGenerationFlaggedFact): string {
  if (fact.id) return fact.id;
  const target = resolveFactTarget(fact);
  return target.kind === 'intro'
    ? `intro::${fact.claim}`
    : `section:${target.index}::${fact.claim}`;
}

function factTargetsIntro(fact: ArticleGenerationFlaggedFact): boolean {
  return resolveFactTarget(fact).kind === 'intro';
}

function factTargetsSection(fact: ArticleGenerationFlaggedFact, templateIndex: number): boolean {
  const target = resolveFactTarget(fact);
  return target.kind === 'section' && target.index === templateIndex;
}

/**
 * Splits prose into flagged / unflagged segments so the review pane can wrap
 * each claim in a highlight mark. Claims are matched as verbatim substrings
 * (the reviewer is instructed to quote exactly); unmatched claims are skipped.
 */
function buildHighlightSegments(prose: string, claims: string[]): HighlightSegment[] {
  if (!prose) return [];
  const ranges: Array<[number, number]> = [];
  for (const claim of claims) {
    const needle = claim.trim();
    if (!needle) continue;
    const at = prose.indexOf(needle);
    if (at >= 0) ranges.push([at, at + needle.length]);
  }
  if (!ranges.length) return [{ text: prose, flagged: false }];

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const [start, end] of ranges) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) {
      segments.push({ text: prose.slice(cursor, start), flagged: false });
    }
    segments.push({ text: prose.slice(start, end), flagged: true });
    cursor = end;
  }
  if (cursor < prose.length) {
    segments.push({ text: prose.slice(cursor), flagged: false });
  }
  return segments;
}

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
  imports: [
    FormsModule,
    DatePicker,
    Toast,
    ProseEditorComponent,
    NgTemplateOutlet,
    ProtopipeBlockSlotsPanelComponent,
    ProtopipeImagePlaceholderComponent,
  ],
  providers: [MessageService, ProtopipeWriterSidePanelService],
  templateUrl: './protopipe-writer.component.html',
  styleUrl: './protopipe-writer.component.scss',
  host: {
    '[class.pw-host--embedded]': 'embedded()',
  },
})
export class ProtopipeWriterComponent implements OnDestroy {
  /** When true, writer is hosted inside the Protopipe home dashboard shell. */
  readonly embedded = input(false);
  /** Post to load when embedded (replaces route :postId). */
  readonly postId = input<string | null>(null);
  /** Blank create session when embedded (replaces /content/new route). */
  readonly createMode = input(false);
  /** Emitted when the user leaves embedded writer (back control). */
  readonly exit = output<void>();
  /** Emitted after first save in embedded create mode so the host can load the new post. */
  readonly postSaved = output<string>();

  protected readonly content = inject(ProtopipeContentService);
  private readonly api = inject(ProtopipeApiService);
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly inspectorSidePanel = inject(ProtopipeWriterSidePanelService);
  private readonly homeWriterView = inject(ProtopipeHomeWriterViewState, { optional: true });
  private readonly homeSidePanel = inject(ProtopipeHomeSidePanelService, { optional: true });
  private readonly inspectorBridge = inject(ProtopipeWriterInspectorBridge, { optional: true });
  private readonly imageFileInput = viewChild<ElementRef<HTMLInputElement>>('imageFileInput');
  private readonly writerShell = viewChild<ElementRef<HTMLElement>>('writerShell');
  private readonly inspectorPanelsRef = viewChild<TemplateRef<unknown>>('inspectorPanels');

  readonly imageUploading = signal(false);
  readonly imageUploadSectionIndex = signal<number | null>(null);
  readonly imageMenuSectionIndex = signal<number | null>(null);
  readonly imageUploadTarget = signal<
    | { kind: 'hero'; blockId: string }
    | { kind: 'section'; sectionIndex: number }
    | { kind: 'prose'; blockId: string; imageIndex: number }
    | null
  >(null);

  readonly heroImageBlock = computed(() => {
    const s = this.session();
    if (!s) return null;
    return getHeroImageBlock(s.template);
  });

  protected readonly imagePlaceholderHint = imagePlaceholderHint;

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

  /** Active inspector tab on standalone writer route. */
  private readonly localActivePanel = signal<InspectorPanel | null>(null);

  readonly useExternalSidePanel = computed(() => this.embedded());

  readonly activeInspectorPanel = computed<InspectorPanel | null>(() => {
    if (this.embedded() && this.homeWriterView) {
      return this.homeWriterView.activePanel();
    }
    return this.localActivePanel();
  });

  readonly inspectorSliderOpen = computed(() => {
    if (!this.activeInspectorPanel()) return false;
    if (this.embedded() && this.homeSidePanel) {
      return this.homeSidePanel.open();
    }
    return this.inspectorSidePanel.open();
  });

  readonly inspectorPanelLabel = computed(() =>
    writerInspectorPanelLabel(this.activeInspectorPanel()),
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

  private readonly effectiveCreate = computed(() =>
    this.embedded() ? this.createMode() : this.isCreateRoute(),
  );

  private readonly effectivePostId = computed(() =>
    this.embedded() ? this.postId() : this.routePostId(),
  );

  private readonly editorBootKey = computed(
    () => `${this.effectiveCreate()}:${this.effectivePostId() ?? ''}`,
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

  readonly typeReadiness = computed((): TypeReadinessItem[] => {
    const s = this.session();
    if (!s) return [];
    const template: ProtopipeContentTemplate = {
      ...s.template,
      articleType: s.template.articleType ?? s.brief?.articleType,
    };
    return computeTypeReadiness(template);
  });

  readonly typeReadinessSummary = computed(() => {
    const items = this.typeReadiness();
    const pass = items.filter((i) => i.status === 'pass').length;
    const fail = items.filter((i) => i.status === 'fail').length;
    return { pass, total: items.length, fail };
  });

  readonly articleTypeDisplay = computed(() => {
    const s = this.session();
    const t = s?.template;
    const articleType = t?.articleType ?? s?.brief?.articleType;
    return articleTypeLabel(articleType, t?.layoutVariant);
  });

  readonly siteHost = computed(() => {
    const site = this.strategy.site();
    const host = site?.hostname?.trim();
    if (host && !host.endsWith('pending.local')) return host.replace(/^www\./, '');
    const url = site?.url?.trim() || site?.previewBaseUrl?.trim();
    if (url) {
      try {
        return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
      } catch {
        return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      }
    }
    return 'yoursite.com';
  });

  readonly serp = computed(() => {
    const s = this.session();
    if (!s) return null;
    return serpPreview({
      title: s.template.title,
      metaDescription: s.template.metaDescription,
      slug: s.slug,
      siteHost: this.siteHost(),
    });
  });

  readonly blogPreviewHtml = signal<string | null>(null);
  readonly blogPreviewSafeHtml = computed<SafeHtml | null>(() => {
    const html = this.blogPreviewHtml();
    return html ? this.sanitizer.bypassSecurityTrustHtml(html) : null;
  });
  readonly blogPreviewLoading = signal(false);
  readonly blogPreviewError = signal<string | null>(null);
  readonly previewTakeover = signal(false);
  private previewRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  readonly hasBlockLayout = computed(() => (this.session()?.template.blocks?.length ?? 0) > 0);

  readonly publishTarget = signal<ProtopipePublishTarget>('astro');
  readonly publishConnectionId = signal<string | null>(null);
  readonly siteConnections = signal<ProtopipeSiteConnection[]>([]);
  readonly wordpressConnections = computed(() =>
    this.siteConnections().filter((c) => c.provider === 'wordpress' && c.status === 'connected'),
  );
  readonly deployStatus = this.content.lastDeployStatus;
  readonly publishedUrl = this.content.lastPublishedUrl;

  readonly metaLen = computed(() => this.session()?.template.metaDescription?.length ?? 0);

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
    if (!kw || (s.template.intro?.trim() ?? '')) return null;
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
    const stepList = generationStepsForRun(run).map((step) => ({
      step,
      label: STEP_SHORT_LABELS[step],
    }));
    const currentIdx = stepList.findIndex((s) => s.step === run.currentStep);
    const done = run.status === 'complete' || run.currentStep === 'done';
    return stepList.map(({ step, label }, idx) => {
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

  // --- fact check -----------------------------------------------------------

  readonly factCategoryLabels = FACT_CATEGORY_LABELS;

  /** Persisted + in-session resolutions keyed by fact id. */
  private readonly factResolutions = signal<Map<string, FactResolution>>(new Map());

  /** Fact review snapshot from the loaded content post (survives refresh). */
  private readonly postFactReview = signal<ProtopipeFactReview | null>(null);

  /** Per-target body hashes for staleness (sha256, matches bagend). */
  private readonly targetBodyHashes = signal<Record<string, string>>({});

  readonly generationFlaggedFacts = computed<FlaggedFactView[]>(() => {
    const postReview = this.postFactReview();
    const review = this.generationReview();
    const template = this.session()?.template;
    const bodyHashes = this.targetBodyHashes();
    const flags =
      postReview?.flags?.length
        ? postReview.flags
        : (review?.flaggedFacts ?? []);
    if (!flags.length) return [];
    const resolutions = this.factResolutions();
    return flags.map((fact) => {
      const id = flaggedFactId(fact);
      const persisted = postReview?.resolutions?.find((r) => r.factId === id);
      const local = resolutions.get(id);
      const resolution: FactResolution | null = local
        ? local
        : persisted?.status === 'confirmed' || persisted?.status === 'dismissed'
          ? persisted.status
          : null;
      const enrichment = enrichFact(fact, template, bodyHashes);
      return {
        ...fact,
        id,
        target: resolveFactTarget(fact),
        resolution,
        ...enrichment,
      };
    });
  });

  /** Flagged facts grouped by section, with the reviewed prose split for highlighting. */
  readonly flaggedSections = computed<FlaggedSectionView[]>(() => {
    const facts = this.generationFlaggedFacts();
    if (!facts.length) return [];
    const tpl = this.session()?.template;
    const byTemplate = new Map<number, FlaggedFactView[]>();
    for (const fact of facts) {
      const target = resolveFactTarget(fact);
      const key = target.kind === 'intro' ? -1 : target.index;
      const arr = byTemplate.get(key) ?? [];
      arr.push(fact);
      byTemplate.set(key, arr);
    }
    const out: FlaggedSectionView[] = [];
    for (const [key, sectionFacts] of byTemplate) {
      const artifactSections = this.run()?.artifacts?.sections;
      const prose =
        key < 0
          ? (tpl?.intro ?? '')
          : (tpl?.sections[key]?.body ??
            artifactSections?.[key + 1]?.prose ??
            '');
      const h2 =
        key < 0
          ? 'Introduction'
          : (tpl?.sections[key]?.h2 ?? sectionFacts[0]?.h2 ?? `Section ${key + 1}`);
      out.push({
        sectionIndex: key < 0 ? 0 : key + 1,
        h2,
        segments: buildHighlightSegments(prose, sectionFacts.map((f) => f.claim)),
        facts: sectionFacts,
      });
    }
    return out.sort((a, b) => a.sectionIndex - b.sectionIndex);
  });

  readonly flaggedFactCount = computed(() => this.generationFlaggedFacts().length);

  /** Critical facts that still need confirm/dismiss (excludes fixed-in-text and stale). */
  readonly pendingCriticalFacts = computed(() =>
    this.generationFlaggedFacts().filter((f) => this.isFactPendingCritical(f)),
  );

  readonly unresolvedCriticalFacts = computed(() => this.pendingCriticalFacts().length);

  readonly factReviewComplete = computed(() => {
    if (!this.flaggedFactCount()) return true;
    if (this.postFactReview()?.completedAt) return true;
    return this.pendingCriticalFacts().length === 0;
  });

  /** Review failed with unresolved critical facts (informational; pull is not blocked). */
  readonly factCheckBlocksPull = computed(
    () => this.generationReviewFailed() && this.unresolvedCriticalFacts() > 0,
  );

  readonly pullDraftHint = computed(() => {
    if (!this.factCheckBlocksPull()) return 'Replace the editor with the latest assembled pipeline draft';
    const n = this.unresolvedCriticalFacts();
    return `${n} critical fact(s) flagged — pull draft anyway, then confirm or dismiss in the editor`;
  });

  /** Pending claim context cards for this article (persisted learning spine). */
  readonly pendingArticleContextCards = signal<ProtopipeContextCard[]>([]);

  private readonly contextCardDrafts = signal<Record<string, string>>({});

  readonly pendingContextCardCount = computed(() => this.pendingArticleContextCards().length);

  /** Live TipTap editors keyed by template section index. */
  private readonly sectionEditors = new Map<number, Editor>();

  private introEditor: Editor | null = null;

  private isFactPendingCritical(fact: FlaggedFactView): boolean {
    return (
      fact.severity === 'critical' &&
      fact.resolution === null &&
      !fact.addressedInText &&
      !fact.stale
    );
  }

  private toFactHighlightItem(
    fact: FlaggedFactView,
    selectedId: string | null,
  ): FactHighlightItem {
    return {
      id: fact.id,
      claim: fact.claim,
      severity: fact.severity,
      resolved: fact.resolution !== null || fact.addressedInText,
      stale: fact.stale,
      claimStart: fact.claimStart,
      claimEnd: fact.claimEnd,
      useOffsets: fact.offsetsReliable,
      selected: fact.id === selectedId,
      suggestion: fact.suggestion,
    };
  }

  private async refreshTargetBodyHashes(template: ProtopipeContentTemplate): Promise<void> {
    const hashes: Record<string, string> = {};
    hashes['intro'] = await hashContentFieldAsync(template.intro ?? '');
    for (let i = 0; i < template.sections.length; i++) {
      hashes[hashCacheKey({ kind: 'section', index: i })] = await hashContentFieldAsync(
        template.sections[i]?.body ?? '',
      );
    }
    this.targetBodyHashes.set(hashes);
  }

  /**
   * Route facts to editors by where the claim actually appears in the template
   * (not pipeline sectionIndex, which uses drafted[0]=intro and body offset).
   */
  factsForIntro(): FactHighlightItem[] {
    const selectedId = this.activeFact()?.fact.id ?? this.selectedFactId();
    return this.generationFlaggedFacts()
      .filter((f) => factTargetsIntro(f))
      .map((f) => this.toFactHighlightItem(f, selectedId));
  }

  factsForSection(templateIndex: number): FactHighlightItem[] {
    const selectedId = this.activeFact()?.fact.id ?? this.selectedFactId();
    return this.generationFlaggedFacts()
      .filter((f) => factTargetsSection(f, templateIndex))
      .map((f) => this.toFactHighlightItem(f, selectedId));
  }

  /** Resolve which template section (or intro) owns this fact for navigation. */
  private templateTargetForFact(fact: FlaggedFactView): { intro: boolean; sectionIndex: number } {
    const target = resolveFactTarget(fact);
    if (target.kind === 'intro') {
      return { intro: true, sectionIndex: 0 };
    }
    return { intro: false, sectionIndex: target.index };
  }

  /** Currently open inline fact popover, anchored to a viewport position. */
  readonly activeFact = signal<{ fact: FlaggedFactView; x: number; y: number } | null>(null);

  /** Fact whose claim is highlighted in the prose (e.g. picked from the panel). */
  readonly selectedFactId = signal<string | null>(null);

  /** Whether intentional SEO keywords are highlighted inside the prose editors. */
  readonly keywordsVisible = signal(true);

  /**
   * The article's load-bearing SEO terms — primary keyword plus brief cluster /
   * NLP terms — deduped and ordered longest-first so multi-word phrases win.
   */
  readonly articleKeywords = computed<string[]>(() => {
    const template = this.session()?.template;
    const brief = this.brief();
    const seen = new Set<string>();
    const out: string[] = [];
    const add = (value?: string | null) => {
      const trimmed = value?.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(trimmed);
    };
    add(template?.primaryKeywordPhrase);
    (brief?.secondaryKeywords ?? []).forEach(add);
    (brief?.mustCoverTerms ?? []).forEach(add);
    return out.sort((a, b) => b.length - a.length);
  });

  /** Keywords passed to the editors — empty unless the toggle is on. */
  readonly activeKeywords = computed<string[]>(() =>
    this.keywordsVisible() ? this.articleKeywords() : [],
  );

  toggleKeywords(): void {
    this.keywordsVisible.update((v) => !v);
  }

  /**
   * Surface a flagged claim inside the prose editor: scroll to the span,
   * strengthen its inline highlight, and open the same anchored popover as a
   * direct click on the highlighted text.
   */
  locateFact(fact: FlaggedFactView): void {
    this.selectedFactId.set(fact.id);
    const target = this.templateTargetForFact(fact);
    const editor = target.intro
      ? this.introEditor
      : this.sectionEditors.get(target.sectionIndex);
    if (!target.intro) {
      this.content.setFocusedSection(target.sectionIndex);
    }
    if (!editor?.commands.revealFact(fact.id)) return;
    const coords = editor.view.coordsAtPos(editor.state.selection.from);
    const x = Math.min(Math.max(12, coords.left), window.innerWidth - 280);
    const y = Math.min(coords.bottom + 8, window.innerHeight - 200);
    this.activeFact.set({ fact, x, y });
  }

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
      if (!createdId || !this.effectiveCreate()) return;
      untracked(() => {
        if (this.embedded()) {
          this.content.saveCreatedId.set(null);
          this.postSaved.emit(createdId);
        } else {
          void this.router.navigate(['/protopipe/content', createdId], { replaceUrl: true });
          this.content.saveCreatedId.set(null);
          this.bootstrappedKey.set(createdId);
        }
      });
    });

    effect(() => {
      const tpl = this.session()?.template;
      if (!tpl) return;
      untracked(() => void this.refreshTargetBodyHashes(tpl));
    });

    effect(() => {
      if (this.publishAfterSave() && !this.content.saving() && !this.content.dirty()) {
        const postId = this.content.editingId();
        if (postId && postId !== 'new') {
          untracked(() => {
            this.publishAfterSave.set(false);
            this.content.publishNow(postId, this.publishRequestBody());
          });
        }
      }
    });

    effect(() => {
      if (this.activeInspectorPanel() !== 'blog') return;
      const s = this.session();
      if (!s) return;
      untracked(() => void this.refreshBlogPreview());
    });

    effect(() => {
      const tpl = this.inspectorPanelsRef();
      if (!tpl || !this.inspectorBridge) return;
      untracked(() => this.inspectorBridge!.setTemplate(tpl));
    });

    effect(() => {
      if (!this.embedded() || !this.inspectorBridge) return;
      this.activeInspectorPanel();
      untracked(() => this.inspectorBridge!.notifyPanelChange());
    });

    this.destroyRef.onDestroy(() => {
      this.inspectorBridge?.clear();
      this.inspectorSidePanel.detachResizeListeners();
    });

    effect(() => {
      if (!this.previewTakeover()) return;
      const tpl = this.session()?.template;
      if (!tpl) return;
      untracked(() => this.schedulePreviewRefresh());
    });

    effect(() => {
      if (!this.content.publishSucceeded()) return;
      untracked(() => {
        if (this.content.consumePublishSucceeded()) {
          const status = this.deployStatus();
          const url = this.publishedUrl();
          const detail =
            status === 'building'
              ? 'Published to GitHub — your site is building via GitHub Actions.'
              : status === 'live' && url
                ? `Published — live at ${url}`
                : 'Published successfully.';
          this.messages.add({
            severity: 'success',
            summary: 'Published',
            detail,
            life: 5000,
          });
          if (this.embedded()) {
            return;
          }
          this.content.clearEditor();
          void this.router.navigate(['/protopipe/content']);
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.content.setWriterImmersive(false);
    this.stopPolling();
    if (this.previewRefreshTimer) clearTimeout(this.previewRefreshTimer);
    this.introEditor = null;
    this.sectionEditors.clear();
  }

  private bootstrapEditor(key: string): void {
    if (this.effectiveCreate()) {
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
      void this.loadSiteConnections();
      return;
    }

    const id = this.effectivePostId();
    if (!id) {
      if (this.embedded()) {
        return;
      }
      void this.router.navigate(['/protopipe/content']);
      return;
    }

    const siteId =
      (this.embedded() ? this.strategy.siteId() : null) ?? this.content.siteId();
    if (!siteId) {
      if (this.embedded()) {
        this.exit.emit();
        return;
      }
      void this.router.navigate(['/protopipe/content']);
      return;
    }

    // Load fresh by id (fixes the stale-catalog draft -> list redirect).
    this.loadingPost.set(true);
    this.api.getContent$(siteId, id).subscribe({
      next: ({ post }) => {
        this.content.startEdit(id);
        this.content.openWritingSession({
          template: syncTemplateImagesToSections(post.template ?? emptyContentTemplate()),
          brief: post.brief ?? null,
          slug: post.slug,
          scheduleAt: post.publishAt ? new Date(post.publishAt) : null,
          selectedKeywordId: post.template?.primaryKeywordId ?? null,
          readOnly: post.status === 'published',
        });
        this.bootstrappedKey.set(key);
        this.loadingPost.set(false);
        this.run.set(null);
        this.postFactReview.set(post.factReview ?? null);
        this.hydrateFactResolutions(post.factReview);
        this.loadArticleContextCards();
        this.resetMarginNotes();
        if (post.articleGenerationRunId) {
          this.loadRun(post.articleGenerationRunId);
        }
        this.maybeAutoApplyTemplateFromRun();
        void this.loadSiteConnections();
      },
      error: () => {
        this.loadingPost.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'Could not open',
          detail: 'That post could not be loaded.',
          life: 4000,
        });
        if (this.embedded()) {
          this.exit.emit();
          return;
        }
        void this.router.navigate(['/protopipe/content']);
      },
    });
  }

  // --- inspector panels -----------------------------------------------------

  isPanelOpen(panel: InspectorPanel): boolean {
    return this.activeInspectorPanel() === panel;
  }

  togglePanel(panel: InspectorPanel): void {
    if (this.embedded() && this.homeWriterView) {
      this.homeWriterView.selectPanel(panel);
      if (panel === 'blog' && this.homeWriterView.isPanel(panel)) {
        void this.refreshBlogPreview();
      }
      return;
    }
    const current = this.localActivePanel();
    if (current === panel) {
      this.localActivePanel.set(null);
      this.inspectorSidePanel.setOpen(false);
      return;
    }
    this.localActivePanel.set(panel);
    this.inspectorSidePanel.ensureOpen();
    if (panel === 'blog') {
      void this.refreshBlogPreview();
    }
  }

  openInspectorPanel(panel: InspectorPanel): void {
    if (this.embedded() && this.homeWriterView) {
      if (this.homeWriterView.isPanel(panel)) {
        this.homeSidePanel?.ensureOpen();
      } else {
        this.homeWriterView.openPanel(panel);
      }
      return;
    }
    this.localActivePanel.set(panel);
    this.inspectorSidePanel.ensureOpen();
    if (panel === 'facts') {
      this.loadArticleContextCards();
    }
  }

  closeInspectorSlider(): void {
    if (this.embedded() && this.homeWriterView) {
      this.homeWriterView.clearPanel();
      this.homeSidePanel?.setOpen(false);
      return;
    }
    this.localActivePanel.set(null);
    this.inspectorSidePanel.setOpen(false);
  }

  onSideSplitterPointerDown(event: PointerEvent): void {
    const host = this.writerShell()?.nativeElement;
    if (!host) return;
    this.inspectorSidePanel.startResize(event, host);
  }

  enterPreviewTakeover(): void {
    this.previewTakeover.set(true);
    void this.refreshBlogPreview();
  }

  exitPreviewTakeover(): void {
    this.previewTakeover.set(false);
  }

  private schedulePreviewRefresh(): void {
    if (this.previewRefreshTimer) clearTimeout(this.previewRefreshTimer);
    this.previewRefreshTimer = setTimeout(() => {
      this.previewRefreshTimer = null;
      void this.refreshBlogPreview();
    }, 600);
  }

  onBlocksTemplateChange(template: ProtopipeContentTemplate): void {
    this.content.patchWritingTemplate(syncTemplateImagesToSections(template));
  }

  onBlockImageUploadRequest(event: { blockId: string; imageIndex?: number }): void {
    const block = this.session()?.template.blocks?.find((b) => b.id === event.blockId);
    if (!block) return;
    if (block.kind === 'image') {
      this.imageUploadTarget.set({ kind: 'hero', blockId: block.id });
    } else if (block.kind === 'prose' && event.imageIndex != null) {
      this.imageUploadTarget.set({
        kind: 'prose',
        blockId: block.id,
        imageIndex: event.imageIndex,
      });
    } else {
      return;
    }
    this.imageFileInput()?.nativeElement.click();
  }

  patchHeroImage(field: 'url' | 'alt', value: string): void {
    const hero = this.heroImageBlock();
    if (!hero) return;
    this.patchBlockById(hero.id, { [field]: value });
  }

  clearHeroImage(): void {
    const hero = this.heroImageBlock();
    if (!hero) return;
    this.patchBlockById(hero.id, { url: '', alt: '' });
  }

  patchBlockImage(
    blockId: string,
    imageIndex: number,
    field: 'url' | 'alt',
    value: string,
  ): void {
    const s = this.session();
    if (!s) return;
    const block = s.template.blocks?.find((b) => b.id === blockId);
    if (block?.kind !== 'prose') return;
    const images = [...(block.images ?? [])];
    images[imageIndex] = { ...images[imageIndex], [field]: value };
    this.patchBlockById(blockId, { images });
  }

  triggerHeroImageUpload(): void {
    const hero = this.heroImageBlock();
    if (!hero) return;
    this.imageUploadTarget.set({ kind: 'hero', blockId: hero.id });
    this.imageFileInput()?.nativeElement.click();
  }

  triggerProseImageUpload(blockId: string, imageIndex: number): void {
    this.imageUploadTarget.set({ kind: 'prose', blockId, imageIndex });
    this.imageFileInput()?.nativeElement.click();
  }

  proseBlockIdForSection(sectionIndex: number): string | null {
    const s = this.session();
    if (!s?.template.blocks?.length) return null;
    const block = proseBlocksForSections(s.template)[sectionIndex];
    return block?.id ?? null;
  }

  isHeroImageUploading(blockId: string): boolean {
    const target = this.imageUploadTarget();
    return this.imageUploading() && target?.kind === 'hero' && target.blockId === blockId;
  }

  isProseImageUploading(blockId: string, imageIndex: number): boolean {
    const target = this.imageUploadTarget();
    return (
      this.imageUploading() &&
      target?.kind === 'prose' &&
      target.blockId === blockId &&
      target.imageIndex === imageIndex
    );
  }

  private patchBlockById(blockId: string, patch: Partial<import('@hive/contracts').ProtopipeArticleBlock>): void {
    const s = this.session();
    if (!s || s.readOnly) return;
    this.content.patchWritingTemplate(syncTemplateImagesToSections(patchBlock(s.template, blockId, patch)));
  }

  focusCanvasSlot(slotId: string): void {
    const s = this.session();
    if (!s) return;
    if (slotId === 'intro') {
      this.introEditor?.commands.focus('end');
      return;
    }
    const block = s.template.blocks?.find((b) => b.slotId === slotId);
    if (block?.kind === 'prose' && block.h2) {
      const idx = s.template.sections.findIndex((sec) => sec.h2 === block.h2);
      if (idx >= 0) this.focusSection(idx);
    }
  }

  private publishRequestBody(): { target: ProtopipePublishTarget; connectionId?: string } {
    const target = this.publishTarget();
    const connectionId = this.publishConnectionId();
    return {
      target,
      connectionId: target === 'wordpress' && connectionId ? connectionId : undefined,
    };
  }

  async refreshBlogPreview(): Promise<void> {
    const siteId = this.content.siteId();
    const s = this.session();
    if (!siteId || !s) return;

    this.blogPreviewLoading.set(true);
    this.blogPreviewError.set(null);
    try {
      const publishAt = s.scheduleAt?.toISOString();
      const response = await this.api.previewContent(siteId, {
        template: s.template,
        slug: s.slug,
        publishAt,
      });
      this.blogPreviewHtml.set(response.html);
    } catch (err) {
      this.blogPreviewHtml.set(null);
      this.blogPreviewError.set(parseProtopipeApiError(err, 'Could not load blog preview'));
    } finally {
      this.blogPreviewLoading.set(false);
    }
  }

  async loadSiteConnections(): Promise<void> {
    const siteId = this.content.siteId();
    if (!siteId) return;
    try {
      const { connections } = await this.api.listSiteConnections(siteId);
      this.siteConnections.set(connections);
      const wp = connections.find((c) => c.provider === 'wordpress' && c.status === 'connected');
      if (wp && !this.publishConnectionId()) {
        this.publishConnectionId.set(wp.id);
      }
    } catch {
      this.siteConnections.set([]);
    }
  }

  setPublishTarget(target: ProtopipePublishTarget): void {
    this.publishTarget.set(target);
    if (target === 'astro') {
      this.publishConnectionId.set(null);
    } else if (!this.publishConnectionId() && this.wordpressConnections()[0]) {
      this.publishConnectionId.set(this.wordpressConnections()[0].id);
    }
  }

  setPublishConnectionId(connectionId: string): void {
    this.publishConnectionId.set(connectionId || null);
  }

  addSectionImage(sectionIndex: number): void {
    const s = this.session();
    if (!s || s.readOnly) return;
    const section = s.template.sections[sectionIndex];
    const images = [...(section.images ?? []), { url: '', alt: '' }];
    this.patchSection(sectionIndex, { images });
  }

  toggleImageMenu(sectionIndex: number): void {
    this.imageMenuSectionIndex.update((current) => (current === sectionIndex ? null : sectionIndex));
  }

  closeImageMenu(): void {
    this.imageMenuSectionIndex.set(null);
  }

  onImageMenuUpload(sectionIndex: number): void {
    this.closeImageMenu();
    this.triggerSectionImageUpload(sectionIndex);
  }

  onImageMenuAddUrl(sectionIndex: number): void {
    this.closeImageMenu();
    this.addSectionImage(sectionIndex);
  }

  triggerSectionImageUpload(sectionIndex: number): void {
    const siteId = this.content.siteId();
    const postId = this.content.editingId();
    if (!siteId || !postId || postId === 'new') {
      this.messages.add({
        severity: 'warn',
        summary: 'Save draft first',
        detail: 'Save the post before uploading images.',
        life: 4000,
      });
      return;
    }
    this.imageUploadSectionIndex.set(sectionIndex);
    this.imageFileInput()?.nativeElement.click();
  }

  hasSectionImagePreview(url: string | undefined): boolean {
    return !!url?.trim();
  }

  async onSectionImageFileSelected(event: Event): Promise<void> {
    const sectionIndex = this.imageUploadSectionIndex();
    const uploadTarget = this.imageUploadTarget();

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if ((!uploadTarget && sectionIndex == null) || !file) {
      this.imageUploadSectionIndex.set(null);
      this.imageUploadTarget.set(null);
      return;
    }

    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    if (!allowed.has(file.type)) {
      this.imageUploadSectionIndex.set(null);
      this.imageUploadTarget.set(null);
      this.messages.add({
        severity: 'error',
        summary: 'Unsupported file',
        detail: 'Use JPEG, PNG, WebP, or GIF.',
        life: 5000,
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.imageUploadSectionIndex.set(null);
      this.imageUploadTarget.set(null);
      this.messages.add({
        severity: 'error',
        summary: 'File too large',
        detail: 'Images must be 5MB or smaller.',
        life: 5000,
      });
      return;
    }

    const siteId = this.content.siteId();
    const postId = this.content.editingId();
    if (!siteId || !postId || postId === 'new') {
      this.imageUploadSectionIndex.set(null);
      this.imageUploadTarget.set(null);
      return;
    }

    this.imageUploading.set(true);
    try {
      const presign = await this.api.presignContentMedia(siteId, postId, {
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      });
      const uploadRes = await fetch(presign.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!uploadRes.ok) {
        throw new Error('S3 upload failed');
      }

      const altHint = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
      const s = this.session();
      if (!s || s.readOnly) return;

      if (uploadTarget?.kind === 'hero') {
        this.patchBlockById(uploadTarget.blockId, { url: presign.publicUrl, alt: altHint });
      } else if (uploadTarget?.kind === 'prose') {
        const block = s.template.blocks?.find((b) => b.id === uploadTarget.blockId);
        if (block?.kind === 'prose') {
          const images = [...(block.images ?? [])];
          images[uploadTarget.imageIndex] = {
            ...(images[uploadTarget.imageIndex] ?? { url: '', alt: '' }),
            url: presign.publicUrl,
            alt: images[uploadTarget.imageIndex]?.alt?.trim() || altHint,
          };
          this.patchBlockById(uploadTarget.blockId, { images });
        }
      } else if (sectionIndex != null) {
        const section = s.template.sections[sectionIndex];
        const images = [...(section.images ?? [])];
        const emptyIdx = images.findIndex((img) => !img.url?.trim());
        if (emptyIdx >= 0) {
          images[emptyIdx] = { ...images[emptyIdx], url: presign.publicUrl, alt: altHint };
        } else {
          images.push({ url: presign.publicUrl, alt: altHint });
        }
        this.patchSection(sectionIndex, { images });
      }

      this.messages.add({
        severity: 'success',
        summary: 'Image uploaded',
        detail: 'Add or edit alt text before publishing.',
        life: 4000,
      });
    } catch (err) {
      const detail = parseProtopipeApiError(err, 'Could not upload image');
      this.messages.add({
        severity: 'error',
        summary: 'Upload failed',
        detail,
        life: 6000,
      });
    } finally {
      this.imageUploading.set(false);
      this.imageUploadSectionIndex.set(null);
      this.imageUploadTarget.set(null);
    }
  }

  updateSectionImage(
    sectionIndex: number,
    imageIndex: number,
    partial: { url?: string; alt?: string },
  ): void {
    const s = this.session();
    if (!s || s.readOnly) return;
    const images = [...(s.template.sections[sectionIndex].images ?? [])];
    images[imageIndex] = { ...images[imageIndex], ...partial };
    this.patchSection(sectionIndex, { images });
  }

  removeSectionImage(sectionIndex: number, imageIndex: number): void {
    const s = this.session();
    if (!s || s.readOnly) return;
    const images = (s.template.sections[sectionIndex].images ?? []).filter((_, i) => i !== imageIndex);
    this.patchSection(sectionIndex, { images });
  }

  addSectionEmbed(sectionIndex: number, url: string): void {
    const s = this.session();
    if (!s || s.readOnly || !url.trim()) return;
    const section = s.template.sections[sectionIndex];
    const embeds: ProtopipeContentSectionEmbed[] = [
      ...(section.embeds ?? []),
      { kind: detectEmbedKind(url), url: url.trim() },
    ];
    this.patchSection(sectionIndex, { embeds });
  }

  updateSectionEmbed(
    sectionIndex: number,
    embedIndex: number,
    partial: Partial<ProtopipeContentSectionEmbed>,
  ): void {
    const s = this.session();
    if (!s || s.readOnly) return;
    const embeds = [...(s.template.sections[sectionIndex].embeds ?? [])];
    embeds[embedIndex] = { ...embeds[embedIndex], ...partial };
    this.patchSection(sectionIndex, { embeds });
  }

  protected detectEmbedKind(url: string): ProtopipeContentEmbedKind {
    return detectEmbedKind(url);
  }

  removeSectionEmbed(sectionIndex: number, embedIndex: number): void {
    const s = this.session();
    if (!s || s.readOnly) return;
    const embeds = (s.template.sections[sectionIndex].embeds ?? []).filter((_, i) => i !== embedIndex);
    this.patchSection(sectionIndex, { embeds });
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
    sections.splice(atIndex, 0, { h2: '', body: '', images: [], embeds: [] });
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
    if (this.embedded()) {
      this.exit.emit();
      return;
    }
    void this.router.navigate(['/protopipe/content']);
  }

  backLabel(): string {
    return this.embedded() ? 'Strategy' : 'Content';
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
    if (!(t.title?.trim() ?? '')) {
      blocker = { detail: 'Add a title before saving.' };
    } else if (!(t.metaDescription?.trim() ?? '')) {
      blocker = {
        detail: 'Add a meta description before saving — it’s required.',
        panel: 'seo',
      };
    } else if (!(t.intro?.trim() ?? '') && t.sections.every((sec) => !(sec.body?.trim() ?? ''))) {
      blocker = { detail: 'Write some body content before saving.' };
    }

    if (!blocker) return false;

    if (blocker.panel) {
      this.openInspectorPanel(blocker.panel);
    }
    this.messages.add({
      severity: 'warn',
      summary: 'Almost there',
      detail: blocker.detail,
      life: 5000,
    });
    return true;
  }

  /** Block publish while critical flagged facts still need a decision. */
  private promptIfFactReviewIncomplete(): boolean {
    const pending = this.pendingCriticalFacts().length;
    if (!pending) return false;
    this.openInspectorPanel('facts');
    this.messages.add({
      severity: 'warn',
      summary: 'Fact review incomplete',
      detail: `Confirm or dismiss ${pending} critical flagged claim(s) before publishing.`,
      life: 6000,
    });
    return true;
  }

  /** Link or clear the post's primary plan keyword. */
  linkKeyword(keywordId: string): void {
    this.content.setPrimaryKeyword(keywordId);
  }

  publish(): void {
    if (this.promptIfIncomplete()) return;
    if (this.promptIfFactReviewIncomplete()) return;
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
    if (this.publishTarget() === 'wordpress' && !this.publishConnectionId()) {
      this.messages.add({
        severity: 'warn',
        summary: 'WordPress not connected',
        detail: 'Connect WordPress in Integrations or choose Astro publish.',
        life: 5000,
      });
      this.openInspectorPanel('seo');
      return;
    }
    this.content.publishNow(postId, this.publishRequestBody());
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
        this.postFactReview.set(null);
        this.factResolutions.set(new Map());
        this.resetMarginNotes();
        this.generating.set(false);
        this.openInspectorPanel('behind');
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
        } else if (run.status === 'complete') {
          this.maybeAutoApplyTemplateFromRun(run);
          this.loadArticleContextCards();
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
            this.maybeAutoApplyTemplateFromRun(run);
            this.loadArticleContextCards();
            this.messages.add({
              severity: 'success',
              summary: 'Pipeline finished',
              detail: 'Draft synced when the document was empty; open Facts to review flags.',
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

  // --- context cards (learning spine) ---------------------------------------

  private loadArticleContextCards(): void {
    const siteId = this.content.siteId();
    const postId = this.content.editingId();
    if (!siteId || !postId || postId === 'new') {
      this.pendingArticleContextCards.set([]);
      return;
    }
    this.api
      .listContextCards$(siteId, { status: 'pending', type: 'claim', articleId: postId })
      .subscribe({
        next: ({ cards }) => {
          this.pendingArticleContextCards.set(cards);
          const drafts: Record<string, string> = {};
          for (const card of cards) {
            drafts[card.id] = card.suggestedValue ?? '';
          }
          this.contextCardDrafts.set(drafts);
        },
        error: () => {
          this.pendingArticleContextCards.set([]);
        },
      });
  }

  contextCardDraft(cardId: string): string {
    return this.contextCardDrafts()[cardId] ?? '';
  }

  setContextCardDraft(cardId: string, value: string): void {
    this.contextCardDrafts.update((drafts) => ({ ...drafts, [cardId]: value }));
  }

  answerContextCard(card: ProtopipeContextCard): void {
    const siteId = this.content.siteId();
    if (!siteId || this.isReadOnly()) return;
    const value = this.contextCardDraft(card.id).trim();
    if (!value) {
      this.messages.add({
        severity: 'warn',
        summary: 'Answer required',
        detail: 'Enter the correct value before saving.',
        life: 3000,
      });
      return;
    }
    this.api
      .patchContextCard$(siteId, card.id, { status: 'answered', answer: { value } })
      .subscribe({
        next: () => {
          this.pendingArticleContextCards.update((cards) =>
            cards.filter((c) => c.id !== card.id),
          );
          this.messages.add({
            severity: 'success',
            summary: 'Claim saved',
            detail: 'Future articles will use this correction.',
            life: 4000,
          });
        },
        error: (err) => {
          this.messages.add({
            severity: 'error',
            summary: 'Could not save',
            detail: parseProtopipeApiError(err, 'That claim could not be saved.'),
            life: 5000,
          });
        },
      });
  }

  skipContextCard(card: ProtopipeContextCard): void {
    const siteId = this.content.siteId();
    if (!siteId || this.isReadOnly()) return;
    this.api.patchContextCard$(siteId, card.id, { status: 'skipped' }).subscribe({
      next: () => {
        this.pendingArticleContextCards.update((cards) =>
          cards.filter((c) => c.id !== card.id),
        );
      },
      error: (err) => {
        this.messages.add({
          severity: 'error',
          summary: 'Could not skip',
          detail: parseProtopipeApiError(err, 'That claim could not be skipped.'),
          life: 5000,
        });
      },
    });
  }

  dismissContextCard(card: ProtopipeContextCard): void {
    const siteId = this.content.siteId();
    if (!siteId || this.isReadOnly()) return;
    this.api.patchContextCard$(siteId, card.id, { status: 'dismissed' }).subscribe({
      next: () => {
        this.pendingArticleContextCards.update((cards) =>
          cards.filter((c) => c.id !== card.id),
        );
      },
      error: (err) => {
        this.messages.add({
          severity: 'error',
          summary: 'Could not dismiss',
          detail: parseProtopipeApiError(err, 'That claim could not be dismissed.'),
          life: 5000,
        });
      },
    });
  }

  // --- fact check actions ---------------------------------------------------

  /** Mark a flagged fact as resolved (client-side; write-back handled separately). */
  markFactReviewComplete(): void {
    if (this.pendingCriticalFacts().length > 0) return;
    const siteId = this.content.siteId();
    const postId = this.content.editingId();
    const runId = this.run()?.id;
    if (!siteId || !postId || postId === 'new' || !runId) return;

    const factReview: ProtopipeFactReview = {
      runId,
      flags: this.generationFlaggedFacts().map(
        ({ id, sectionIndex, h2, claim, category, severity, suggestion, target, claimStart, claimEnd, contentHash }) => ({
          id,
          sectionIndex,
          h2,
          claim,
          category,
          severity,
          suggestion,
          target,
          claimStart,
          claimEnd,
          contentHash,
        }),
      ),
      resolutions: [...this.factResolutions().entries()]
        .filter(([, status]) => status === 'confirmed' || status === 'dismissed')
        .map(([factId, status]) => ({
          factId,
          status,
          resolvedAt: new Date().toISOString(),
        })),
      completedAt: new Date().toISOString(),
    };
    this.postFactReview.set(factReview);
    this.persistFactReview();
    this.messages.add({
      severity: 'success',
      summary: 'Fact review complete',
      detail: 'You can publish when the rest of the article is ready.',
      life: 4000,
    });
  }

  resolveFact(fact: FlaggedFactView, resolution: FactResolution): void {
    this.factResolutions.update((prev) => {
      const next = new Map(prev);
      if (next.get(fact.id) === resolution) {
        next.delete(fact.id);
      } else {
        next.set(fact.id, resolution);
      }
      return next;
    });
    this.persistFactReview();
  }

  private hydrateFactResolutions(review: ProtopipeFactReview | null | undefined): void {
    if (!review?.resolutions?.length) {
      this.factResolutions.set(new Map());
      return;
    }
    const map = new Map<string, FactResolution>();
    for (const r of review.resolutions) {
      if (r.status === 'confirmed' || r.status === 'dismissed') {
        map.set(r.factId, r.status);
      }
    }
    this.factResolutions.set(map);
  }

  private persistFactReview(): void {
    const siteId = this.content.siteId();
    const postId = this.content.editingId();
    const runId = this.run()?.id;
    if (!siteId || !postId || postId === 'new' || !runId) return;

    const flags = this.generationFlaggedFacts().map(
      ({ id, sectionIndex, h2, claim, category, severity, suggestion, target, claimStart, claimEnd, contentHash }) => ({
        id,
        sectionIndex,
        h2,
        claim,
        category,
        severity,
        suggestion,
        target,
        claimStart,
        claimEnd,
        contentHash,
      }),
    );
    const resolutions: ProtopipeFactResolution[] = [...this.factResolutions().entries()]
      .filter(([, status]) => status === 'confirmed' || status === 'dismissed')
      .map(([factId, status]) => ({
        factId,
        status,
        resolvedAt: new Date().toISOString(),
      }));

    const prior = this.postFactReview();
    const factReview: ProtopipeFactReview = {
      runId,
      flags,
      resolutions,
      completedAt:
        prior?.completedAt ??
        (this.pendingCriticalFacts().length === 0 ? new Date().toISOString() : undefined),
    };

    this.api.updateContent$(siteId, postId, { factReview }).subscribe({
      next: ({ post }) => this.postFactReview.set(post.factReview ?? factReview),
      error: () => {
        /* non-blocking; operator can save manually */
      },
    });
  }

  /** Open the pipeline panel and focus the editable section for a flagged fact. */
  goToFlaggedSection(sectionIndex: number): void {
    this.openInspectorPanel('facts');
    const group = this.flaggedSections().find((s) => s.sectionIndex === sectionIndex);
    const fact = group?.facts[0];
    if (fact) {
      this.locateFact(fact);
      return;
    }
    this.content.setFocusedSection(sectionIndex > 0 ? sectionIndex - 1 : 0);
  }

  /** Track a section's editor instance so inline fact actions can target it. */
  registerEditor(sectionIndex: number, editor: Editor): void {
    this.sectionEditors.set(sectionIndex, editor);
    editor.commands.setFlaggedFacts(this.factsForSection(sectionIndex));
  }

  registerIntroEditor(editor: Editor): void {
    this.introEditor = editor;
    editor.commands.setFlaggedFacts(this.factsForIntro());
  }

  /** A highlighted claim was clicked in the editor: open the inline popover. */
  onFactClick(sectionIndex: number, event: { factId: string; rect: DOMRect }): void {
    const fact = this.generationFlaggedFacts().find((f) => f.id === event.factId);
    if (!fact) return;
    const { rect } = event;
    const x = Math.min(rect.left, window.innerWidth - 320);
    const y = rect.bottom + 8;
    this.activeFact.set({ fact, x: Math.max(12, x), y });
  }

  closeFactPopover(): void {
    this.activeFact.set(null);
  }

  confirmActiveFact(): void {
    const active = this.activeFact();
    if (!active) return;
    this.resolveFact(active.fact, 'confirmed');
    this.closeFactPopover();
  }

  dismissActiveFact(): void {
    const active = this.activeFact();
    if (!active) return;
    this.resolveFact(active.fact, 'dismissed');
    this.closeFactPopover();
  }

  /** Select the claim text in its section editor so the operator can rewrite it. */
  editActiveFact(): void {
    const active = this.activeFact();
    if (!active) return;
    const editor = this.sectionEditors.get(active.fact.sectionIndex);
    editor?.commands.selectFact(active.fact.id);
    this.closeFactPopover();
  }

  // --- bubble + slash menus -------------------------------------------------

  /** Floating formatting/AI toolbar shown on a text selection. */
  readonly bubbleMenu = signal<{
    text: string;
    x: number;
    y: number;
    editor: Editor;
    range: { from: number; to: number };
  } | null>(null);

  /** Slash command palette anchored to the cursor. */
  readonly slashMenu = signal<{
    query: string;
    x: number;
    y: number;
    editor: Editor;
    range: { from: number; to: number };
  } | null>(null);

  /** Dismissible results popover for research / ideas / links. */
  readonly aiPanel = signal<AiPanelState | null>(null);

  /** Slash commands filtered by the current query. */
  readonly slashCommands = computed<SlashCommand[]>(() => {
    const menu = this.slashMenu();
    const q = (menu?.query ?? '').toLowerCase();
    if (!q) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter(
      (c) => c.label.toLowerCase().includes(q) || c.keywords.includes(q),
    );
  });

  onSelectionMenu(event: ProseSelectionEvent | null): void {
    if (!event) {
      this.bubbleMenu.set(null);
      return;
    }
    const editor = event.editor;
    const { from, to } = editor.state.selection;
    const x = Math.max(12, Math.min(event.rect.left, window.innerWidth - 280));
    const y = Math.max(12, event.rect.top - 46);
    this.bubbleMenu.set({ text: event.text, x, y, editor, range: { from, to } });
  }

  onSlashMenu(event: ProseSlashEvent | null): void {
    if (!event) {
      this.slashMenu.set(null);
      return;
    }
    const x = Math.max(12, Math.min(event.rect.left, window.innerWidth - 260));
    const y = event.rect.bottom + 6;
    this.slashMenu.set({
      query: event.query,
      x,
      y,
      editor: event.editor,
      range: { from: event.from, to: event.to },
    });
  }

  bubbleToggleBold(): void {
    this.bubbleMenu()?.editor.chain().focus().toggleBold().run();
  }

  bubbleToggleItalic(): void {
    this.bubbleMenu()?.editor.chain().focus().toggleItalic().run();
  }

  bubbleResearch(): void {
    const menu = this.bubbleMenu();
    if (!menu) return;
    const phrase = menu.text.trim().slice(0, 120);
    this.bubbleMenu.set(null);
    void this.openResearch(menu.editor, phrase, { from: menu.range.to, to: menu.range.to });
  }

  bubbleLink(): void {
    const menu = this.bubbleMenu();
    if (!menu) return;
    this.bubbleMenu.set(null);
    void this.openLinkPicker(menu.editor, menu.range, true);
  }

  runSlashCommand(id: string): void {
    const menu = this.slashMenu();
    if (!menu) return;
    const { editor, range } = menu;
    this.slashMenu.set(null);

    switch (id) {
      case 'bullet':
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
        return;
      case 'quote':
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
        return;
      case 'link':
        editor.chain().focus().deleteRange(range).run();
        void this.openLinkPicker(editor, { from: range.from, to: range.from }, false);
        return;
      case 'idea':
        editor.chain().focus().deleteRange(range).run();
        void this.openIdeas(editor, { from: range.from, to: range.from });
        return;
      case 'research': {
        editor.chain().focus().deleteRange(range).run();
        const phrase = this.session()?.template.h1?.trim() || this.session()?.template.title || '';
        void this.openResearch(editor, phrase, { from: range.from, to: range.from });
        return;
      }
    }
  }

  closeAiPanel(): void {
    this.aiPanel.set(null);
  }

  applyAiItem(item: AiPanelItem): void {
    const panel = this.aiPanel();
    if (!panel) return;
    const { editor, range } = panel;
    if (panel.kind === 'links' && panel.linkSelection) {
      if (item.insert) {
        editor.chain().focus().extendMarkRange('link').setLink({ href: item.insert }).run();
      }
    } else if (panel.kind === 'links' && item.insert) {
      this.insertAtRange(editor, range, `[${item.label}](${item.insert})`);
    } else if (item.insert) {
      this.insertAtRange(editor, range, item.insert);
    }
    this.closeAiPanel();
  }

  private insertAtRange(
    editor: Editor,
    range: { from: number; to: number } | null,
    text: string,
  ): void {
    const chain = editor.chain().focus();
    if (range) {
      chain.insertContentAt(range, text);
    } else {
      chain.insertContent(text);
    }
    chain.run();
  }

  private async openResearch(
    editor: Editor,
    phrase: string,
    range: { from: number; to: number },
  ): Promise<void> {
    const siteId = this.content.siteId();
    if (!siteId || !phrase) return;
    this.aiPanel.set({
      kind: 'research',
      title: `Research · “${phrase}”`,
      loading: true,
      error: null,
      items: [],
      editor,
      range,
    });
    try {
      const res = await this.api.researchQuery(siteId, {
        phrase,
        includeRelated: true,
        relatedLimit: 10,
      });
      const items: AiPanelItem[] = (res.ads.related ?? []).map((kw) => ({
        label: kw.phrase,
        detail:
          kw.avgMonthlySearches != null ? `${kw.avgMonthlySearches.toLocaleString()}/mo` : undefined,
        insert: kw.phrase,
      }));
      this.aiPanel.update((p) =>
        p && p.kind === 'research'
          ? { ...p, loading: false, items, error: items.length ? null : 'No related phrases found.' }
          : p,
      );
    } catch {
      this.aiPanel.update((p) =>
        p && p.kind === 'research' ? { ...p, loading: false, error: 'Research failed.' } : p,
      );
    }
  }

  private async openIdeas(
    editor: Editor,
    range: { from: number; to: number },
  ): Promise<void> {
    const siteId = this.content.siteId();
    if (!siteId) return;
    this.aiPanel.set({
      kind: 'ideas',
      title: 'Article ideas',
      loading: true,
      error: null,
      items: [],
      editor,
      range,
    });
    try {
      const res = await this.api.getArticleIdeas(siteId);
      const items: AiPanelItem[] = (res.ideas ?? []).slice(0, 12).map((idea) => ({
        label: idea.title,
        detail: idea.angle,
        insert: idea.title,
      }));
      this.aiPanel.update((p) =>
        p && p.kind === 'ideas'
          ? {
              ...p,
              loading: false,
              items,
              error: res.pending
                ? 'Ideas are still generating — try again shortly.'
                : items.length
                  ? null
                  : 'No ideas yet.',
            }
          : p,
      );
    } catch {
      this.aiPanel.update((p) =>
        p && p.kind === 'ideas' ? { ...p, loading: false, error: 'Could not load ideas.' } : p,
      );
    }
  }

  private async openLinkPicker(
    editor: Editor,
    range: { from: number; to: number },
    linkSelection: boolean,
  ): Promise<void> {
    const siteId = this.content.siteId();
    if (!siteId) return;
    this.aiPanel.set({
      kind: 'links',
      title: 'Link to a published article',
      loading: true,
      error: null,
      items: [],
      editor,
      range,
      linkSelection,
    });
    try {
      const res = await this.api.listContent(siteId);
      const currentId = this.content.editingId();
      const items: AiPanelItem[] = (res.posts ?? [])
        .filter((p) => p.status === 'published' && p.id !== currentId && p.slug)
        .slice(0, 20)
        .map((p) => ({
          label: p.title || p.template?.h1 || p.slug || 'Untitled',
          detail: `/${p.slug}`,
          insert: `/${p.slug}`,
        }));
      this.aiPanel.update((prev) =>
        prev && prev.kind === 'links'
          ? { ...prev, loading: false, items, error: items.length ? null : 'No published articles to link.' }
          : prev,
      );
    } catch {
      this.aiPanel.update((prev) =>
        prev && prev.kind === 'links' ? { ...prev, loading: false, error: 'Could not load articles.' } : prev,
      );
    }
  }

  // --- margin AI notes (ambient suggestions) --------------------------------

  private readonly dismissedNotes = signal<Set<string>>(new Set());
  readonly expandedNote = signal<string | null>(null);

  private static readonly HINT_ADVICE: Record<string, string> = {
    meta: 'Write a 140–160 character meta description that previews the answer and includes the keyword.',
    'intro-kw': 'Work the primary keyword naturally into the first sentence or two of the opening.',
    words: 'Aim for at least 300 words of substantive body copy so the piece reads as authoritative.',
    title: 'Give the article a search-friendly title that leads with the phrase people type.',
    h1: 'Add a clear page headline (H1) so readers and search engines know the topic at a glance.',
  };

  /** All ambient suggestions seeded from writing hints, brief gaps, and outline notes. */
  private readonly allMarginNotes = computed<MarginNote[]>(() => {
    const session = this.session();
    if (!session) return [];
    const template = session.template;
    const notes: MarginNote[] = [];

    for (const hint of writingHints(template)) {
      if (hint.done) continue;
      const advice = ProtopipeWriterComponent.HINT_ADVICE[hint.id];
      if (!advice) continue;
      notes.push({
        id: `hint:${hint.id}`,
        anchor: 'intro',
        label: 'Checklist',
        peek: hint.label,
        text: advice,
      });
    }

    const brief = this.run()?.artifacts?.brief;
    (brief?.contentGaps ?? []).slice(0, 4).forEach((gap, i) => {
      const trimmed = gap.trim();
      if (!trimmed) return;
      notes.push({
        id: `gap:${i}`,
        anchor: 'intro',
        label: 'Content gap',
        peek: trimmed.length > 28 ? `${trimmed.slice(0, 28)}…` : trimmed,
        text: trimmed,
      });
    });

    const outline = this.run()?.artifacts?.outline;
    (outline?.sections ?? []).forEach((sec, i) => {
      const body = template.sections[i]?.body ?? '';
      if (body.trim()) return;
      const points = (sec.notes ?? []).map((n) => n.trim()).filter(Boolean);
      if (!points.length) return;
      notes.push({
        id: `outline:${i}`,
        anchor: 'section',
        sectionIndex: i,
        label: 'Draft prompt',
        peek: 'Cover these points',
        text: points.join(' · '),
        apply: {
          target: 'section',
          sectionIndex: i,
          text: points.map((p) => `- ${p}`).join('\n'),
        },
      });
    });

    return notes;
  });

  readonly marginNoteCount = computed(
    () => this.allMarginNotes().filter((n) => !this.dismissedNotes().has(n.id)).length,
  );

  notesForIntro(): MarginNote[] {
    const dismissed = this.dismissedNotes();
    return this.allMarginNotes().filter((n) => n.anchor === 'intro' && !dismissed.has(n.id));
  }

  notesForSection(sectionIndex: number): MarginNote[] {
    const dismissed = this.dismissedNotes();
    return this.allMarginNotes().filter(
      (n) => n.anchor === 'section' && n.sectionIndex === sectionIndex && !dismissed.has(n.id),
    );
  }

  private resetMarginNotes(): void {
    this.dismissedNotes.set(new Set());
    this.expandedNote.set(null);
    this.selectedFactId.set(null);
  }

  isNoteExpanded(id: string): boolean {
    return this.expandedNote() === id;
  }

  toggleNote(id: string): void {
    this.expandedNote.update((cur) => (cur === id ? null : id));
  }

  dismissNote(id: string): void {
    this.dismissedNotes.update((prev) => new Set(prev).add(id));
    if (this.expandedNote() === id) this.expandedNote.set(null);
  }

  applyNote(note: MarginNote): void {
    if (!note.apply || this.isReadOnly()) {
      this.dismissNote(note.id);
      return;
    }
    const { target, sectionIndex, text } = note.apply;
    if (target === 'section' && sectionIndex != null) {
      const existing = this.session()?.template.sections[sectionIndex]?.body ?? '';
      const next = existing.trim() ? `${existing}\n\n${text}` : text;
      this.patchSection(sectionIndex, { body: next });
    } else if (target === 'intro') {
      const existing = this.session()?.template.intro ?? '';
      const next = existing.trim() ? `${existing}\n\n${text}` : text;
      this.patchTemplate({ intro: next });
    }
    this.dismissNote(note.id);
  }

  /** Sync assembled template when the canvas is empty or still on a prior run's draft. */
  private maybeAutoApplyTemplateFromRun(run?: ArticleGenerationRunDto): void {
    const active = run ?? this.run();
    if (!active || active.status !== 'complete' || !active.artifacts?.template) return;
    const s = this.session();
    if (!s || s.readOnly) return;

    void (async () => {
      const artifactTpl = active.artifacts!.template!;
      const sessionFp = await templateContentFingerprint(s.template);
      const artifactFp = await templateContentFingerprint(artifactTpl);
      if (sessionFp === artifactFp) return;

      const hasContent =
        (s.template.intro?.trim().length ?? 0) > 0 ||
        s.template.sections.some((sec) => (sec.body?.trim().length ?? 0) > 0);
      const reviewRunId = this.postFactReview()?.runId;
      const staleForRun = Boolean(active.id && reviewRunId && reviewRunId !== active.id);

      if (!hasContent || staleForRun) {
        this.applyGenerated({ silent: true });
      }
    })();
  }

  applyGenerated(options?: { silent?: boolean }): void {
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
          blocks: tpl.blocks ?? s.template.blocks,
          cta: tpl.cta ?? s.template.cta,
          internalLinks: tpl.internalLinks ?? s.template.internalLinks,
          articleType: tpl.articleType ?? s.template.articleType,
          layoutVariant: tpl.layoutVariant ?? s.template.layoutVariant,
          layoutVersion: tpl.layoutVersion ?? s.template.layoutVersion,
        },
      });
      const reviewFlags = artifacts.review?.flaggedFacts ?? [];
      if (reviewFlags.length && run.id) {
        const factReview: ProtopipeFactReview = {
          runId: run.id,
          flags: reviewFlags,
          resolutions: this.postFactReview()?.resolutions ?? [],
        };
        this.postFactReview.set(factReview);
        this.persistFactReview();
      }
    } else {
      const outline = artifacts.outline;
      const drafted = artifacts.sections ?? [];
      const sections = (outline?.sections ?? []).map((sec, i) => ({
        h2: sec.h2,
        body: drafted[i]?.prose ?? '',
        images: [] as { url: string; alt: string }[],
        embeds: [] as { kind: 'youtube' | 'vimeo' | 'url'; url: string }[],
      }));
      this.content.updateWritingSession({
        template: {
          ...s.template,
          h1: outline?.h1 || s.template.h1,
          sections: sections.length ? sections : s.template.sections,
        },
      });
    }

    if (!options?.silent) {
      this.messages.add({
        severity: 'success',
        summary: 'Draft applied',
        detail: 'Review the pulled-in sections, then save.',
        life: 4000,
      });
    }
  }
}
