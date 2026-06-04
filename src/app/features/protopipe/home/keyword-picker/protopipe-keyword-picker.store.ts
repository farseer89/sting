import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  ProtopipeDiscoverAdsIdea,
  ProtopipeDiscoverGscQuery,
  ProtopipeDiscoverRankedKeyword,
  ProtopipeKeywordDiscoveryResponse,
  ProtopipeResearchRelatedKeyword,
} from '@hive/contracts';
import { ContentPlanStore } from '../../content-plan/content-plan.store';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import {
  buildRelevanceContext,
  isRelevantForPicker,
  type KeywordRelevanceContext,
} from './keyword-picker.relevance';
import {
  mergeKeywordOption,
  pickPreselectedKeys,
  pickSuggestedPanel,
  scoreKeywordOptions,
} from './keyword-picker.scoring';
import type { KeywordPickerOption } from './keyword-picker.types';
import { normalizePhraseKey } from './keyword-picker.types';

const SEARCH_DEBOUNCE_MS = 350;
const RELATED_LIMIT = 25;
const SEED_PHRASE_COUNT = 2;

@Injectable()
export class ProtopipeKeywordPickerStore {
  private readonly api = inject(ProtopipeApiService);
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly contentPlan = inject(ContentPlanStore);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private siteId: string | null = null;
  private relevanceCtx: KeywordRelevanceContext = buildRelevanceContext({});

  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _hostname = signal('');
  private readonly _pool = signal<KeywordPickerOption[]>([]);
  private readonly _suggested = signal<KeywordPickerOption[]>([]);
  private readonly _selected = signal<Map<string, KeywordPickerOption>>(new Map());
  private readonly _searchQuery = signal('');
  private readonly _searching = signal(false);
  private readonly _searchRelated = signal<KeywordPickerOption[]>([]);
  private readonly _searchPrimary = signal<KeywordPickerOption | null>(null);
  private readonly _confirming = signal(false);
  private readonly _discoveryNote = signal<string | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly hostname = this._hostname.asReadonly();
  readonly pool = this._pool.asReadonly();
  readonly suggested = this._suggested.asReadonly();
  readonly selected = this._selected.asReadonly();
  readonly searchQuery = this._searchQuery.asReadonly();
  readonly searching = this._searching.asReadonly();
  readonly searchRelated = this._searchRelated.asReadonly();
  readonly searchPrimary = this._searchPrimary.asReadonly();
  readonly confirming = this._confirming.asReadonly();
  readonly discoveryNote = this._discoveryNote.asReadonly();

  readonly selectedCount = computed(() => this._selected().size);

  readonly selectedList = computed(() => [...this._selected().values()]);

  readonly filteredPool = computed(() => {
    const q = this._searchQuery().trim().toLowerCase();
    const selected = this._selected();
    const pool = this._pool().filter((o) => !selected.has(o.phraseKey));
    if (!q) return pool.slice(0, 6);
    return pool.filter((o) => o.phrase.toLowerCase().includes(q)).slice(0, 8);
  });

  readonly hasSearchQuery = computed(() => this._searchQuery().trim().length > 0);

  async load(force = false): Promise<void> {
    if (this.loadTask && !force) {
      return this.loadTask;
    }
    this.loadTask = this.performLoad();
    try {
      await this.loadTask;
    } finally {
      this.loadTask = null;
    }
  }

  private loadTask: Promise<void> | null = null;

  private async performLoad(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    this._discoveryNote.set(null);
    try {
      await this.strategy.ensureLoaded();
      const siteId = this.strategy.siteId();
      if (!siteId) {
        throw new Error('No site loaded for this account');
      }
      this.siteId = siteId;
      this.contentPlan.setSiteId(siteId);
      this.relevanceCtx = buildRelevanceContext({
        strategySummary: this.strategy.strategy().summary,
        displayName: this.strategy.site()?.displayName,
        hostname: this.strategy.site()?.hostname,
      });

      const discovery = await this.api.discoverKeywords(siteId);
      this._hostname.set(discovery.hostname ?? this.strategy.site()?.hostname ?? '');

      const map = new Map<string, KeywordPickerOption>();
      this.mergeDiscovery(discovery, map);
      await this.seedRelatedKeywords(map, discovery);
      this.applyScoredPool(map);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to load keyword suggestions'));
    } finally {
      this._loading.set(false);
    }
  }

  setSearchQuery(value: string): void {
    this._searchQuery.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    const trimmed = value.trim();
    if (!trimmed) {
      this._searchRelated.set([]);
      this._searchPrimary.set(null);
      this._searching.set(false);
      return;
    }
    this.searchTimer = setTimeout(() => void this.fetchRelatedKeywords(trimmed), SEARCH_DEBOUNCE_MS);
  }

  clearSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this._searchQuery.set('');
    this._searchRelated.set([]);
    this._searchPrimary.set(null);
    this._searching.set(false);
  }

  isSelected(phraseKey: string): boolean {
    return this._selected().has(phraseKey);
  }

  toggle(option: KeywordPickerOption): void {
    const key = normalizePhraseKey(option.phrase);
    if (!key) return;
    this._selected.update((current) => {
      const next = new Map(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, { ...option, phraseKey: key });
      }
      return next;
    });
  }

  remove(phraseKey: string): void {
    this._selected.update((current) => {
      const next = new Map(current);
      next.delete(phraseKey);
      return next;
    });
  }

  addCustom(phrase: string): boolean {
    const key = normalizePhraseKey(phrase);
    if (!key) return false;
    if (this._selected().has(key)) return false;
    const option: KeywordPickerOption = {
      phraseKey: key,
      phrase: phrase.trim(),
      source: 'custom',
    };
    this._selected.update((current) => new Map(current).set(key, option));
    return true;
  }

  addFromOption(option: KeywordPickerOption): void {
    const key = normalizePhraseKey(option.phrase);
    if (!key) return;
    this._selected.update((current) => {
      const next = new Map(current);
      next.set(key, { ...option, phraseKey: key });
      return next;
    });
    this.mergeIntoPool(option);
  }

  async confirmAndBuildPlan(): Promise<boolean> {
    if (this._confirming() || this._selected().size === 0) return false;
    this._confirming.set(true);
    this._error.set(null);
    try {
      const inputs = [...this._selected().values()].map((o) => ({
        phrase: o.phrase,
        intent: 'commercial' as const,
        priority: 'medium' as const,
        notes: 'Confirmed on home',
      }));
      this.strategy.replaceKeywords(inputs);
      const saved = await this.strategy.saveKeywords();
      if (!saved) {
        this._error.set(this.strategy.error() ?? 'Failed to save keywords');
        return false;
      }
      await this.contentPlan.generate();
      return true;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to save keywords and start plan'));
      return false;
    } finally {
      this._confirming.set(false);
    }
  }

  private mergeDiscovery(
    res: ProtopipeKeywordDiscoveryResponse,
    map: Map<string, KeywordPickerOption>,
  ): void {
    const notes: string[] = [];
    if (!res.ranked.available && res.ranked.error) {
      notes.push('Ranking data unavailable');
    }
    if (!res.ads.available && res.ads.error) {
      notes.push('Ads ideas unavailable');
    }
    if (notes.length) {
      this._discoveryNote.set(notes.join(' · '));
    }

    for (const k of res.ranked.keywords ?? []) {
      this.mergeRanked(k, map);
    }
    for (const q of res.gsc.queries ?? []) {
      this.mergeGsc(q, map);
    }
    for (const idea of res.ads.ideas ?? []) {
      this.mergeAdsIdea(idea, map, 'ads');
    }
  }

  private mergeGsc(q: ProtopipeDiscoverGscQuery, map: Map<string, KeywordPickerOption>): void {
    const phrase = (q.query ?? '').trim();
    if (!phrase) return;
    if (!isRelevantForPicker(phrase, this.relevanceCtx, 'gsc')) return;
    mergeKeywordOption(map, {
      phraseKey: normalizePhraseKey(phrase),
      phrase,
      position: q.position,
      source: 'gsc',
    });
  }

  private mergeRanked(k: ProtopipeDiscoverRankedKeyword, map: Map<string, KeywordPickerOption>): void {
    const phrase = (k.phrase ?? '').trim();
    if (!phrase) return;
    if (!isRelevantForPicker(phrase, this.relevanceCtx, 'ranked')) return;
    mergeKeywordOption(map, {
      phraseKey: normalizePhraseKey(phrase),
      phrase,
      searchVolume: k.searchVolume,
      keywordDifficulty: k.keywordDifficulty,
      position: k.position,
      source: 'ranked',
    });
  }

  private mergeAdsIdea(
    idea: ProtopipeDiscoverAdsIdea,
    map: Map<string, KeywordPickerOption>,
    source: 'ads' | 'ads_related',
  ): void {
    const phrase = (idea.phrase ?? '').trim();
    if (!phrase) return;
    if (!isRelevantForPicker(phrase, this.relevanceCtx, source)) return;
    mergeKeywordOption(map, {
      phraseKey: normalizePhraseKey(phrase),
      phrase,
      searchVolume: idea.avgMonthlySearches,
      competition: idea.competition,
      competitionIndex: idea.competitionIndex,
      source,
    });
  }

  private async seedRelatedKeywords(
    map: Map<string, KeywordPickerOption>,
    discovery: ProtopipeKeywordDiscoveryResponse,
  ): Promise<void> {
    const siteId = this.siteId;
    if (!siteId) return;

    const seeds = this.pickSeedPhrases(map, discovery);
    for (const phrase of seeds) {
      try {
        const res = await this.api.researchQuery(siteId, {
          phrase,
          includeRelated: true,
          relatedLimit: RELATED_LIMIT,
        });
        for (const related of res.ads.related ?? []) {
          this.mergeRelated(related, map);
        }
      } catch {
        // Related enrichment is best-effort on load.
      }
    }
  }

  private pickSeedPhrases(
    map: Map<string, KeywordPickerOption>,
    discovery: ProtopipeKeywordDiscoveryResponse,
  ): string[] {
    const seeds: string[] = [];
    const seen = new Set<string>();

    const addSeed = (phrase: string | undefined): void => {
      const trimmed = (phrase ?? '').trim();
      if (!trimmed) return;
      const key = normalizePhraseKey(trimmed);
      if (seen.has(key)) return;
      seen.add(key);
      seeds.push(trimmed);
    };

    const summary = this.strategy.strategy().summary;
    const seedMatch = summary.match(/Primary goal: rank for "([^"]+)"/i);
    if (seedMatch?.[1]) addSeed(seedMatch[1]);

    const tradeMatch = summary.match(/Trade:\s*([^.]+)/i);
    if (tradeMatch?.[1]) addSeed(tradeMatch[1]);

    const ranked = (discovery.ranked.keywords ?? [])
      .filter((k) => {
        const phrase = (k.phrase ?? '').trim();
        return phrase && isRelevantForPicker(phrase, this.relevanceCtx, 'ranked');
      })
      .sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0));
    for (const k of ranked) {
      if (seeds.length >= SEED_PHRASE_COUNT) break;
      addSeed(k.phrase);
    }

    if (seeds.length < SEED_PHRASE_COUNT) {
      const scored = scoreKeywordOptions([...map.values()], this.relevanceCtx);
      for (const o of scored) {
        if (seeds.length >= SEED_PHRASE_COUNT) break;
        addSeed(o.phrase);
      }
    }

    return seeds.slice(0, SEED_PHRASE_COUNT);
  }

  private mergeRelated(related: ProtopipeResearchRelatedKeyword, map: Map<string, KeywordPickerOption>): void {
    const phrase = (related.phrase ?? '').trim();
    if (!phrase) return;
    if (!isRelevantForPicker(phrase, this.relevanceCtx, 'ads_related')) return;
    mergeKeywordOption(map, {
      phraseKey: normalizePhraseKey(phrase),
      phrase,
      searchVolume: related.avgMonthlySearches,
      competition: related.competition,
      source: 'ads_related',
    });
  }

  private applyScoredPool(map: Map<string, KeywordPickerOption>): void {
    const scored = scoreKeywordOptions([...map.values()], this.relevanceCtx);
    this._pool.set(scored);
    this._suggested.set(pickSuggestedPanel(scored));

    const savedKeys = new Set(
      this.strategy.keywords().map((k) => normalizePhraseKey(k.phrase)),
    );
    const preselected = pickPreselectedKeys(scored, savedKeys);
    const selected = new Map<string, KeywordPickerOption>();

    for (const key of preselected) {
      const fromPool = scored.find((o) => o.phraseKey === key);
      if (fromPool) {
        selected.set(key, fromPool);
      }
    }
    for (const kw of this.strategy.keywords()) {
      const key = normalizePhraseKey(kw.phrase);
      if (!key || selected.has(key)) continue;
      selected.set(key, {
        phraseKey: key,
        phrase: kw.phrase,
        source: 'custom',
      });
    }
    this._selected.set(selected);
  }

  private mergeIntoPool(option: KeywordPickerOption): void {
    const map = new Map(this._pool().map((o) => [o.phraseKey, o]));
    mergeKeywordOption(map, option);
    const scored = scoreKeywordOptions([...map.values()], this.relevanceCtx);
    this._pool.set(scored);
  }

  private async fetchRelatedKeywords(phrase: string): Promise<void> {
    const siteId = this.siteId;
    if (!siteId) return;
    this._searching.set(true);
    try {
      const res = await this.api.researchQuery(siteId, {
        phrase,
        includeRelated: true,
        relatedLimit: 20,
      });
      const metrics = res.ads.metrics;
      if (metrics) {
        this._searchPrimary.set({
          phraseKey: normalizePhraseKey(phrase),
          phrase,
          searchVolume: metrics.avgMonthlySearches,
          competition: metrics.competition,
          competitionIndex: metrics.competitionIndex,
          source: 'research',
        });
      } else {
        this._searchPrimary.set({
          phraseKey: normalizePhraseKey(phrase),
          phrase,
          source: 'research',
        });
      }

      const related: KeywordPickerOption[] = [];
      for (const row of res.ads.related ?? []) {
        const p = (row.phrase ?? '').trim();
        if (!p) continue;
        if (!isRelevantForPicker(p, this.relevanceCtx, 'ads_related')) continue;
        related.push({
          phraseKey: normalizePhraseKey(p),
          phrase: p,
          searchVolume: row.avgMonthlySearches,
          competition: row.competition,
          source: 'ads_related',
        });
      }
      this._searchRelated.set(related);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Search failed'));
      this._searchRelated.set([]);
      this._searchPrimary.set(null);
    } finally {
      this._searching.set(false);
    }
  }
}
