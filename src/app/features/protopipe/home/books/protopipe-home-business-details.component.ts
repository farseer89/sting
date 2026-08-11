import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { ProgressSpinner } from 'primeng/progressspinner';
import type {
  CustomerMarketScope,
  MarketLocationRef,
  MarketReachMode,
  ProtopipeBrandAlias,
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

type BinderSection =
  | 'overview'
  | 'brand'
  | 'services'
  | 'market'
  | 'customers'
  | 'competitors'
  | 'facts';

type BrandAliasDraft = Pick<ProtopipeBrandAlias, 'id' | 'value' | 'source' | 'status' | 'notes'>;

interface BrandIdentityDraft {
  primaryName: string;
  aliases: BrandAliasDraft[];
}

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
  readonly saveError = signal<string | null>(null);
  readonly saveStatus = signal<string | null>(null);
  readonly savingBrand = signal(false);
  readonly answeredCards = signal<ProtopipeContextCard[]>([]);
  readonly binderSection = signal<BinderSection>('overview');
  readonly brandDraft = signal<BrandIdentityDraft>({ primaryName: '', aliases: [] });

  readonly profile = () => this.strategy.onboardingProfile();
  readonly site = () => this.strategy.site();

  readonly serviceCount = computed(() => this.profile()?.services.length ?? 0);
  readonly avatarCount = computed(() => this.profile()?.customerAvatars.length ?? 0);
  readonly competitorCount = computed(() => this.profile()?.competitors.length ?? 0);
  readonly factCount = computed(() => this.answeredCards().length);
  readonly brandAliasCount = computed(
    () => this.brandDraft().aliases.filter((alias) => alias.status === 'confirmed').length,
  );
  readonly brandDirty = computed(
    () => JSON.stringify(this.brandDraft()) !== JSON.stringify(this.persistedBrandDraft()),
  );

  ngOnInit(): void {
    void this.init();
  }

  selectSection(section: BinderSection): void {
    this.binderSection.set(section);
  }

  updatePrimaryName(value: string): void {
    this.brandDraft.update((draft) => ({ ...draft, primaryName: value }));
    this.saveStatus.set(null);
  }

  updateAlias(index: number, field: keyof BrandAliasDraft, value: string): void {
    this.brandDraft.update((draft) => ({
      ...draft,
      aliases: draft.aliases.map((alias, aliasIndex) =>
        aliasIndex === index ? { ...alias, [field]: value } : alias,
      ),
    }));
    this.saveStatus.set(null);
  }

  addAlias(): void {
    this.brandDraft.update((draft) => ({
      ...draft,
      aliases: [
        ...draft.aliases,
        {
          id: `temp-${crypto.randomUUID()}`,
          value: '',
          source: 'manual',
          status: 'confirmed',
        },
      ],
    }));
    this.saveStatus.set(null);
  }

  removeAlias(index: number): void {
    this.brandDraft.update((draft) => ({
      ...draft,
      aliases: draft.aliases.filter((_, aliasIndex) => aliasIndex !== index),
    }));
    this.saveStatus.set(null);
  }

  resetBrandDraft(): void {
    this.brandDraft.set(this.persistedBrandDraft());
    this.saveError.set(null);
    this.saveStatus.set(null);
  }

  async saveBrandIdentity(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    const draft = this.brandDraft();
    const primaryName = draft.primaryName.trim();
    if (primaryName.length < 2) {
      this.saveError.set('Add a primary brand name before saving.');
      return;
    }

    this.savingBrand.set(true);
    this.saveError.set(null);
    this.saveStatus.set(null);
    try {
      const response = await this.api.saveBrandIdentity(siteId, {
        brandIdentity: {
          primaryName,
          aliases: draft.aliases
            .map((alias) => ({
              ...alias,
              value: alias.value.trim(),
              notes: alias.notes?.trim() || undefined,
            }))
            .filter((alias) => alias.value.length > 0),
        },
      });
      this.strategy.applyPlan(response.plan);
      this.resetBrandDraft();
      this.saveStatus.set('Brand identity saved.');
    } catch (err) {
      this.saveError.set(parseProtopipeApiError(err, 'Could not save brand identity.'));
    } finally {
      this.savingBrand.set(false);
    }
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
    this.resetBrandDraft();
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

  private persistedBrandDraft(): BrandIdentityDraft {
    const site = this.strategy.site();
    const brandIdentity = this.strategy.brandIdentity();
    return {
      primaryName: brandIdentity?.primaryName || site?.displayName || '',
      aliases:
        brandIdentity?.aliases?.length
          ? brandIdentity.aliases.map((alias) => ({
              id: alias.id,
              value: alias.value,
              source: alias.source,
              status: alias.status,
              notes: alias.notes,
            }))
          : site?.displayName
            ? [
                {
                  id: 'site-display-name',
                  value: site.displayName,
                  source: 'site_display_name',
                  status: 'confirmed',
                },
              ]
            : [],
    };
  }
}
