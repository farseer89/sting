import { Injectable, computed, inject, signal } from '@angular/core';
import type { ProtopipeDataForSeoStatusResponse } from '@hive/contracts';
import type {
  KeywordIntent,
  KeywordPriority,
  ProtopipeKeyword,
  ProtopipeSite,
  ProtopipeStrategySummary,
} from './protopipe.models';
import {
  PROTOPIPE_MAX_NOTES_LENGTH,
  PROTOPIPE_MAX_PHRASE_LENGTH,
} from './protopipe.constants';
import { parseProtopipeApiError } from './protopipe-http.util';
import { ProtopipeApiService } from './protopipe-api.service';

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
  private readonly _summary = signal('');
  private readonly _keywords = signal<ProtopipeKeyword[]>([]);
  private readonly _updatedAt = signal(new Date().toISOString());
  private readonly _loading = signal(false);
  private readonly _saving = signal(false);
  private readonly _dirty = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _initialized = signal(false);
  private readonly _dataForSeoTesting = signal(false);
  private readonly _dataForSeoStatus = signal<ProtopipeDataForSeoStatusResponse | null>(null);
  private readonly _dataForSeoTestError = signal<string | null>(null);

  readonly keywords = this._keywords.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly dirty = this._dirty.asReadonly();
  readonly error = this._error.asReadonly();
  readonly siteId = this._siteId.asReadonly();
  readonly dataForSeoTesting = this._dataForSeoTesting.asReadonly();
  readonly dataForSeoStatus = this._dataForSeoStatus.asReadonly();
  readonly dataForSeoTestError = this._dataForSeoTestError.asReadonly();

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
      const activeSiteId = boot.primarySiteId || boot.sites[0]?.id;
      if (!activeSiteId) {
        throw new Error('No site available for this account');
      }
      this._siteId.set(activeSiteId);
      const plan = await this.api.getPlan(activeSiteId);
      this.applyPlan(plan);
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
    const keyword: ProtopipeKeyword = {
      id: `temp-${crypto.randomUUID()}`,
      phrase,
      intent: input.intent,
      priority: input.priority,
      notes: this.clampNotes(input.notes),
    };
    this._keywords.update((list) => [...list, keyword]);
    this._dirty.set(true);
  }

  updateKeyword(id: string, patch: Partial<Omit<ProtopipeKeyword, 'id'>>): void {
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

  /** Dev/integration check: bagend → DataForSEO (v2 status endpoint). */
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

  private applyPlan(plan: ProtopipeStrategySummary): void {
    this._siteId.set(plan.site.id);
    this._site.set(plan.site);
    this._summary.set(plan.summary);
    this._keywords.set(plan.keywords);
    this._updatedAt.set(plan.updatedAt);
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
