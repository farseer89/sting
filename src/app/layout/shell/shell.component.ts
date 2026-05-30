import { NgClass } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { Menu } from 'primeng/menu';
import { Ripple } from 'primeng/ripple';
import { StyleClass } from 'primeng/styleclass';
import { Toast } from 'primeng/toast';
import { Tooltip } from 'primeng/tooltip';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { NavMenuItem, NavigationService } from '../../core/config/navigation.service';
import {
  MAX_ROOT_FONT_PX,
  MIN_ROOT_FONT_PX,
  ThemeService,
} from '../../core/theme/theme.service';
import { THEME_GROUPS } from '../../core/theme/theme.types';
import { ProtopipeContentService } from '../../features/protopipe/protopipe-content.service';
import { ProtopipeWritingToolsComponent } from '../../features/protopipe/content/protopipe-writing-tools.component';
import { SessionExpiredDialogComponent } from '../../shared/session-expired-dialog/session-expired-dialog.component';

export interface ShellBreadcrumb {
  label: string;
  routerLink?: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgClass,
    Menu,
    Ripple,
    StyleClass,
    Toast,
    Tooltip,
    SessionExpiredDialogComponent,
    ProtopipeWritingToolsComponent,
  ],
  providers: [MessageService],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly nav = inject(NavigationService);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);
  private readonly content = inject(ProtopipeContentService);
  private readonly themeService = inject(ThemeService);

  readonly currentThemeId = this.themeService.themeId;

  readonly themeMenuItems: MenuItem[] = buildThemeMenuItems((id) => this.themeService.setTheme(id));

  // UI scale (root font size) — see ThemeService.
  readonly rootFontPx = this.themeService.rootFontPx;
  readonly minScale = MIN_ROOT_FONT_PX;
  readonly maxScale = MAX_ROOT_FONT_PX;

  increaseScale(event?: Event): void {
    event?.stopPropagation();
    this.themeService.increaseScale();
  }

  decreaseScale(event?: Event): void {
    event?.stopPropagation();
    this.themeService.decreaseScale();
  }

  resetScale(event?: Event): void {
    event?.stopPropagation();
    this.themeService.resetScale();
  }

  readonly inWritingMode = this.content.inWritingMode;

  private routerSub?: Subscription;

  readonly logoSrc = 'assets/images/blocks/logos/fieldwave.png';
  readonly defaultAvatar = 'assets/images/blocks/avatars/circle/avatar-f-1.png';

  navigationItems: NavMenuItem[] = [];
  breadcrumbs: ShellBreadcrumb[] = [{ label: 'Home' }];

  userPhotoUrl = this.defaultAvatar;
  userFullName = 'User';
  mobileMenuOpen = false;

  private readonly openMenus = new Set<string>();

  readonly userMenuItems: MenuItem[] = [
    { label: 'Logout', icon: 'pi pi-sign-out', command: () => this.logout() },
  ];

  ngOnInit(): void {
    this.navigationItems = this.nav.getMenuItems();
    for (const id of this.nav.getDefaultOpenMenuIds()) {
      this.openMenus.add(id);
    }

    this.loadUserData();
    this.updateBreadcrumbs(this.router.url);

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.updateBreadcrumbs(e.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  isOpen(id: string | undefined): boolean {
    return id ? this.openMenus.has(id) : false;
  }

  toggleMenu(id: string | undefined): void {
    if (!id) return;
    if (this.openMenus.has(id)) {
      this.openMenus.delete(id);
    } else {
      this.openMenus.add(id);
    }
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  onNavClick(): void {
    this.closeMobileMenu();
  }

  onBugReport(): void {
    this.messages.add({
      severity: 'info',
      summary: 'Bug report',
      detail: 'Bug reporting will be wired in a follow-up.',
      life: 3000,
    });
  }

  isActiveTheme(id: string): boolean {
    return this.currentThemeId() === id;
  }

  onNotifications(): void {
    this.messages.add({
      severity: 'info',
      summary: 'Notifications',
      detail: 'No notifications yet.',
      life: 3000,
    });
  }

  private loadUserData(): void {
    const photo = this.auth.getCurrentUserPhoto();
    this.userPhotoUrl = photo || this.defaultAvatar;
    const fullName = this.auth.getCurrentUserFullName();
    if (fullName?.trim()) {
      this.userFullName = fullName.trim();
    }
  }

  private updateBreadcrumbs(url: string): void {
    const path = url.split('?')[0];
    if (path === '/dev/docs') {
      this.breadcrumbs = [
        { label: 'Home', routerLink: '/home' },
        { label: 'Dev Docs' },
      ];
      return;
    }
    if (path === '/dev/ui') {
      this.breadcrumbs = [
        { label: 'Home', routerLink: '/home' },
        { label: 'UI Playground' },
      ];
      return;
    }
    if (path.startsWith('/protopipe/content/')) {
      const writing = path.includes('/content/new') || path.match(/\/content\/[a-f0-9]{24}$/i);
      this.breadcrumbs = writing
        ? [
            { label: 'Content', routerLink: '/protopipe/content' },
            { label: 'Writing' },
          ]
        : [{ label: 'Content' }];
      return;
    }
    if (path === '/protopipe/content') {
      this.breadcrumbs = [{ label: 'Content' }];
      return;
    }
    if (path === '/protopipe/keywords') {
      this.breadcrumbs = [
        { label: 'My Sites' },
        { label: 'My Plan', routerLink: '/protopipe' },
        { label: 'Keywords' },
      ];
      return;
    }
    if (path === '/protopipe') {
      this.breadcrumbs = [
        { label: 'My Sites' },
        { label: 'My Plan' },
      ];
      return;
    }
    if (path === '/home') {
      this.breadcrumbs = [{ label: 'Alpha Home' }];
      return;
    }
    if (path === '/' || path === '') {
      this.breadcrumbs = [{ label: 'My Plan', routerLink: '/protopipe' }];
      return;
    }
  }

  private logout(): void {
    this.auth.logout();
  }
}

/**
 * Build the palette dropdown items from THEME_GROUPS, inserting separators
 * between groups (matches PRIME_BLOCKS alpha-layout structure).
 */
function buildThemeMenuItems(onPick: (id: string) => void): MenuItem[] {
  const items: MenuItem[] = [];
  THEME_GROUPS.forEach((group, gIdx) => {
    if (gIdx > 0) items.push({ separator: true });
    for (const theme of group.themes) {
      items.push({
        label: theme.label,
        icon: theme.icon,
        command: () => onPick(theme.id),
      });
    }
  });
  return items;
}
