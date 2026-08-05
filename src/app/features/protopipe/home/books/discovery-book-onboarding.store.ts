import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  ProtopipeFanOutCompetitorSuggestion,
  ProtopipeSerpLocationOption,
} from '@hive/contracts';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import {
  MARKET_COUNTRIES,
  marketReachNeedsCountry,
  marketReachNeedsLocal,
  type MarketCountryOption,
  type MarketReachMode,
  type OnboardingModeId,
} from '../../onboarding/onboarding-market.constants';
import { ProtopipeKeywordPickerStore } from '../keyword-picker/protopipe-keyword-picker.store';
import { ProtopipeOnboardingStateService } from '../../onboarding/protopipe-onboarding-state.service';
import type { DiscoveryBookOnboardingStepId } from './discovery-book-onboarding.steps';
import {
  draftFingerprint,
  draftFromStrategy,
  draftToOnboardingRequest,
  draftToProgressRequest,
  defaultMarketDraft,
  isPendingSiteHostname,
  normalizeDomain,
  normalizeUrl,
  syncLegacyMarketFields,
  type DiscoveryBookOnboardingDraft,
} from './discovery-book-onboarding.draft';
import { defaultNationalMarket } from './discovery-book-market.utils';
import { buildOnboardingScanUiContext } from '../../onboarding/onboarding-scan-context';

const MAX_SERVICES = 8;
const MAX_COMPETITORS = 3;
const MAX_TARGET_CUSTOMERS = 5;
const MAX_CUSTOMER_AVATARS = 12;

export interface AvatarEnrichmentPending {
  original: string;
  enriched: string;
}

@Injectable()
export class DiscoveryBookOnboardingStore {
  private readonly api = inject(ProtopipeApiService);
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly keywordStore = inject(ProtopipeKeywordPickerStore);
  private readonly onboardingState = inject(ProtopipeOnboardingStateService);

  private readonly baselineFingerprint = signal('');
  private readonly draft = signal<DiscoveryBookOnboardingDraft>(draftFromStrategy(null, null));

  readonly saving = signal(false);
  readonly stepSaving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveStatus = signal<string | null>(null);
  readonly stepError = signal<string | null>(null);
  readonly locationSuggestions = signal<ProtopipeSerpLocationOption[]>([]);
  readonly countrySuggestions = signal<MarketCountryOption[]>([]);
  readonly isSearchingLocations = signal(false);

  readonly serviceDraft = signal('');
  readonly competitorDraft = signal('');
  readonly targetCustomerDraft = signal('');

  readonly offerScanning = signal(false);
  readonly offerScanError = signal<string | null>(null);
  readonly offerScannedUrl = signal('');
  readonly siteFoundServices = signal<string[]>([]);
  readonly tradeLabel = signal<string | null>(null);
  readonly tradeSuggestions = signal<string[]>([]);
  readonly customerAvatarSuggestions = signal<string[]>([]);
  readonly businessNameHint = signal<string | null>(null);
  readonly scanResolvedBy = signal<'llm' | 'deterministic' | null>(null);
  readonly expandedSuggestions = signal<string[]>([]);
  readonly offerExpanding = signal(false);
  readonly offerExpandError = signal<string | null>(null);
  readonly avatarEnrichmentPending = signal<Record<number, AvatarEnrichmentPending>>({});
  readonly avatarEnrichingSlot = signal<number | null>(null);
  readonly avatarEnrichError = signal<string | null>(null);
  readonly competitorFanOutSuggestions = signal<ProtopipeFanOutCompetitorSuggestion[]>([]);
  readonly competitionFanningOut = signal(false);
  readonly competitionFanOutError = signal<string | null>(null);
  private offerScanDebounce: ReturnType<typeof setTimeout> | null = null;

  readonly scanUiContext = computed(() => {
    const draft = this.draft();
    return buildOnboardingScanUiContext({
      scan:
        this.offerScannedUrl().trim().length > 0
          ? {
              siteServices: this.siteFoundServices(),
              suggestedServices: this.tradeSuggestions(),
              tradeLabel: this.tradeLabel() ?? undefined,
              customerAvatars: this.customerAvatarSuggestions(),
              businessNameHint: this.businessNameHint() ?? undefined,
            }
          : null,
      websiteUrl: draft.websiteUrl,
      services: draft.services,
      tradeLabel: this.tradeLabel(),
      isStrategyOnly: draft.onboardingMode === 'strategy_only',
      marketScope: draft.marketScope,
      marketReach: draft.marketReach,
    });
  });

  readonly isDirty = computed(
    () => draftFingerprint(this.draft()) !== this.baselineFingerprint(),
  );

  readonly draftSnapshot = this.draft.asReadonly();

  syncFromStrategy(): void {
    // Baseline starts empty while the draft already has default market fields, so isDirty()
    // is true before the first sync. Only skip when the user has edited after a prior sync.
    const baseline = this.baselineFingerprint();
    if (!this.onboardingState.onboardingCompleted() && baseline && this.isDirty()) {
      return;
    }
    const next = draftFromStrategy(this.strategy.onboardingProfile(), this.strategy.site());
    this.draft.set(next);
    this.baselineFingerprint.set(draftFingerprint(next));
    this.saveError.set(null);
    this.saveStatus.set(null);
  }

  selectMode(mode: OnboardingModeId): void {
    this.draft.update((d) => ({ ...d, onboardingMode: mode }));
  }

  setWebsiteUrl(value: string): void {
    this.draft.update((d) => ({ ...d, websiteUrl: value }));
    this.invalidateOfferScan();
    this.scheduleOfferScan();
  }

  scheduleOfferScan(): void {
    if (this.offerScanDebounce) clearTimeout(this.offerScanDebounce);
    this.offerScanDebounce = setTimeout(() => void this.ensureOfferScan(), 700);
  }

  /** Cancel any pending debounce and scan immediately (e.g. when leaving step 1). */
  flushOfferScan(): void {
    if (this.offerScanDebounce) {
      clearTimeout(this.offerScanDebounce);
      this.offerScanDebounce = null;
    }
    void this.ensureOfferScan();
  }

  shouldAutoScanOfferOnEntry(): boolean {
    const d = this.draft();
    return (
      d.onboardingMode !== 'strategy_only' &&
      d.websiteUrl.trim().length > 0 &&
      d.services.length === 0 &&
      !this.hasCurrentOfferScan(d.websiteUrl)
    );
  }

  async flushOfferScanAndWait(): Promise<void> {
    if (this.offerScanDebounce) {
      clearTimeout(this.offerScanDebounce);
      this.offerScanDebounce = null;
    }
    await this.ensureOfferScan();
  }

  setBusinessName(value: string): void {
    this.draft.update((d) => ({ ...d, businessName: value }));
  }

  addService(): void {
    this.commitDraft(this.serviceDraft, 'services', MAX_SERVICES);
  }

  addSuggestedService(service: string): void {
    const label = service.trim();
    if (!label) return;
    this.draft.update((current) => {
      if (current.services.length >= MAX_SERVICES) return current;
      if (current.services.some((s) => s.toLowerCase() === label.toLowerCase())) return current;
      return { ...current, services: [...current.services, label] };
    });
  }

  siteFoundInServices(): string[] {
    const found = new Set(this.siteFoundServices().map((s) => s.toLowerCase()));
    return this.draft().services.filter((s) => found.has(s.toLowerCase()));
  }

  availableTradeSuggestions(): string[] {
    const selected = new Set(this.draft().services.map((s) => s.toLowerCase()));
    return this.tradeSuggestions().filter((s) => !selected.has(s.toLowerCase()));
  }

  availableExpandedSuggestions(): string[] {
    const selected = new Set(this.draft().services.map((s) => s.toLowerCase()));
    return this.expandedSuggestions().filter((s) => !selected.has(s.toLowerCase()));
  }

  canExpandServices(): boolean {
    return (
      this.draft().services.length > 0 &&
      this.draft().services.length < MAX_SERVICES &&
      !this.offerExpanding()
    );
  }

  expandExcludeList(): string[] {
    return Array.from(
      new Set([
        ...this.draft().services,
        ...this.tradeSuggestions(),
        ...this.expandedSuggestions(),
      ]),
    );
  }

  async expandServices(): Promise<void> {
    const selected = this.draft().services;
    if (selected.length === 0 || selected.length >= MAX_SERVICES) return;

    const siteId = this.strategy.siteId();
    if (!siteId) {
      this.offerExpandError.set('No site loaded.');
      return;
    }

    this.offerExpanding.set(true);
    this.offerExpandError.set(null);

    try {
      const res = await this.api.expandOffer(siteId, {
        selectedServices: selected,
        tradeLabel: this.tradeLabel() ?? undefined,
        websiteUrl: this.draft().websiteUrl.trim() || undefined,
        exclude: this.expandExcludeList(),
      });

      if (res.error === 'llm_not_configured') {
        this.offerExpandError.set('Expand needs AI configured on the server.');
        return;
      }
      if (res.error && res.expandedServices.length === 0) {
        this.offerExpandError.set('Could not expand services right now — try again.');
        return;
      }

      if (res.expandedServices.length > 0) {
        this.expandedSuggestions.update((current) =>
          Array.from(new Set([...current, ...res.expandedServices])),
        );
      } else {
        this.offerExpandError.set('No new related services found — try adjusting your selection.');
      }
    } catch (err) {
      this.offerExpandError.set(parseProtopipeApiError(err, 'Could not expand services.'));
    } finally {
      this.offerExpanding.set(false);
    }
  }

  availableAvatarSuggestions(): string[] {
    const used = new Set(
      this.draft()
        .customerAvatars.map((a) => a.trim().toLowerCase())
        .filter(Boolean),
    );
    return this.customerAvatarSuggestions().filter((s) => !used.has(s.trim().toLowerCase()));
  }

  applyAvatarSuggestion(text: string): void {
    const value = text.trim();
    if (value.length < 5) return;

    this.draft.update((d) => {
      const avatars = [...d.customerAvatars];
      const emptyIndex = avatars.findIndex((a) => !a.trim());
      if (emptyIndex >= 0) {
        avatars[emptyIndex] = value;
        return { ...d, customerAvatars: avatars };
      }
      if (avatars.length >= MAX_CUSTOMER_AVATARS) return d;
      return { ...d, customerAvatars: [...avatars, value] };
    });
  }

  invalidateOfferScan(): void {
    this.offerScannedUrl.set('');
    this.siteFoundServices.set([]);
    this.tradeLabel.set(null);
    this.tradeSuggestions.set([]);
    this.customerAvatarSuggestions.set([]);
    this.businessNameHint.set(null);
    this.scanResolvedBy.set(null);
    this.expandedSuggestions.set([]);
    this.offerExpandError.set(null);
    this.offerScanError.set(null);
  }

  async ensureOfferScan(): Promise<void> {
    const d = this.draft();
    if (d.onboardingMode === 'strategy_only') return;

    const url = d.websiteUrl.trim();
    if (!url) {
      this.offerScanError.set('Add your website on Getting started to scan services.');
      return;
    }

    if (this.hasCurrentOfferScan(url) && !this.offerScanning()) {
      return;
    }
    if (this.offerScanning()) {
      return;
    }

    const siteId = this.strategy.siteId();
    if (!siteId) {
      await this.strategy.ensureLoaded();
    }
    const resolvedSiteId = this.strategy.siteId();
    if (!resolvedSiteId) {
      this.offerScanError.set('No site loaded.');
      return;
    }

    this.offerScanning.set(true);
    this.offerScanError.set(null);

    try {
      const res = await this.api.scanOffer(resolvedSiteId, {
        websiteUrl: normalizeUrl(url),
      });
      this.offerScannedUrl.set(normalizeUrl(url));
      this.siteFoundServices.set(res.siteServices);
      this.tradeLabel.set(res.tradeLabel ?? null);
      this.tradeSuggestions.set(res.suggestedServices ?? res.tradeSuggestions ?? []);
      this.customerAvatarSuggestions.set(res.customerAvatars ?? []);
      this.scanResolvedBy.set(res.resolvedBy ?? null);
      this.businessNameHint.set(res.businessNameHint?.trim() || null);

      if (res.error === 'llm_not_configured') {
        this.offerScanError.set(
          'Site scan needs AI configured on the server — showing page headings only.',
        );
      }

      this.draft.update((current) => {
        let next = current;
        if (res.siteServices.length > 0 && current.services.length === 0) {
          next = { ...next, services: res.siteServices.slice(0, MAX_SERVICES) };
        }
        if (res.businessNameHint?.trim() && !current.businessName.trim()) {
          next = { ...next, businessName: res.businessNameHint.trim() };
        }

        const avatars = [...next.customerAvatars];
        const suggestions = res.customerAvatars ?? [];
        let changed = next !== current;
        for (let i = 0; i < suggestions.length && i < avatars.length; i += 1) {
          if (!avatars[i]?.trim()) {
            avatars[i] = suggestions[i];
            changed = true;
          }
        }
        return changed ? { ...next, customerAvatars: avatars } : next;
      });
    } catch (err) {
      this.offerScanError.set(parseProtopipeApiError(err, 'Could not scan your website.'));
    } finally {
      this.offerScanning.set(false);
    }
  }

  private hasCurrentOfferScan(url: string): boolean {
    const scanned = this.offerScannedUrl().trim();
    if (!scanned) return false;
    return normalizeDomain(scanned) === normalizeDomain(url);
  }

  removeService(index: number): void {
    this.draft.update((d) => ({
      ...d,
      services: d.services.filter((_, i) => i !== index),
    }));
  }

  onServiceDraftInput(value: string): void {
    this.serviceDraft.set(value);
  }

  updateCustomerAvatar(index: number, value: string): void {
    this.draft.update((d) => {
      const next = [...d.customerAvatars];
      next[index] = value;
      return { ...d, customerAvatars: next };
    });
    this.clearAvatarEnrichment(index);
  }

  avatarEnrichmentFor(index: number): AvatarEnrichmentPending | null {
    return this.avatarEnrichmentPending()[index] ?? null;
  }

  canEnrichCustomerAvatar(index: number): boolean {
    const text = (this.draft().customerAvatars[index] ?? '').trim();
    return (
      text.length >= 5 &&
      this.avatarEnrichmentFor(index) == null &&
      this.avatarEnrichingSlot() !== index
    );
  }

  private clearAvatarEnrichment(index: number): void {
    this.avatarEnrichmentPending.update((pending) => {
      if (!(index in pending)) return pending;
      const next = { ...pending };
      delete next[index];
      return next;
    });
  }

  dismissAvatarEnrichment(index: number): void {
    this.clearAvatarEnrichment(index);
    this.avatarEnrichError.set(null);
  }

  confirmAvatarEnrichment(index: number): void {
    const pending = this.avatarEnrichmentFor(index);
    if (!pending) return;
    this.draft.update((d) => {
      const next = [...d.customerAvatars];
      next[index] = pending.enriched;
      return { ...d, customerAvatars: next };
    });
    this.clearAvatarEnrichment(index);
    this.avatarEnrichError.set(null);
  }

  async enrichCustomerAvatar(index: number): Promise<void> {
    const draft = (this.draft().customerAvatars[index] ?? '').trim();
    if (draft.length < 5) return;

    const siteId = this.strategy.siteId();
    if (!siteId) {
      this.avatarEnrichError.set('No site loaded.');
      return;
    }

    this.avatarEnrichingSlot.set(index);
    this.avatarEnrichError.set(null);

    try {
      const res = await this.api.enrichCustomer(siteId, {
        draft,
        services: this.draft().services,
        tradeLabel: this.tradeLabel() ?? undefined,
      });

      if (res.error === 'llm_not_configured') {
        this.avatarEnrichError.set('Add detail needs AI configured on the server.');
        return;
      }
      if (res.error === 'no_change') {
        this.avatarEnrichError.set('Already specific enough — add a bit more detail first.');
        return;
      }
      if (res.error && res.enriched === draft) {
        this.avatarEnrichError.set('Could not add detail right now — try again.');
        return;
      }

      this.avatarEnrichmentPending.update((pending) => ({
        ...pending,
        [index]: { original: draft, enriched: res.enriched },
      }));
    } catch (err) {
      this.avatarEnrichError.set(parseProtopipeApiError(err, 'Could not add detail.'));
    } finally {
      this.avatarEnrichingSlot.set(null);
    }
  }

  addCustomerAvatarSlot(): void {
    this.draft.update((d) => {
      if (d.customerAvatars.length >= MAX_CUSTOMER_AVATARS) return d;
      return { ...d, customerAvatars: [...d.customerAvatars, ''] };
    });
  }

  removeCustomerAvatar(index: number): void {
    if (index <= 0) return;
    this.draft.update((d) => {
      if (d.customerAvatars.length <= 1) return d;
      return {
        ...d,
        customerAvatars: d.customerAvatars.filter((_, i) => i !== index),
      };
    });
  }

  canAddCustomerAvatar(): boolean {
    const avatars = this.draft().customerAvatars;
    return avatars.length < MAX_CUSTOMER_AVATARS && (avatars[0] ?? '').trim().length >= 5;
  }

  addTargetCustomer(): void {
    this.commitDraft(this.targetCustomerDraft, 'targetCustomerSites', MAX_TARGET_CUSTOMERS, normalizeDomain);
  }

  removeTargetCustomer(index: number): void {
    this.draft.update((d) => ({
      ...d,
      targetCustomerSites: d.targetCustomerSites.filter((_, i) => i !== index),
    }));
  }

  onTargetCustomerDraftInput(value: string): void {
    this.targetCustomerDraft.set(value);
  }

  addCompetitor(): void {
    this.commitDraft(this.competitorDraft, 'competitors', MAX_COMPETITORS, normalizeDomain);
  }

  addSuggestedCompetitor(domain: string): void {
    const label = normalizeDomain(domain);
    if (!label) return;
    this.draft.update((current) => {
      if (current.competitors.length >= MAX_COMPETITORS) return current;
      if (current.competitors.some((c) => c.toLowerCase() === label.toLowerCase())) return current;
      return { ...current, competitors: [...current.competitors, label] };
    });
  }

  availableCompetitorFanOutSuggestions(): ProtopipeFanOutCompetitorSuggestion[] {
    const selected = new Set(this.draft().competitors.map((c) => c.toLowerCase()));
    return this.competitorFanOutSuggestions().filter(
      (suggestion) => !selected.has(suggestion.domain.toLowerCase()),
    );
  }

  canFanOutCompetition(): boolean {
    return (
      this.draft().competitors.length > 0 &&
      this.draft().competitors.length < MAX_COMPETITORS &&
      !this.competitionFanningOut()
    );
  }

  competitionFanOutExcludeList(): string[] {
    return Array.from(
      new Set([
        ...this.draft().competitors,
        ...this.competitorFanOutSuggestions().map((suggestion) => suggestion.domain),
      ]),
    );
  }

  async fanOutCompetition(): Promise<void> {
    const selected = this.draft().competitors;
    if (selected.length === 0 || selected.length >= MAX_COMPETITORS) return;

    const siteId = this.strategy.siteId();
    if (!siteId) {
      this.competitionFanOutError.set('No site loaded.');
      return;
    }

    this.competitionFanningOut.set(true);
    this.competitionFanOutError.set(null);

    try {
      const draft = this.draft();
      const res = await this.api.fanOutCompetition(siteId, {
        selectedCompetitors: selected,
        services: draft.services,
        tradeLabel: this.tradeLabel() ?? undefined,
        websiteUrl: draft.websiteUrl.trim() || undefined,
        marketScope: draft.marketScope ?? undefined,
        serpLocationCode: draft.serpLocationCode,
        serpLocationName: draft.serpLocationName,
        exclude: this.competitionFanOutExcludeList(),
      });

      if (res.error === 'dataforseo_not_configured') {
        this.competitionFanOutError.set('Fan out needs DataForSEO configured on the server.');
        return;
      }
      if (res.error === 'no_ranking_competitors_found') {
        this.competitionFanOutError.set(
          'No ranking competitors found for your site and market yet.',
        );
        return;
      }
      if (res.error && res.suggestions.length === 0) {
        this.competitionFanOutError.set('Could not look up ranking competitors right now — try again.');
        return;
      }

      if (res.suggestions.length > 0) {
        this.competitorFanOutSuggestions.update((current) => {
          const byDomain = new Map(current.map((suggestion) => [suggestion.domain.toLowerCase(), suggestion]));
          for (const suggestion of res.suggestions) {
            byDomain.set(suggestion.domain.toLowerCase(), suggestion);
          }
          return Array.from(byDomain.values());
        });
      } else {
        this.competitionFanOutError.set(
          'No new ranking competitors found — try adjusting who you added first.',
        );
      }
    } catch (err) {
      this.competitionFanOutError.set(parseProtopipeApiError(err, 'Could not fan out competitors.'));
    } finally {
      this.competitionFanningOut.set(false);
    }
  }

  removeCompetitor(index: number): void {
    this.draft.update((d) => ({
      ...d,
      competitors: d.competitors.filter((_, i) => i !== index),
    }));
  }

  onCompetitorDraftInput(value: string): void {
    this.competitorDraft.set(value);
  }

  selectMarketReach(reach: MarketReachMode): void {
    this.draft.update((d) => {
      const next: DiscoveryBookOnboardingDraft = {
        ...d,
        marketReach: reach,
        localMarket: marketReachNeedsLocal(reach) ? d.localMarket : null,
        nationalMarket: marketReachNeedsCountry(reach)
          ? (d.nationalMarket ?? defaultNationalMarket())
          : null,
      };
      return syncLegacyMarketFields(next);
    });
  }

  ensureMarketDefaults(): void {
    this.draft.update((d) => {
      if (d.marketReach) return syncLegacyMarketFields(d);
      return { ...d, ...defaultMarketDraft() };
    });
  }

  selectLocation(option: ProtopipeSerpLocationOption | null): void {
    if (!option) {
      this.draft.update((d) => {
        if (!d.localMarket) return d;
        const next = { ...d, localMarket: null };
        return syncLegacyMarketFields(next);
      });
      return;
    }

    const parts = option.name.split(',').map((p) => p.trim());
    this.draft.update((d) => {
      const localMarket = {
        serpLocationCode: option.code,
        serpLocationName: option.name,
        city: parts[0] || d.localMarket?.city,
        state: parts[1] || d.localMarket?.state,
        countryIso: option.country || d.localMarket?.countryIso || d.nationalMarket?.countryIso,
      };
      if (
        d.localMarket?.serpLocationCode === localMarket.serpLocationCode &&
        d.localMarket?.serpLocationName === localMarket.serpLocationName
      ) {
        return d;
      }
      return syncLegacyMarketFields({ ...d, localMarket });
    });
  }

  selectCountry(option: MarketCountryOption | null): void {
    if (!option) {
      this.draft.update((d) => {
        if (!d.nationalMarket) return d;
        const next = { ...d, nationalMarket: defaultNationalMarket() };
        return syncLegacyMarketFields(next);
      });
      return;
    }
    this.draft.update((d) => {
      const nationalMarket = {
        serpLocationCode: option.code,
        serpLocationName: option.name,
        countryIso: option.iso,
      };
      if (
        d.nationalMarket?.serpLocationCode === nationalMarket.serpLocationCode &&
        d.nationalMarket?.serpLocationName === nationalMarket.serpLocationName &&
        d.nationalMarket?.countryIso === nationalMarket.countryIso
      ) {
        return d;
      }
      return syncLegacyMarketFields({ ...d, nationalMarket });
    });
  }

  async searchLocations(query: string): Promise<void> {
    const q = query.trim();
    if (q.length < 2) {
      this.locationSuggestions.set([]);
      return;
    }
    this.isSearchingLocations.set(true);
    try {
      const res = await this.api.searchSerpLocations(q, 8);
      this.locationSuggestions.set(res.locations);
    } catch {
      this.locationSuggestions.set([]);
    } finally {
      this.isSearchingLocations.set(false);
    }
  }

  searchCountries(query: string): void {
    const q = query.trim().toLowerCase();
    const list = q
      ? MARKET_COUNTRIES.filter((c) => c.name.toLowerCase().includes(q))
      : [...MARKET_COUNTRIES];
    this.countrySuggestions.set(list.slice(0, 12));
  }

  stepValidationError(stepId: DiscoveryBookOnboardingStepId): string | null {
    const d = this.draft();
    switch (stepId) {
      case 'onboarding:getting-started':
        if (
          d.onboardingMode === 'existing_site' &&
          (!d.websiteUrl.trim() || isPendingSiteHostname(d.websiteUrl))
        ) {
          return 'Add your website to continue.';
        }
        return null;
      case 'onboarding:offer':
        if (d.services.length === 0 && !this.serviceDraft().trim()) {
          return 'Add at least one service.';
        }
        return null;
      case 'onboarding:customers':
        if ((d.customerAvatars[0] ?? '').trim().length < 5) {
          return 'Describe what at least one customer wants (5+ characters).';
        }
        return null;
      case 'onboarding:competition':
        if (d.onboardingMode === 'strategy_only' && d.competitors.length === 0) {
          return 'Add at least one competitor.';
        }
        return null;
      case 'onboarding:market':
        if (!d.marketReach) return 'Choose where customers search for you.';
        if (marketReachNeedsCountry(d.marketReach) && !d.nationalMarket?.serpLocationCode) {
          return 'Pick a country.';
        }
        if (marketReachNeedsLocal(d.marketReach) && !d.localMarket?.serpLocationCode) {
          return 'Pick your town or city.';
        }
        return null;
      case 'onboarding:business-name':
        if (d.businessName.trim().length < 2) return 'Add a business or project name.';
        return null;
    }
  }

  clearStepError(): void {
    this.stepError.set(null);
  }

  canContinue(stepId: DiscoveryBookOnboardingStepId): boolean {
    return !this.saving() && !this.stepSaving() && this.stepValidationError(stepId) == null;
  }

  /** First-time setup — submit on the last step only. */
  canFinishOnboarding(stepId: DiscoveryBookOnboardingStepId): boolean {
    return !this.saving() && stepId === 'onboarding:business-name' && this.fullValidationError() == null;
  }

  /** Re-open onboarding after activation — save when profile changed. */
  canSaveEdits(): boolean {
    return this.isDirty() && !this.saving() && this.fullValidationError() == null;
  }

  tryContinue(stepId: DiscoveryBookOnboardingStepId): boolean {
    this.flushDraftInputs();
    const err = this.stepValidationError(stepId);
    if (err) {
      this.stepError.set(err);
      return false;
    }
    this.stepError.set(null);
    return true;
  }

  async saveStepProgress(
    completedStepId: DiscoveryBookOnboardingStepId,
    resumeStepId: DiscoveryBookOnboardingStepId,
  ): Promise<boolean> {
    this.flushDraftInputs();
    const err = this.stepValidationError(completedStepId);
    if (err) {
      this.stepError.set(err);
      return false;
    }

    return this.persistProgress(completedStepId, resumeStepId);
  }

  /** Save current draft when navigating between steps (no validation gate). */
  async saveDraftProgress(
    completedStepId: DiscoveryBookOnboardingStepId,
    resumeStepId: DiscoveryBookOnboardingStepId,
  ): Promise<void> {
    if (this.onboardingState.onboardingCompleted()) return;
    this.flushDraftInputs();
    await this.persistProgress(completedStepId, resumeStepId, { silent: true });
  }

  private async persistProgress(
    completedStepId: DiscoveryBookOnboardingStepId,
    resumeStepId: DiscoveryBookOnboardingStepId,
    options?: { silent?: boolean },
  ): Promise<boolean> {
    const siteId = this.strategy.siteId();
    if (!siteId) {
      this.stepError.set('No site loaded.');
      return false;
    }

    this.stepSaving.set(true);
    this.stepError.set(null);

    try {
      const body = draftToProgressRequest(this.draft(), completedStepId, resumeStepId);
      await this.api.saveOnboardingProgress(siteId, body);
      await this.strategy.refreshPlan();
      this.syncFromStrategy();
      return true;
    } catch (saveErr) {
      if (!options?.silent) {
        this.stepError.set(parseProtopipeApiError(saveErr, 'Could not save onboarding progress.'));
      }
      return false;
    } finally {
      this.stepSaving.set(false);
    }
  }

  fullValidationError(): string | null {
    for (const step of [
      'onboarding:getting-started',
      'onboarding:offer',
      'onboarding:customers',
      'onboarding:competition',
      'onboarding:market',
      'onboarding:business-name',
    ] as DiscoveryBookOnboardingStepId[]) {
      const err = this.stepValidationError(step);
      if (err) return err;
    }
    return null;
  }

  async save(): Promise<string | null> {
    this.flushDraftInputs();

    const validation = this.fullValidationError();
    if (validation) {
      this.saveError.set(validation);
      return null;
    }

    const siteId = this.strategy.siteId();
    if (!siteId) {
      this.saveError.set('No site loaded.');
      return null;
    }

    this.saving.set(true);
    this.saveError.set(null);
    this.saveStatus.set(null);

    try {
      const wasOnboardingCompleted = this.onboardingState.onboardingCompleted();
      const body = draftToOnboardingRequest(this.draft());
      const res = await this.api.completeOnboarding(siteId, body);
      this.onboardingState.applyOnboardingCompleted(res.onboardingCompletedAt);
      await this.strategy.refreshPlan();
      this.syncFromStrategy();

      if (res.discoveryRunId) {
        this.saveStatus.set('Saved — starting a fresh discovery run…');
        if (!wasOnboardingCompleted) {
          void this.keywordStore.followDiscoveryRun(siteId, res.discoveryRunId);
          return res.discoveryRunId;
        }
        await this.keywordStore.followDiscoveryRun(siteId, res.discoveryRunId);
        return res.discoveryRunId;
      }

      const latest = await this.api.getLatestKeywordDiscoveryRun(siteId);
      if (!latest.run) {
        this.saveStatus.set('Saved — starting keyword discovery…');
        const started = await this.api.startKeywordDiscoveryRun(siteId);
        if (!wasOnboardingCompleted) {
          void this.keywordStore.followDiscoveryRun(siteId, started.run.id);
          return started.run.id;
        }
        await this.keywordStore.followDiscoveryRun(siteId, started.run.id);
        return started.run.id;
      }

      this.saveStatus.set('Saved — discovery inputs unchanged, no new run started.');
      return null;
    } catch (err) {
      this.saveError.set(parseProtopipeApiError(err, 'Could not save onboarding changes.'));
      return null;
    } finally {
      this.saving.set(false);
    }
  }

  private flushDraftInputs(): void {
    this.addService();
    this.addTargetCustomer();
    this.addCompetitor();
  }

  private commitDraft(
    draft: ReturnType<typeof signal<string>>,
    field: 'services' | 'targetCustomerSites' | 'competitors',
    max: number,
    normalize?: (value: string) => string,
  ): void {
    const raw = draft();
    const parts = raw
      .split(',')
      .map((p) => (normalize ? normalize(p.trim()) : p.trim()))
      .filter(Boolean);
    if (parts.length === 0) return;

    this.draft.update((current) => {
      const next = [...current[field]];
      for (const part of parts) {
        if (next.length >= max) break;
        if (!next.some((e) => e.toLowerCase() === part.toLowerCase())) {
          next.push(part);
        }
      }
      return { ...current, [field]: next };
    });
    draft.set('');
  }
}

function normalizeDomain(value: string): string {
  return value.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
}
