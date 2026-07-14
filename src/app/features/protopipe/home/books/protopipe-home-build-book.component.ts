import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { ProgressSpinner } from 'primeng/progressspinner';
import type { ProtopipeContentPlanCalendarItem, ProtopipeContentPost, ProtopipePublishStatus } from '@hive/contracts';
import { ProtopipeBuildBookService, findDraftSectionForSlot } from '../../build-book/protopipe-build-book.service';
import { ProtopipeShireSitesApiService } from '../../build-book/protopipe-shire-sites-api.service';
import { validateBuildBookPublishGate } from '../../build-book/validation/build-book-publish-gate.util';
import { findBuildBookBlockDefinition } from '../../build-book/build-book-block.catalog';
import {
  baselineVariantLabel,
  isBaselineHomepage,
} from '../../build-book/build-book-baseline.util';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import {
  BUILD_BOOK_OPTIONS,
  BUILD_BOOK_SECTION_ORDER,
  buildBookSectionLabel,
  buildBookSectionNum,
  findBuildBookOption,
  type BuildBookOption,
  type BuildBookSection,
} from '../../build-book/build-book.constants';
import {
  BUILD_DEMO_HERO_VARIANTS,
  brandsForDemoSection,
  demoBrandDot,
  demoBrandLabel,
  filterDemoOptions,
  heroPreviewImageForLayout,
  isDemoSection as isBuildBookDemoSection,
} from '../../build-book/build-book-demo.catalog';
import { baselineApprovedHeroOptionsForBrand } from '../../build-book/build-book-baseline-hero.catalog';
import {
  BASELINE_APPROVED_FOLD_LIBRARY,
  resolveBaselineFoldLayoutId,
} from '../../build-book/build-book-baseline-fold.catalog';
import type {
  BlogArticleTemplateKey,
  BuildBookDemoBrand,
  BuildBookTemplateDefinition,
} from '../../build-book/build-book.types';
import { BLOG_ARTICLE_TEMPLATE_CATALOG } from '../../build-book/build-book-blog-template.catalog';
import { ProtopipeBuildSiteImagesPanelComponent } from '../../build-book/build-site-images-panel/protopipe-build-site-images-panel.component';
import { ProtopipeBuildImageQuickPickerComponent } from '../../build-book/image-picker/build-image-quick-picker.component';
import { ProtopipeBuildMediaSlotsPanelComponent } from '../../build-book/build-media-slots-panel/protopipe-build-media-slots-panel.component';
import { ProtopipeBuildBlockNavThumbComponent } from '../../build-book/nav-thumb/build-block-nav-thumb.component';
import { resolveMediaSlotsForBlock } from '../../build-book/build-book-media-slots.util';
import { ProtopipeBuildBookOptionPreviewComponent } from '../../build-book/option-preview/protopipe-build-book-option-preview.component';
import {
  ProtopipeBuildPageCanvasComponent,
  type BuildPageBlockState,
  type BuildPageSectionState,
} from '../../build-book/canvas/build-page-canvas.component';
import {
  DEFAULT_HERO_PREVIEW_COPY,
  type BuildHeroPreviewCopy,
} from '../../build-book/build-hero-preview.types';
import { readHeroCopy, readHeroImageUrl, resolveHeroPreviewLayoutId, heroCopyToProps } from '../../build-book/build-hero-block.util';
import { resolveBaselineHeroLayoutId } from '../../build-book/build-book-baseline-hero.catalog';
import type { BuildBookProspectContext } from '../../build-book/build-book-context';
import { BUILD_BOOK_TEMPLATE_DEFINITIONS } from '../../build-book/build-book-template.catalog';
import {
  navDisplayLabel,
  navDisplaySubtitle,
  enrichedBlockDefinition,
  variantsForPattern,
  resolveBlockIdForHeroLayoutOption,
  patternLabelForId,
  resolvePatternIdForBlock,
  type AddBlockCatalogFilter,
} from '../../build-book/build-book-block-registry.util';
import { articlePreviewPropsForPattern } from '../../build-book/build-book-blog-fixtures';
import {
  articleFillFingerprint,
  fillBlogPostBlockProps,
  fillSourceFromProtopipeTemplate,
} from '../../build-book/build-book-article-fill.util';
import {
  ensureSiteThemeCatalogFontsReady,
  ensureSiteThemeGoogleFontCatalogLoaded,
  ensureSiteThemeGoogleFontsLoaded,
  materializeBlockPropsForInsert,
  siteThemeTokensToCssVars,
  themedPatternThumbStyle,
  type SiteDesignContext,
} from '../../site-design/public';
import type { BuildBookPatternSelectedEvent } from '../../build-book/page-builder-rail/build-book-page-builder-rail.component';
import { intentDisplayLabel } from '../../build-book/build-book-pattern-skeletons';
import type { BuildBookBlockIntent } from '../../build-book/build-book-block-patterns.catalog';
import type {
  BuildBookBlockInstance,
  BuildBookPageKind,
  BuildBookPendingAdd,
} from '../../build-book/build-book.types';
import { BUILD_BOOK_PENDING_ADD_BLOCK_ID } from '../../build-book/build-book.types';
import { BuildBookPageBuilderRailComponent } from '../../build-book/page-builder-rail/build-book-page-builder-rail.component';
import { BuildBookLandingPagesPanelComponent } from '../../build-book/landing-pages-panel/build-book-landing-pages-panel.component';
import { BuildBookContentPostsPanelComponent } from '../../build-book/content-posts-panel/build-book-content-posts-panel.component';
import { BuildBookSitesPanelComponent } from '../../build-book/sites-panel/build-book-sites-panel.component';
import { ProtopipeHomeKeywordBookComponent } from './protopipe-home-keyword-book.component';
import { ProtopipeContentPlanComponent } from '../../content-plan/protopipe-content-plan.component';
import { StrategyBinderCalendarPanelComponent } from '../strategy-binder/strategy-binder-calendar-panel.component';
import { mapStrategyBinderView } from '../strategy-binder/strategy-binder.mapper';
import { ProtopipeHomeStrategyViewState } from '../strategy/protopipe-home-strategy-view.state';
import { ProtopipeContentService } from '../../protopipe-content.service';
import { calendarItemKey } from '../strategy/strategy.helpers';
import {
  buildCalendarNextActionMap,
} from '../strategy-binder/calendar-article-action.util';
import { ProtopipeBuildBookThemePanelComponent } from '../../build-book/theme-panel/protopipe-build-book-theme-panel.component';
import { hasBuildBookBaselineAssembly } from '../../build-book/build-book-baseline-assemblies';
import { hrefFieldsFromProps, altFieldsFromProps } from '../../build-book/fields/build-href-field.util';
import { contentFieldsFromEditablePaths } from '../../build-book/fields/build-content-field.util';
import { readProp } from '../../build-book/fields/build-field.util';
import type { BuildPageImageEditEvent } from '../../build-book/canvas/build-page-canvas.component';
import { ContentPlanStore } from '../../content-plan/content-plan.store';
import { ProtopipeHomeThinkerViewState } from '../protopipe-home-thinker-view.state';
import { ProtopipeBuildBookNavState } from '../protopipe-build-book-nav.state';

const SECTION_DECK: Record<BuildBookSection, string> = {
  hero: 'Pick a hero layout, then open Hero images & copy to generate photos and set headline text — same live preview as pitch prep.',
  fold: 'Below-the-fold sections from the Sparky and WRI style labs — contract bars, capabilities, proof, and close patterns.',
  services: 'How service lines are organized on the homepage.',
  proof: 'Social proof — reviews, outcomes, or a single quote highlight.',
  areas: 'Coverage and process — FAQ accordion or how-it-works steps.',
  close: 'Final conversion — CTA banner or lead capture form.',
};

const HERO_PREVIEW_PLACEHOLDER_IMAGE =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000"%3E%3Cdefs%3E%3ClinearGradient id="g" x1="0" x2="1" y1="0" y2="1"%3E%3Cstop offset="0" stop-color="%230f766e"/%3E%3Cstop offset="0.52" stop-color="%23164e63"/%3E%3Cstop offset="1" stop-color="%230f172a"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="1600" height="1000" fill="url(%23g)"/%3E%3Cpath d="M0 690c180-72 343-101 489-86 171 18 274 89 436 82 182-8 301-111 675-137v451H0z" fill="%23020617" opacity=".38"/%3E%3C/svg%3E';

type BuildBookEntryMode = 'template' | 'blocks';
type BuildBookInspectorTab = 'content' | 'layout' | 'media' | 'links';
type BuildBookTab =
  | 'research'
  | 'strategy'
  | 'calendar'
  | 'sites'
  | 'templates'
  | 'homepage'
  | 'landing-pages'
  | 'blog-home'
  | 'blog-templates'
  | 'seo-strategy'
  | 'site-theme'
  | 'content-posts';

type ContentPostsCanvasMode = 'profile' | 'article-preview';

interface BuildBookTabItem {
  id: BuildBookTab;
  label: string;
  status?: string;
}

@Component({
  selector: 'app-protopipe-home-build-book',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    FormsModule,
    Button,
    Dialog,
    InputText,
    Message,
    ProgressSpinner,
    ProtopipeBuildPageCanvasComponent,
    BuildBookPageBuilderRailComponent,
    BuildBookLandingPagesPanelComponent,
    BuildBookContentPostsPanelComponent,
    BuildBookSitesPanelComponent,
    ProtopipeHomeKeywordBookComponent,
    ProtopipeContentPlanComponent,
    StrategyBinderCalendarPanelComponent,
    ProtopipeBuildBookThemePanelComponent,
    ProtopipeBuildSiteImagesPanelComponent,
    ProtopipeBuildImageQuickPickerComponent,
    ProtopipeBuildBlockNavThumbComponent,
    ProtopipeBuildMediaSlotsPanelComponent,
    ProtopipeBuildBookOptionPreviewComponent,
  ],
  templateUrl: './protopipe-home-build-book.component.html',
  styleUrl: './protopipe-home-build-book.component.scss',
})
export class ProtopipeHomeBuildBookComponent implements OnInit, OnDestroy {
  readonly prospectContext = input<BuildBookProspectContext | null>(null);
  readonly exit = output<void>();
  readonly previewBlogArticleTemplate = output<BlogArticleTemplateKey>();

  readonly buildBook = inject(ProtopipeBuildBookService);
  readonly strategy = inject(ProtopipeStrategyService);
  private readonly contentPlan = inject(ContentPlanStore);
  private readonly content = inject(ProtopipeContentService);
  private readonly strategyView = inject(ProtopipeHomeStrategyViewState, { optional: true });
  private readonly thinkerView = inject(ProtopipeHomeThinkerViewState, { optional: true });
  private readonly buildBookNav = inject(ProtopipeBuildBookNavState);
  private readonly shireSitesApi = inject(ProtopipeShireSitesApiService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly pageBuilderRail = viewChild(BuildBookPageBuilderRailComponent);

  readonly setupOpen = signal(false);
  readonly setupTemplate = signal<BuildBookTemplateDefinition | null>(null);
  readonly setupDisplayName = signal('');
  readonly setupSlug = signal('');
  readonly setupSaving = signal(false);
  readonly setupError = signal<string | null>(null);
  readonly publishing = signal(false);
  readonly publishProgressMessage = signal<string | null>(null);
  readonly publishStartedAt = signal<number | null>(null);
  readonly publishErrorOpen = signal(false);
  readonly editingDisplayName = signal(false);
  readonly displayNameDraft = signal('');
  private publishPollTimer: ReturnType<typeof setInterval> | null = null;

  readonly section = signal<BuildBookSection>('hero');
  readonly bookTab = signal<BuildBookTab>('templates');
  readonly landingPageId = signal<string | null>(null);
  readonly blogPostId = signal<string | null>(null);
  readonly entryMode = signal<BuildBookEntryMode>('template');
  readonly demoBrand = signal<BuildBookDemoBrand>('sparky');
  readonly previewOpen = signal(true);
  readonly previewWidth = signal(320);
  readonly inspectorTab = signal<BuildBookInspectorTab>('content');
  readonly canvasViewMode = signal<'full' | 'focus'>('full');
  readonly heroPreviewIndex = signal(0);
  readonly scrollToSection = signal<BuildBookSection | null>(null);
  readonly activeBlockId = signal<string | null>(null);
  readonly scrollToBlockId = signal<string | null>(null);
  readonly pendingAdd = signal<BuildBookPendingAdd | null>(null);
  readonly addCatalogFilter = signal<AddBlockCatalogFilter>('compatible');
  readonly pendingImageEdit = signal<{ blockInstanceId: string; propPath: string } | null>(null);
  readonly imagePickerOpen = signal(false);
  readonly bookTabs: BuildBookTabItem[] = [
    { id: 'research', label: 'Research' },
    { id: 'strategy', label: 'Strategy' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'sites', label: 'Sites' },
    { id: 'templates', label: 'Templates' },
    { id: 'homepage', label: 'Homepage' },
    { id: 'landing-pages', label: 'Landing Pages' },
    { id: 'blog-home', label: 'Blog Home' },
    { id: 'blog-templates', label: 'Blog Templates' },
    { id: 'site-theme', label: 'Site theme' },
    { id: 'seo-strategy', label: 'Media Library' },
    { id: 'content-posts', label: 'Content Posts' },
  ];
  readonly switchingSite = signal(false);
  readonly switchingSiteId = signal<string | null>(null);
  readonly contentPostsCanvasMode = signal<ContentPostsCanvasMode>('profile');
  /** pageId → article fill fingerprint — avoid re-writing Profile on every tick. */
  private readonly articleFillApplied = new Map<string, string>();

  readonly isPageEditor = computed(() => {
    if (!this.buildBook.hasDraft()) return false;
    if (this.bookTab() === 'homepage') return true;
    if (this.bookTab() === 'landing-pages') return Boolean(this.landingPageId());
    if (this.bookTab() === 'blog-home') return Boolean(this.buildBook.blogHomePageId());
    if (this.bookTab() === 'content-posts') return Boolean(this.blogPostId());
    return false;
  });

  readonly activePageId = computed(() => {
    if (this.bookTab() === 'homepage') return this.buildBook.homepagePageId();
    if (this.bookTab() === 'landing-pages') return this.landingPageId();
    if (this.bookTab() === 'blog-home') return this.buildBook.blogHomePageId();
    if (this.bookTab() === 'content-posts') return this.blogPostId();
    return null;
  });

  readonly activePageKind = computed((): BuildBookPageKind => {
    if (this.bookTab() === 'landing-pages') return 'landing-page';
    if (this.bookTab() === 'blog-home') return 'blog-home';
    if (this.bookTab() === 'content-posts') return 'blog-post';
    return 'homepage';
  });

  readonly usesPageBuilderRail = computed(
    () =>
      this.isBaselineMode() ||
      this.bookTab() === 'landing-pages' ||
      this.bookTab() === 'blog-home' ||
      this.bookTab() === 'content-posts',
  );

  readonly activeBookTabMeta = computed(
    () => this.bookTabs.find((tab) => tab.id === this.bookTab()) ?? this.bookTabs[0],
  );

  readonly pageStackBlocks = computed(() => {
    const pageId = this.activePageId();
    if (pageId) return this.buildBook.blocksForPage(pageId);
    return this.baselineBlocks();
  });

  readonly siteDesignContext = computed((): SiteDesignContext | null =>
    this.buildBook.resolveSiteDesignContext(this.activePageId(), this.activePageKind()),
  );

  readonly themeEditorContext = computed((): SiteDesignContext | null =>
    this.buildBook.resolveSiteDesignContext(this.buildBook.homepagePageId(), 'homepage'),
  );

  readonly siteThemeCssVars = computed((): Record<string, string> | null => {
    const ctx = this.siteDesignContext();
    return ctx ? siteThemeTokensToCssVars(ctx.theme) : null;
  });

  constructor() {
    effect(() => {
      ensureSiteThemeGoogleFontCatalogLoaded();
      void ensureSiteThemeCatalogFontsReady();
      const ctx = this.siteDesignContext();
      if (ctx) ensureSiteThemeGoogleFontsLoaded(ctx.theme.typography);
    });

    effect(() => {
      if (this.bookTab() !== 'content-posts') return;
      const pageId = this.blogPostId();
      if (!pageId) return;
      // Touch posts catalog so return-from-writer refresh re-runs fill.
      void this.content.posts();
      const page = this.buildBook.blogPosts().find((item) => item.id === pageId);
      const postId = page?.contentPostId;
      if (!postId) return;
      const post = this.content.postById(postId);
      const template = post?.template;
      if (!template) return;
      const hasBody =
        Boolean(template.intro?.trim()) ||
        (template.sections?.length ?? 0) > 0 ||
        (template.blocks?.length ?? 0) > 0;
      if (!hasBody) return;

      const profileId = post?.blogTemplateProfileId?.trim();
      const source = fillSourceFromProtopipeTemplate(template, {
        kicker: page?.suggestedKeyword,
      });
      const fingerprint = `${profileId ?? ''}|${articleFillFingerprint(source)}`;
      if (this.articleFillApplied.get(pageId) === fingerprint) return;

      // Defer write so we do not mutate Build Book signals synchronously inside the effect.
      queueMicrotask(() => {
        if (this.articleFillApplied.get(pageId) === fingerprint) return;
        if (profileId) {
          this.buildBook.cloneTemplateProfileOntoArticlePage(
            profileId,
            postId,
            page?.label ?? post?.title ?? 'Blog post',
          );
        }
        this.buildBook.applyArticleFillToBlogPage(pageId, source);
        this.articleFillApplied.set(pageId, fingerprint);
      });
    });

    effect(() => {
      const request = this.buildBookNav.articlePreviewRequest();
      if (!request) return;
      // Wait until draft/pages are available before consuming the handoff.
      if (!this.buildBook.hasDraft()) return;
      queueMicrotask(() => {
        const pending = this.buildBookNav.consumeArticlePreviewRequest();
        if (!pending) return;
        this.openArticlePreviewForContentPost(pending.contentPostId, pending.title);
      });
    });
  }

  readonly patternThumbStyle = computed((): Record<string, string> | null => {
    const ctx = this.siteDesignContext();
    return ctx ? themedPatternThumbStyle(ctx.theme) : null;
  });

  readonly navSlots: BuildBookSection[] = [
    'hero',
    'fold',
    'services',
    'proof',
    'areas',
    'close',
  ];

  readonly heroLayoutId = computed(() => {
    const pending = this.pendingAdd();
    if (pending?.patternId === 'hero' && pending.previewOptionId) {
      return pending.previewOptionId;
    }
    if (this.isBaselineMode()) {
      const block =
        this.activeBlock()?.section === 'hero'
          ? this.activeBlock()
          : this.baselineBlocks().find((item) => item.section === 'hero');
      if (block) {
        return resolveBaselineHeroLayoutId(block.blockId, block.props);
      }
    }

    const hero = this.heroSection();
    return resolveHeroPreviewLayoutId(this.selectedId('hero'), hero);
  });

  readonly heroPreviewMeta = computed(
    () => BUILD_DEMO_HERO_VARIANTS.find((h) => h.id === this.heroLayoutId()) ?? BUILD_DEMO_HERO_VARIANTS[0],
  );

  readonly heroPreviewBrand = computed(
    (): BuildBookDemoBrand => this.heroPreviewMeta()?.brand ?? this.demoBrand(),
  );

  readonly configuredStackCount = computed(() => {
    if (this.isBaselineMode()) {
      return this.buildBook.homepageBlocks().length;
    }
    return this.navSlots.filter((slot) => Boolean(this.selectedId(slot))).length;
  });

  readonly publishGate = computed(() =>
    validateBuildBookPublishGate({
      homepage: this.buildBook.pages().find((page) => page.kind === 'homepage') ?? null,
      site: this.strategy.site(),
      dirty: this.buildBook.dirty(),
    }),
  );

  readonly canPublish = computed(() => {
    if (this.publishing()) return false;
    if (this.publishInProgress() && !this.publishStale()) return false;
    return this.publishGate().ok && this.buildBook.hasDraft();
  });

  readonly publishInProgress = computed(
    () => this.publishStatus() === 'provisioning' || this.publishing(),
  );

  readonly publishStale = computed(() => {
    if (this.publishStatus() !== 'provisioning') return false;
    const started = this.publishStartedAt();
    if (!started) return false;
    return Date.now() - started > 5 * 60 * 1000;
  });

  readonly publishButtonLabel = computed(() => {
    if (this.publishing()) return 'Publishing…';
    if (this.publishStatus() === 'provisioning') {
      return this.publishStale() ? 'Retry publish' : 'Publishing…';
    }
    if (this.publishStatus() === 'failed') return 'Retry publish';
    if (this.publishStatus() === 'live') return 'Publish updates';
    return 'Publish';
  });

  readonly publishProgressTooltip = computed(() => {
    const parts: string[] = [];
    const msg = this.publishProgressMessage();
    if (msg) parts.push(msg);
    parts.push('Checking deploy status every few seconds…');
    if (this.publishStale()) {
      parts.push('Deploy is taking longer than expected. You can retry publish.');
    }
    return parts.join(' ');
  });

  readonly lastSavedLabel = computed(() => {
    const updatedAt = this.buildBook.draft()?.updatedAt;
    if (!updatedAt) return this.buildBook.dirty() ? 'Unsaved' : 'Not saved';
    if (this.buildBook.dirty()) return 'Unsaved';
    return `Saved ${this.formatRelativeTime(updatedAt)}`;
  });

  readonly publishStatus = computed(
    () => this.strategy.site()?.publishStatus ?? ('draft' as ProtopipePublishStatus),
  );

  readonly liveSiteUrl = computed(() => this.strategy.site()?.previewBaseUrl ?? null);

  readonly canViewRunbook = computed(() => {
    const siteId = this.strategy.siteId();
    const plan = this.contentPlan.plan();
    return Boolean(this.thinkerView && siteId && plan?.id && plan.siteId === siteId);
  });

  readonly contentPlanPlan = computed(() => {
    const siteId = this.strategy.siteId();
    const plan = this.contentPlan.plan();
    if (!siteId || !plan || plan.siteId !== siteId) return null;
    return plan;
  });

  readonly calendarVm = computed(() => {
    const plan = this.contentPlanPlan();
    if (!plan) return null;
    return mapStrategyBinderView(plan, this.siteLabel(), '');
  });

  readonly calendarItems = computed(() => this.calendarVm()?.calendar ?? []);

  readonly calendarDeck = computed(() => this.calendarVm()?.calendarDeck ?? '');

  readonly selectedCalendarKey = computed(() => {
    const article = this.strategyView?.selectedArticle() ?? null;
    return article ? calendarItemKey(article) : null;
  });

  /** Plan-item key → contentPostId from Build Book blog pages. */
  readonly blogPagePostLinks = computed(() => {
    const links: Record<string, string> = {};
    for (const page of this.buildBook.blogPosts()) {
      const key = page.contentPlanItemKey?.trim();
      const postId = page.contentPostId?.trim();
      if (key && postId) links[key] = postId;
    }
    return links;
  });

  readonly calendarNextActions = computed(() =>
    buildCalendarNextActionMap(
      this.contentPlanPlan(),
      this.content.posts(),
      this.blogPagePostLinks(),
    ),
  );

  readonly siteSlug = computed(() => this.strategy.site()?.clientSitesSlug ?? null);

  readonly isBaselineMode = computed(() => isBaselineHomepage(this.buildBook.pages()));

  readonly baselineBlocks = computed(() => this.buildBook.homepageBlocks());

  readonly baselineVariantLabel = computed(() => {
    const hero = this.baselineBlocks()[0];
    return hero ? baselineVariantLabel(hero.props) : null;
  });

  readonly activeBlock = computed(() => {
    const id = this.activeBlockId();
    const blocks = this.pageStackBlocks();
    if (!id) return blocks[0] ?? null;
    return blocks.find((block) => block.id === id) ?? null;
  });

  readonly activeBlockDefinition = computed(() => {
    const block = this.activeBlock();
    return block ? findBuildBookBlockDefinition(block.blockId) : null;
  });

  readonly activeHrefFields = computed(() => {
    if (this.isBaselineMode()) {
      const block = this.activeBlock();
      const def = this.activeBlockDefinition();
      if (!block || !def) return [];
      return hrefFieldsFromProps(block.props, def.editableFields);
    }

    const props = this.buildBook.sectionProps(this.section());
    const optionId = this.selectedId(this.section());
    const option = optionId ? findBuildBookOption(this.section(), optionId) : undefined;
    const defaults = option ? findBuildBookBlockDefinition(option.id) : undefined;
    if (!props || !defaults) return [];
    return hrefFieldsFromProps(props, defaults.editableFields);
  });

  readonly activeAltFields = computed(() => {
    if (!this.isBaselineMode()) return [];
    const block = this.activeBlock();
    const def = this.activeBlockDefinition();
    if (!block || !def) return [];
    return altFieldsFromProps(block.props, def.editableFields);
  });

  readonly activeContentFields = computed(() => {
    if (this.isBaselineMode()) {
      const block = this.activeBlock();
      const def = this.activeBlockDefinition();
      if (!block || !def) return [];
      return contentFieldsFromEditablePaths(block.props, def.editableFields);
    }

    const props = this.buildBook.sectionProps(this.section());
    const optionId = this.selectedId(this.section());
    const option = optionId ? findBuildBookOption(this.section(), optionId) : undefined;
    const defaults = option ? findBuildBookBlockDefinition(option.id) : undefined;
    if (!props || !defaults) return [];
    return contentFieldsFromEditablePaths(props, defaults.editableFields);
  });

  readonly activeImageEditUrl = computed(() => {
    const pending = this.pendingImageEdit();
    if (pending) {
      const props = this.buildBook.blockProps(pending.blockInstanceId);
      if (!props) return null;
      const url = readProp(props, pending.propPath);
      return typeof url === 'string' ? url : null;
    }
    return this.activeHeroImageUrl();
  });

  readonly imageEditHint = computed(() => {
    const pending = this.pendingImageEdit();
    if (!pending) return 'Choose or generate a hero image for the live preview.';
    if (pending.propPath === 'imageSrc') return 'Choose or generate a featured well photo.';
    if (pending.propPath === 'paintingImageSrc') return 'Choose or generate a painting photo.';
    if (pending.propPath === 'insetImageSrc') return 'Choose or generate an inset painting photo.';
    if (pending.propPath === 'leftImageSrc' || pending.propPath === 'rightImageSrc') {
      return 'Choose or generate a hero photo.';
    }
    if (pending.propPath === 'textureImageSrc') return 'Choose or generate a texture photo.';
    if (pending.propPath.startsWith('capabilities.')) return 'Choose a capability card photo.';
    if (pending.propPath.startsWith('gallery.')) return 'Choose a gallery photo.';
    if (pending.propPath.startsWith('salonPanels.')) return 'Choose a salon wall photo.';
    if (pending.propPath.startsWith('processSteps.')) return 'Choose a process step photo.';
    return 'Choose or generate a hero background image.';
  });

  readonly activeMediaSlots = computed(() => {
    const block = this.activeBlock();
    if (!block) return [];
    return resolveMediaSlotsForBlock(block.blockId, block.props);
  });

  readonly activeMediaSlotPropPath = computed(
    () => this.pendingImageEdit()?.propPath ?? null,
  );

  readonly imagePickerTitle = computed(() => {
    const pending = this.pendingImageEdit();
    if (pending?.propPath === 'imageSrc') return 'Choose featured well photo';
    if (pending?.propPath === 'backgroundImageSrc') return 'Choose hero background';
    if (pending?.propPath === 'paintingImageSrc') return 'Choose painting photo';
    if (pending?.propPath === 'insetImageSrc') return 'Choose inset painting';
    if (pending?.propPath === 'leftImageSrc') return 'Choose left photo';
    if (pending?.propPath === 'rightImageSrc') return 'Choose right photo';
    if (pending?.propPath === 'textureImageSrc') return 'Choose texture photo';
    if (pending?.propPath.startsWith('capabilities.')) return 'Choose capability photo';
    if (pending?.propPath.startsWith('gallery.')) return 'Choose gallery photo';
    if (pending?.propPath.startsWith('salonPanels.')) return 'Choose salon panel photo';
    if (pending?.propPath.startsWith('processSteps.')) return 'Choose process step photo';
    return 'Choose an image';
  });

  readonly starterTemplates = BUILD_BOOK_TEMPLATE_DEFINITIONS;
  readonly blogArticleTemplates = BLOG_ARTICLE_TEMPLATE_CATALOG;

  readonly activeProspectContext = computed(
    () => this.prospectContext() ?? this.buildBook.prospectContext(),
  );

  readonly title = computed(() => {
    const prospect = this.activeProspectContext();
    return prospect ? `Build demo for ${prospect.name}` : 'Build book';
  });

  readonly deck = computed(() => {
    const prospect = this.activeProspectContext();
    if (!prospect) {
      return 'Shire-ready site design workspace — start from a template, refine blocks, and prepare the homepage stack.';
    }
    const area = prospect.area ? ` in ${prospect.area}` : '';
    return `Create a tailored demo page for this ${prospect.category ?? 'business'}${area}, using template structure now and Shire build-book state later.`;
  });

  readonly contextSignal = computed(() => {
    const prospect = this.activeProspectContext();
    if (!prospect) return this.siteLabel();
    return prospect.topSignal ?? this.websiteStatusLabel(prospect.websiteStatus);
  });

  readonly selectedTemplateId = computed(() => this.buildBook.selectedTemplateId());
  readonly selectedTemplate = computed(() =>
    this.starterTemplates.find((template) => template.id === this.selectedTemplateId()) ?? null,
  );
  readonly selectedTemplatePreviewUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.blockAssemblyPreviewUrl() ?? this.selectedTemplate()?.previewUrl;
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });
  readonly heroSection = computed(() => {
    const draft = this.buildBook.draft();
    if (!draft) return null;
    return findDraftSectionForSlot(draft, 'hero');
  });
  readonly heroCopy = computed(() => {
    const props = this.heroSection()?.props;
    return props ? readHeroCopy(props) : DEFAULT_HERO_PREVIEW_COPY;
  });
  readonly activeHeroImageUrl = computed(() => {
    if (this.isBaselineMode()) {
      const block =
        this.activeBlock()?.section === 'hero'
          ? this.activeBlock()
          : this.baselineBlocks().find((item) => item.section === 'hero');
      if (block) {
        const layoutId = resolveBaselineHeroLayoutId(block.blockId, block.props);
        const fromProps = readHeroImageUrl(block.props, layoutId);
        if (fromProps) return fromProps;

        return (
          findBuildBookOption('hero', layoutId)?.previewImage ??
          heroPreviewImageForLayout(layoutId)
        );
      }
    }

    const layoutId = resolveHeroPreviewLayoutId(this.selectedId('hero'), this.heroSection());
    const props = this.heroSection()?.props;
    if (props) {
      const fromProps = readHeroImageUrl(props, layoutId);
      if (fromProps) return fromProps;
    }

    return findBuildBookOption('hero', layoutId)?.previewImage ?? heroPreviewImageForLayout(layoutId);
  });

  readonly baselineHeroPhotoDrifted = computed(() => {
    const block = this.activeBlock();
    if (!this.isBaselineMode() || block?.section !== 'hero') return false;

    const def = findBuildBookBlockDefinition(block.blockId);
    if (!def) return false;

    const layoutId = resolveBaselineHeroLayoutId(block.blockId, block.props);
    const current = readHeroImageUrl(block.props, layoutId);
    const template = readHeroImageUrl(def.defaultProps, layoutId);
    if (!current || !template) return false;
    return current !== template;
  });
  readonly activeHeroImageCss = computed(() => {
    const url = this.activeHeroImageUrl();
    return url ? `url(${JSON.stringify(url)})` : null;
  });
  readonly heroPreviewImageUrl = computed(
    () => this.activeHeroImageUrl() ?? HERO_PREVIEW_PLACEHOLDER_IMAGE,
  );
  readonly blockAssemblyCount = computed(
    () => this.buildBook.pages().find((page) => page.kind === 'homepage')?.blocks.length ?? 0,
  );
  readonly pageSectionStates = computed((): BuildPageSectionState[] => {
    const draft = this.buildBook.draft();
    return BUILD_BOOK_SECTION_ORDER.map((section) => {
      const optionId = this.selectedId(section);
      const option = optionId ? findBuildBookOption(section, optionId) : undefined;
      const draftSection = draft ? findDraftSectionForSlot(draft, section) : null;
      return {
        section,
        blockId: optionId,
        layout: option?.layout ?? 'grid',
        props: structuredClone(draftSection?.props ?? {}),
        configured: Boolean(optionId && draftSection),
      };
    });
  });

  readonly pageBlockStates = computed((): BuildPageBlockState[] => {
    const articlePreview =
      this.bookTab() === 'content-posts' && this.contentPostsCanvasMode() === 'article-preview';
    const stack = this.pageStackBlocks();
    const linkedTemplate = articlePreview ? this.linkedContentPostTemplate() : null;
    const filledPropsById = linkedTemplate
      ? new Map(
          fillBlogPostBlockProps(
            stack,
            fillSourceFromProtopipeTemplate(linkedTemplate, {
              kicker: this.activeBlogPostKeyword(),
            }),
          ).map((block) => [block.id, block.props] as const),
        )
      : null;

    const states: BuildPageBlockState[] = stack.map((block) => {
      const patternId = block.patternId ?? resolvePatternIdForBlock(block.blockId);
      let props: Record<string, unknown>;
      if (filledPropsById) {
        props = structuredClone(filledPropsById.get(block.id) ?? block.props);
      } else if (articlePreview) {
        props = articlePreviewPropsForPattern(patternId, structuredClone(block.props));
      } else {
        props = structuredClone(block.props);
      }
      return {
        id: block.id,
        blockId: block.blockId,
        section: block.section,
        label: block.label ?? block.blockId,
        layout: findBuildBookBlockDefinition(block.blockId)?.layout ?? 'grid',
        props,
        configured: true,
        pendingPreview: false,
      };
    });

    const pending = this.pendingAdd();
    if (!pending || articlePreview) return states;

    const ghost = this.buildPendingGhostState(pending);
    const insertAt = Math.min(Math.max(0, pending.insertAt), states.length);
    return [...states.slice(0, insertAt), ghost, ...states.slice(insertAt)];
  });

  private linkedContentPostTemplate(): ProtopipeContentPost['template'] | null {
    const pageId = this.blogPostId();
    if (!pageId) return null;
    const page = this.buildBook.blogPosts().find((item) => item.id === pageId);
    const postId = page?.contentPostId;
    if (!postId) return null;
    const post = this.content.postById(postId);
    const template = post?.template;
    if (!template) return null;
    const hasBody =
      Boolean(template.intro?.trim()) ||
      (template.sections?.length ?? 0) > 0 ||
      (template.blocks?.length ?? 0) > 0;
    return hasBody ? template : null;
  }

  private activeBlogPostKeyword(): string | undefined {
    const pageId = this.blogPostId();
    if (!pageId) return undefined;
    return this.buildBook.blogPosts().find((item) => item.id === pageId)?.suggestedKeyword;
  }

  readonly canvasEditable = computed(
    () =>
      !(
        this.bookTab() === 'content-posts' && this.contentPostsCanvasMode() === 'article-preview'
      ),
  );

  readonly pendingLayoutVariants = computed(() => {
    const pending = this.pendingAdd();
    if (!pending || pending.patternId === 'hero') return [];
    return variantsForPattern(
      pending.patternId,
      this.activePageKind(),
      this.selectedTemplateId(),
      this.addCatalogFilter(),
    );
  });

  ngOnInit(): void {
    void this.init();
  }

  ngOnDestroy(): void {
    this.stopPublishPolling();
  }

  private async init(): Promise<void> {
    await this.strategy.ensureLoaded();
    await this.buildBook.load();
    this.entryMode.set(this.buildBook.entryMode());
    const prospect = this.prospectContext();
    if (prospect) this.buildBook.setProspectContext(prospect);
    const draft = this.buildBook.draft();
    if (draft) {
      this.syncHeroPreviewIndexFromDraft(draft);
      this.syncDemoBrandFromDraft(draft);
    }
    const site = this.strategy.site();
    if (site?.displayName && draft) {
      this.buildBook.seedHeroEyebrow(site.displayName);
    }
    this.restoreWorkflowFromUrl();
    if (this.isBaselineMode()) {
      const first = this.baselineBlocks()[0];
      if (first && !this.activeBlockId()) {
        this.activeBlockId.set(first.id);
        this.section.set(first.section);
      }
    }
    if (this.publishStatus() === 'provisioning') {
      this.publishStartedAt.set(Date.now());
      this.publishProgressMessage.set(
        'Deploying your site to Cloudflare Pages. This usually takes a few minutes.',
      );
      this.startPublishPolling();
    }
  }

  private syncHeroPreviewIndexFromDraft(
    draft: NonNullable<ReturnType<typeof this.buildBook.draft>>,
  ): void {
    const heroSection = findDraftSectionForSlot(draft, 'hero');
    const layoutId = resolveHeroPreviewLayoutId(this.selectedId('hero'), heroSection);
    const idx = BUILD_DEMO_HERO_VARIANTS.findIndex((h) => h.id === layoutId);
    if (idx >= 0) this.heroPreviewIndex.set(idx);
  }

  private syncDemoBrandFromDraft(
    draft: NonNullable<ReturnType<typeof this.buildBook.draft>>,
  ): void {
    const heroSection = findDraftSectionForSlot(draft, 'hero');
    const labBrand = heroSection?.props['labBrand'];
    if (labBrand === 'sparky' || labBrand === 'wri' || labBrand === 'consult' || labBrand === 'veil') {
      this.demoBrand.set(labBrand);
      return;
    }

    const optionId = this.selectedId('hero');
    const option = optionId ? findBuildBookOption('hero', optionId) : undefined;
    if (option?.demo?.brand) {
      this.demoBrand.set(option.demo.brand);
    }
  }

  selectSection(id: BuildBookSection): void {
    if (this.isBaselineMode()) {
      const block = this.baselineBlocks().find((item) => item.section === id);
      if (block) {
        this.selectBlock(block.id);
        return;
      }
    }
    // Homepage section nav only — keep landing/blog/content page editors on their tab.
    if (!this.usesPageBuilderRail()) {
      this.bookTab.set('homepage');
    }
    this.section.set(id);
    this.scrollToSection.set(id);
    this.syncWorkflowToUrl();
    if (isBuildBookDemoSection(id)) {
      this.syncDemoBrandForSection(id);
    }
    this.openPreview();
  }

  selectBlock(blockInstanceId: string): void {
    const block = this.pageStackBlocks().find((item) => item.id === blockInstanceId);
    if (!block) return;
    // Page-builder tabs (landing / blog-home / content-posts) must stay put when
    // selecting or inserting a block — previously blog-home bounced to homepage.
    if (!this.usesPageBuilderRail()) {
      this.bookTab.set('homepage');
    }
    this.activeBlockId.set(block.id);
    this.section.set(block.section);
    this.scrollToBlockId.set(block.id);
    this.syncWorkflowToUrl();
    this.openPreview();
  }

  toggleCanvasViewMode(): void {
    this.canvasViewMode.update((mode) => (mode === 'full' ? 'focus' : 'full'));
  }

  private syncDemoBrandForSection(section: BuildBookSection): void {
    const optionId = this.selectedId(section);
    const option = optionId ? findBuildBookOption(section, optionId) : undefined;
    if (option?.demo?.brand) {
      this.demoBrand.set(option.demo.brand);
      return;
    }

    const props = this.buildBook.sectionProps(section);
    const labBrand = props?.['labBrand'];
    if (labBrand === 'sparky' || labBrand === 'wri' || labBrand === 'consult' || labBrand === 'veil') {
      this.demoBrand.set(labBrand);
      return;
    }

    const brands = brandsForDemoSection(section);
    if (!brands.includes(this.demoBrand())) {
      this.demoBrand.set(brands[0] ?? 'sparky');
    }
  }

  togglePreview(): void {
    this.previewOpen.update((open) => !open);
  }

  openPreview(): void {
    this.previewOpen.set(true);
  }

  closePreview(): void {
    this.previewOpen.set(false);
  }

  setEntryMode(mode: BuildBookEntryMode): void {
    this.entryMode.set(mode);
    this.buildBook.setEntryMode(mode);
  }

  openSeoStrategyTab(): void {
    this.selectBookTab('seo-strategy');
  }

  selectBookTab(tab: BuildBookTab): void {
    if (
      tab !== 'homepage' &&
      tab !== 'landing-pages' &&
      tab !== 'blog-home' &&
      tab !== 'content-posts'
    ) {
      this.clearPendingAdd();
      this.pageBuilderRail()?.dismissAddView();
    }
    this.bookTab.set(tab);
    if (tab === 'homepage' && this.buildBook.hasDraft()) {
      this.openPreview();
    } else if (tab === 'landing-pages' && this.landingPageId()) {
      this.openPreview();
    } else if (tab === 'blog-home' && this.buildBook.hasDraft()) {
      const page = this.buildBook.ensureBlogHomePage();
      const first = this.buildBook.blocksForPage(page.id)[0];
      if (first) {
        this.activeBlockId.set(first.id);
        this.section.set(first.section);
      }
      this.openPreview();
    } else if (tab === 'content-posts' && this.blogPostId()) {
      this.openPreview();
    } else if (tab === 'content-posts' && this.buildBook.hasDraft()) {
      const existing = this.buildBook.blogPosts()[0];
      if (existing) {
        this.blogPostId.set(existing.id);
      } else {
        const page = this.buildBook.createBlogPostPage('Default blog template');
        if (page) this.blogPostId.set(page.id);
      }
      if (this.blogPostId()) {
        const first = this.buildBook.blocksForPage(this.blogPostId()!)[0];
        if (first) {
          this.activeBlockId.set(first.id);
          this.section.set(first.section);
        }
        this.openPreview();
      }
    } else if (tab === 'seo-strategy' && this.buildBook.hasDraft()) {
      this.closePreview();
    } else if (
      tab !== 'homepage' &&
      tab !== 'landing-pages' &&
      tab !== 'blog-home' &&
      tab !== 'content-posts'
    ) {
      this.closePreview();
    }
    if (tab === 'sites') {
      void this.strategy.refreshSitesList().catch(() => undefined);
    }
    if (tab === 'strategy' || tab === 'content-posts' || tab === 'calendar') {
      const siteId = this.strategy.siteId();
      if (siteId) {
        this.contentPlan.setSiteId(siteId);
        void this.contentPlan.loadLatest();
      }
      if (tab === 'calendar') {
        this.content.ensureCatalogLoaded();
        this.content.reload();
        void this.contentPlan.loadLatest();
      }
    }
    this.syncWorkflowToUrl();
  }

  /** Keyword discovery confirm → Strategy so the content-plan thinker run is visible. */
  onResearchConfirmed(): void {
    const siteId = this.strategy.siteId();
    if (siteId) {
      this.contentPlan.setSiteId(siteId);
      void this.contentPlan.loadLatest();
    }
    this.selectBookTab('strategy');
  }

  onCalendarSelect(item: ProtopipeContentPlanCalendarItem): void {
    this.strategyView?.selectArticle(item);
  }

  onCalendarAction(item: ProtopipeContentPlanCalendarItem): void {
    if (!this.strategyView) return;
    const key = calendarItemKey(item);
    const next = this.calendarNextActions()[key];
    if (next && (next.stage === 'review' || next.stage === 'published') && next.postId) {
      this.strategyView.reviewOnBlog(
        next.postId,
        item.workingTitle || item.editorialTitle || next.post?.title,
      );
      return;
    }
    void this.strategyView.openInWriter(item);
  }

  async onEditSiteFromList(siteId: string): Promise<void> {
    if (!siteId) return;
    if (this.strategy.siteId() === siteId) {
      await this.buildBook.ensureHostedSiteBaseline();
      this.selectBookTab(this.buildBook.hasDraft() ? 'homepage' : 'templates');
      return;
    }

    if (this.buildBook.dirty()) {
      const proceed = window.confirm(
        'You have unsaved Build Book changes on the current site. Switch anyway and discard them?',
      );
      if (!proceed) return;
    }

    this.switchingSite.set(true);
    this.switchingSiteId.set(siteId);
    try {
      const ok = await this.strategy.selectSite(siteId);
      if (!ok) return;
      this.landingPageId.set(null);
      this.blogPostId.set(null);
      this.contentPostsCanvasMode.set('profile');
      this.activeBlockId.set(null);
      this.clearPendingAdd();
      await this.buildBook.load();
      this.entryMode.set(this.buildBook.entryMode());
      const draft = this.buildBook.draft();
      if (draft) {
        this.syncHeroPreviewIndexFromDraft(draft);
        this.syncDemoBrandFromDraft(draft);
      }
      this.selectBookTab(this.buildBook.hasDraft() ? 'homepage' : 'templates');
    } finally {
      this.switchingSite.set(false);
      this.switchingSiteId.set(null);
    }
  }

  onOpenLiveSite(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  onLandingPageSelected(pageId: string | null): void {
    this.clearPendingAdd();
    this.pageBuilderRail()?.dismissAddView();
    this.landingPageId.set(pageId);
    if (pageId) {
      const first = this.buildBook.blocksForPage(pageId)[0];
      if (first) {
        this.activeBlockId.set(first.id);
        this.section.set(first.section);
      } else {
        this.activeBlockId.set(null);
      }
      this.openPreview();
    }
    this.syncWorkflowToUrl();
  }

  onBlogPostSelected(pageId: string | null): void {
    this.clearPendingAdd();
    this.pageBuilderRail()?.dismissAddView();
    this.blogPostId.set(pageId);
    this.contentPostsCanvasMode.set('profile');
    if (pageId) {
      const first = this.buildBook.blocksForPage(pageId)[0];
      if (first) {
        this.activeBlockId.set(first.id);
        this.section.set(first.section);
      } else {
        this.activeBlockId.set(null);
      }
      this.openPreview();
    }
    this.syncWorkflowToUrl();
  }

  onBlogProfileReset(pageId: string): void {
    this.articleFillApplied.delete(pageId);
    const first = this.buildBook.blocksForPage(pageId)[0];
    if (first) {
      this.activeBlockId.set(first.id);
      this.section.set(first.section);
    }
  }

  setContentPostsCanvasMode(mode: ContentPostsCanvasMode): void {
    this.contentPostsCanvasMode.set(mode);
    if (mode === 'article-preview') {
      this.clearPendingAdd();
      this.pageBuilderRail()?.dismissAddView();
    }
  }

  /** Deep-link / Thinker handoff: Content Posts → clone profile stack → Article preview. */
  openArticlePreviewForContentPost(contentPostId: string, title?: string): void {
    if (!this.buildBook.hasDraft()) return;
    void this.buildBook.ensureBlogTemplateProfiles();

    const post = this.content.postById(contentPostId);
    const profileId = post?.blogTemplateProfileId?.trim() || undefined;
    const label = title?.trim() || post?.title?.trim() || 'Blog post';
    const page = profileId
      ? this.buildBook.cloneTemplateProfileOntoArticlePage(profileId, contentPostId, label)
      : this.buildBook.ensureBlogPostForContentPost(contentPostId, label);
    if (!page) return;

    // Force fill effect to re-apply after cloning a different stack.
    this.articleFillApplied.delete(page.id);

    this.clearPendingAdd();
    this.pageBuilderRail()?.dismissAddView();
    this.bookTab.set('content-posts');
    this.blogPostId.set(page.id);
    this.contentPostsCanvasMode.set('article-preview');
    const first = this.buildBook.blocksForPage(page.id)[0];
    if (first) {
      this.activeBlockId.set(first.id);
      this.section.set(first.section);
    } else {
      this.activeBlockId.set(null);
    }
    this.openPreview();
    this.syncWorkflowToUrl();
  }

  activePageLabel(): string {
    if (this.bookTab() === 'landing-pages') {
      const page = this.buildBook.landingPages().find((item) => item.id === this.landingPageId());
      return page?.label ?? 'Landing page';
    }
    if (this.bookTab() === 'blog-home') {
      return this.buildBook.blogHomePage()?.label ?? 'Blog';
    }
    if (this.bookTab() === 'content-posts') {
      const page = this.buildBook.blogPosts().find((item) => item.id === this.blogPostId());
      return page?.label ?? 'Blog template';
    }
    return 'Homepage';
  }

  onPageBlockReorder(event: { fromIndex: number; toIndex: number }): void {
    const pageId = this.activePageId();
    if (!pageId) return;
    this.buildBook.reorderPageBlocks(pageId, event.fromIndex, event.toIndex);
  }

  onInsertPageBlock(event: { blockId: string; insertAt?: number }): void {
    const pageId = this.activePageId();
    if (!pageId) return;
    const blocks = this.pageStackBlocks();
    const activeIndex = blocks.findIndex((block) => block.id === this.activeBlockId());
    const insertAt =
      event.insertAt ??
      (activeIndex >= 0 ? activeIndex + 1 : blocks.length);
    this.buildBook.addPageBlock(pageId, event.blockId, insertAt);
    const updated = this.buildBook.blocksForPage(pageId);
    const added = updated[Math.min(insertAt, updated.length - 1)];
    if (added) this.selectBlock(added.id);
  }

  onRemovePageBlock(blockInstanceId: string): void {
    const pageId = this.activePageId();
    if (!pageId) return;
    this.buildBook.removePageBlock(pageId, blockInstanceId);
    if (this.activeBlockId() === blockInstanceId) {
      const first = this.pageStackBlocks()[0];
      if (first) this.selectBlock(first.id);
    }
  }

  onAddCatalogFilterChange(filter: AddBlockCatalogFilter): void {
    this.addCatalogFilter.set(filter);
  }

  onPendingPatternSelected(event: BuildBookPatternSelectedEvent): void {
    const variants = variantsForPattern(
      event.patternId,
      this.activePageKind(),
      this.selectedTemplateId(),
      this.addCatalogFilter(),
    );
    this.pendingAdd.set({
      patternId: event.patternId,
      insertAt: event.insertAt,
      previewBlockId: variants.length === 1 ? variants[0]?.id : undefined,
    });
    this.openPreview();
    this.selectInspectorTab('layout');
    this.scrollToBlockId.set(BUILD_BOOK_PENDING_ADD_BLOCK_ID);
  }

  clearPendingAdd(): void {
    this.pendingAdd.set(null);
    if (this.scrollToBlockId() === BUILD_BOOK_PENDING_ADD_BLOCK_ID) {
      this.scrollToBlockId.set(null);
    }
  }

  commitPendingAdd(blockId: string): void {
    const pending = this.pendingAdd();
    const pageId = this.activePageId();
    if (!pending || !pageId) return;

    this.buildBook.addPageBlock(pageId, blockId, pending.insertAt);
    const updated = this.buildBook.blocksForPage(pageId);
    const added = updated[Math.min(pending.insertAt, updated.length - 1)];
    this.clearPendingAdd();
    this.pageBuilderRail()?.dismissAddView();
    if (added) this.selectBlock(added.id);
  }

  onPendingVariantSelect(blockId: string): void {
    this.commitPendingAdd(blockId);
  }

  onPendingVariantPreview(blockId: string): void {
    const pending = this.pendingAdd();
    if (!pending) return;
    this.pendingAdd.set({ ...pending, previewBlockId: blockId });
  }

  onPendingHeroLayoutPreview(optionId: string): void {
    const pending = this.pendingAdd();
    if (!pending || pending.patternId !== 'hero') return;
    const previewBlockId = resolveBlockIdForHeroLayoutOption(optionId);
    this.pendingAdd.set({
      ...pending,
      previewOptionId: optionId,
      previewBlockId: previewBlockId ?? undefined,
    });
  }

  pendingPatternLabel(): string {
    const pending = this.pendingAdd();
    return pending ? patternLabelForId(pending.patternId) : '';
  }

  private buildPendingGhostState(pending: BuildBookPendingAdd): BuildPageBlockState {
    const previewBlockId = pending.previewBlockId;
    const def = previewBlockId ? findBuildBookBlockDefinition(previewBlockId) : null;
    const section = def?.section ?? (pending.patternId === 'hero' ? 'hero' : 'fold');
    const ctx = this.siteDesignContext();
    const props =
      previewBlockId && ctx
        ? materializeBlockPropsForInsert(previewBlockId, ctx)
        : previewBlockId
          ? this.buildBook.materializeBlockPropsForPage(previewBlockId, this.activePageId())
          : {};

    return {
      id: BUILD_BOOK_PENDING_ADD_BLOCK_ID,
      blockId: previewBlockId ?? def?.id ?? pending.patternId,
      section,
      label: patternLabelForId(pending.patternId),
      layout: def?.layout ?? 'grid',
      props,
      configured: Boolean(previewBlockId),
      pendingPreview: true,
    };
  }

  blockIntentLabels(blockId: string): string[] {
    const intents = enrichedBlockDefinition(blockId)?.intents ?? [];
    return intents.map((intent: BuildBookBlockIntent) => intentDisplayLabel(intent));
  }

  onHeroCopyChange(copy: BuildHeroPreviewCopy): void {
    if (!this.buildBook.draft()) return;
    if (this.isBaselineMode()) {
      const block = this.activeBlock();
      if (block?.section === 'hero') {
        this.buildBook.updateBlockProps(block.id, heroCopyToProps(copy));
        return;
      }
    }
    this.buildBook.updateHeroCopy(copy);
  }

  onCanvasSectionClick(section: BuildBookSection): void {
    if (this.isBaselineMode()) return;
    if (this.section() === section) return;
    this.section.set(section);
    this.syncWorkflowToUrl();
  }

  onCanvasBlockClick(blockInstanceId: string): void {
    if (blockInstanceId === BUILD_BOOK_PENDING_ADD_BLOCK_ID) return;
    if (this.activeBlockId() === blockInstanceId) return;
    this.selectBlock(blockInstanceId);
  }

  onCanvasBlockPropPathChange(event: { blockId: string; path: string; value: unknown }): void {
    this.buildBook.updateBlockPropPath(event.blockId, event.path, event.value);
  }

  onCanvasBlockPropsChange(event: { blockId: string; props: Record<string, unknown> }): void {
    this.buildBook.setBlockProps(event.blockId, event.props);
  }

  onCanvasPropsChange(event: { section: BuildBookSection; props: Record<string, unknown> }): void {
    this.buildBook.setSectionProps(event.section, event.props);
  }

  onCanvasPropPathChange(event: { section: BuildBookSection; path: string; value: unknown }): void {
    this.buildBook.updateSectionPropPath(event.section, event.path, event.value);
  }

  onCanvasImageEdit(event: BuildPageImageEditEvent = {}): void {
    if (this.isBaselineMode() && event.blockId && event.propPath) {
      this.pendingImageEdit.set({ blockInstanceId: event.blockId, propPath: event.propPath });
      this.selectInspectorTab('media');
      this.imagePickerOpen.set(true);
      return;
    }

    const heroBlockId = this.activeBlock()?.blockId;
    if (
      this.isBaselineMode() &&
      (heroBlockId === 'wri-baseline-hero-life-proof' ||
        heroBlockId === 'sparky-baseline-hero-callout' ||
        heroBlockId === 'wilco-baseline-hero-split' ||
        heroBlockId === 'hil-baseline-hero-canopy')
    ) {
      const block = this.activeBlock();
      if (block) {
        this.pendingImageEdit.set({ blockInstanceId: block.id, propPath: 'backgroundImageSrc' });
        this.imagePickerOpen.set(true);
        return;
      }
    }

    this.pendingImageEdit.set(null);
    this.selectInspectorTab('media');
  }

  onMediaSlotSelect(propPath: string): void {
    const block = this.activeBlock();
    if (!block) return;
    this.pendingImageEdit.set({ blockInstanceId: block.id, propPath });
    this.inspectorTab.set('media');
    this.previewOpen.set(true);
  }

  closeImagePicker(): void {
    this.imagePickerOpen.set(false);
    this.pendingImageEdit.set(null);
  }

  async onImagePickerSelect(url: string): Promise<void> {
    this.imagePickerOpen.set(false);
    await this.onHeroImageSelected(url);
  }

  onImagePickerOpenLibrary(): void {
    this.imagePickerOpen.set(false);
    this.selectInspectorTab('media');
  }

  updateActiveHref(key: string, value: string): void {
    if (this.isBaselineMode()) {
      const block = this.activeBlock();
      if (!block) return;
      if (key.includes('.')) {
        this.buildBook.updateBlockPropPath(block.id, key, value);
        return;
      }
      this.buildBook.updateBlockProps(block.id, { [key]: value });
      return;
    }
    this.buildBook.updateSectionProps(this.section(), { [key]: value });
  }

  updateActiveAlt(key: string, value: string): void {
    const block = this.activeBlock();
    if (!block) return;
    this.buildBook.updateBlockPropPath(block.id, key, value);
  }

  updateActiveContent(key: string, value: string): void {
    if (this.isBaselineMode()) {
      const block = this.activeBlock();
      if (!block) return;
      if (key.includes('.')) {
        this.buildBook.updateBlockPropPath(block.id, key, value);
        return;
      }
      this.buildBook.updateBlockProps(block.id, { [key]: value });
      return;
    }

    if (key.includes('.')) {
      this.buildBook.updateSectionPropPath(this.section(), key, value);
      return;
    }
    this.buildBook.updateSectionProps(this.section(), { [key]: value });
  }

  altPanelVisible(): boolean {
    return this.activeAltFields().length > 0;
  }

  hrefPanelVisible(): boolean {
    return this.activeHrefFields().length > 0;
  }

  contentPanelVisible(): boolean {
    return this.activeContentFields().length > 0;
  }

  addSectionStat(): void {
    const props = this.buildBook.sectionProps(this.section());
    const stats = Array.isArray(props?.['stats']) ? [...(props!['stats'] as unknown[])] : [];
    stats.push({ value: 'New stat', label: 'Label' });
    this.buildBook.updateSectionArray(this.section(), 'stats', stats);
  }

  addSectionListItem(key: 'items' | 'services' | 'testimonials'): void {
    const section = this.section();
    const props = this.buildBook.sectionProps(section);
    const arrayKey =
      section === 'areas'
        ? Array.isArray(props?.['items'])
          ? 'items'
          : 'steps'
        : key;
    const items = Array.isArray(props?.[arrayKey]) ? [...(props![arrayKey] as unknown[])] : [];
    if (arrayKey === 'services' || arrayKey === 'steps') {
      items.push(typeof items[0] === 'string' ? 'New service' : { title: 'New service', body: 'Description' });
    } else if (arrayKey === 'testimonials') {
      items.push({ quote: 'New review', name: 'Customer', role: 'Client' });
    } else {
      items.push({ question: 'New question', answer: 'Answer' });
    }
    this.buildBook.updateSectionArray(section, arrayKey, items);
  }

  structuralPanelVisible(): boolean {
    if (this.isBaselineMode()) {
      const blockId = this.activeBlock()?.blockId;
      return (
        blockId === 'wri-baseline-contract-bar' ||
        blockId === 'wri-baseline-capabilities-grid' ||
        blockId === 'wri-baseline-life-proof-split' ||
        blockId === 'wri-baseline-project-lifecycle' ||
        blockId === 'wri-baseline-regulatory-trust' ||
        blockId === 'wri-baseline-featured-well' ||
        blockId === 'wri-baseline-sidebar-facts' ||
        blockId === 'wri-baseline-island-coverage' ||
        blockId === 'wri-baseline-rig-gallery-cta'
      );
    }
    const section = this.section();
    if (section === 'fold') return true;
    if (section === 'services') return true;
    if (section === 'proof') return this.selectedId('proof') === 'proof-reviews';
    if (section === 'areas') return true;
    return false;
  }

  baselineStructuralHint(): string {
    const pending = this.pendingAdd();
    if (pending) {
      return `Adding ${patternLabelForId(pending.patternId)} — pick a variant in the Layout tab to insert it on the page.`;
    }
    const block = this.activeBlock();
    if (!block) {
      return 'Select a block in the homepage stack, then click text on the canvas to edit copy inline.';
    }
    if (block.section === 'hero') {
      return 'Click headline, subhead, and button text on the canvas to edit. Use Layout for hero style and Media for photos.';
    }
    if (block.section === 'fold') {
      return 'Click text on the canvas to edit. Use Layout to swap fold patterns and Media for block photos.';
    }
    return `Editing ${block.label ?? block.blockId}. Click text on the canvas to edit copy. Use Links for CTA URLs and alt text.`;
  }

  selectInspectorTab(tab: BuildBookInspectorTab): void {
    this.inspectorTab.set(tab);
    this.openPreview();
  }

  onInspectorNavigate(tab: BuildBookInspectorTab): void {
    this.selectInspectorTab(tab);
  }

  inspectorLayoutTabVisible(): boolean {
    if (this.pendingAdd()) return true;
    if (this.isBaselineMode()) return this.baselineLayoutOptionsVisible();
    return this.heroPanelOptions().length > 0;
  }

  inspectorLinksTabVisible(): boolean {
    return this.hrefPanelVisible() || this.altPanelVisible();
  }

  addBaselineBlockStat(): void {
    const block = this.activeBlock();
    if (!block) return;
    const props = this.buildBook.blockProps(block.id);
    const stats = Array.isArray(props?.['stats']) ? [...(props!['stats'] as unknown[])] : [];
    stats.push({ value: 'New stat', label: 'Label' });
    this.buildBook.updateBlockProps(block.id, { stats });
  }

  addBaselineBullet(): void {
    const block = this.activeBlock();
    if (!block) return;
    const props = this.buildBook.blockProps(block.id);
    const bullets = Array.isArray(props?.['bullets']) ? [...(props!['bullets'] as string[])] : [];
    bullets.push('New bullet');
    this.buildBook.updateBlockProps(block.id, { bullets });
  }

  addBaselineCredential(): void {
    const block = this.activeBlock();
    if (!block) return;
    const props = this.buildBook.blockProps(block.id);
    const credentials = Array.isArray(props?.['credentials'])
      ? [...(props!['credentials'] as unknown[])]
      : [];
    credentials.push({ claim: 'New credential', proof: 'Supporting proof' });
    this.buildBook.updateBlockProps(block.id, { credentials });
  }

  addBaselineLifecycleStep(): void {
    const block = this.activeBlock();
    if (!block) return;
    const props = this.buildBook.blockProps(block.id);
    const steps = Array.isArray(props?.['steps']) ? [...(props!['steps'] as unknown[])] : [];
    steps.push({ step: String(steps.length + 1).padStart(2, '0'), title: 'New step', body: 'Description' });
    this.buildBook.updateBlockProps(block.id, { steps });
  }

  addBaselineCapability(): void {
    const block = this.activeBlock();
    if (!block) return;
    const props = this.buildBook.blockProps(block.id);
    const capabilities = Array.isArray(props?.['capabilities'])
      ? [...(props!['capabilities'] as unknown[])]
      : [];
    capabilities.push({
      title: 'New capability',
      body: 'Description',
      image: props?.['backgroundImageSrc'] ?? '',
      href: '#services',
    });
    this.buildBook.updateBlockProps(block.id, { capabilities });
  }

  addBaselineFeaturedMetric(): void {
    const block = this.activeBlock();
    if (!block) return;
    const props = this.buildBook.blockProps(block.id);
    const metrics = Array.isArray(props?.['metrics']) ? [...(props!['metrics'] as unknown[])] : [];
    metrics.push({ label: 'Metric', value: 'Value' });
    this.buildBook.updateBlockProps(block.id, { metrics });
  }

  addBaselineFact(): void {
    const block = this.activeBlock();
    if (!block) return;
    const props = this.buildBook.blockProps(block.id);
    const facts = Array.isArray(props?.['facts']) ? [...(props!['facts'] as unknown[])] : [];
    facts.push({ label: 'Fact', value: 'Detail' });
    this.buildBook.updateBlockProps(block.id, { facts });
  }

  addBaselineOffice(): void {
    const block = this.activeBlock();
    if (!block) return;
    const props = this.buildBook.blockProps(block.id);
    const offices = Array.isArray(props?.['offices']) ? [...(props!['offices'] as unknown[])] : [];
    offices.push({
      label: 'New office',
      address: 'Street address',
      city: 'City, HI',
      phone: '(808) 531-8422',
    });
    this.buildBook.updateBlockProps(block.id, { offices });
  }

  addBaselineIsland(): void {
    const block = this.activeBlock();
    if (!block) return;
    const props = this.buildBook.blockProps(block.id);
    const islands = Array.isArray(props?.['islands']) ? [...(props!['islands'] as string[])] : [];
    islands.push('New island');
    this.buildBook.updateBlockProps(block.id, { islands });
  }

  addBaselineGalleryItem(): void {
    const block = this.activeBlock();
    if (!block) return;
    const props = this.buildBook.blockProps(block.id);
    const gallery = Array.isArray(props?.['gallery']) ? [...(props!['gallery'] as unknown[])] : [];
    gallery.push({
      label: 'New project',
      image: props?.['backgroundImageSrc'] ?? '',
      location: 'Hawaii',
    });
    this.buildBook.updateBlockProps(block.id, { gallery });
  }

  blockNavLabel(blockId: string, instanceLabel?: string): string {
    return navDisplayLabel(blockId, instanceLabel);
  }

  blockNavSubtitle(blockId: string, instanceLabel?: string): string | null {
    return navDisplaySubtitle(blockId, instanceLabel);
  }

  variantBrandLabel(templateId: string | undefined): string {
    if (!templateId) return 'Universal';
    if (templateId.includes('sparky')) return 'Sparky';
    if (templateId.includes('wri')) return 'WRI';
    if (templateId.includes('wilco')) return 'Wilco';
    if (templateId.includes('veil')) return 'Veil';
    if (templateId.includes('blackstone')) return 'Blackstone';
    return 'Lab';
  }

  addBaselineBlockFromCatalog(blockId: string): void {
    this.onInsertPageBlock({ blockId });
  }

  removeBaselineBlock(blockInstanceId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.onRemovePageBlock(blockInstanceId);
  }

  isPinnedBaselineBlock(blockId: string): boolean {
    return (
      blockId === 'wri-baseline-hero-life-proof' ||
      blockId === 'wri-baseline-contract-bar' ||
      blockId === 'sparky-baseline-hero-callout' ||
      blockId === 'hil-baseline-hero-canopy'
    );
  }

  async onHeroImageSelected(url: string): Promise<void> {
    if (!this.buildBook.draft()) return;
    const pending = this.pendingImageEdit();
    if (pending) {
      this.buildBook.updateBlockPropPath(pending.blockInstanceId, pending.propPath, url);
      this.pendingImageEdit.set(null);
    } else {
      this.buildBook.updateHeroImage(url);
    }
    await this.save();
    this.openPreview();
  }

  onPreviewLayoutFromStudio(layoutId: string): void {
    const opt = findBuildBookOption('hero', layoutId);
    if (opt) void this.selectOption('hero', layoutId);
  }

  onPreviewBrandFromStudio(brand: BuildBookDemoBrand): void {
    this.demoBrand.set(brand);
  }

  onHeroPreviewBrandChange(brand: BuildBookDemoBrand): void {
    this.demoBrand.set(brand);
    const heroes = BUILD_DEMO_HERO_VARIANTS.filter((h) => h.brand === brand);
    const first = heroes[0];
    if (first) void this.selectOption('hero', first.id);
  }

  onHeroPreviewIndexChange(index: number): void {
    this.heroPreviewIndex.set(index);
    const hero = BUILD_DEMO_HERO_VARIANTS.filter((h) => h.brand === this.heroPreviewBrand())[index];
    if (hero) void this.selectOption('hero', hero.id);
  }

  startPreviewResize(event: PointerEvent): void {
    if (!this.previewOpen()) return;
    event.preventDefault();
    const startX = event.clientX;
    const startW = this.previewWidth();

    const onMove = (moveEvent: PointerEvent): void => {
      const next = startW + (startX - moveEvent.clientX);
      this.previewWidth.set(Math.min(Math.max(next, 220), 360));
    };

    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  selectDemoBrand(brand: BuildBookDemoBrand): void {
    this.demoBrand.set(brand);
  }

  async selectOption(section: BuildBookSection, optionId: string): Promise<void> {
    if (this.isOptionSelected(section, optionId)) return;
    this.buildBook.selectOption(section, optionId);
    if (section === 'hero') {
      const idx = BUILD_DEMO_HERO_VARIANTS.findIndex((h) => h.id === optionId);
      if (idx >= 0) this.heroPreviewIndex.set(idx);
      const opt = findBuildBookOption('hero', optionId);
      if (opt?.demo?.brand) this.demoBrand.set(opt.demo.brand);
    }
    this.openPreview();
  }

  selectBaselineLayoutOption(optionId: string): void {
    const block = this.activeBlock();
    if (!block || (block.section !== 'hero' && block.section !== 'fold')) return;
    if (this.isOptionSelected(block.section, optionId)) return;

    this.buildBook.selectBaselineLayoutOption(block.id, optionId);

    if (block.section === 'hero') {
      const idx = BUILD_DEMO_HERO_VARIANTS.findIndex((h) => h.id === optionId);
      if (idx >= 0) this.heroPreviewIndex.set(idx);
      const opt = findBuildBookOption('hero', optionId);
      if (opt?.demo?.brand) this.demoBrand.set(opt.demo.brand);
    }
    this.openPreview();
  }

  selectBaselineHeroOption(optionId: string): void {
    this.selectBaselineLayoutOption(optionId);
  }

  onBaselinePanelOptionSelect(optionId: string): void {
    if (this.isBaselineMode()) {
      this.selectBaselineLayoutOption(optionId);
      return;
    }
    void this.selectOption(this.section(), optionId);
  }

  onHeroPanelOptionSelect(optionId: string): void {
    const pending = this.pendingAdd();
    if (pending?.patternId === 'hero') {
      const blockId = resolveBlockIdForHeroLayoutOption(optionId);
      if (blockId) this.commitPendingAdd(blockId);
      return;
    }
    this.onBaselinePanelOptionSelect(optionId);
  }

  selectedId(section: BuildBookSection): string | null {
    return this.buildBook.selectedOptionId(section);
  }

  sectionLabel(id: BuildBookSection): string {
    return buildBookSectionLabel(id);
  }

  sectionNum(id: BuildBookSection): string {
    return buildBookSectionNum(id);
  }

  sectionDeck(id: BuildBookSection): string {
    return SECTION_DECK[id];
  }

  optionsForSection(section: BuildBookSection): BuildBookOption[] {
    const all = BUILD_BOOK_OPTIONS[section];
    const brand = section === 'hero' ? 'all' : this.demoBrand();
    return filterDemoOptions(section, all, brand);
  }

  baselineLayoutOptionsVisible(): boolean {
    if (this.pendingAdd()?.patternId === 'hero') return this.isBaselineMode();
    const section = this.activeBlock()?.section;
    return this.isBaselineMode() && (section === 'hero' || section === 'fold');
  }

  heroPanelOptions(): BuildBookOption[] {
    if (this.isBaselineMode()) {
      return [...this.heroPanelApprovedOptions(), ...this.heroPanelLabOptions()];
    }
    return this.optionsForSection(this.section());
  }

  heroPanelApprovedOptions(): BuildBookOption[] {
    if (this.pendingAdd()?.patternId === 'hero') {
      if (this.selectedTemplateId() === 'blackstone-landscaping-v1') {
        return baselineApprovedHeroOptionsForBrand('wri').filter(
          (option) => option.id === 'hil-baseline-hero-canopy',
        );
      }
      return baselineApprovedHeroOptionsForBrand(this.baselineTemplateBrand());
    }
    const block = this.activeBlock();
    if (this.selectedTemplateId() === 'blackstone-landscaping-v1' && block?.section === 'hero') {
      return baselineApprovedHeroOptionsForBrand('wri').filter(
        (option) => option.id === 'hil-baseline-hero-canopy',
      );
    }
    if (block?.section === 'fold') {
      return BASELINE_APPROVED_FOLD_LIBRARY;
    }
    return baselineApprovedHeroOptionsForBrand(this.baselineTemplateBrand());
  }

  heroPanelLabOptions(): BuildBookOption[] {
    const section = this.heroPanelSection();
    return filterDemoOptions(section, BUILD_BOOK_OPTIONS[section], 'all');
  }

  resetBaselineHeroPhotoForBlock(blockInstanceId: string): void {
    const block = this.baselineBlocks().find((item) => item.id === blockInstanceId);
    if (!block || block.section !== 'hero') return;
    this.activeBlockId.set(block.id);
    this.buildBook.resetBaselineHeroImageToTemplateDefault(block.id);
    this.openPreview();
  }

  resetBaselineHeroPhoto(): void {
    const block = this.activeBlock();
    if (!block || block.section !== 'hero') return;
    this.buildBook.resetBaselineHeroImageToTemplateDefault(block.id);
    this.openPreview();
  }

  heroPanelSection(): BuildBookSection {
    if (this.pendingAdd()?.patternId === 'hero') return 'hero';
    if (this.isBaselineMode()) {
      const section = this.activeBlock()?.section;
      if (section === 'hero' || section === 'fold') return section;
    }
    return this.section();
  }

  baselineTemplateBrand(): BuildBookDemoBrand {
    const fromBlock = this.baselineBlocks()[0]?.props['labBrand'];
    if (fromBlock === 'sparky' || fromBlock === 'wri' || fromBlock === 'consult' || fromBlock === 'veil') {
      return fromBlock;
    }

    const templateId = this.selectedTemplateId();
    if (templateId === 'sparky-electric-trades-v1') return 'sparky';
    if (templateId === 'wilco-consulting-v1') return 'consult';
    if (templateId === 'veil-live-painter-v1') return 'veil';
    if (templateId === 'blackstone-landscaping-v1') return 'wri';
    return 'wri';
  }

  sectionShowsDemoBrandTabs(section: BuildBookSection): boolean {
    return isBuildBookDemoSection(section) && section !== 'hero';
  }

  demoBrandsForSection(section: BuildBookSection): BuildBookDemoBrand[] {
    return brandsForDemoSection(section);
  }

  sectionUsesDemoCatalog(section: BuildBookSection): boolean {
    return isBuildBookDemoSection(section);
  }

  demoBrandLabel(brand: BuildBookDemoBrand): string {
    return demoBrandLabel(brand);
  }

  demoBrandDot(brand: BuildBookDemoBrand): string {
    return demoBrandDot(brand);
  }

  isOptionSelected(section: BuildBookSection, optionId: string): boolean {
    const pending = this.pendingAdd();
    if (section === 'hero' && pending?.patternId === 'hero' && pending.previewOptionId) {
      return pending.previewOptionId === optionId;
    }
    if (section === 'hero') {
      if (this.isBaselineMode()) {
        const block = this.activeBlock();
        if (block?.section === 'hero') {
          return resolveBaselineHeroLayoutId(block.blockId, block.props) === optionId;
        }
      }
      return this.heroLayoutId() === optionId;
    }
    if (section === 'fold') {
      if (this.isBaselineMode()) {
        const block = this.activeBlock();
        if (block?.section === 'fold') {
          return resolveBaselineFoldLayoutId(block.blockId, block.props) === optionId;
        }
      }
      return this.selectedId('fold') === optionId;
    }
    return this.selectedId(section) === optionId;
  }

  astroUnitLabel(astroUnit: string): string {
    const parts = astroUnit.split('/');
    return parts[parts.length - 1] ?? astroUnit;
  }

  async save(): Promise<void> {
    await this.buildBook.save();
  }

  async initializeDraft(): Promise<void> {
    const ok = await this.buildBook.initializeStarterDraft();
    if (ok) {
      this.bookTab.set('homepage');
      this.syncWorkflowToUrl();
      await this.save();
    }
  }

  async useStarterTemplate(template: BuildBookTemplateDefinition): Promise<void> {
    const site = this.strategy.site();
    const defaultName =
      this.activeProspectContext()?.name || site?.displayName || template.label;
    this.setupTemplate.set(template);
    this.setupDisplayName.set(defaultName);
    this.setupSlug.set(this.slugify(defaultName));
    this.setupError.set(null);
    this.setupOpen.set(true);
  }

  protected onSetupNameChange(): void {
    const name = this.setupDisplayName();
    const slug = this.setupSlug();
    if (!slug || slug === this.slugify(name)) {
      this.setupSlug.set(this.slugify(name));
    }
  }

  protected async confirmSiteSetup(): Promise<void> {
    const template = this.setupTemplate();
    const siteId = this.strategy.siteId();
    const displayName = this.setupDisplayName().trim();
    const slug = this.setupSlug().trim();
    if (!template || !siteId || !displayName || !slug) {
      this.setupError.set('Display name and slug are required.');
      return;
    }

    this.setupSaving.set(true);
    this.setupError.set(null);
    try {
      const site = await this.shireSitesApi.patch(siteId, { displayName, clientSitesSlug: slug });
      this.strategy.mergeSite(site);
      this.setupOpen.set(false);
      await this.applyStarterTemplate(template);
    } catch (err) {
      this.setupError.set(
        err instanceof Error ? err.message : 'Could not save site details.',
      );
    } finally {
      this.setupSaving.set(false);
    }
  }

  private async applyStarterTemplate(template: BuildBookTemplateDefinition): Promise<void> {
    this.setEntryMode('template');
    this.buildBook.setSelectedTemplateId(template.id);
    await this.initializeDraft();
    if (!hasBuildBookBaselineAssembly(template.id)) {
      await this.selectOption('hero', template.recommendedHeroId);
      await this.selectOption('fold', template.recommendedFoldId);
      await this.selectOption('services', template.recommendedServicesId);
      await this.save();
    } else {
      const first = this.buildBook.homepageBlocks()[0];
      if (first) {
        this.activeBlockId.set(first.id);
        this.section.set(first.section);
      }
    }
    this.bookTab.set('homepage');
    this.syncWorkflowToUrl();
    this.openPreview();
  }

  protected tryExit(): void {
    if (this.buildBook.dirty()) {
      const ok = window.confirm('You have unsaved build book changes. Leave without saving?');
      if (!ok) return;
    }
    this.exit.emit();
  }

  /** Open the content-plan thinker runbook for the active site. */
  async viewRunbook(): Promise<void> {
    const thinker = this.thinkerView;
    const siteId = this.strategy.siteId();
    if (!thinker || !siteId) return;

    let plan = this.contentPlan.plan();
    if (!plan?.id || plan.siteId !== siteId) {
      this.contentPlan.setSiteId(siteId);
      await this.contentPlan.loadLatest();
      plan = this.contentPlan.plan();
    }
    if (!plan?.id) return;

    thinker.setFocusBackLabel('Back to Strategy');
    thinker.openContentPlanRun(plan.siteId, plan);
  }

  protected startEditingDisplayName(): void {
    this.displayNameDraft.set(this.strategy.site()?.displayName ?? this.siteLabel());
    this.editingDisplayName.set(true);
  }

  protected async saveDisplayName(): Promise<void> {
    const siteId = this.strategy.siteId();
    const displayName = this.displayNameDraft().trim();
    if (!siteId || !displayName) return;
    try {
      const site = await this.shireSitesApi.patch(siteId, { displayName });
      this.strategy.mergeSite(site);
      this.editingDisplayName.set(false);
    } catch {
      // keep editor open; build book error surface handles API errors elsewhere
    }
  }

  protected cancelEditingDisplayName(): void {
    this.editingDisplayName.set(false);
  }

  async publishSite(): Promise<void> {
    if (!this.canPublish()) return;
    if (this.buildBook.dirty()) {
      const saved = await this.buildBook.save();
      if (!saved) return;
    }
    this.publishing.set(true);
    this.publishStartedAt.set(Date.now());
    this.publishProgressMessage.set('Preparing your site for deploy…');
    try {
      const result = await this.buildBook.publishSite();
      if (result.ok) {
        this.publishProgressMessage.set(
          result.message ?? 'Deploying your site to Cloudflare Pages…',
        );
        this.startPublishPolling();
      } else {
        this.publishProgressMessage.set(null);
      }
    } finally {
      this.publishing.set(false);
    }
  }

  publishBlockers(): string {
    return this.publishGate()
      .issues.map((item) => item.message)
      .join(' · ');
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
  }

  private formatRelativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    const delta = Date.now() - then;
    const minutes = Math.floor(delta / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 14) return `${days}d`;
    return new Date(iso).toLocaleDateString();
  }

  private startPublishPolling(): void {
    this.stopPublishPolling();
    void this.buildBook.refreshSitePublishStatus();
    this.publishPollTimer = setInterval(() => {
      void this.buildBook.refreshSitePublishStatus().then(() => {
        const status = this.publishStatus();
        if (status === 'live') {
          this.publishProgressMessage.set('Your site is live.');
          this.publishStartedAt.set(null);
          this.stopPublishPolling();
        } else if (status === 'failed') {
          this.publishProgressMessage.set(null);
          this.publishStartedAt.set(null);
          this.stopPublishPolling();
        }
      });
    }, 2000);
  }

  private stopPublishPolling(): void {
    if (this.publishPollTimer) {
      clearInterval(this.publishPollTimer);
      this.publishPollTimer = null;
    }
  }

  isTemplateSelected(template: BuildBookTemplateDefinition): boolean {
    return this.selectedTemplateId() === template.id;
  }

  templateActionLabel(template: BuildBookTemplateDefinition): string {
    if (this.buildBook.initializing()) return 'Applying...';
    return this.isTemplateSelected(template) ? 'Selected' : 'Select template';
  }

  templatePreviewImage(template: BuildBookTemplateDefinition): string {
    const ink = template.id.includes('wilco') ? '#18181b' : template.accent;
    const bg = template.id.includes('sparky')
      ? '#fff7ed'
      : template.id.includes('wri')
        ? '#ecfeff'
        : '#f4f4f5';
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
        <rect width="640" height="360" fill="${bg}"/>
        <rect x="38" y="34" width="564" height="292" rx="24" fill="#fff" stroke="#e4e4e7"/>
        <rect x="70" y="68" width="108" height="14" rx="7" fill="${ink}"/>
        <rect x="406" y="69" width="44" height="8" rx="4" fill="#d4d4d8"/>
        <rect x="466" y="69" width="44" height="8" rx="4" fill="#d4d4d8"/>
        <rect x="526" y="66" width="44" height="14" rx="7" fill="${ink}" opacity=".9"/>
        <rect x="70" y="118" width="250" height="26" rx="13" fill="${ink}" opacity=".18"/>
        <rect x="70" y="158" width="310" height="20" rx="10" fill="#18181b"/>
        <rect x="70" y="190" width="238" height="12" rx="6" fill="#a1a1aa"/>
        <rect x="70" y="214" width="202" height="12" rx="6" fill="#d4d4d8"/>
        <rect x="70" y="252" width="112" height="28" rx="14" fill="${ink}"/>
        <rect x="398" y="116" width="146" height="142" rx="22" fill="${ink}" opacity=".9"/>
        <circle cx="512" cy="142" r="44" fill="#fff" opacity=".2"/>
        <rect x="398" y="276" width="48" height="10" rx="5" fill="#d4d4d8"/>
        <rect x="460" y="276" width="48" height="10" rx="5" fill="#d4d4d8"/>
        <rect x="522" y="276" width="48" height="10" rx="5" fill="#d4d4d8"/>
      </svg>
    `;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  openTemplatePreview(template: BuildBookTemplateDefinition): void {
    window.open(template.previewUrl, '_blank', 'noopener,noreferrer');
  }

  openBlogTemplatePreview(templateId: BlogArticleTemplateKey): void {
    this.previewBlogArticleTemplate.emit(templateId);
  }

  toggleInspector(): void {
    this.togglePreview();
  }

  blockAssemblyPreviewUrl(): string | null {
    const homepage = this.buildBook.pages().find((page) => page.kind === 'homepage');
    const previewUrl = homepage?.blocks
      .map((block) => block.props['baselinePreviewUrl'])
      .find((value): value is string => typeof value === 'string' && value.length > 0);
    return previewUrl ?? null;
  }

  themeLabel(): string {
    const theme = this.buildBook.draft()?.theme;
    if (!theme) return '—';
    return theme.replace(/-/g, ' ');
  }

  siteLabel(): string {
    const siteName = this.strategy.site()?.displayName?.trim();
    if (siteName && siteName !== 'My site') return siteName;
    return this.activeProspectContext()?.name || siteName || 'Your site';
  }

  websiteStatusLabel(status: BuildBookProspectContext['websiteStatus']): string {
    switch (status) {
      case 'none':
        return 'No website';
      case 'poor':
        return 'Weak website';
      case 'fair':
        return 'Existing site';
      case 'good':
        return 'Good site';
      default:
        return 'Website unknown';
    }
  }

  priorityLabel(priority: BuildBookProspectContext['priority']): string {
    switch (priority) {
      case 'critical':
        return 'Critical';
      case 'high':
        return 'High';
      case 'medium':
        return 'Medium';
      case 'monitor':
        return 'Monitor';
      default:
        return 'Demo';
    }
  }

  private restoreWorkflowFromUrl(): void {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const subview = params.get('subview');
    const chapter = params.get('chapter');
    const section = params.get('section');
    const pageId = params.get('page');
    const validTab = this.bookTabs.some((item) => item.id === tab);
    const validSection = this.navSlots.some((slot) => slot === section);

    if (validSection) {
      this.section.set(section as BuildBookSection);
    }

    if (validTab) {
      this.bookTab.set(tab as BuildBookTab);
    } else if (chapter === 'homepage') {
      this.bookTab.set('homepage');
    } else if (chapter === 'templates') {
      this.bookTab.set('templates');
    } else if (chapter === 'site-info-images' || chapter === 'image-tone') {
      this.bookTab.set('seo-strategy');
    } else if (chapter === 'research' || chapter === 'discovery') {
      this.bookTab.set('research');
    } else if (chapter === 'landing-pages') {
      this.bookTab.set('landing-pages');
    } else if (chapter === 'blog-home') {
      this.bookTab.set('blog-home');
    } else if (chapter === 'blog-posts') {
      this.bookTab.set('content-posts');
    } else if (validSection) {
      this.bookTab.set('homepage');
    }

    if (subview === 'homepage') {
      this.bookTab.set('homepage');
    }

    if (this.bookTab() === 'blog-home' && this.buildBook.hasDraft()) {
      this.buildBook.ensureBlogHomePage();
    }

    if (pageId && this.buildBook.landingPages().some((page) => page.id === pageId)) {
      this.landingPageId.set(pageId);
    } else if (pageId && this.buildBook.blogPosts().some((page) => page.id === pageId)) {
      this.blogPostId.set(pageId);
      if (params.get('mode') === 'article-preview') {
        this.contentPostsCanvasMode.set('article-preview');
      }
    }

    if (this.isPageEditor()) {
      this.openPreview();
    } else {
      this.closePreview();
    }
  }

  private syncWorkflowToUrl(): void {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'build-book');
    url.searchParams.set('tab', this.bookTab());
    url.searchParams.delete('chapter');
    url.searchParams.delete('subview');
    if (this.bookTab() === 'landing-pages' && this.landingPageId()) {
      url.searchParams.set('page', this.landingPageId()!);
    } else if (this.bookTab() === 'content-posts' && this.blogPostId()) {
      url.searchParams.set('page', this.blogPostId()!);
      if (this.contentPostsCanvasMode() === 'article-preview') {
        url.searchParams.set('mode', 'article-preview');
      } else {
        url.searchParams.delete('mode');
      }
    } else if (this.bookTab() === 'blog-home') {
      url.searchParams.set('page', 'blog-home');
      url.searchParams.delete('mode');
    } else {
      url.searchParams.delete('page');
      url.searchParams.delete('mode');
    }
    if (this.isPageEditor()) {
      url.searchParams.set('section', this.section());
    } else {
      url.searchParams.delete('section');
    }
    window.history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }
}
