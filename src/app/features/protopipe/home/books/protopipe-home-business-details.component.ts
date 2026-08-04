import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { ProgressSpinner } from 'primeng/progressspinner';
import type {
  CustomerMarketScope,
  MarketLocationRef,
  MarketReachMode,
  ProtopipeContextCard,
  ProtopipeOnboardingProfile,
} from '@hive/contracts';
import { firstValueFrom } from 'rxjs';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { MARKET_REACH_OPTIONS } from '../../onboarding/onboarding-market.constants';
import {
  inferMarketReach,
  resolveLocalMarket,
  resolveNationalMarket,
} from './discovery-book-market.utils';

type BinderSection = 'overview' | 'services' | 'market' | 'customers' | 'competitors' | 'facts';

const MARKET_SCOPE_LABELS: Record<CustomerMarketScope, string> = {
  local: 'Local',
  national: 'National',
  worldwide: 'Worldwide',
};

const MARKET_REACH_LABELS: Record<MarketReachMode, string> = Object.fromEntries(
  MARKET_REACH_OPTIONS.map((option) => [option.id, option.label]),
) as Record<MarketReachMode, string>;

@Component({
  selector: 'app-protopipe-home-business-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Message, ProgressSpinner, DatePipe],
  templateUrl: './protopipe-home-business-details.component.html',
  styleUrl: './protopipe-home-business-details.component.scss',
})
export class ProtopipeHomeBusinessDetailsComponent implements OnInit {
  private readonly api = inject(ProtopipeApiService);
  readonly strategy = inject(ProtopipeStrategyService);

  readonly showSharpen = input(true);
  readonly goSharpen = output<void>();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly answeredCards = signal<ProtopipeContextCard[]>([]);
  readonly binderSection = signal<BinderSection>('overview');

  readonly profile = () => this.strategy.onboardingProfile();
  readonly site = () => this.strategy.site();

  readonly serviceCount = computed(() => this.profile()?.services.length ?? 0);
  readonly avatarCount = computed(() => this.profile()?.customerAvatars.length ?? 0);
  readonly competitorCount = computed(() => this.profile()?.competitors.length ?? 0);
  readonly factCount = computed(() => this.answeredCards().length);

  ngOnInit(): void {
    void this.init();
  }

  selectSection(section: BinderSection): void {
    this.binderSection.set(section);
  }

  marketScopeLabel(scope: CustomerMarketScope): string {
    return MARKET_SCOPE_LABELS[scope] ?? scope;
  }

  marketReachLabel(profile: ProtopipeOnboardingProfile): string {
    const reach = inferMarketReach(profile);
    if (reach) return MARKET_REACH_LABELS[reach] ?? reach;
    return this.marketScopeLabel(profile.marketScope);
  }

  marketLocationLabel(ref: MarketLocationRef | null | undefined): string | null {
    if (!ref) return null;
    const parts = [ref.city, ref.state, ref.serpLocationName].filter(Boolean);
    if (parts.length) return [...new Set(parts)].join(', ');
    return ref.serpLocationName ?? null;
  }

  localMarketFor(profile: ProtopipeOnboardingProfile): MarketLocationRef | undefined {
    return resolveLocalMarket(profile);
  }

  nationalMarketFor(profile: ProtopipeOnboardingProfile): MarketLocationRef | undefined {
    return resolveNationalMarket(profile);
  }

  onboardingModeLabel(mode: ProtopipeOnboardingProfile['onboardingMode']): string {
    if (mode === 'strategy_only') return 'Pre-launch strategy';
    if (mode === 'existing_site') return 'Existing site';
    return 'Existing site';
  }

  locationSummary(profile: ProtopipeOnboardingProfile): string | null {
    const parts = [profile.city, profile.state, profile.countryIso].filter(Boolean);
    if (parts.length) return parts.join(', ');
    return profile.serpLocationName ?? null;
  }

  private async init(): Promise<void> {
    await this.strategy.ensureLoaded();
    await this.strategy.refreshPlan();
    const siteId = this.strategy.siteId();
    if (!siteId) {
      this.loading.set(false);
      return;
    }

    try {
      const res = await firstValueFrom(this.api.listContextCards$(siteId, { status: 'answered' }));
      this.answeredCards.set((res.cards ?? []).slice(0, 12));
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Could not load business book'));
    } finally {
      this.loading.set(false);
    }
  }
}
