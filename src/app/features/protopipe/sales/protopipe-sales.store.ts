import { computed, inject, Injectable, signal } from '@angular/core';
import type {
  Prospect,
  ProspectWebsiteStatus,
  SalesInteraction,
  SaveProspectsRequest,
  SaveSalesInteractionRequest,
} from '@hive/contracts';
import type { BuildBookProspectContext } from '../build-book/build-book-context';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { ProtopipeStrategyService } from '../protopipe-strategy.service';
import { isShirePrimary } from '../shire/shire-http.util';
import { ProtopipeSalesShireApiService } from './protopipe-sales-shire-api.service';

type ProspectDraft = Prospect & { id: string };

function cloneProspects(prospects: Prospect[]): ProspectDraft[] {
  return prospects.map((prospect) => ({
    ...prospect,
    sourceCandidateRefs: [...prospect.sourceCandidateRefs],
  }));
}

function stringify(value: unknown): string {
  return JSON.stringify(value);
}

function optionalString(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function optionalNumber(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

@Injectable()
export class ProtopipeSalesStore {
  private readonly api = inject(ProtopipeSalesShireApiService);
  private readonly strategy = inject(ProtopipeStrategyService);

  private readonly _prospects = signal<ProspectDraft[]>([]);
  private readonly _interactions = signal<SalesInteraction[]>([]);
  private readonly _snapshot = signal<ProspectDraft[]>([]);
  private readonly _loading = signal(false);
  private readonly _saving = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _message = signal<string | null>(null);
  private loadRequest: Promise<void> | null = null;

  readonly prospects = this._prospects.asReadonly();
  readonly interactions = this._interactions.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly error = this._error.asReadonly();
  readonly message = this._message.asReadonly();
  readonly dirty = computed(() => stringify(this._prospects()) !== stringify(this._snapshot()));
  readonly prospectCount = computed(() => this._prospects().length);
  readonly callReadyCount = computed(
    () => this._prospects().filter((prospect) => prospect.status === 'call_ready').length,
  );
  readonly promotedCount = computed(
    () => this._prospects().filter((prospect) => prospect.status === 'promoted').length,
  );

  async load(): Promise<void> {
    if (this.loadRequest) return this.loadRequest;
    this.loadRequest = this.loadOnce();
    try {
      await this.loadRequest;
    } finally {
      this.loadRequest = null;
    }
  }

  async saveProspects(): Promise<boolean> {
    const siteId = this.requireSiteId();
    this._saving.set(true);
    this._error.set(null);
    this._message.set(null);
    try {
      const response = await this.api.saveProspects(siteId, this.toSaveProspectsRequest());
      const rows = cloneProspects(response.prospects);
      this._prospects.set(rows);
      this._snapshot.set(cloneProspects(rows));
      this._message.set('Prospects saved.');
      return true;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not save prospects.'));
      return false;
    } finally {
      this._saving.set(false);
    }
  }

  async recordSalesInteraction(body: SaveSalesInteractionRequest): Promise<boolean> {
    const siteId = this.requireSiteId();
    this._saving.set(true);
    this._error.set(null);
    this._message.set(null);
    try {
      const response = await this.api.createSalesInteraction(
        siteId,
        this.toSaveSalesInteractionRequest(body),
      );
      this._interactions.update((interactions) => [
        response.interaction,
        ...interactions.filter((interaction) => interaction.id !== response.interaction.id),
      ]);
      const prospects = await this.api.listProspects(siteId);
      const rows = cloneProspects(prospects.prospects);
      this._prospects.set(rows);
      this._snapshot.set(cloneProspects(rows));
      this._message.set('Sales interaction saved.');
      return true;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not save sales interaction.'));
      return false;
    } finally {
      this._saving.set(false);
    }
  }

  interactionsForProspect(prospectId: string): SalesInteraction[] {
    return this._interactions().filter((interaction) => interaction.prospectId === prospectId);
  }

  updateProspect(
    id: string,
    patch: Partial<Pick<Prospect, 'status' | 'priority' | 'notes' | 'topSignal' | 'websiteStatus'>>,
  ): void {
    this._prospects.update((prospects) =>
      prospects.map((prospect) => (prospect.id === id ? { ...prospect, ...patch } : prospect)),
    );
  }

  promoteToBuildBook(prospect: Prospect): BuildBookProspectContext {
    this.updateProspect(prospect.id, { status: 'promoted' });
    return {
      name: prospect.businessName,
      category: prospect.category,
      area: prospect.market,
      phone: prospect.phone,
      websiteStatus: prospect.websiteStatus,
      score: prospect.score,
      priority: prospect.priority,
      topSignal: prospect.topSignal,
      source: 'prospector',
    };
  }

  private async loadOnce(): Promise<void> {
    if (!isShirePrimary()) {
      this._error.set('Shire is not configured for this sales workspace.');
      return;
    }

    this._loading.set(true);
    this._error.set(null);
    try {
      await this.strategy.ensureLoaded();
      const siteId = this.requireSiteId();
      const [prospects, interactions] = await Promise.all([
        this.api.listProspects(siteId),
        this.api.listSalesInteractions(siteId),
      ]);
      const rows = cloneProspects(prospects.prospects);
      this._prospects.set(rows);
      this._interactions.set(interactions.interactions);
      this._snapshot.set(cloneProspects(rows));
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load Cold Caller.'));
    } finally {
      this._loading.set(false);
    }
  }

  private toSaveProspectsRequest(): SaveProspectsRequest {
    return {
      prospects: this._prospects().map((prospect) => ({
        id: prospect.id.startsWith('temp-') ? undefined : optionalString(prospect.id),
        businessName: prospect.businessName,
        category: optionalString(prospect.category),
        market: optionalString(prospect.market),
        phone: optionalString(prospect.phone),
        website: optionalString(prospect.website),
        websiteStatus: prospect.websiteStatus,
        priority: prospect.priority,
        score: optionalNumber(prospect.score),
        topSignal: optionalString(prospect.topSignal),
        status: prospect.status,
        salesStage: prospect.salesStage,
        sourceCampaignId: optionalString(prospect.sourceCampaignId),
        sourceCandidateRefs: prospect.sourceCandidateRefs.map((ref) => ({
          source: ref.source,
          sourceId: ref.sourceId,
          campaignId: optionalString(ref.campaignId),
        })),
        lastPitchSessionId: optionalString(prospect.lastPitchSessionId),
        lastSalesInteractionId: optionalString(prospect.lastSalesInteractionId),
        lastSalesInteractionOutcome: optionalString(prospect.lastSalesInteractionOutcome),
        lastSalesInteractionAt: optionalString(prospect.lastSalesInteractionAt),
        nextSalesInteractionAt: optionalString(prospect.nextSalesInteractionAt),
        buildBookId: optionalString(prospect.buildBookId),
        notes: prospect.notes ?? '',
      })),
    };
  }

  private toSaveSalesInteractionRequest(
    body: SaveSalesInteractionRequest,
  ): SaveSalesInteractionRequest {
    return {
      prospectId: body.prospectId,
      phase: body.phase,
      channel: body.channel,
      outcome: body.outcome,
      sentiment: body.sentiment,
      occurredAt: optionalString(body.occurredAt),
      durationSeconds: optionalNumber(body.durationSeconds),
      operatorName: optionalString(body.operatorName),
      scriptVariant: optionalString(body.scriptVariant),
      scriptBody: optionalString(body.scriptBody),
      offerSummary: optionalString(body.offerSummary),
      researchBrief: body.researchBrief
        ? {
            summary: optionalString(body.researchBrief.summary),
            signals: body.researchBrief.signals?.filter(Boolean) ?? [],
            objections: body.researchBrief.objections?.filter(Boolean) ?? [],
            opportunities: body.researchBrief.opportunities?.filter(Boolean) ?? [],
          }
        : undefined,
      notes: body.notes ?? '',
      outcomeReasonTags: body.outcomeReasonTags?.filter(Boolean) ?? [],
      nextStep: optionalString(body.nextStep),
      nextStepAt: optionalString(body.nextStepAt),
      mediaRefs: body.mediaRefs,
    };
  }

  private requireSiteId(): string {
    const siteId = this.strategy.siteId();
    if (!siteId) {
      throw new Error('No site loaded');
    }
    return siteId;
  }
}

export type { ProspectWebsiteStatus };
