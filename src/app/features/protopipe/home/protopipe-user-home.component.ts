import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ProtopipeOnboardingStateService } from '../onboarding/protopipe-onboarding-state.service';
import {
  PROTOPIPE_HOME_NAV,
  PROTOPIPE_HOME_NAV_DEFAULT_OPEN,
  type ProtopipeHomeNavItem,
} from './protopipe-home-nav';

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
  templateUrl: './protopipe-user-home.component.html',
  styleUrl: './protopipe-user-home.component.scss',
})
export class ProtopipeUserHomeComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly onboarding = inject(ProtopipeOnboardingStateService);

  constructor() {
    document.documentElement.classList.add('void-home', 'void-white');
    this.destroyRef.onDestroy(() => {
      document.documentElement.classList.remove('void-home', 'void-white');
    });
  }

  readonly navItems = PROTOPIPE_HOME_NAV;
  readonly navCollapsed = signal(false);
  readonly openNavGroupIds = signal<string[]>([...PROTOPIPE_HOME_NAV_DEFAULT_OPEN]);
  readonly siteDisplayName = signal('');
  readonly siteHostname = signal('');
  readonly subscriptionLabel = signal('Workspace');
  readonly loading = signal(true);

  readonly userName = computed(() => {
    const full = this.auth.getCurrentUserFullName()?.trim();
    return full || 'User';
  });

  readonly userInitials = computed(() => initialsFromName(this.userName()));

  ngOnInit(): void {
    void this.loadBootstrap();
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
    } catch {
      this.siteDisplayName.set('Your workspace');
      this.siteHostname.set('');
    } finally {
      this.loading.set(false);
    }
  }
}
