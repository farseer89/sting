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
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ContentPlanStore } from '../content-plan/content-plan.store';
import { ProtopipeOnboardingStateService } from '../onboarding/protopipe-onboarding-state.service';
import { ProtopipeStrategyService } from '../protopipe-strategy.service';
import { ProtopipeKeywordSearchPanelComponent } from './keyword-picker/protopipe-keyword-search-panel.component';
import { ProtopipeKeywordPickerStore } from './keyword-picker/protopipe-keyword-picker.store';
import { ProtopipeHomeStrategyComponent } from './strategy/protopipe-home-strategy.component';
import { ProtopipeStrategyContextPanelComponent } from './strategy/protopipe-strategy-context-panel.component';
import { ProtopipeHomeStrategyViewState } from './strategy/protopipe-home-strategy-view.state';
import { ProtopipeHomeWriterComponent } from './protopipe-home-writer.component';
import { ProtopipeHomeWriterViewState } from './protopipe-home-writer-view.state';
import { ProtopipeWriterContextPanelComponent } from './strategy/protopipe-writer-context-panel.component';
import { ProtopipeKeywordPickerComponent } from './keyword-picker/protopipe-keyword-picker.component';
import { ProtopipeHomeSidePanelService } from './protopipe-home-side-panel.service';
import {
  PROTOPIPE_HOME_NAV,
  PROTOPIPE_HOME_NAV_DEFAULT_OPEN,
  type ProtopipeHomeNavItem,
} from './protopipe-home-nav';

export type ProtopipeHomeView = 'keywords' | 'strategy' | 'writer';

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
  ],
  imports: [
    ProtopipeKeywordPickerComponent,
    ProtopipeKeywordSearchPanelComponent,
    ProtopipeHomeStrategyComponent,
    ProtopipeHomeWriterComponent,
    ProtopipeStrategyContextPanelComponent,
    ProtopipeWriterContextPanelComponent,
  ],
  templateUrl: './protopipe-user-home.component.html',
  styleUrl: './protopipe-user-home.component.scss',
})
export class ProtopipeUserHomeComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly onboarding = inject(ProtopipeOnboardingStateService);
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly contentPlan = inject(ContentPlanStore);
  readonly sidePanel = inject(ProtopipeHomeSidePanelService);
  /** Shared with strategy children + context panel — inspect selectedArticle() when debugging clicks. */
  readonly strategyViewState = inject(ProtopipeHomeStrategyViewState);
  readonly writerViewState = inject(ProtopipeHomeWriterViewState);
  private readonly keywordStore = inject(ProtopipeKeywordPickerStore);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly homeWorkspaceEl = viewChild<ElementRef<HTMLElement>>('homeWorkspace');

  readonly showSidePanel = computed(() => {
    if (!this.sidePanel.open()) {
      return false;
    }
    const view = this.activeView();
    return view === 'keywords' || view === 'strategy' || view === 'writer';
  });

  readonly showKeywordSidePanel = computed(
    () => this.showSidePanel() && this.activeView() === 'keywords',
  );

  readonly showStrategySidePanel = computed(
    () => this.showSidePanel() && this.activeView() === 'strategy',
  );

  readonly showWriterSidePanel = computed(
    () => this.showSidePanel() && this.activeView() === 'writer',
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

  readonly navItems = PROTOPIPE_HOME_NAV;
  readonly navCollapsed = signal(false);
  readonly openNavGroupIds = signal<string[]>([...PROTOPIPE_HOME_NAV_DEFAULT_OPEN]);
  readonly siteDisplayName = signal('');
  readonly siteHostname = signal('');
  readonly subscriptionLabel = signal('Workspace');
  readonly loading = signal(true);
  readonly activeView = signal<ProtopipeHomeView>('keywords');
  readonly activeNavId = signal('start-keywords');
  readonly userMenuOpen = signal(false);

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

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.sidePanel.detachResizeListeners());
    this.writerViewState.setExitHandler(() => this.leaveWriterFocus());
    this.strategyViewState.setEnterWriterHandler(() => this.enterWriterFocus());
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

  toggleNavCollapse(): void {
    this.navCollapsed.update((v) => !v);
  }

  selectNavItem(item: ProtopipeHomeNavItem): void {
    if (item.disabled) return;
    if (item.id === 'start-keywords') {
      this.leaveWriterFocus();
      this.activeNavId.set(item.id);
      this.activeView.set('keywords');
    } else if (item.id === 'start-strategy') {
      this.leaveWriterFocus();
      this.activeNavId.set(item.id);
      this.activeView.set('strategy');
    } else if (item.id === 'content-writer') {
      this.enterWriterFocus();
    } else if (item.id === 'int-wordpress' || item.id === 'int-google') {
      void this.router.navigate(['/protopipe/settings/integrations']);
    }
  }

  enterWriterFocus(): void {
    if (!this.writerViewState.activePostId()) {
      this.writerViewState.openCreate();
    }
    this.writerViewState.clearPanel();
    this.sidePanel.setOpen(false);
    this.activeNavId.set('content-writer');
    this.activeView.set('writer');
  }

  leaveWriterFocus(): void {
    this.writerViewState.clearPanel();
    this.writerViewState.clearSession();
    this.sidePanel.setOpen(false);
    if (this.activeView() === 'writer') {
      this.activeView.set('strategy');
      this.activeNavId.set('start-strategy');
    }
  }

  onKeywordsConfirmed(): void {
    this.activeView.set('strategy');
    this.activeNavId.set('start-strategy');
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.userMenuOpen.update((open) => !open);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  logout(): void {
    this.closeUserMenu();
    this.auth.logout();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeUserMenu();
    if (this.activeView() === 'writer') {
      this.leaveWriterFocus();
    }
  }

  isNavItemActive(item: ProtopipeHomeNavItem): boolean {
    return !item.disabled && this.activeNavId() === item.id;
  }

  private async loadBootstrap(): Promise<void> {
    try {
      const boot = await this.onboarding.load();
      const site =
        boot.sites.find((s) => s.id === boot.primarySiteId) ?? boot.sites[0] ?? null;
      this.siteDisplayName.set(site?.displayName?.trim() || site?.hostname || 'Your site');
      this.siteHostname.set(site?.hostname || '');
      const status = boot.subscription?.subscriptionStatus;
      if (status === 'trialing') {
        this.subscriptionLabel.set('Trial');
      } else if (status === 'active') {
        this.subscriptionLabel.set('Pro');
      } else {
        this.subscriptionLabel.set('Workspace');
      }

      if (site?.id) {
        await this.strategy.ensureLoaded();
        this.contentPlan.setSiteId(site.id);
        await this.contentPlan.loadLatest();
        void this.keywordStore.load();
        const planStatus = this.contentPlan.status();
        if (planStatus === 'running' || planStatus === 'pending' || planStatus === 'complete') {
          this.activeView.set('strategy');
          this.activeNavId.set('start-strategy');
        }
      }
    } catch {
      this.siteDisplayName.set('Your workspace');
      this.siteHostname.set('');
    } finally {
      this.loading.set(false);
    }
  }
}
