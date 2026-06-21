import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  ProtopipeGeoTargetOption,
  ProtopipeGoogleIntegrationStatusResponse,
  ProtopipeResearchRelatedKeyword,
} from '@hive/contracts';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { normalizePhraseKey } from '../keyword-picker/keyword-picker.types';
import {
  DEFAULT_ADS_ASSUMPTIONS,
  DEFAULT_PITCH_CONFIG,
  SIMULATOR_BUDGET_PRESETS,
  avgCpcFromKeyword,
  computeMaxAffordableCpc,
  computePitchEconomics,
  createProductId,
  isKeywordOverBudget,
  loadAdsBookDraft,
  saveAdsBookDraft,
  type AdsBookAssumptions,
  type AdsBookProduct,
  type AdsBookProductKeyword,
  type PitchEconomicsConfig,
  type PitchEconomicsResult,
} from './ads-book-economics';

const SEARCH_DEBOUNCE_MS = 350;
const SEARCH_RELATED_LIMIT = 50;
const GEO_SEARCH_DEBOUNCE_MS = 250;

export type AdsBookSection = 'strategy' | 'explore' | 'products' | 'simulator' | 'launch' | 'setup';

export type { AdsBookProduct, AdsBookProductKeyword, AdsBookAssumptions, PitchEconomicsResult };
export { SIMULATOR_BUDGET_PRESETS, DEFAULT_PITCH_CONFIG, computeMaxAffordableCpc, isKeywordOverBudget };

export interface AdsStrategyRow {
  phraseKey: string;
  phrase: string;
  priority: string;
  intent: string;
  loading: boolean;
  error?: string;
  avgMonthlySearches?: number;
  cpcLowMicros?: number;
  cpcHighMicros?: number;
  competition?: string;
  competitionIndex?: number;
}

export interface AdsExploreRow {
  phraseKey: string;
  phrase: string;
  isPrimary: boolean;
  avgMonthlySearches?: number;
  cpcLowMicros?: number;
  cpcHighMicros?: number;
  competition?: string;
  competitionIndex?: number;
}

export const US_DEFAULT_GEO: ProtopipeGeoTargetOption = {
  id: '2840',
  name: 'United States',
  countryCode: 'US',
  targetType: 'Country',
};

export interface GeoCountryOption {
  code: string;
  label: string;
  geoTargetId: string;
}

/** Country-level targets — city search is scoped via dropdown + suggest API countryCode. */
export const GEO_COUNTRY_OPTIONS: GeoCountryOption[] = [
  { code: 'US', label: 'United States', geoTargetId: '2840' },
  { code: 'CA', label: 'Canada', geoTargetId: '2124' },
  { code: 'GB', label: 'United Kingdom', geoTargetId: '2826' },
  { code: 'AU', label: 'Australia', geoTargetId: '2036' },
];

export function cityLabelFromGeo(geo: ProtopipeGeoTargetOption): string {
  if (geo.targetType === 'Country') return '';
  return geo.name.split(',')[0]?.trim() ?? geo.name;
}

export function geoCountryOption(code: string): GeoCountryOption | undefined {
  return GEO_COUNTRY_OPTIONS.find((c) => c.code === code);
}

@Injectable()
export class ProtopipeAdsBookStore {
  private readonly api = inject(ProtopipeApiService);
  private readonly strategy = inject(ProtopipeStrategyService);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private geoSearchTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly _section = signal<AdsBookSection>('products');
  private readonly _selectedGeo = signal<ProtopipeGeoTargetOption>(US_DEFAULT_GEO);
  private readonly _countryCode = signal('US');
  private readonly _cityInput = signal('');
  private readonly _geoSuggestions = signal<ProtopipeGeoTargetOption[]>([]);
  private readonly _geoSearching = signal(false);
  private readonly _geoResolved = signal(false);
  private readonly _languageCode = signal('en');
  private readonly _error = signal<string | null>(null);
  private readonly _googleStatus = signal<ProtopipeGoogleIntegrationStatusResponse | null>(null);
  private readonly _strategyRows = signal<AdsStrategyRow[]>([]);
  private readonly _strategyLoading = signal(false);
  private readonly _strategyLoaded = signal(false);
  private readonly _searchQuery = signal('');
  private readonly _searching = signal(false);
  private readonly _exploreRows = signal<AdsExploreRow[]>([]);
  private readonly _products = signal<AdsBookProduct[]>([]);
  private readonly _assumptions = signal<AdsBookAssumptions>({ ...DEFAULT_ADS_ASSUMPTIONS });
  private readonly _selectedProductId = signal<string | null>(null);
  private readonly _simulatorCpcUsd = signal<number | null>(null);
  private readonly _pitchConfig = signal<PitchEconomicsConfig>({ ...DEFAULT_PITCH_CONFIG });
  private readonly _expandedProductId = signal<string | null>(null);

  readonly section = this._section.asReadonly();
  readonly selectedGeo = this._selectedGeo.asReadonly();
  readonly countryCode = this._countryCode.asReadonly();
  readonly cityInput = this._cityInput.asReadonly();
  readonly geoCountries = GEO_COUNTRY_OPTIONS;
  readonly geoTargetId = computed(() => this._selectedGeo().id);
  readonly geoSuggestions = this._geoSuggestions.asReadonly();
  readonly geoSearching = this._geoSearching.asReadonly();
  readonly geoResolved = this._geoResolved.asReadonly();
  readonly languageCode = this._languageCode.asReadonly();
  readonly error = this._error.asReadonly();
  readonly googleStatus = this._googleStatus.asReadonly();
  readonly strategyRows = this._strategyRows.asReadonly();
  readonly strategyLoading = this._strategyLoading.asReadonly();
  readonly strategyLoaded = this._strategyLoaded.asReadonly();
  readonly searchQuery = this._searchQuery.asReadonly();
  readonly searching = this._searching.asReadonly();
  readonly exploreRows = this._exploreRows.asReadonly();

  readonly hasSearchQuery = computed(() => this._searchQuery().trim().length > 0);
  readonly strategyKeywordCount = computed(() => this._strategyRows().length);
  readonly strategyWithCpcCount = computed(
    () => this._strategyRows().filter((r) => r.cpcLowMicros != null || r.cpcHighMicros != null).length,
  );
  readonly exploreResultCount = computed(() => this._exploreRows().length);
  readonly adsConnected = computed(() => this._googleStatus()?.ads.connected ?? false);
  readonly products = this._products.asReadonly();
  readonly assumptions = this._assumptions.asReadonly();
  readonly selectedProductId = this._selectedProductId.asReadonly();
  readonly simulatorCpcUsd = this._simulatorCpcUsd.asReadonly();
  readonly pitchConfig = this._pitchConfig.asReadonly();
  readonly expandedProductId = this._expandedProductId.asReadonly();
  readonly productCount = computed(() => this._products().length);

  readonly selectedProduct = computed(() => {
    const id = this._selectedProductId();
    return this._products().find((p) => p.id === id) ?? null;
  });

  readonly simulatorResults = computed((): PitchEconomicsResult[] => {
    const product = this.selectedProduct();
    if (!product) return [];
    const assumptions = this._assumptions();
    const pitchConfig = this._pitchConfig();
    const cpc =
      this._simulatorCpcUsd() ??
      avgCpcFromKeyword(
        product.keywords.find((k) => !k.loading && (k.cpcLowMicros != null || k.cpcHighMicros != null)) ??
          product.keywords[0],
      ) ??
      0;

    return SIMULATOR_BUDGET_PRESETS.map((adSpendUsd) =>
      computePitchEconomics({
        adSpendUsd,
        avgCpcUsd: cpc,
        priceUsd: product.priceUsd,
        marginUsd: product.marginUsd,
        assumptions,
        pitchConfig,
        productName: product.name,
      }),
    );
  });

  readonly primaryPitchResult = computed((): PitchEconomicsResult | null => {
    const product = this.selectedProduct();
    if (!product) return null;
    const assumptions = this._assumptions();
    const pitchConfig = this._pitchConfig();
    const cpc =
      this._simulatorCpcUsd() ??
      avgCpcFromKeyword(
        product.keywords.find((k) => !k.loading && (k.cpcLowMicros != null || k.cpcHighMicros != null)) ??
          product.keywords[0],
      ) ??
      0;
    const adSpend = pitchConfig.allInMode ? pitchConfig.allInMonthlyUsd : pitchConfig.adSpendUsd;

    return computePitchEconomics({
      adSpendUsd: adSpend,
      avgCpcUsd: cpc,
      priceUsd: product.priceUsd,
      marginUsd: product.marginUsd,
      assumptions,
      pitchConfig,
      productName: product.name,
    });
  });

  async ensureContext(): Promise<void> {
    await this.strategy.ensureLoaded();
    this.loadDraft();
    await this.loadGoogleStatus();
    await this.resolveDefaultGeo();
    this.initStrategyRows();
  }

  setSection(section: AdsBookSection): void {
    if (section === 'launch') return;
    if (section === 'simulator' && !this._selectedProductId() && this._products().length > 0) {
      this._selectedProductId.set(this._products()[0].id);
    }
    this._section.set(section);
    if (section === 'strategy' && !this._strategyLoaded() && !this._strategyLoading()) {
      void this.loadStrategyCpc();
    }
  }

  setGeoSelection(option: ProtopipeGeoTargetOption): void {
    this._selectedGeo.set(option);
    if (option.countryCode) {
      this._countryCode.set(option.countryCode);
    }
    this._cityInput.set(cityLabelFromGeo(option));
    this._strategyLoaded.set(false);
    if (this._section() === 'strategy') {
      void this.loadStrategyCpc();
    }
    const q = this._searchQuery().trim();
    if (this._section() === 'explore' && q) {
      void this.fetchExplore(q);
    }
  }

  setCountryCode(code: string): void {
    const country = geoCountryOption(code);
    if (!country) return;

    this._countryCode.set(code);
    this._geoSuggestions.set([]);

    if (this._selectedGeo().countryCode !== code) {
      this.setGeoSelection({
        id: country.geoTargetId,
        name: country.label,
        countryCode: code,
        targetType: 'Country',
      });
    }
  }

  setCityInput(value: string): void {
    this._cityInput.set(value);
  }

  searchGeoSuggestions(query: string): void {
    if (this.geoSearchTimer) clearTimeout(this.geoSearchTimer);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      this._geoSuggestions.set([]);
      this._geoSearching.set(false);
      return;
    }
    this._geoSearching.set(true);
    this.geoSearchTimer = setTimeout(
      () => void this.fetchGeoSuggestions(trimmed, this._countryCode()),
      GEO_SEARCH_DEBOUNCE_MS,
    );
  }

  setLanguageCode(code: string): void {
    this._languageCode.set(code);
  }

  setSearchQuery(value: string): void {
    this._searchQuery.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    const trimmed = value.trim();
    if (!trimmed) {
      this._exploreRows.set([]);
      this._searching.set(false);
      return;
    }
    this.searchTimer = setTimeout(() => void this.fetchExplore(trimmed), SEARCH_DEBOUNCE_MS);
  }

  clearSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this._searchQuery.set('');
    this._exploreRows.set([]);
    this._searching.set(false);
  }

  async refreshStrategy(): Promise<void> {
    this._strategyLoaded.set(false);
    await this.loadStrategyCpc();
  }

  addProduct(): void {
    const product: AdsBookProduct = {
      id: createProductId(),
      name: 'New service',
      priceUsd: 1500,
      marginUsd: 600,
      keywords: [],
    };
    this._products.update((list) => [...list, product]);
    this._selectedProductId.set(product.id);
    this._expandedProductId.set(product.id);
    this.persistDraft();
  }

  updateProduct(id: string, patch: Partial<Pick<AdsBookProduct, 'name' | 'priceUsd' | 'marginUsd' | 'notes'>>): void {
    this._products.update((list) =>
      list.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
    this.persistDraft();
  }

  removeProduct(id: string): void {
    this._products.update((list) => list.filter((p) => p.id !== id));
    if (this._selectedProductId() === id) {
      this._selectedProductId.set(this._products()[0]?.id ?? null);
    }
    if (this._expandedProductId() === id) {
      this._expandedProductId.set(null);
    }
    this.persistDraft();
  }

  selectProduct(id: string | null): void {
    this._selectedProductId.set(id);
    this.persistDraft();
  }

  toggleProductExpanded(id: string): void {
    this._expandedProductId.update((current) => (current === id ? null : id));
  }

  setAssumptions(patch: Partial<AdsBookAssumptions>): void {
    this._assumptions.update((a) => ({ ...a, ...patch }));
    this.persistDraft();
  }

  setSimulatorCpcUsd(value: number | null): void {
    this._simulatorCpcUsd.set(value);
    this.persistDraft();
  }

  setPitchConfig(patch: Partial<PitchEconomicsConfig>): void {
    this._pitchConfig.update((c) => ({ ...c, ...patch }));
    this.persistDraft();
  }

  setAdSpendPreset(amount: number): void {
    this._pitchConfig.update((c) => ({ ...c, adSpendUsd: amount }));
    this.persistDraft();
  }

  toggleAllInMode(enabled: boolean): void {
    this._pitchConfig.update((c) => ({ ...c, allInMode: enabled }));
    this.persistDraft();
  }

  async addProductKeyword(productId: string, phrase: string): Promise<void> {
    const trimmed = phrase.trim();
    if (!trimmed) return;

    const phraseKey = normalizePhraseKey(trimmed);
    const keyword: AdsBookProductKeyword = { phraseKey, phrase: trimmed, loading: true };

    this._products.update((list) =>
      list.map((p) => {
        if (p.id !== productId) return p;
        if (p.keywords.some((k) => k.phraseKey === phraseKey)) {
          return p;
        }
        return { ...p, keywords: [...p.keywords, keyword] };
      }),
    );

    await this.fetchProductKeywordCpc(productId, phraseKey);
    this.persistDraft();
  }

  removeProductKeyword(productId: string, phraseKey: string): void {
    this._products.update((list) =>
      list.map((p) =>
        p.id === productId
          ? { ...p, keywords: p.keywords.filter((k) => k.phraseKey !== phraseKey) }
          : p,
      ),
    );
    this.persistDraft();
  }

  async refreshProductKeywords(productId: string): Promise<void> {
    const product = this._products().find((p) => p.id === productId);
    if (!product) return;

    this._products.update((list) =>
      list.map((p) =>
        p.id === productId
          ? { ...p, keywords: p.keywords.map((k) => ({ ...k, loading: true, error: undefined })) }
          : p,
      ),
    );

    for (const kw of product.keywords) {
      await this.fetchProductKeywordCpc(productId, kw.phraseKey);
    }
    this.persistDraft();
  }

  maxAffordableCpcForProduct(product: AdsBookProduct): number {
    return computeMaxAffordableCpc(product.marginUsd, this._assumptions());
  }

  private loadDraft(): void {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    const draft = loadAdsBookDraft(siteId);
    if (!draft) return;
    this._products.set(draft.products);
    this._assumptions.set(draft.assumptions);
    this._selectedProductId.set(draft.selectedProductId ?? draft.products[0]?.id ?? null);
    this._simulatorCpcUsd.set(draft.simulatorCpcUsd ?? null);
    if (draft.pitch) {
      this._pitchConfig.set({ ...DEFAULT_PITCH_CONFIG, ...draft.pitch });
    }
  }

  private persistDraft(): void {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    saveAdsBookDraft(siteId, {
      products: this._products(),
      assumptions: this._assumptions(),
      selectedProductId: this._selectedProductId() ?? undefined,
      simulatorCpcUsd: this._simulatorCpcUsd() ?? undefined,
      pitch: this._pitchConfig(),
    });
  }

  private async fetchProductKeywordCpc(productId: string, phraseKey: string): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;

    const product = this._products().find((p) => p.id === productId);
    const keyword = product?.keywords.find((k) => k.phraseKey === phraseKey);
    if (!keyword) return;

    try {
      const res = await this.api.researchQuery(siteId, {
        phrase: keyword.phrase,
        geoTargetId: this._selectedGeo().id,
        languageCode: this._languageCode(),
        includeRelated: false,
        includeGsc: false,
      });
      const m = res.ads.metrics;
      this._products.update((list) =>
        list.map((p) => {
          if (p.id !== productId) return p;
          return {
            ...p,
            keywords: p.keywords.map((k) =>
              k.phraseKey === phraseKey
                ? {
                    ...k,
                    loading: false,
                    avgMonthlySearches: m?.avgMonthlySearches,
                    cpcLowMicros: m?.lowTopOfPageBidMicros,
                    cpcHighMicros: m?.highTopOfPageBidMicros,
                    competition: m?.competition,
                    error: res.ads.error,
                  }
                : k,
            ),
          };
        }),
      );
    } catch (err) {
      this._products.update((list) =>
        list.map((p) => {
          if (p.id !== productId) return p;
          return {
            ...p,
            keywords: p.keywords.map((k) =>
              k.phraseKey === phraseKey
                ? { ...k, loading: false, error: parseProtopipeApiError(err, 'Failed to load CPC') }
                : k,
            ),
          };
        }),
      );
    }
  }

  private async resolveDefaultGeo(): Promise<void> {
    if (this._geoResolved()) return;

    const profile = this.strategy.onboardingProfile();
    const locationName = profile?.serpLocationName?.trim();
    const countryCode = profile?.countryIso?.trim().toUpperCase() || 'US';
    this._countryCode.set(geoCountryOption(countryCode) ? countryCode : 'US');

    if (!locationName) {
      const country = geoCountryOption(this._countryCode());
      if (country) {
        this._selectedGeo.set({
          id: country.geoTargetId,
          name: country.label,
          countryCode: country.code,
          targetType: 'Country',
        });
      } else {
        this._selectedGeo.set(US_DEFAULT_GEO);
      }
      this._cityInput.set('');
      this._geoResolved.set(true);
      return;
    }

    try {
      const res = await this.api.searchGeoTargets(locationName, this._countryCode(), 8);
      const picked = this.pickDefaultGeoOption(res.options, locationName);
      if (picked) {
        this.setGeoSelection(picked);
      } else {
        const country = geoCountryOption(this._countryCode());
        if (country) {
          this.setGeoSelection({
            id: country.geoTargetId,
            name: country.label,
            countryCode: country.code,
            targetType: 'Country',
          });
        } else {
          this.setGeoSelection(US_DEFAULT_GEO);
        }
        this._cityInput.set(locationName);
      }
    } catch {
      this.setGeoSelection(US_DEFAULT_GEO);
    } finally {
      this._geoResolved.set(true);
    }
  }

  private pickDefaultGeoOption(
    options: ProtopipeGeoTargetOption[],
    query: string,
  ): ProtopipeGeoTargetOption | undefined {
    if (!options.length) return undefined;
    const q = query.trim().toLowerCase();
    const exact = options.find(
      (o) =>
        o.name.toLowerCase() === q ||
        o.name.toLowerCase().startsWith(q + ',') ||
        o.canonicalName?.toLowerCase() === q,
    );
    return exact ?? options[0];
  }

  private async fetchGeoSuggestions(query: string, countryCode?: string): Promise<void> {
    try {
      const res = await this.api.searchGeoTargets(query, countryCode ?? this._countryCode(), 12);
      this._geoSuggestions.set(
        res.options.filter((o) => o.targetType !== 'Country'),
      );
    } catch {
      this._geoSuggestions.set([]);
    } finally {
      this._geoSearching.set(false);
    }
  }

  private initStrategyRows(): void {
    const keywords = this.strategy.keywords();
    this._strategyRows.set(
      keywords.map((kw) => ({
        phraseKey: normalizePhraseKey(kw.phrase),
        phrase: kw.phrase.trim(),
        priority: kw.priority,
        intent: kw.intent,
        loading: false,
      })),
    );
    if (keywords.length > 0 && this._section() === 'strategy' && this._geoResolved()) {
      void this.loadStrategyCpc();
    }
  }

  private async loadGoogleStatus(): Promise<void> {
    try {
      this._googleStatus.set(await this.api.googleIntegrationStatus());
    } catch {
      this._googleStatus.set(null);
    }
  }

  private async loadStrategyCpc(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) {
      this._error.set('No site loaded');
      return;
    }

    const rows = this._strategyRows();
    if (rows.length === 0) {
      this._strategyLoaded.set(true);
      return;
    }

    this._strategyLoading.set(true);
    this._error.set(null);
    this._strategyRows.set(rows.map((r) => ({ ...r, loading: true, error: undefined })));

    const geoTargetId = this._selectedGeo().id;
    const languageCode = this._languageCode();
    const updated: AdsStrategyRow[] = [];

    for (const row of rows) {
      try {
        const res = await this.api.researchQuery(siteId, {
          phrase: row.phrase,
          geoTargetId,
          languageCode,
          includeRelated: false,
          includeGsc: false,
        });
        const m = res.ads.metrics;
        updated.push({
          ...row,
          loading: false,
          avgMonthlySearches: m?.avgMonthlySearches,
          cpcLowMicros: m?.lowTopOfPageBidMicros,
          cpcHighMicros: m?.highTopOfPageBidMicros,
          competition: m?.competition,
          competitionIndex: m?.competitionIndex,
          error: res.ads.error,
        });
      } catch (err) {
        updated.push({
          ...row,
          loading: false,
          error: parseProtopipeApiError(err, 'Failed to load CPC'),
        });
      }
    }

    this._strategyRows.set(updated);
    this._strategyLoading.set(false);
    this._strategyLoaded.set(true);
  }

  private async fetchExplore(phrase: string): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;

    this._searching.set(true);
    this._error.set(null);
    try {
      const res = await this.api.researchQuery(siteId, {
        phrase,
        geoTargetId: this._selectedGeo().id,
        languageCode: this._languageCode(),
        includeRelated: true,
        relatedLimit: SEARCH_RELATED_LIMIT,
        includeGsc: false,
      });

      const rows: AdsExploreRow[] = [];
      const seedKey = normalizePhraseKey(phrase);
      const m = res.ads.metrics;

      if (m) {
        rows.push({
          phraseKey: seedKey,
          phrase: phrase.trim(),
          isPrimary: true,
          avgMonthlySearches: m.avgMonthlySearches,
          cpcLowMicros: m.lowTopOfPageBidMicros,
          cpcHighMicros: m.highTopOfPageBidMicros,
          competition: m.competition,
          competitionIndex: m.competitionIndex,
        });
      }

      for (const related of res.ads.related ?? []) {
        rows.push(this.mapRelated(related, seedKey));
      }

      this._exploreRows.set(rows.filter((r) => r.phraseKey));
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Search failed'));
      this._exploreRows.set([]);
    } finally {
      this._searching.set(false);
    }
  }

  private mapRelated(related: ProtopipeResearchRelatedKeyword, seedKey: string): AdsExploreRow {
    const phrase = (related.phrase ?? '').trim();
    const phraseKey = normalizePhraseKey(phrase);
    return {
      phraseKey,
      phrase,
      isPrimary: phraseKey === seedKey,
      avgMonthlySearches: related.avgMonthlySearches,
      cpcLowMicros: related.cpcLowMicros,
      cpcHighMicros: related.cpcHighMicros,
      competition: related.competition,
    };
  }
}
