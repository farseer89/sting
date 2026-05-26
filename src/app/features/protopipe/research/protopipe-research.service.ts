import { Injectable, inject, signal } from '@angular/core';
import type {
  ProtopipeGoogleIntegrationStatusResponse,
  ProtopipeResearchQueryRequest,
  ProtopipeResearchResponse,
} from '@hive/contracts';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { ProtopipeApiService } from '../protopipe-api.service';
import { ProtopipeStrategyService } from '../protopipe-strategy.service';

@Injectable({ providedIn: 'root' })
export class ProtopipeResearchService {
  private readonly api = inject(ProtopipeApiService);
  private readonly strategy = inject(ProtopipeStrategyService);

  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _result = signal<ProtopipeResearchResponse | null>(null);
  private readonly _googleStatus = signal<ProtopipeGoogleIntegrationStatusResponse | null>(null);
  private readonly _addingPhrase = signal<string | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly result = this._result.asReadonly();
  readonly googleStatus = this._googleStatus.asReadonly();
  readonly addingPhrase = this._addingPhrase.asReadonly();

  async ensureContext(): Promise<void> {
    await this.strategy.ensureLoaded();
    await this.loadGoogleStatus();
  }

  async loadGoogleStatus(): Promise<void> {
    try {
      this._googleStatus.set(await this.api.googleIntegrationStatus());
    } catch {
      this._googleStatus.set(null);
    }
  }

  async search(body: ProtopipeResearchQueryRequest): Promise<boolean> {
    const siteId = this.strategy.siteId();
    if (!siteId) {
      this._error.set('No site loaded');
      return false;
    }
    const phrase = body.phrase?.trim();
    if (!phrase) {
      this._error.set('Enter a keyword to research');
      return false;
    }
    this._loading.set(true);
    this._error.set(null);
    try {
      this._result.set(
        await this.api.researchQuery(siteId, {
          ...body,
          phrase,
          includeRelated: body.includeRelated ?? true,
          relatedLimit: body.relatedLimit ?? 25,
        }),
      );
      return true;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Research failed'));
      return false;
    } finally {
      this._loading.set(false);
    }
  }

  async addPhraseToPlan(phrase: string): Promise<boolean> {
    const trimmed = phrase.trim();
    if (!trimmed) return false;
    if (
      this.strategy.keywords().some((k) => k.phrase.trim().toLowerCase() === trimmed.toLowerCase())
    ) {
      this._error.set('Keyword already on your plan');
      return false;
    }
    this._addingPhrase.set(trimmed);
    this._error.set(null);
    try {
      this.strategy.addKeyword({ phrase: trimmed, intent: 'commercial', priority: 'medium' });
      return await this.strategy.saveKeywords();
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Failed to add keyword'));
      return false;
    } finally {
      this._addingPhrase.set(null);
    }
  }
}
