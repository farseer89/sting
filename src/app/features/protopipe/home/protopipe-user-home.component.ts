import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import type { CognitivePackCatalogItem } from '../thought-packs/cognitive-pack.model';
import { isPackSelectable } from '../thought-packs/cognitive-pack-catalog';
import { ThoughtPackDetailComponent } from '../thought-packs/thought-pack-detail.component';
import { ThoughtPackStoreComponent } from '../thought-packs/thought-pack-store.component';
import { ProtopipeThoughtPacksService } from '../thought-packs/protopipe-thought-packs.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PRODUCT_CONFIG } from '../../../core/config/product-config';
import { Button } from 'primeng/button';
import { Popover } from 'primeng/popover';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Tooltip } from 'primeng/tooltip';
import { ContentPlanStore } from '../content-plan/content-plan.store';
import { ProtopipeOnboardingStateService } from '../onboarding/protopipe-onboarding-state.service';
import { ProtopipeStrategyService } from '../protopipe-strategy.service';
import { ProtopipeContentService } from '../protopipe-content.service';
import { ProtopipeKeywordPickerStore } from './keyword-picker/protopipe-keyword-picker.store';
import { ProtopipeHomeSharpenComponent } from './sharpen/protopipe-home-sharpen.component';
import { ProtopipeHomeStrategyComponent } from './strategy/protopipe-home-strategy.component';
import { ProtopipeStrategyContextPanelComponent } from './strategy/protopipe-strategy-context-panel.component';
import { ProtopipeHomeStrategyViewState } from './strategy/protopipe-home-strategy-view.state';
import { ProtopipeHomeWriterComponent } from './protopipe-home-writer.component';
import { ProtopipeHomeWriterViewState } from './protopipe-home-writer-view.state';
import { ProtopipeHomeThinkerViewState } from './protopipe-home-thinker-view.state';
import { ProtopipeBlogPreviewNavState } from './protopipe-blog-preview-nav.state';
import { ArticleGenerationRunSession } from '../article/article-generation-run-session.service';
import { ThoughtRunSession } from '../runs/thought-run-session.service';
import { ProtopipeHomeKeywordBookComponent } from './books/protopipe-home-keyword-book.component';
import { ProtopipeHomeMentionsBookComponent } from './books/mentions-book/protopipe-home-mentions-book.component';
import type { SharpenTab } from './sharpen/protopipe-home-sharpen.component';
import { ProtopipeHomeRunbooksComponent } from './runbooks/protopipe-home-runbooks.component';
import { ProtopipeHomeIntakeDemoComponent } from './intake-demo/protopipe-home-intake-demo.component';
import { ProtopipeMediaStudioComponent } from '../admin/media-studio/protopipe-media-studio.component';
import { ProtopipeHomeBrandBookComponent } from './books/protopipe-home-brand-book.component';
import { ProtopipeHomeAudienceBookComponent } from './books/protopipe-home-audience-book.component';
import { ProtopipeHomeBuildBookComponent } from './books/protopipe-home-build-book.component';
import { ProtopipeHomeBlogPreviewComponent } from './blog-preview/protopipe-home-blog-preview.component';
import { ProtopipeHomeBusinessDetailsComponent } from './books/protopipe-home-business-details.component';
import { ProtopipeHomeGoalsComponent } from './books/protopipe-home-goals.component';
import { ProtopipeHomeAdsBookComponent } from './books/protopipe-home-ads-book.component';
import { ProtopipeHomeResearchBookComponent } from './books/protopipe-home-research-book.component';
import { ProtopipeHomeMerchBookComponent } from './books/protopipe-home-merch-book.component';
import { ProtopipePitchProspectBoardComponent } from '../pitch-prep/protopipe-pitch-prospect-board.component';
import { ProtopipePitchPrepWizardComponent } from '../pitch-prep/protopipe-pitch-prep-wizard.component';
import { ProtopipeLeadsListComponent } from '../leads/protopipe-leads-list.component';
import { ProtopipeHomeThinkerBinderComponent } from './thinker/protopipe-home-thinker-binder.component';
import { ProtopipeHomeAnalyticsBinderComponent } from './analytics-binder/protopipe-home-analytics-binder.component';
import { ProtopipeHomeDashboardComponent } from './dashboard/protopipe-home-dashboard.component';
import { ProtopipeProspectorComponent } from '../prospector/protopipe-prospector.component';
import { ProtopipeColdCallerComponent } from '../cold-caller/protopipe-cold-caller.component';
import { ProtopipeBillingComponent } from '../billing/protopipe-billing.component';
import { ProtopipeBillingPortalService } from '../billing/protopipe-billing-portal.service';
import { ProtopipeHomeSidePanelService } from './protopipe-home-side-panel.service';
import { ProtopipeHomeKeywordsComponent } from './keywords/protopipe-home-keywords.component';
import {
  PROTOPIPE_HOME_NAV,
  PROTOPIPE_HOME_NAV_DEFAULT_OPEN,
  type ProtopipeHomeNavIcon,
  type ProtopipeHomeNavItem,
} from './protopipe-home-nav';
import {
  HOME_DASHBOARD_PATH,
  HOME_DISCOVERY_PATH,
  HOME_KEYWORDS_PATH,
  HOME_ONBOARDING_PATH,
  homeShellRouteKind,
} from './protopipe-home.routes';
import { resolveBootstrapSiteId } from '../resolve-bootstrap-site-id';
import { calendarItemKey } from './strategy/strategy.helpers';
import type { StrategyVisualView } from './strategy/strategy-visual-view';
import type { BuildBookProspectContext } from '../build-book/build-book-context';
import type { BlogArticleTemplateKey } from '../build-book/build-book.types';
import {
  buildProtopipeAccessState,
  hasProtopipeCapability,
  isProtopipeInternalAdminEmail,
  type ProtopipeAccessState,
} from '../access/protopipe-access.model';

export type ProtopipeHomeView =
  | 'dashboard'
  | 'discovery'
  | 'keywords'
  | 'mentions-book'
  | 'strategy'
  | 'sharpen'
  | 'writer'
  | 'packs'
  | 'runbooks'
  | 'media-studio'
  | 'pitch-prep'
  | 'leads'
  | 'brand-book'
  | 'audience-book'
  | 'build-book'
  | 'blog-preview'
  | 'ads-book'
  | 'research-book'
  | 'merch-book'
  | 'business-details'
  | 'goals'
  | 'intake'
  | 'thinker'
  | 'strategy-binder'
  | 'analytics-binder'
  | 'prospector'
  | 'cold-caller'
  | 'billing';

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface HomeFocusReturnContext {
  view: ProtopipeHomeView;
  navId: string;
  sidePanelOpen: boolean;
  strategyArticleKey?: string | null;
  strategyVisualView?: StrategyVisualView;
}

type HomeFocusHistoryKind = 'thinker' | 'writer';

interface MobileHomeTab {
  id: string;
  label: string;
  icon: ProtopipeHomeNavIcon;
  item: ProtopipeHomeNavItem | null;
}

@Component({
  selector: 'app-protopipe-user-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    ProtopipeKeywordPickerStore,
    ProtopipeHomeSidePanelService,
    ProtopipeHomeStrategyViewState,
    ProtopipeHomeWriterViewState,
    ProtopipeHomeThinkerViewState,
    ArticleGenerationRunSession,
    ThoughtRunSession,
  ],
  imports: [
    Button,
    Popover,
    ProgressSpinner,
    Tooltip,
    ProtopipeHomeKeywordBookComponent,
    ProtopipeHomeMentionsBookComponent,
    ProtopipeHomeStrategyComponent,
    ProtopipeHomeSharpenComponent,
    ProtopipeHomeWriterComponent,
    ProtopipeStrategyContextPanelComponent,
    ThoughtPackStoreComponent,
    ThoughtPackDetailComponent,
    ProtopipeHomeRunbooksComponent,
    ProtopipeHomeIntakeDemoComponent,
    ProtopipeMediaStudioComponent,
    ProtopipeHomeBrandBookComponent,
    ProtopipeHomeAudienceBookComponent,
    ProtopipeHomeBuildBookComponent,
    ProtopipeHomeBlogPreviewComponent,
    ProtopipeHomeBusinessDetailsComponent,
    ProtopipeHomeGoalsComponent,
    ProtopipeHomeAdsBookComponent,
    ProtopipeHomeResearchBookComponent,
    ProtopipeHomeMerchBookComponent,
    ProtopipePitchProspectBoardComponent,
    ProtopipePitchPrepWizardComponent,
    ProtopipeLeadsListComponent,
    ProtopipeHomeThinkerBinderComponent,
    ProtopipeHomeAnalyticsBinderComponent,
    ProtopipeHomeDashboardComponent,
    ProtopipeHomeKeywordsComponent,
    ProtopipeProspectorComponent,
    ProtopipeColdCallerComponent,
    ProtopipeBillingComponent,
  ],
  templateUrl: './protopipe-user-home.component.html',
  styleUrl: './protopipe-user-home.component.scss',
})
export class ProtopipeUserHomeComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  readonly product = inject(PRODUCT_CONFIG);
  private readonly billingPortal = inject(ProtopipeBillingPortalService);
  private readonly onboarding = inject(ProtopipeOnboardingStateService);
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly content = inject(ProtopipeContentService);
  private readonly thoughtPacks = inject(ProtopipeThoughtPacksService);
  private readonly contentPlan = inject(ContentPlanStore);
  readonly sidePanel = inject(ProtopipeHomeSidePanelService);
  /** Shared with strategy children + context panel — inspect selectedArticle() when debugging clicks. */
  readonly strategyViewState = inject(ProtopipeHomeStrategyViewState);
  readonly writerViewState = inject(ProtopipeHomeWriterViewState);
  readonly thinkerViewState = inject(ProtopipeHomeThinkerViewState);
  private readonly blogPreviewNav = inject(ProtopipeBlogPreviewNavState);
  private readonly keywordStore = inject(ProtopipeKeywordPickerStore);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly homeWorkspaceEl = viewChild<ElementRef<HTMLElement>>('homeWorkspace');
  readonly buildBookCmp = viewChild(ProtopipeHomeBuildBookComponent);

  private focusReturnContext: HomeFocusReturnContext | null = null;
  private focusHistoryEntry: HomeFocusHistoryKind | null = null;
  private suppressFocusPopState = false;
  readonly buildBookProspectContext = signal<BuildBookProspectContext | null>(null);

  readonly showSidePanel = computed(() => {
    if (!this.sidePanel.open()) {
      return false;
    }
    const view = this.activeView();
    return view === 'keywords' || view === 'strategy';
  });

  readonly showKeywordSidePanel = computed(
    () => this.showSidePanel() && this.activeView() === 'keywords',
  );

  readonly showStrategySidePanel = computed(
    () => this.showSidePanel() && this.activeView() === 'strategy',
  );

  readonly sidePanelArticleOpen = computed(
    () => this.activeView() === 'strategy' && this.strategyViewState.selectedArticle() !== null,
  );

  constructor() {
    document.documentElement.classList.add('void-home', 'void-white');
    this.destroyRef.onDestroy(() => {
      document.documentElement.classList.remove('void-home', 'void-white');
    });

    // TROUBLESHOOT: OnPush shell — re-check when panel open state or article selection changes.
    effect(() => {
      this.sidePanel.open();
      this.strategyViewState.selectedArticle();
      this.activeView();
      untracked(() => this.cdr.markForCheck());
    });
  }

  readonly accessState = computed(() => {
    const email = this.auth.currentUserEmail || this.auth.getStoredProfile()?.email || '';
    return buildProtopipeAccessState(this.strategy.subscription(), {
      isInternalAdmin: isProtopipeInternalAdminEmail(email),
    });
  });
  readonly canSharpen = computed(() => hasProtopipeCapability(this.accessState(), 'sharpen'));
  readonly navItems = computed(() => this.gateNavItems(PROTOPIPE_HOME_NAV, this.accessState()));
  readonly navCollapsed = signal(false);
  readonly openNavGroupIds = signal<string[]>([...PROTOPIPE_HOME_NAV_DEFAULT_OPEN]);
  readonly siteDisplayName = signal('');
  readonly siteHostname = signal('');
  readonly siteId = signal<string | null>(null);
  readonly subscriptionLabel = computed(() => this.accessState().statusLabel);
  readonly accessNotice = signal<string | null>(null);
  readonly billingPortalLoading = this.billingPortal.loading;
  readonly loading = signal(true);
  readonly activeView = signal<ProtopipeHomeView>('dashboard');
  readonly activeNavId = signal('home-dashboard');
  readonly sharpenInitialTab = signal<SharpenTab | null>(null);
  readonly packDetailId = signal<string | null>(null);
  readonly pitchPrepProspectId = signal<string | null>(null);
  readonly thoughtPacksCatalog = this.thoughtPacks.catalog;
  readonly thoughtPacksLoading = this.thoughtPacks.loading;
  readonly thoughtPacksError = this.thoughtPacks.error;
  readonly siteDefaultPackId = this.thoughtPacks.siteDefaultPackId;
  readonly savingSiteDefault = this.thoughtPacks.saving;
  readonly siteDefaultMessage = this.thoughtPacks.saveMessage;
  readonly userMenuOpen = signal(false);
  readonly mobileMoreOpen = signal(false);

  readonly mobilePrimaryTabs = computed<MobileHomeTab[]>(() => {
    const items = this.navItems();
    const configs: Array<{ id: string; label: string; icon: ProtopipeHomeNavIcon }> = [
      { id: 'home-dashboard', label: 'Home', icon: 'grid' },
      { id: 'start-keywords', label: 'Discover', icon: 'search' },
      { id: 'start-strategy', label: 'Strategy', icon: 'sitemap' },
      { id: 'content-writer', label: 'Write', icon: 'write' },
    ];

    return configs
      .map((config) => ({
        ...config,
        item: this.findNavItemById(items, config.id),
      }))
      .filter((tab) => tab.item !== null);
  });

  readonly mobileMoreNavItems = computed(() => this.navItems().filter((item) => !item.separator));

  readonly userName = computed(() => {
    const full = this.auth.getCurrentUserFullName()?.trim();
    return full || 'User';
  });

  readonly userInitials = computed(() => initialsFromName(this.userName()));

  readonly userPhotoUrl = computed(() => {
    const photo = this.auth.getCurrentUserPhoto();
    return photo.includes('avatar-f-1.png') ? '' : photo;
  });

  readonly isWriterFocus = computed(() => this.activeView() === 'writer');
  readonly isThinkerFocus = computed(() => this.activeView() === 'thinker');
  readonly isBuildBookFocus = computed(() => this.activeView() === 'build-book');
  readonly isBlogPreviewFocus = computed(() => this.activeView() === 'blog-preview');
  /** Temporarily reveal site nav while in immersive Writing book. */
  readonly writerRailPeek = signal(false);
  readonly isRailHidden = computed(() => {
    if (this.isWriterFocus() && this.writerRailPeek()) return false;
    return (
      this.isWriterFocus() ||
      this.isBuildBookFocus() ||
      this.isThinkerFocus() ||
      this.isBlogPreviewFocus()
    );
  });
  readonly blogPreviewContentPostId = computed(() => {
    const request = this.blogPreviewNav.request();
    return request?.kind === 'content-post' ? request.contentPostId : '';
  });
  readonly blogPreviewTitleHint = computed(() => this.blogPreviewNav.request()?.title);
  readonly blogPreviewArticleTemplateKey = computed(() => {
    const request = this.blogPreviewNav.request();
    return request?.kind === 'template-design' ? request.templateKey : null;
  });

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.sidePanel.detachResizeListeners());
    this.writerViewState.setExitHandler(() => this.leaveWriterFocus({ syncHistory: true }));
    this.thinkerViewState.setEnterThinkerHandler(() => this.enterThinkerFocus());
    this.thinkerViewState.setEnterWriterHandler(() => this.enterWriterFocus());
    this.thinkerViewState.setReviewOnBlogHandler((contentPostId, title) =>
      this.enterBlogPreviewFocus(contentPostId, title),
    );
    this.thinkerViewState.setPublishToSiteHandler((contentPostId) =>
      this.enterWriterPublishFocus(contentPostId),
    );
    this.thinkerViewState.setExitHandler(() => this.leaveThinkerFocus({ syncHistory: true }));
    this.strategyViewState.setEnterWriterHandler(() => this.enterWriterFocus());
    this.strategyViewState.setReviewOnBlogHandler((contentPostId, title) =>
      this.enterBlogPreviewFocus(contentPostId, title),
    );
    this.strategyViewState.setPublishToSiteHandler((contentPostId) =>
      this.enterWriterPublishFocus(contentPostId),
    );
    this.syncPacksFromRoute();
    this.syncPitchPrepFromRoute();
    this.syncLeadsFromRoute();
    this.syncProspectorFromRoute();
    this.syncColdCallerFromRoute();
    this.syncBillingFromRoute();
    this.syncViewFromRoute();
    this.syncViewFromQuery();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        this.syncPacksFromRoute();
        this.syncPitchPrepFromRoute();
        this.syncLeadsFromRoute();
        this.syncProspectorFromRoute();
        this.syncColdCallerFromRoute();
        this.syncBillingFromRoute();
        this.syncViewFromRoute();
        this.syncViewFromQuery();
      });
    void this.loadBootstrap();
  }

  onSideSplitterPointerDown(event: PointerEvent): void {
    const host = this.homeWorkspaceEl()?.nativeElement;
    if (!host) return;
    const railWidth = this.activeView() === 'keywords' ? 32 : 0;
    this.sidePanel.startResize(event, host, railWidth);
  }

  isNavGroupOpen(id: string): boolean {
    return this.openNavGroupIds().includes(id);
  }

  toggleNavGroup(id: string): void {
    const current = this.openNavGroupIds();
    if (current.includes(id)) {
      this.openNavGroupIds.set(current.filter((groupId) => groupId !== id));
    } else {
      this.openNavGroupIds.set([...current, id]);
    }
  }

  openSharpenFromMentions(): void {
    this.sharpenInitialTab.set('ai-search');
    this.leaveWriterFocus();
    this.sidePanel.setOpen(false);
    this.activeNavId.set('start-sharpen');
    this.activeView.set('sharpen');
  }

  viewMentionTrackingRun(runId: string): void {
    const siteId = this.siteId();
    if (!siteId) return;
    this.thinkerViewState.openMentionTrackingRun(siteId, runId);
  }

  onSharpenTabConsumed(): void {
    this.sharpenInitialTab.set(null);
  }

  toggleNavCollapse(): void {
    this.navCollapsed.update((v) => !v);
  }

  selectNavItem(item: ProtopipeHomeNavItem): void {
    this.mobileMoreOpen.set(false);
    if (item.locked) {
      this.showLockedNotice(item);
      return;
    }
    if (item.disabled) return;
    if (item.id === 'home-dashboard') {
      this.leaveWriterFocus();
      this.leaveThinkerFocus();
      this.sidePanel.setOpen(false);
      this.activeNavId.set(item.id);
      this.activeView.set('dashboard');
      void this.router.navigate([HOME_DASHBOARD_PATH]);
    } else if (item.id === 'start-keywords') {
      this.leaveWriterFocus();
      this.activeNavId.set(item.id);
      this.activeView.set('discovery');
      void this.router.navigate([
        this.onboarding.onboardingCompleted() ? HOME_DISCOVERY_PATH : HOME_ONBOARDING_PATH,
      ]);
    } else if (item.id === 'seo-keywords') {
      this.openKeywordSelectionView();
    } else if (item.id === 'start-business' || item.id === 'books-business') {
      this.openBusinessDetailsView(item.id);
    } else if (item.id === 'start-mentions') {
      this.leaveWriterFocus();
      this.leaveThinkerFocus();
      this.activeNavId.set(item.id);
      this.activeView.set('mentions-book');
    } else if (item.id === 'start-strategy') {
      this.leaveWriterFocus();
      this.leaveThinkerFocus();
      this.activeNavId.set(item.id);
      this.activeView.set('strategy');
    } else if (item.id === 'start-sharpen') {
      this.leaveWriterFocus();
      this.sidePanel.setOpen(false);
      this.activeNavId.set(item.id);
      this.activeView.set('sharpen');
    } else if (item.id === 'content-writer') {
      this.enterWriterFocus();
    } else if (item.id === 'content-packs') {
      this.showPacksStore();
      void this.router.navigate(['/home/packs']);
    } else if (item.id === 'content-media-studio') {
      this.leaveWriterFocus();
      this.sidePanel.setOpen(false);
      this.activeNavId.set(item.id);
      this.activeView.set('media-studio');
    } else if (item.id === 'content-pitch-prep') {
      this.showPitchPrepBoard();
      void this.router.navigate(['/home/pitch-prep']);
    } else if (item.id === 'analytics-leads') {
      this.showLeadsView();
      void this.router.navigate(['/home/leads']);
    } else if (item.id === 'prospector') {
      this.leaveWriterFocus();
      this.sidePanel.setOpen(false);
      this.activeNavId.set(item.id);
      this.activeView.set('prospector');
      void this.router.navigate(['/home/prospector']);
    } else if (item.id === 'cold-caller') {
      this.leaveWriterFocus();
      this.sidePanel.setOpen(false);
      this.activeNavId.set(item.id);
      this.activeView.set('cold-caller');
      void this.router.navigate(['/home/cold-caller']);
    } else if (item.id === 'account-billing') {
      this.openBillingView();
    } else if (item.id === 'dev-runbooks') {
      this.leaveWriterFocus();
      this.sidePanel.setOpen(false);
      this.activeNavId.set(item.id);
      this.activeView.set('runbooks');
    } else if (item.id === 'books-audience') {
      this.openAudienceBookView();
    } else if (item.id === 'books-brand') {
      this.openBrandBookView();
    } else if (item.id === 'books-build') {
      this.openBuildBookView();
    } else if (item.id === 'books-ads') {
      this.openAdsBookView();
    } else if (item.id === 'books-research') {
      this.openResearchBookView();
    } else if (item.id === 'books-merch') {
      this.openMerchBookView();
    } else if (item.id === 'books-goals') {
      this.openGoalsView();
    } else if (item.id === 'int-wordpress' || item.id === 'int-google') {
      void this.router.navigate(['/protopipe/settings/integrations']);
    } else if (item.id === 'intake-demo') {
      this.openIntakeDemoView();
    } else if (item.id === 'dev-analytics') {
      this.leaveWriterFocus();
      this.sidePanel.setOpen(false);
      this.activeNavId.set(item.id);
      this.activeView.set('analytics-binder');
    } else if (item.id === 'dev-strategy') {
      this.leaveWriterFocus();
      this.sidePanel.setOpen(false);
      this.activeNavId.set(item.id);
      this.activeView.set('strategy-binder');
    } else if (item.id === 'dev-thinker') {
      this.leaveWriterFocus({ syncHistory: false });
      this.sidePanel.setOpen(false);
      this.enterThinkerFocus();
      this.activeNavId.set(item.id);
    } else if (item.id === 'intake-studio') {
      const siteId = this.siteId();
      void this.router.navigate(['/protopipe/lab/intake-studio'], {
        queryParams: siteId ? { siteId } : {},
      });
    } else if (item.id === 'sms-contacts') {
      void this.router.navigate(['/protopipe/settings/contacts']);
    }
  }

  selectMobileTab(tab: MobileHomeTab): void {
    if (!tab.item) return;
    this.selectNavItem(tab.item);
  }

  toggleMobileMore(event?: Event): void {
    event?.stopPropagation();
    this.mobileMoreOpen.update((open) => !open);
  }

  closeMobileMore(): void {
    this.mobileMoreOpen.set(false);
  }

  toggleWriterRailPeek(): void {
    this.writerRailPeek.update((open) => !open);
  }

  enterWriterFocus(): void {
    this.writerRailPeek.set(false);
    const fromView = this.activeView();
    if (fromView !== 'writer') {
      if (fromView !== 'thinker') {
        this.focusReturnContext = this.captureFocusReturnContext();
        this.pushFocusHistory('writer');
      } else if (this.focusHistoryEntry) {
        history.replaceState({ protopipeFocus: 'writer' }, '', window.location.href);
        this.focusHistoryEntry = 'writer';
      }
    }

    if (!this.writerViewState.activePostId()) {
      const thinkerPostId = this.thinkerViewState.postId();
      if (thinkerPostId) {
        this.writerViewState.openPost(thinkerPostId);
      } else {
        this.writerViewState.openCreate();
      }
    }
    this.thinkerViewState.clearSession();
    this.writerViewState.clearPanel();
    this.sidePanel.setOpen(false);
    this.activeNavId.set('content-writer');
    this.activeView.set('writer');
  }

  enterThinkerFocus(): void {
    if (this.activeView() !== 'thinker') {
      this.focusReturnContext = this.captureFocusReturnContext();
      this.thinkerViewState.setFocusBackLabel(this.focusBackLabelForView(this.activeView()));
      this.pushFocusHistory('thinker');
    }
    this.writerViewState.clearPanel();
    this.sidePanel.setOpen(false);
    this.activeView.set('thinker');
  }

  leaveThinkerFocus(options: { syncHistory?: boolean } = {}): void {
    const syncHistory = options.syncHistory !== false;
    const wasThinker = this.activeView() === 'thinker';
    const runKind = this.thinkerViewState.runKind();
    // After an article run, refresh catalog so calendar shows Review (not Write).
    if (wasThinker && runKind === 'article') {
      this.content.reload();
    }
    this.thinkerViewState.clearSession();
    if (wasThinker) {
      this.restoreFocusReturnContext(runKind);
    }
    this.clearFocusHistory(syncHistory);
  }

  leaveBuildBookFocus(): void {
    this.sidePanel.setOpen(false);
    if (this.activeView() === 'build-book') {
      this.activeView.set('brand-book');
      this.activeNavId.set('books-brand');
    }
  }

  enterBuildBookFocus(context: BuildBookProspectContext | null = null): void {
    this.leaveWriterFocus();
    this.sidePanel.setOpen(false);
    this.buildBookProspectContext.set(context);
    this.activeNavId.set('books-build');
    this.activeView.set('build-book');
    const siteId = this.strategy.siteId();
    if (siteId) {
      this.contentPlan.setSiteId(siteId);
      void this.contentPlan.loadLatest();
    }
  }

  /** Calendar / Thinker → dedicated Blog Preview (selected template + filled article). */
  enterBlogPreviewFocus(contentPostId: string, title?: string): void {
    const id = contentPostId.trim();
    if (!id) return;
    this.content.reload();
    this.blogPreviewNav.open(id, title);
    if (this.activeView() === 'thinker') {
      this.thinkerViewState.clearSession();
      this.clearFocusHistory(true);
    }
    this.leaveWriterFocus();
    this.sidePanel.setOpen(false);
    this.activeView.set('blog-preview');
  }

  enterBlogArticleTemplatePreview(templateKey: BlogArticleTemplateKey): void {
    this.blogPreviewNav.openArticleTemplate(templateKey);
    this.leaveWriterFocus();
    this.sidePanel.setOpen(false);
    this.activeView.set('blog-preview');
  }

  leaveBlogPreviewFocus(): void {
    const request = this.blogPreviewNav.request();
    this.blogPreviewNav.clear();
    if (this.activeView() !== 'blog-preview') return;
    this.sidePanel.setOpen(false);
    if (request?.kind === 'template-design') {
      this.activeView.set('build-book');
      this.activeNavId.set('books-build');
      return;
    }
    this.activeView.set('strategy');
    this.activeNavId.set('start-strategy');
  }

  /** @deprecated Prefer enterBlogPreviewFocus — kept for Build Book internal deep-links. */
  enterBuildBookArticlePreview(contentPostId: string, title?: string): void {
    this.enterBlogPreviewFocus(contentPostId, title);
  }

  /** Open Writing Book on a draft with Publish guidance in the SEO panel. */
  enterWriterPublishFocus(contentPostId: string): void {
    this.writerViewState.openPostForPublish(contentPostId);
    this.enterWriterFocus();
  }

  leaveWriterFocus(options: { syncHistory?: boolean } = {}): void {
    const syncHistory = options.syncHistory !== false;
    const wasWriter = this.activeView() === 'writer';
    this.writerRailPeek.set(false);
    this.writerViewState.clearPanel();
    this.writerViewState.clearSession();
    this.content.setEditingSiteId(null);
    if (wasWriter) {
      this.restoreFocusReturnContext();
    } else {
      this.sidePanel.setOpen(false);
    }
    this.clearFocusHistory(syncHistory);
  }

  openKeywordSelectionView(): void {
    this.leaveWriterFocus();
    this.leaveThinkerFocus();
    this.sidePanel.setOpen(false);
    this.activeView.set('keywords');
    this.activeNavId.set('seo-keywords');
    void this.router.navigate([HOME_KEYWORDS_PATH]);
  }

  onKeywordsConfirmed(): void {
    this.activeView.set('strategy');
    this.activeNavId.set('start-strategy');
  }

  onDashboardOpen(
    target: 'keywords' | 'strategy' | 'mentions-book' | 'build-book' | 'business-details',
  ): void {
    if (target === 'keywords') {
      this.openKeywordSelectionView();
    } else if (target === 'strategy') {
      this.leaveWriterFocus();
      this.leaveThinkerFocus();
      this.activeView.set('strategy');
      this.activeNavId.set('start-strategy');
    } else if (target === 'mentions-book') {
      this.leaveWriterFocus();
      this.leaveThinkerFocus();
      this.activeView.set('mentions-book');
      this.activeNavId.set('start-mentions');
    } else if (target === 'business-details') {
      this.leaveWriterFocus();
      this.leaveThinkerFocus();
      this.activeView.set('business-details');
      this.activeNavId.set('start-business');
    } else {
      this.openBuildBookView();
      return;
    }
  }

  onOnboardingFinished(): void {
    void this.router.navigate([HOME_DASHBOARD_PATH]);
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.mobileMoreOpen.set(false);
    this.userMenuOpen.update((open) => !open);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
    this.mobileMoreOpen.set(false);
  }

  openBillingView(): void {
    this.leaveWriterFocus();
    this.leaveThinkerFocus();
    this.sidePanel.setOpen(false);
    this.activeNavId.set('account-billing');
    this.activeView.set('billing');
    this.closeUserMenu();
    void this.router.navigate([this.product.routes.billing]);
  }

  async openBillingPortal(): Promise<void> {
    try {
      await this.billingPortal.openPortal(this.product.routes.billing);
    } catch {
      this.accessNotice.set(this.billingPortal.error() ?? 'Could not open Stripe billing.');
    }
  }

  logout(): void {
    this.closeUserMenu();
    this.auth.logout();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeUserMenu();
    this.closeMobileMore();
    if (this.activeView() === 'writer') {
      this.leaveWriterFocus({ syncHistory: true });
    } else if (this.activeView() === 'thinker') {
      this.leaveThinkerFocus({ syncHistory: true });
    } else if (this.activeView() === 'build-book') {
      this.leaveBuildBookFocus();
    } else if (this.activeView() === 'blog-preview') {
      this.leaveBlogPreviewFocus();
    }
  }

  @HostListener('window:popstate')
  onFocusPopState(): void {
    if (this.suppressFocusPopState) return;

    const view = this.activeView();
    if (view === 'thinker') {
      this.leaveThinkerFocus({ syncHistory: false });
    } else if (view === 'writer') {
      this.leaveWriterFocus({ syncHistory: false });
    }
  }

  isNavItemActive(item: ProtopipeHomeNavItem): boolean {
    return !item.disabled && !item.locked && this.activeNavId() === item.id;
  }

  openPackDetail(pack: CognitivePackCatalogItem): void {
    this.showPackDetail(pack.id);
    void this.router.navigate(['/home/packs', pack.id]);
  }

  closePackDetail(): void {
    this.showPacksStore();
    void this.router.navigate(['/home/packs']);
  }

  closePitchPrepWizard(): void {
    this.showPitchPrepBoard();
    void this.router.navigate(['/home/pitch-prep']);
  }

  openPitchPrepWizard(prospectId: string): void {
    this.showPitchPrepWizard(prospectId);
    void this.router.navigate(['/home/pitch-prep', prospectId, 'wizard']);
  }

  onPackStartWriting(pack: CognitivePackCatalogItem): void {
    if (!isPackSelectable(pack)) return;
    this.writerViewState.setPendingCognitivePackId(pack.id);
    this.writerViewState.openCreate();
    this.enterWriterFocus();
  }

  onPackSetSiteDefault(pack: CognitivePackCatalogItem): void {
    void this.thoughtPacks.setSiteDefault(pack);
  }

  openBrandBookView(): void {
    this.leaveWriterFocus();
    this.sidePanel.setOpen(false);
    this.activeNavId.set('books-brand');
    this.activeView.set('brand-book');
  }

  openAudienceBookView(): void {
    this.leaveWriterFocus();
    this.sidePanel.setOpen(false);
    this.activeNavId.set('books-audience');
    this.activeView.set('audience-book');
  }

  openBuildBookView(clearContext = true, syncRoute = true): void {
    this.enterBuildBookFocus(clearContext ? null : this.buildBookProspectContext());
    if (syncRoute) {
      void this.router.navigate(['/home'], { queryParams: { view: 'build-book' } });
    }
  }

  openBuildBookForProspect(context: BuildBookProspectContext): void {
    this.enterBuildBookFocus(context);
    void this.router.navigate(['/home'], { queryParams: { view: 'build-book' } });
  }

  openAdsBookView(): void {
    this.leaveWriterFocus();
    this.sidePanel.setOpen(false);
    this.activeNavId.set('books-ads');
    this.activeView.set('ads-book');
  }

  openResearchBookView(): void {
    this.leaveWriterFocus();
    this.sidePanel.setOpen(false);
    this.activeNavId.set('books-research');
    this.activeView.set('research-book');
  }

  openMerchBookView(): void {
    this.leaveWriterFocus();
    this.sidePanel.setOpen(false);
    this.activeNavId.set('books-merch');
    this.activeView.set('merch-book');
  }

  openBusinessDetailsView(navId: string = 'start-business'): void {
    this.leaveWriterFocus();
    this.sidePanel.setOpen(false);
    this.activeNavId.set(navId);
    this.activeView.set('business-details');
  }

  openGoalsView(): void {
    this.leaveWriterFocus();
    this.sidePanel.setOpen(false);
    this.activeNavId.set('books-goals');
    this.activeView.set('goals');
  }

  openIntakeDemoView(): void {
    this.leaveWriterFocus();
    this.sidePanel.setOpen(false);
    this.activeNavId.set('intake-demo');
    this.activeView.set('intake');
  }

  openBrandSetupWizard(): void {
    const siteId = this.siteId();
    void this.router.navigate(['/home/brand-setup'], {
      queryParams: siteId ? { siteId } : {},
    });
  }

  private syncViewFromRoute(): void {
    const path = this.router.url.split('?')[0] ?? '';
    const kind = homeShellRouteKind(path);
    if (!kind) return;

    if (kind === 'dashboard') {
      this.leaveWriterFocus();
      this.leaveThinkerFocus();
      this.sidePanel.setOpen(false);
      this.activeView.set('dashboard');
      this.activeNavId.set('home-dashboard');
      return;
    }

    if (kind === 'onboarding' || kind === 'discovery') {
      this.leaveWriterFocus();
      this.activeView.set('discovery');
      this.activeNavId.set('start-keywords');
      return;
    }

    if (kind === 'keywords') {
      this.leaveWriterFocus();
      this.leaveThinkerFocus();
      this.sidePanel.setOpen(false);
      this.activeView.set('keywords');
      this.activeNavId.set('seo-keywords');
    }
  }

  private syncViewFromQuery(): void {
    const view = this.currentHomeViewParam();
    if (view === 'brand-book') {
      this.openBrandBookView();
    } else if (view === 'audience-book') {
      this.openAudienceBookView();
    } else if (view === 'build-book') {
      this.openBuildBookView(false, false);
    } else if (view === 'intake') {
      this.openIntakeDemoView();
    }
  }

  private syncLeadsFromRoute(): void {
    const path = this.router.url.split('?')[0] ?? '';
    if (path === '/home/leads' || path.startsWith('/home/leads')) {
      this.showLeadsView();
    }
  }

  private currentHomeViewParam(): string | null {
    const query = this.router.url.split('?')[1] ?? '';
    return new URLSearchParams(query).get('view');
  }

  private captureFocusReturnContext(): HomeFocusReturnContext {
    const view = this.activeView();
    const article = this.strategyViewState.selectedArticle();
    return {
      view,
      navId: this.activeNavId(),
      sidePanelOpen: this.sidePanel.open(),
      strategyArticleKey: article ? calendarItemKey(article) : null,
      strategyVisualView: view === 'strategy' ? this.strategyViewState.visualView() : undefined,
    };
  }

  private focusBackLabelForView(view: ProtopipeHomeView): string {
    switch (view) {
      case 'strategy':
        return 'Strategy';
      case 'build-book':
        return 'Back to Strategy';
      case 'keywords':
        return 'Keywords';
      case 'mentions-book':
        return 'AI Mentions';
      case 'writer':
        return 'Writer';
      default:
        return 'Back';
    }
  }

  private pushFocusHistory(kind: HomeFocusHistoryKind): void {
    if (this.focusHistoryEntry) {
      history.replaceState({ protopipeFocus: kind }, '', window.location.href);
      this.focusHistoryEntry = kind;
      return;
    }
    history.pushState({ protopipeFocus: kind }, '', window.location.href);
    this.focusHistoryEntry = kind;
  }

  private clearFocusHistory(syncHistory: boolean): void {
    if (!this.focusHistoryEntry) return;

    this.focusHistoryEntry = null;

    if (!syncHistory) return;

    this.suppressFocusPopState = true;
    history.back();
    queueMicrotask(() => {
      this.suppressFocusPopState = false;
    });
  }

  private restoreFocusReturnContext(_runKind?: string): void {
    const ctx = this.focusReturnContext;
    this.focusReturnContext = null;

    // Legacy: content-plan runs opened with no return ctx (old Strategy binder).
    if (!ctx) {
      this.activeView.set('strategy');
      this.activeNavId.set('start-strategy');
      this.sidePanel.setOpen(false);
      this.strategyViewState.clearArticle();
      return;
    }

    this.activeView.set(ctx.view);
    this.activeNavId.set(ctx.navId);

    if (ctx.view === 'strategy') {
      this.strategyViewState.restorePanelContext({
        sidePanelOpen: ctx.sidePanelOpen,
        articleKey: ctx.strategyArticleKey,
        visualView: ctx.strategyVisualView,
      });
      return;
    }

    if (ctx.view === 'keywords' && ctx.sidePanelOpen) {
      this.sidePanel.setOpen(true);
    } else {
      this.sidePanel.setOpen(false);
    }
  }

  private syncProspectorFromRoute(): void {
    const path = this.router.url.split('?')[0] ?? '';
    if (path === '/home/prospector' || path.startsWith('/home/prospector')) {
      this.leaveWriterFocus();
      this.sidePanel.setOpen(false);
      this.activeView.set('prospector');
      this.activeNavId.set('prospector');
    }
  }

  private syncColdCallerFromRoute(): void {
    const path = this.router.url.split('?')[0] ?? '';
    if (path === '/home/cold-caller' || path.startsWith('/home/cold-caller')) {
      this.leaveWriterFocus();
      this.sidePanel.setOpen(false);
      this.activeView.set('cold-caller');
      this.activeNavId.set('cold-caller');
    }
  }

  private syncBillingFromRoute(): void {
    const path = this.router.url.split('?')[0] ?? '';
    if (path === '/home/billing' || path.startsWith('/home/billing')) {
      this.leaveWriterFocus();
      this.sidePanel.setOpen(false);
      this.activeView.set('billing');
      this.activeNavId.set('account-billing');
    }
  }

  private showLeadsView(): void {
    this.leaveWriterFocus();
    this.sidePanel.setOpen(false);
    this.activeView.set('leads');
    this.activeNavId.set('analytics-leads');
  }

  private syncPitchPrepFromRoute(): void {
    const path = this.router.url.split('?')[0] ?? '';
    const wizardPrefix = '/home/pitch-prep/';
    if (path.startsWith(wizardPrefix) && path.endsWith('/wizard')) {
      const prospectId = decodeURIComponent(
        path.slice(wizardPrefix.length, path.length - '/wizard'.length),
      );
      if (prospectId) {
        this.showPitchPrepWizard(prospectId);
        return;
      }
    }
    if (path === '/home/pitch-prep' || path.startsWith('/home/pitch-prep')) {
      this.showPitchPrepBoard();
    }
  }

  private showPitchPrepBoard(): void {
    this.leaveWriterFocus();
    this.sidePanel.setOpen(false);
    this.activeView.set('pitch-prep');
    this.activeNavId.set('content-pitch-prep');
    this.pitchPrepProspectId.set(null);
  }

  private showPitchPrepWizard(prospectId: string): void {
    this.leaveWriterFocus();
    this.sidePanel.setOpen(false);
    this.activeView.set('pitch-prep');
    this.activeNavId.set('content-pitch-prep');
    this.pitchPrepProspectId.set(prospectId);
  }

  private syncPacksFromRoute(): void {
    const path = this.router.url.split('?')[0] ?? '';
    if (path.startsWith('/home/packs/') && path.length > '/home/packs/'.length) {
      const packId = decodeURIComponent(path.slice('/home/packs/'.length));
      this.showPackDetail(packId);
      return;
    }
    if (path === '/home/packs' || path.startsWith('/home/packs')) {
      this.showPacksStore();
    }
  }

  private showPacksStore(): void {
    this.leaveWriterFocus();
    this.sidePanel.setOpen(false);
    this.activeView.set('packs');
    this.activeNavId.set('content-packs');
    this.packDetailId.set(null);
    void this.thoughtPacks.ensureCatalogLoaded();
  }

  private showPackDetail(packId: string): void {
    this.leaveWriterFocus();
    this.sidePanel.setOpen(false);
    this.activeView.set('packs');
    this.activeNavId.set('content-packs');
    this.packDetailId.set(packId);
    void this.thoughtPacks.ensureCatalogLoaded();
  }

  private gateNavItems(
    items: readonly ProtopipeHomeNavItem[],
    access: ProtopipeAccessState,
  ): ProtopipeHomeNavItem[] {
    const gated = items
      .map((item) => {
        if (item.separator) {
          return item;
        }

        const hasCapability = hasProtopipeCapability(access, item.capability);
        if (!hasCapability && item.hiddenWhenLocked) {
          return null;
        }

        const children = item.children ? this.gateNavItems(item.children, access) : undefined;
        if (item.children && (!children || children.length === 0)) {
          return null;
        }

        return {
          ...item,
          children,
          locked: !hasCapability,
        };
      })
      .filter((item): item is ProtopipeHomeNavItem => item !== null);

    return gated.filter((item, index, list) => {
      if (!item.separator) return true;
      const previous = list[index - 1];
      const next = list[index + 1];
      return Boolean(previous && next && !previous.separator && !next.separator);
    });
  }

  private findNavItemById(
    items: readonly ProtopipeHomeNavItem[],
    id: string,
  ): ProtopipeHomeNavItem | null {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const child = this.findNavItemById(item.children, id);
        if (child) return child;
      }
    }
    return null;
  }

  private showLockedNotice(item: ProtopipeHomeNavItem): void {
    const access = this.accessState();
    const upgrade = item.lockedLabel ?? access.upgradeLabel.replace('Upgrade to ', '');
    if (access.isReadOnly) {
      this.accessNotice.set(
        `${item.label} is locked while this workspace is ${access.statusLabel.toLowerCase()}. Choose a plan to keep going.`,
      );
      return;
    }
    this.accessNotice.set(
      `${item.label} is included with ${upgrade}. Your current access is ${access.statusLabel}.`,
    );
  }

  private async loadBootstrap(): Promise<void> {
    try {
      const boot = await this.onboarding.load();
      const siteId = resolveBootstrapSiteId(boot);
      const site = siteId ? (boot.sites.find((s) => s.id === siteId) ?? null) : null;
      this.siteDisplayName.set(site?.displayName?.trim() || site?.hostname || 'Your site');
      this.siteHostname.set(site?.hostname || '');

      if (site?.id) {
        this.siteId.set(site.id);
        await this.strategy.ensureLoaded();
        void this.thoughtPacks.ensureCatalogLoaded();
        this.contentPlan.setSiteId(site.id);
        await this.contentPlan.loadLatest();
        void this.keywordStore.load();
        this.syncViewFromRoute();
      }
    } catch {
      this.siteDisplayName.set('Your workspace');
      this.siteHostname.set('');
    } finally {
      this.syncViewFromRoute();
      this.syncViewFromQuery();
      this.loading.set(false);
    }
  }
}
