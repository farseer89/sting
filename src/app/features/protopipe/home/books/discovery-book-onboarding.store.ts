import { Injectable, computed, inject, signal } from '@angular/core';
import type { ProtopipeSerpLocationOption } from '@hive/contracts';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import {
  MARKET_COUNTRIES,
  type CustomerMarketScope,
  type MarketCountryOption,
  type OnboardingModeId,
} from '../../onboarding/onboarding-market.constants';
import { ProtopipeKeywordPickerStore } from '../keyword-picker/protopipe-keyword-picker.store';
import type { DiscoveryBookOnboardingStepId } from './discovery-book-onboarding.steps';
import {
  draftFingerprint,
  draftFromStrategy,
  draftToOnboardingRequest,
  type DiscoveryBookOnboardingDraft,
} from './discovery-book-onboarding.draft';

const MAX_SERVICES = 8;
const MAX_COMPETITORS = 3;
const MAX_TARGET_CUSTOMERS = 5;
const MAX_CUSTOMER_AVATARS = 12;

@Injectable()
export class DiscoveryBookOnboardingStore {
  private readonly api = inject(ProtopipeApiService);
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly keywordStore = inject(ProtopipeKeywordPickerStore);

  private readonly baselineFingerprint = signal('');
  private readonly draft = signal<DiscoveryBookOnboardingDraft>(draftFromStrategy(null, null));

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveStatus = signal<string | null>(null);
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
  readonly scanResolvedBy = signal<'llm' | 'deterministic' | null>(null);
  readonly expandedSuggestions = signal<string[]>([]);
  readonly offerExpanding = signal(false);
  readonly offerExpandError = signal<string | null>(null);

  readonly isDirty = computed(
    () => draftFingerprint(this.draft()) !== this.baselineFingerprint(),
  );

  readonly draftSnapshot = this.draft.asReadonly();

  syncFromStrategy(): void {
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

    if (this.offerScannedUrl() === url && !this.offerScanning()) {
      return;
    }

    const siteId = this.strategy.siteId();
    if (!siteId) {
      this.offerScanError.set('No site loaded.');
      return;
    }

    this.offerScanning.set(true);
    this.offerScanError.set(null);

    try {
      const res = await this.api.scanOffer(siteId, { websiteUrl: url });
      this.offerScannedUrl.set(url);
      this.siteFoundServices.set(res.siteServices);
      this.tradeLabel.set(res.tradeLabel ?? null);
      this.tradeSuggestions.set(res.suggestedServices ?? res.tradeSuggestions ?? []);
      this.customerAvatarSuggestions.set(res.customerAvatars ?? []);
      this.scanResolvedBy.set(res.resolvedBy ?? null);

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

  removeCompetitor(index: number): void {
    this.draft.update((d) => ({
      ...d,
      competitors: d.competitors.filter((_, i) => i !== index),
    }));
  }

  onCompetitorDraftInput(value: string): void {
    this.competitorDraft.set(value);
  }

  selectMarketScope(scope: CustomerMarketScope): void {
    this.draft.update((d) => ({
      ...d,
      marketScope: scope,
      serpLocationCode: scope === 'worldwide' ? undefined : d.serpLocationCode,
      serpLocationName: scope === 'worldwide' ? undefined : d.serpLocationName,
      city: scope === 'worldwide' ? undefined : d.city,
      state: scope === 'worldwide' ? undefined : d.state,
      countryIso: scope === 'national' ? d.countryIso : scope === 'worldwide' ? undefined : d.countryIso,
    }));
  }

  selectLocation(option: ProtopipeSerpLocationOption | null): void {
    if (!option) {
      this.draft.update((d) => ({
        ...d,
        serpLocationCode: undefined,
        serpLocationName: undefined,
        city: undefined,
        state: undefined,
      }));
      return;
    }
    const parts = option.name.split(',').map((p) => p.trim());
    this.draft.update((d) => ({
      ...d,
      serpLocationCode: option.code,
      serpLocationName: option.name,
      city: parts[0] || d.city,
      state: parts[1] || d.state,
      countryIso: option.country || d.countryIso,
    }));
  }

  selectCountry(option: MarketCountryOption | null): void {
    if (!option) {
      this.draft.update((d) => ({
        ...d,
        serpLocationCode: undefined,
        serpLocationName: undefined,
        countryIso: undefined,
      }));
      return;
    }
    this.draft.update((d) => ({
      ...d,
      serpLocationCode: option.code,
      serpLocationName: option.name,
      countryIso: option.iso,
      city: undefined,
      state: undefined,
    }));
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
        if (d.onboardingMode === 'existing_site' && !d.websiteUrl.trim()) {
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
      case 'onboarding:ideal-customers':
        return null;
      case 'onboarding:competition':
        if (d.onboardingMode === 'strategy_only' && d.competitors.length === 0) {
          return 'Add at least one competitor.';
        }
        return null;
      case 'onboarding:market':
        if (!d.marketScope) return 'Choose local, national, or worldwide.';
        if (d.marketScope === 'local' && d.serpLocationCode == null) {
          return 'Pick your town or city.';
        }
        if (d.marketScope === 'national' && d.serpLocationCode == null) {
          return 'Pick a country.';
        }
        return null;
      case 'onboarding:business-name':
        if (d.businessName.trim().length < 2) return 'Add a business or project name.';
        return null;
    }
  }

  canSave(stepId: DiscoveryBookOnboardingStepId): boolean {
    return this.isDirty() && this.stepValidationError(stepId) == null && this.fullValidationError() == null;
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

  async save(stepId: DiscoveryBookOnboardingStepId): Promise<string | null> {
    const validation = this.stepValidationError(stepId) ?? this.fullValidationError();
    if (validation) {
      this.saveError.set(validation);
      return null;
    }

    this.addService();
    this.addTargetCustomer();
    this.addCompetitor();

    const siteId = this.strategy.siteId();
    if (!siteId) {
      this.saveError.set('No site loaded.');
      return null;
    }

    this.saving.set(true);
    this.saveError.set(null);
    this.saveStatus.set(null);

    try {
      const body = draftToOnboardingRequest(this.draft());
      const res = await this.api.completeOnboarding(siteId, body);
      await this.strategy.refreshPlan();
      this.syncFromStrategy();

      if (res.discoveryRunId) {
        this.saveStatus.set('Saved — starting a fresh discovery run…');
        await this.keywordStore.followDiscoveryRun(siteId, res.discoveryRunId);
        return res.discoveryRunId;
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
