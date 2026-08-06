import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  ProtopipeDataForSeoStatusResponse,
  ProtopipeSpyFuStatusResponse,
  ShireHostedSiteScanResponse,
  SubscriptionState,
  DiscoveryBookOnboardingStepId,
} from '@hive/contracts';
import type { ProtopipeOnboardingProfile } from '@hive/contracts';
import type {
  KeywordIntent,
  KeywordPriority,
  ProtopipeKeywordDto,
  ProtopipeKeywordMetricPoint,
  ProtopipeSite,
  ProtopipeStrategySummary,
} from './protopipe.models';
import {
  PROTOPIPE_MAX_NOTES_LENGTH,
  PROTOPIPE_MAX_PHRASE_LENGTH,
} from './protopipe.constants';
import { parseProtopipeApiError } from './protopipe-http.util';
import { ProtopipeApiService } from './protopipe-api.service';
import { resolveBootstrapSiteId } from './resolve-bootstrap-site-id';

export interface NewProtopipeKeyword {
  phrase: string;
  intent: KeywordIntent;
  priority: KeywordPriority;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class ProtopipeStrategyService {
  private readonly api = inject(ProtopipeApiService);

  private readonly _siteId = signal<string | null>(null);
  private readonly _site = signal<ProtopipeSite | null>(null);
  private readonly _sites = signal<ProtopipeSite[]>([]);
  private readonly _summary = signal('');
  private readonly _onboardingProfile = signal<ProtopipeOnboardingProfile | null>(null);
  private readonly _onboardingStepId = signal<DiscoveryBookOnboardingStepId | null>(null);
  private readonly _subscription = signal<SubscriptionState | null>(null);
  private readonly _defaultCognitivePackId = signal('none');
  private readonly _keywords = signal<ProtopipeKeywordDto[]>([]);
  private readonly _marketRefreshing = signal(false);
  private readonly _lastEnrichSummary = signal<string | null>(null);
  private readonly _updatedAt = signal(new Date().toISOString());
  private readonly _loading = signal(false);
  private readonly _saving = signal(false);
  private readonly _dirty = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _initialized = signal(false);
  private readonly _dataForSeoTesting = signal(false);
  private readonly _dataForSeoStatus = signal<ProtopipeDataForSeoStatusResponse | null>(null);
  private readonly _spyFuStatus = signal<ProtopipeSpyFuStatusResponse | null>(null);
  private readonly _dataForSeoTestError = signal<string | null>(null);

  readonly keywords = this._keywords.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly dirty = this._dirty.asReadonly();
  readonly error = this._error.asReadonly();
  readonly siteId = this._siteId.asReadonly();
  readonly dataForSeoTesting = this._dataForSeoTesting.asReadonly();
  readonly dataForSeoStatus = this._dataForSeoStatus.asReadonly();
  readonly spyFuStatus = this._spyFuStatus.asReadonly();
  readonly dataForSeoTestError = this._dataForSeoTestError.asReadonly();
  readonly marketRefreshing = this._marketRefreshing.asReadonly();
  readonly lastEnrichSummary = this._lastEnrichSummary.asReadonly();
  readonly site = this._site.asReadonly();
  readonly sites = this._sites.asReadonly();
  readonly onboardingProfile = this._onboardingProfile.asReadonly();
  readonly onboardingStepId = this._onboardingStepId.asReadonly();
  readonly subscription = this._subscription.asReadonly();
  readonly defaultCognitivePackId = this._defaultCognitivePackId.asReadonly();

  readonly strategy = computed<ProtopipeStrategySummary>(() => ({
    site: this._site() ?? {
      id: this._siteId() ?? '',
      displayName: '—',
      url: '',
      hostname: '',
    },
    summary: this._summary(),
    keywords: this._keywords(),
    updatedAt: this._updatedAt(),
    onboardingProfile: this._onboardingProfile() ?? undefined,
    onboardingStepId: this._onboardingStepId(),
  }));

  readonly keywordCount = computed(() => this._keywords().length);
  readonly highPriorityCount = computed(
    () => this._keywords().filter((k) => k.priority === 'high').length,
  );

  async ensureLoaded(): Promise<void> {
    if (this._initialized() && !this._error()) {
      return;
    }
    await this.reload();
  }

  /** Force refresh from API (e.g. after error or explicit retry). */
  async reload(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const boot = await this.api.bootstrap();
      this._sites.set(boot.sites as ProtopipeSite[]);
      this._subscription.set(boot.subscription ?? null);
      const siteIds = boot.sites.map((s) => s.id);
      if (siteIds.length === 0) {
        throw new Error('No site available for this account');
      }

      const preferredId =
        this.readRememberedSiteId(siteIds) ?? resolveBootstrapSiteId(boot);
      const orderedSiteIds = [
        ...new Set([preferredId, ...siteIds].filter((id): id is string => Boolean(id))),
      ];

      let fallbackPlan: ProtopipeStrategySummary | null = null;
      let fallbackSiteId: string | null = null;
      let bestPlan: ProtopipeStrategySummary | null = null;
      let bestSiteId: string | null = null;
      let bestScore = -1;

      for (const siteId of orderedSiteIds) {
        try {
          const plan = await this.api.getPlan(siteId);
          const score = scoreOnboardingPlan(plan);
          if (score > bestScore) {
            bestScore = score;
            bestPlan = plan;
            bestSiteId = siteId;
          }
          if (!fallbackPlan) {
            fallbackPlan = plan;
            fallbackSiteId = siteId;
          }
        } catch {
          // Owner may not have access to a stale bootstrap site id — try the rest.
        }
      }

      if (bestPlan && bestSiteId && bestScore > 0) {
        this._siteId.set(bestSiteId);
        this.applyPlan(bestPlan);
        this._initialized.set(true);
        this._dirty.set(false);
        return;
      }

      if (!fallbackPlan || !fallbackSiteId) {
        throw new Error('No site available for this account');
      }

      this._siteId.set(fallbackSiteId);
      this.applyPlan(fallbackPlan);
      this._initialized.set(true);
      this._dirty.set(false);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to load plan'));
    } finally {
      this._loading.set(false);
    }
  }

  addKeyword(input: NewProtopipeKeyword): void {
    const phrase = this.clampPhrase(input.phrase);
    if (!phrase) {
      return;
    }
    const keyword: ProtopipeKeywordDto = {
      id: `temp-${crypto.randomUUID()}`,
      phrase,
      intent: input.intent,
      priority: input.priority,
      notes: this.clampNotes(input.notes),
    };
    this._keywords.update((list) => [...list, keyword]);
    this._dirty.set(true);
  }

  updateKeyword(id: string, patch: Partial<Omit<ProtopipeKeywordDto, 'id'>>): void {
    this._keywords.update((list) =>
      list.map((kw) => {
        if (kw.id !== id) {
          return kw;
        }
        return {
          ...kw,
          ...patch,
          phrase: patch.phrase !== undefined ? this.clampPhrase(patch.phrase) : kw.phrase,
          notes: patch.notes !== undefined ? this.clampNotes(patch.notes) : kw.notes,
        };
      }),
    );
    this._dirty.set(true);
  }

  removeKeyword(id: string): void {
    this._keywords.update((list) => list.filter((kw) => kw.id !== id));
    this._dirty.set(true);
  }

  /** Replace the full keyword list (e.g. home picker confirm). */
  replaceKeywords(inputs: NewProtopipeKeyword[]): void {
    const keywords: ProtopipeKeywordDto[] = [];
    const seen = new Set<string>();
    for (const input of inputs) {
      const phrase = this.clampPhrase(input.phrase);
      if (!phrase) continue;
      const key = phrase.trim().toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) continue;
      seen.add(key);
      keywords.push({
        id: `temp-${crypto.randomUUID()}`,
        phrase,
        intent: input.intent,
        priority: input.priority,
        notes: this.clampNotes(input.notes),
      });
    }
    this._keywords.set(keywords);
    this._dirty.set(true);
  }

  /** Dev/integration check: bagend → DataForSEO (v2 status endpoint). */
  async refreshMarketData(): Promise<boolean> {
    const siteId = this._siteId();
    if (!siteId) {
      this._error.set('No site loaded');
      return false;
    }
    this._marketRefreshing.set(true);
    this._error.set(null);
    try {
      const result = await this.api.enrichMarket(siteId);
      this._lastEnrichSummary.set(
        `Updated ${result.enriched} keywords · $${result.costUsd.toFixed(4)} · ${new Date(result.capturedAt).toLocaleString()}`,
      );
      await this.reloadPlanOnly(siteId);
      return true;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to refresh market data'));
      return false;
    } finally {
      this._marketRefreshing.set(false);
    }
  }

  async loadKeywordHistory(keywordId: string): Promise<ProtopipeKeywordMetricPoint[]> {
    const siteId = this._siteId();
    if (!siteId || keywordId.startsWith('temp-')) {
      return [];
    }
    const { points } = await this.api.getKeywordMetricHistory(siteId, keywordId);
    return points;
  }

  async testDataForSeoConnection(): Promise<void> {
    this._dataForSeoTesting.set(true);
    this._dataForSeoTestError.set(null);
    this._dataForSeoStatus.set(null);
    try {
      const status = await this.api.dataForSeoStatus();
      this._dataForSeoStatus.set(status);
    } catch (err) {
      this._dataForSeoTestError.set(parseProtopipeApiError(err, 'DataForSEO check failed'));
    } finally {
      this._dataForSeoTesting.set(false);
    }
  }

  async refreshMarketProviderStatus(): Promise<void> {
    this._dataForSeoTesting.set(true);
    this._dataForSeoTestError.set(null);
    try {
      const [dataForSeo, spyFu] = await Promise.all([
        this.api.dataForSeoStatus(),
        this.api.spyFuStatus(),
      ]);
      this._dataForSeoStatus.set(dataForSeo);
      this._spyFuStatus.set(spyFu);
    } catch (err) {
      this._dataForSeoTestError.set(parseProtopipeApiError(err, 'Market provider check failed'));
    } finally {
      this._dataForSeoTesting.set(false);
    }
  }

  async saveKeywords(): Promise<boolean> {
    const siteId = this._siteId();
    if (!siteId) {
      this._error.set('No site loaded');
      return false;
    }
    this._saving.set(true);
    this._error.set(null);
    try {
      const { plan } = await this.api.saveKeywords(siteId, {
        keywords: this._keywords().map((kw) => ({
          id: kw.id.startsWith('temp-') ? undefined : kw.id,
          phrase: kw.phrase,
          intent: kw.intent,
          priority: kw.priority,
          notes: kw.notes,
        })),
      });
      this.applyPlan(plan);
      this._dirty.set(false);
      return true;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to save keywords'));
      return false;
    } finally {
      this._saving.set(false);
    }
  }

  private async reloadPlanOnly(siteId: string): Promise<void> {
    const plan = await this.api.getPlan(siteId);
    this.applyPlan(plan);
  }

  async refreshPlan(): Promise<void> {
    const siteId = this._siteId();
    if (!siteId) return;
    await this.reloadPlanOnly(siteId);
  }

  /** Switch the active Build Book / strategy site and reload its plan. */
  async selectSite(siteId: string): Promise<boolean> {
    if (!siteId || this._siteId() === siteId) return true;

    this._loading.set(true);
    this._error.set(null);
    try {
      const plan = await this.api.getPlan(siteId);
      this.applyPlan(plan);
      this._initialized.set(true);
      this._dirty.set(false);
      return true;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not switch site'));
      return false;
    } finally {
      this._loading.set(false);
    }
  }

  async refreshSitesList(): Promise<void> {
    this.api.invalidateBootstrapCache();
    const boot = await this.api.bootstrap();
    this._sites.set(boot.sites as ProtopipeSite[]);
  }

  private applyPlan(plan: ProtopipeStrategySummary): void {
    this._siteId.set(plan.site.id);
    this._site.set(plan.site);
    this._summary.set(plan.summary);
    this._onboardingProfile.set(plan.onboardingProfile ?? null);
    this._onboardingStepId.set(
      (plan.onboardingStepId as DiscoveryBookOnboardingStepId | null | undefined) ?? null,
    );
    this._defaultCognitivePackId.set(plan.defaultCognitivePackId ?? 'none');
    this._keywords.set(plan.keywords);
    this._updatedAt.set(plan.updatedAt);
    this.rememberSiteId(plan.site.id);
    this._sites.update((list) => {
      const idx = list.findIndex((s) => s.id === plan.site.id);
      if (idx < 0) return [...list, plan.site];
      const next = [...list];
      next[idx] = { ...next[idx], ...plan.site };
      return next;
    });
  }

  private rememberSiteId(siteId: string): void {
    try {
      localStorage.setItem('protopipe.activeSiteId', siteId);
    } catch {
      /* ignore quota / private mode */
    }
  }

  private readRememberedSiteId(siteIds: string[]): string | null {
    try {
      const remembered = localStorage.getItem('protopipe.activeSiteId');
      if (remembered && siteIds.includes(remembered)) return remembered;
    } catch {
      /* ignore */
    }
    return null;
  }

  /** Called after PATCH site default cognitive pack without full plan reload. */
  applyDefaultCognitivePackId(packId: string): void {
    this._defaultCognitivePackId.set(packId || 'none');
  }

  mergeSite(patch: Partial<import('@hive/contracts').ProtopipeSite>): void {
    const current = this._site();
    if (!current) return;
    const next = { ...current, ...patch };
    // Explicit undefined must clear sticky fields (spread keeps the old value).
    if ('provisioningError' in patch && patch.provisioningError == null) {
      delete next.provisioningError;
    }
    this._site.set(next);
    this._sites.update((list) => {
      const idx = list.findIndex((s) => s.id === next.id);
      if (idx < 0) return list;
      const copy = [...list];
      copy[idx] = { ...copy[idx], ...next };
      return copy;
    });
  }

  async scanHostedSite(url: string): Promise<ShireHostedSiteScanResponse> {
    const siteId = this._siteId();
    if (!siteId) {
      throw new Error('No site selected');
    }
    const result = await this.api.scanHostedSite(siteId, { url });
    this.mergeSite(result.site);
    this.api.invalidateBootstrapCache();
    await this.refreshSitesList();
    return result;
  }

  private clampPhrase(value: string): string {
    return value.trim().slice(0, PROTOPIPE_MAX_PHRASE_LENGTH);
  }

  private clampNotes(value?: string): string | undefined {
    if (value == null) {
      return undefined;
    }
    const trimmed = value.trim().slice(0, PROTOPIPE_MAX_NOTES_LENGTH);
    return trimmed.length > 0 ? trimmed : undefined;
  }
}

function scoreOnboardingPlan(plan: ProtopipeStrategySummary): number {
  if (plan.onboardingStepId) return 100;
  const profile = plan.onboardingProfile;
  if (!profile) return 0;
  if (profile.websiteUrl?.trim()) return 40;
  if (profile.onboardingMode) return 20;
  if ((profile.services?.length ?? 0) > 0) return 30;
  if ((profile.customerAvatars?.length ?? 0) > 0) return 10;
  return 0;
}
