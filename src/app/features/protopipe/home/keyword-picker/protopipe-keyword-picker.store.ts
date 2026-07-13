import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  ProtopipeDiscoverAdsIdea,
  ProtopipeDiscoverGscQuery,
  ProtopipeDiscoverRankedKeyword,
  ProtopipeDiscoveryCandidate,
  ProtopipeDiscoveryCandidateSource,
  ProtopipeKeywordDiscoveryResponse,
  ProtopipeKeywordDiscoveryRunDto,
  ProtopipeResearchRelatedKeyword,
  ProtopipeSuggestedAvatar,
} from '@hive/contracts';
import { discoveryProgressPercent, discoveryStepLabel } from './discovery-progress';
import { ContentPlanStore } from '../../content-plan/content-plan.store';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { ProtopipeHomeThinkerViewState } from '../protopipe-home-thinker-view.state';
import {
  buildRelevanceContext,
  isRelevantForPicker,
  isRelevantForSeedExpansion,
  type KeywordRelevanceContext,
} from './keyword-picker.relevance';
import { buildSearchResultsFromResearch } from './keyword-picker.search-results';
import {
  mergeKeywordOption,
  pickPreselectedKeys,
  pickSuggestedPanel,
  scoreKeywordOptions,
} from './keyword-picker.scoring';
import type { KeywordPickerOption, KeywordPickerSource } from './keyword-picker.types';
import { normalizePhraseKey } from './keyword-picker.types';

const SEARCH_DEBOUNCE_MS = 350;
const SEARCH_RELATED_LIMIT = 50;
const IDLE_POOL_PREVIEW = 25;
const SEED_PHRASE_COUNT = 3;
const DISCOVERY_POLL_MS = 1500;
const DISCOVERY_POLL_MAX = 120;
/** Max audiences allowed when confirming a keyword strategy (matches bagend confirm). */
export const MAX_KEYWORD_PICKER_AVATARS = 3;
const MAX_AVATARS = MAX_KEYWORD_PICKER_AVATARS;

export type KeywordPickerWizardStep = 'keywords' | 'avatars' | 'build';

function optionalNumber(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function optionalRatio(value: number | null | undefined): number | undefined {
  const n = optionalNumber(value);
  if (n == null) return undefined;
  return n > 1 ? n / 100 : n;
}

function optionalString(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapDiscoverySourceToPicker(
  source: ProtopipeDiscoveryCandidateSource,
): KeywordPickerSource {
  switch (source) {
    case 'gsc':
      return 'gsc';
    case 'ranked':
      return 'ranked';
    case 'ads_ideas':
      return 'ads';
    case 'ads_related':
      return 'ads_related';
    default:
      return 'research';
  }
}

@Injectable()
export class ProtopipeKeywordPickerStore {
  private readonly api = inject(ProtopipeApiService);
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly contentPlan = inject(ContentPlanStore);
  private readonly thinkerView = inject(ProtopipeHomeThinkerViewState);

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
  private readonly _rerunningDiscovery = signal(false);
  private readonly _discoveryNote = signal<string | null>(null);
  private readonly _discoveryProgress = signal<string | null>(null);
  private readonly _discoveryProgressPercent = signal(0);
  private readonly _discoveryRunId = signal<string | null>(null);
  private readonly _suggestedAvatars = signal<ProtopipeSuggestedAvatar[]>([]);
  private readonly _selectedAvatarIds = signal<Set<string>>(new Set());
  private readonly _hoveredAvatarId = signal<string | null>(null);
  private readonly _wizardStep = signal<KeywordPickerWizardStep>('keywords');

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
  readonly rerunningDiscovery = this._rerunningDiscovery.asReadonly();
  readonly discoveryNote = this._discoveryNote.asReadonly();
  readonly discoveryProgress = this._discoveryProgress.asReadonly();
  readonly discoveryProgressPercent = this._discoveryProgressPercent.asReadonly();
  readonly discoveryRunId = this._discoveryRunId.asReadonly();
  readonly suggestedAvatars = this._suggestedAvatars.asReadonly();
  readonly selectedAvatarIds = this._selectedAvatarIds.asReadonly();
  readonly hoveredAvatarId = this._hoveredAvatarId.asReadonly();
  readonly wizardStep = this._wizardStep.asReadonly();

  readonly selectedCount = computed(() => this._selected().size);
  readonly selectedList = computed(() => [...this._selected().values()]);
  readonly selectedAvatarCount = computed(() => this._selectedAvatarIds().size);

  readonly wizardEnabled = computed(
    () => this._discoveryRunId() != null && this._suggestedAvatars().length > 0,
  );

  readonly filteredPool = computed(() => {
    const q = this._searchQuery().trim().toLowerCase();
    const selected = this._selected();
    const pool = this._pool().filter((o) => !selected.has(o.phraseKey));
    if (!q) return pool.slice(0, IDLE_POOL_PREVIEW);
    return pool.filter((o) => o.phrase.toLowerCase().includes(q)).slice(0, IDLE_POOL_PREVIEW);
  });

  readonly hasSearchQuery = computed(() => this._searchQuery().trim().length > 0);

  readonly searchResultCount = computed(() => {
    let count = this._searchRelated().length;
    if (this._searchPrimary()) count += 1;
    return count;
  });

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
    this._discoveryProgress.set(null);
    this._discoveryProgressPercent.set(0);
    this._wizardStep.set('keywords');
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
        onboardingProfile: this.strategy.onboardingProfile() ?? undefined,
        displayName: this.strategy.site()?.displayName,
        hostname: this.strategy.site()?.hostname,
      });

      this._hostname.set(this.strategy.site()?.hostname ?? '');
      const map = new Map<string, KeywordPickerOption>();
      const latest = await this.api.getLatestKeywordDiscoveryRun(siteId);
      const existing = latest.run;

      if (existing) {
        this._discoveryRunId.set(existing.id);
        this.thinkerView.openDiscoveryRun(siteId, existing, { enterFocus: false });
        if (existing.status === 'pending' || existing.status === 'discovering') {
          this._discoveryProgress.set(discoveryStepLabel(existing.currentStep));
          this._discoveryProgressPercent.set(discoveryProgressPercent(existing));
          const run = await this.pollDiscoveryRun(siteId, existing.id);
          this.thinkerView.updateDiscoveryRun(run);
          this.mergeDiscoveryRun(run, map);
          this.applySuggestedAvatars(run.artifacts.suggestedAvatars ?? []);
          await this.seedRelatedKeywords(map);
        } else if (existing.status === 'ready' || existing.status === 'confirmed') {
          this.thinkerView.updateDiscoveryRun(existing);
          this.mergeDiscoveryRun(existing, map);
          this.applySuggestedAvatars(existing.artifacts.suggestedAvatars ?? []);
          await this.seedRelatedKeywords(map);
        } else if (existing.status === 'failed') {
          this._discoveryNote.set(
            existing.error?.message ?? 'Keyword discovery failed. Your saved keywords are shown below.',
          );
          this.loadFromSavedStrategy(map);
        }
      } else {
        this._discoveryRunId.set(null);
        this._suggestedAvatars.set([]);
        this._selectedAvatarIds.set(new Set());
        this._discoveryNote.set('Keyword research has not run yet. Complete onboarding to start discovery.');
        this.loadFromSavedStrategy(map);
      }

      this.applyScoredPool(map);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to load keyword suggestions'));
    } finally {
      this._loading.set(false);
      this._discoveryProgress.set(null);
    this._discoveryProgressPercent.set(0);
    }
  }

  private async pollDiscoveryRun(
    siteId: string,
    runId: string,
  ): Promise<ProtopipeKeywordDiscoveryRunDto> {
    for (let attempt = 0; attempt < DISCOVERY_POLL_MAX; attempt++) {
      const { run } = await this.api.getKeywordDiscoveryRun(siteId, runId);
      if (run.status === 'ready' || run.status === 'confirmed') {
        return run;
      }
      if (run.status === 'failed') {
        throw new Error(run.error?.message ?? 'Keyword discovery failed');
      }
      this._discoveryProgress.set(discoveryStepLabel(run.currentStep));
      this._discoveryProgressPercent.set(discoveryProgressPercent(run));
      this.thinkerView.updateDiscoveryRun(run);
      await sleep(DISCOVERY_POLL_MS);
    }
    throw new Error('Keyword discovery timed out — try again in a moment.');
  }

  confirmKeywordSelection(): boolean {
    if (this._selected().size === 0) return false;
    if (!this.wizardEnabled()) {
      return false;
    }
    this._wizardStep.set('avatars');
    this._error.set(null);
    return true;
  }

  goToBuildStep(): boolean {
    const selected = this._selectedAvatarIds();
    if (selected.size === 0) {
      this._error.set(`Select at least one audience (up to ${MAX_AVATARS}).`);
      return false;
    }
    if (selected.size > MAX_AVATARS) {
      const keep = new Set<string>();
      for (const av of this._suggestedAvatars()) {
        if (!selected.has(av.id)) continue;
        keep.add(av.id);
        if (keep.size >= MAX_AVATARS) break;
      }
      if (keep.size < MAX_AVATARS) {
        for (const id of selected) {
          if (keep.has(id)) continue;
          keep.add(id);
          if (keep.size >= MAX_AVATARS) break;
        }
      }
      this._selectedAvatarIds.set(keep);
    }
    this._wizardStep.set('build');
    this._error.set(null);
    return true;
  }

  backWizardStep(): void {
    const step = this._wizardStep();
    if (step === 'build') {
      this._wizardStep.set('avatars');
    } else if (step === 'avatars') {
      this._wizardStep.set('keywords');
    }
    this._error.set(null);
  }

  setWizardStep(step: KeywordPickerWizardStep): void {
    this._wizardStep.set(step);
    this._error.set(null);
  }

  /** Temporary QA hook — enqueue a fresh keyword discovery run for the current site. */
  async rerunDiscovery(): Promise<string | null> {
    await this.strategy.ensureLoaded();
    const siteId = this.strategy.siteId();
    if (!siteId) {
      this._error.set('No site loaded for this account');
      return null;
    }

    this._rerunningDiscovery.set(true);
    this._error.set(null);
    this._discoveryNote.set(null);

    try {
      const { run } = await this.api.startKeywordDiscoveryRun(siteId);
      await this.followDiscoveryRun(siteId, run.id);
      return run.id;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not restart keyword discovery'));
      return null;
    } finally {
      this._rerunningDiscovery.set(false);
    }
  }

  /** Attach and poll a discovery run started after onboarding profile changes. */
  async followDiscoveryRun(siteId: string, runId: string): Promise<void> {
    this.siteId = siteId;
    this._error.set(null);
    this._discoveryNote.set(null);
    this._discoveryProgress.set('Starting discovery…');
    this._discoveryProgressPercent.set(0);
    this._wizardStep.set('keywords');
    this._selected.set(new Map());
    this._selectedAvatarIds.set(new Set());
    this._suggestedAvatars.set([]);

    const map = new Map<string, KeywordPickerOption>();
    this.relevanceCtx = buildRelevanceContext({
      strategySummary: this.strategy.strategy().summary,
      onboardingProfile: this.strategy.onboardingProfile() ?? undefined,
      displayName: this.strategy.site()?.displayName,
      hostname: this.strategy.site()?.hostname,
    });

    try {
      const { run: initial } = await this.api.getKeywordDiscoveryRun(siteId, runId);
      this._discoveryRunId.set(runId);
      this.thinkerView.openDiscoveryRun(siteId, initial, { enterFocus: false });

      let run = initial;
      if (run.status === 'pending' || run.status === 'discovering') {
        run = await this.pollDiscoveryRun(siteId, runId);
      }

      this.thinkerView.updateDiscoveryRun(run);
      this.mergeDiscoveryRun(run, map);
      this.applySuggestedAvatars(run.artifacts.suggestedAvatars ?? []);
      await this.seedRelatedKeywords(map);
      this.applyScoredPool(map);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Discovery run failed after save.'));
    } finally {
      this._discoveryProgress.set(null);
      this._discoveryProgressPercent.set(0);
    }
  }

  setHoveredAvatarId(id: string | null): void {
    this._hoveredAvatarId.set(id);
  }

  toggleAvatar(id: string): void {
    this._selectedAvatarIds.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_AVATARS) {
        next.add(id);
      }
      return next;
    });
  }

  updateAvatar(
    id: string,
    field:
      | 'label'
      | 'description'
      | 'intentCluster'
      | 'exampleQueries'
      | 'emotionalState'
      | 'whatTheyNeed'
      | 'voiceTheyRespondTo',
    value: string | string[],
  ): void {
    this._suggestedAvatars.update((list) =>
      list.map((av) => {
        if (av.id !== id) return av;
        if (field === 'exampleQueries' && Array.isArray(value)) {
          return { ...av, exampleQueries: value };
        }
        if (typeof value === 'string') {
          return { ...av, [field]: value };
        }
        return av;
      }),
    );
  }

  addCustomAvatar(): void {
    const id = `user-${Date.now()}`;
    const custom: ProtopipeSuggestedAvatar = {
      id,
      label: 'Custom audience',
      description: '',
      intentCluster: 'Custom audience',
      exampleQueries: [],
      origin: 'user',
    };
    this._suggestedAvatars.update((list) => [...list, custom]);
    this._selectedAvatarIds.update((current) => {
      if (current.size >= MAX_AVATARS) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }

  isAvatarSelected(id: string): boolean {
    return this._selectedAvatarIds().has(id);
  }

  async confirmAvatarsAndBuildPlan(): Promise<boolean> {
    if (this._confirming()) return false;
    const runId = this._discoveryRunId();
    if (runId) {
      return this.confirmViaDiscoveryApi(runId);
    }
    return this.confirmLegacyAndBuildPlan();
  }

  /** @deprecated Legacy single-step confirm when discovery run is unavailable. */
  async confirmAndBuildPlan(): Promise<boolean> {
    if (this.wizardEnabled() && this._wizardStep() !== 'build') {
      return false;
    }
    return this.confirmAvatarsAndBuildPlan();
  }

  private async confirmViaDiscoveryApi(discoveryRunId: string): Promise<boolean> {
    const siteId = this.siteId;
    if (!siteId) return false;
    const avatarIds = this._selectedAvatarIds();
    if (avatarIds.size === 0 || avatarIds.size > MAX_AVATARS) {
      this._error.set(`Select 1–${MAX_AVATARS} audiences to continue.`);
      return false;
    }
    if (this._selected().size === 0) {
      this._error.set('Select at least one keyword.');
      return false;
    }

    this._confirming.set(true);
    this._error.set(null);
    try {
      const avatarsById = new Map(this._suggestedAvatars().map((a) => [a.id, a]));
      const confirmedAvatars = [...avatarIds].map((id) => {
        const av = avatarsById.get(id);
        return {
          id,
          description: av?.description?.trim() || id,
          exampleQueries: av?.exampleQueries ?? [],
          intentCluster: av?.intentCluster?.trim() || 'general',
          label: av?.label?.trim() || undefined,
          emotionalState: av?.emotionalState?.trim() || undefined,
          whatTheyNeed: av?.whatTheyNeed?.trim() || undefined,
          voiceTheyRespondTo: av?.voiceTheyRespondTo?.trim() || undefined,
          origin:
            av?.origin ??
            (av?.matchedOnboarding ? ('onboarding' as const) : ('discovery' as const)),
        };
      });

      const confirmedKeywords = [...this._selected().values()].map((o) => ({
        phrase: o.phrase,
        searchVolume: optionalNumber(o.searchVolume),
        difficulty: optionalNumber(o.keywordDifficulty),
        cpc: optionalNumber(o.cpc),
        fit: optionalRatio(o.relevanceScore),
        opportunity: optionalNumber(o.opportunityScore),
        intent: o.intent,
        funnelStage: o.funnelStage,
        source: o.discoverySource,
        isGap: o.isGap,
        serpFeatures: o.serpFeatures,
        avatarId: optionalString(o.avatarId),
      }));

      await this.api.confirmKeywordStrategy(siteId, {
        discoveryRunId,
        confirmedKeywords,
        confirmedAvatars,
      });

      await this.strategy.reload();
      await this.contentPlan.loadLatest();
      return true;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to confirm strategy and start plan'));
      return false;
    } finally {
      this._confirming.set(false);
    }
  }

  private async confirmLegacyAndBuildPlan(): Promise<boolean> {
    if (this._selected().size === 0) return false;
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

  private mergeDiscoveryRun(
    run: ProtopipeKeywordDiscoveryRunDto,
    map: Map<string, KeywordPickerOption>,
  ): void {
    const notes: string[] = [];
    const notableEvents = run.events.filter((e) => {
      if (e.status === 'failed') return true;
      const text = `${e.note ?? ''} ${e.error ?? ''}`.toLowerCase();
      return (
        text.includes('google ads api') ||
        text.includes('permission_denied') ||
        text.includes('unavailable')
      );
    });
    for (const ev of notableEvents) {
      if (ev.note || ev.error) {
        notes.push(ev.note ?? ev.error ?? `${ev.step} failed`);
      }
    }
    if (notes.length) {
      this._discoveryNote.set(notes.slice(0, 2).join(' · '));
    }
    for (const c of run.artifacts.scoredCandidates ?? []) {
      this.mergeDiscoveryCandidate(c, map);
    }
  }

  private isStrategyOnlySite(): boolean {
    const profile = this.strategy.onboardingProfile();
    const hostname = (this.strategy.site()?.hostname ?? '').toLowerCase();
    return profile?.onboardingMode === 'strategy_only' || hostname === 'pending.local';
  }

  private relevanceOptions(): { strategyOnly?: boolean } {
    return this.isStrategyOnlySite() ? { strategyOnly: true } : {};
  }

  private scoringConfig(): { strategyOnly?: boolean } {
    return this.relevanceOptions();
  }

  private mergeDiscoveryCandidate(
    c: ProtopipeDiscoveryCandidate,
    map: Map<string, KeywordPickerOption>,
  ): void {
    const phrase = (c.phrase ?? '').trim();
    if (!phrase) return;
    const pickerSource = mapDiscoverySourceToPicker(c.source);
    if (!isRelevantForPicker(phrase, this.relevanceCtx, pickerSource, this.relevanceOptions())) return;
    mergeKeywordOption(map, {
      phraseKey: normalizePhraseKey(phrase),
      phrase,
      searchVolume: c.searchVolume,
      keywordDifficulty: c.difficulty,
      opportunityScore: c.opportunity,
      relevanceScore: c.fit,
      source: pickerSource,
      intent: c.intent,
      funnelStage: c.funnelStage,
      discoverySource: c.source,
      avatarId: c.avatarId,
      isGap: c.isGap,
      cpc: c.cpc,
      serpFeatures: c.serpFeatures ?? c.serpItemTypes,
    });
  }

  private applySuggestedAvatars(avatars: ProtopipeSuggestedAvatar[]): void {
    this._suggestedAvatars.set(avatars);
    const preselected = new Set<string>();
    // Discovery may mark every onboarding avatar as preselected (often > MAX).
    // Cap so "Continue to review" is not a silent no-op.
    for (const av of avatars) {
      if (!av.preselected) continue;
      preselected.add(av.id);
      if (preselected.size >= MAX_AVATARS) break;
    }
    if (preselected.size === 0 && avatars.length > 0) {
      preselected.add(avatars[0].id);
    }
    this._selectedAvatarIds.set(preselected);
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
    if (!isRelevantForPicker(phrase, this.relevanceCtx, 'gsc', this.relevanceOptions())) return;
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
    if (!isRelevantForPicker(phrase, this.relevanceCtx, 'ranked', this.relevanceOptions())) return;
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
    if (!isRelevantForPicker(phrase, this.relevanceCtx, source, this.relevanceOptions())) return;
    mergeKeywordOption(map, {
      phraseKey: normalizePhraseKey(phrase),
      phrase,
      searchVolume: idea.avgMonthlySearches,
      competition: idea.competition,
      competitionIndex: idea.competitionIndex,
      source,
    });
  }

  private async seedRelatedKeywords(map: Map<string, KeywordPickerOption>): Promise<void> {
    const siteId = this.siteId;
    if (!siteId) return;

    const seeds = this.pickSeedPhrases(map);
    for (const phrase of seeds) {
      try {
        const res = await this.api.researchQuery(siteId, {
          phrase,
          includeRelated: true,
          relatedLimit: SEARCH_RELATED_LIMIT,
        });
        for (const related of res.ads.related ?? []) {
          this.mergeRelated(related, map, true);
        }
      } catch {
        // Related enrichment is best-effort on load.
      }
    }
  }

  private pickSeedPhrases(map: Map<string, KeywordPickerOption>): string[] {
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

    const profile = this.strategy.onboardingProfile();
    if (profile?.services?.length) {
      for (const service of profile.services) {
        if (seeds.length >= SEED_PHRASE_COUNT) break;
        addSeed(service);
      }
    } else {
      const summary = this.strategy.strategy().summary;
      const seedMatch = summary.match(/Primary goal: rank for "([^"]+)"/i);
      if (seedMatch?.[1]) addSeed(seedMatch[1]);

      const tradeMatch = summary.match(/Trade:\s*([^.]+)/i);
      if (tradeMatch?.[1]) addSeed(tradeMatch[1]);
    }

    const ranked = [...map.values()]
      .filter((o) => o.source === 'ranked' || o.source === 'ads')
      .filter((o) =>
        isRelevantForPicker(o.phrase, this.relevanceCtx, o.source === 'ads' ? 'ads' : 'ranked', this.relevanceOptions()),
      )
      .sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0));
    for (const o of ranked) {
      if (seeds.length >= SEED_PHRASE_COUNT) break;
      addSeed(o.phrase);
    }

    if (seeds.length < SEED_PHRASE_COUNT) {
      const scored = scoreKeywordOptions([...map.values()], this.relevanceCtx, this.scoringConfig());
      for (const o of scored) {
        if (seeds.length >= SEED_PHRASE_COUNT) break;
        addSeed(o.phrase);
      }
    }

    return seeds.slice(0, SEED_PHRASE_COUNT);
  }

  private mergeRelated(
    related: ProtopipeResearchRelatedKeyword,
    map: Map<string, KeywordPickerOption>,
    seedExpansion = false,
  ): void {
    const phrase = (related.phrase ?? '').trim();
    if (!phrase) return;
    if (!seedExpansion) {
      if (!isRelevantForPicker(phrase, this.relevanceCtx, 'ads_related', this.relevanceOptions())) {
        return;
      }
    } else if (
      !isRelevantForSeedExpansion(phrase, this.relevanceCtx, 'ads_related', this.relevanceOptions())
    ) {
      return;
    }
    mergeKeywordOption(map, {
      phraseKey: normalizePhraseKey(phrase),
      phrase,
      searchVolume: related.avgMonthlySearches,
      competition: related.competition,
      source: 'ads_related',
    });
  }

  private loadFromSavedStrategy(map: Map<string, KeywordPickerOption>): void {
    for (const kw of this.strategy.keywords()) {
      const phrase = kw.phrase?.trim();
      if (!phrase) continue;
      mergeKeywordOption(map, {
        phraseKey: normalizePhraseKey(phrase),
        phrase,
        source: 'custom',
      });
    }
  }

  private applyScoredPool(map: Map<string, KeywordPickerOption>): void {
    // Keep saved + strategy keywords in the browsable pool (confirmed runs may omit scoredCandidates).
    this.loadFromSavedStrategy(map);
    const scored = scoreKeywordOptions([...map.values()], this.relevanceCtx, this.scoringConfig());
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
    const scored = scoreKeywordOptions([...map.values()], this.relevanceCtx, this.scoringConfig());
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
        relatedLimit: SEARCH_RELATED_LIMIT,
      });
      const { primary, related } = buildSearchResultsFromResearch({
        phrase,
        metrics: res.ads.metrics,
        adsRelated: res.ads.related,
        gscSimilar: res.gsc.similarQueries,
        ctx: this.relevanceCtx,
      });
      this._searchPrimary.set(primary);
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
