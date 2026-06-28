import { computed, inject, Injectable, signal } from '@angular/core';
import type {
  Prospect,
  ProspectingCampaign,
  ProspectingCandidateSummary,
  ProspectWebsiteStatus,
  SaveProspectsRequest,
} from '@hive/contracts';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { ProtopipeStrategyService } from '../protopipe-strategy.service';
import { isShirePrimary } from '../shire/shire-http.util';
import type { BuildBookProspectContext } from '../build-book/build-book-context';
import type { ProspectorRunDto, ProspectorScoredLead } from './prospector-run.model';
import { ProtopipeProspectorShireApiService } from './protopipe-prospector-shire-api.service';

type ProspectDraft = Prospect & { id: string };

function cloneProspects(prospects: Prospect[]): ProspectDraft[] {
  return prospects.map((prospect) => ({ ...prospect, sourceCandidateRefs: [...prospect.sourceCandidateRefs] }));
}

function stringify(value: unknown): string {
  return JSON.stringify(value);
}

@Injectable()
export class ProtopipeProspectorStore {
  private readonly api = inject(ProtopipeProspectorShireApiService);
  private readonly strategy = inject(ProtopipeStrategyService);

  private readonly _campaigns = signal<ProspectingCampaign[]>([]);
  private readonly _prospects = signal<ProspectDraft[]>([]);
  private readonly _snapshot = signal<ProspectDraft[]>([]);
  private readonly _loading = signal(false);
  private readonly _saving = signal(false);
  private readonly _campaignSaving = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _message = signal<string | null>(null);

  readonly campaigns = this._campaigns.asReadonly();
  readonly prospects = this._prospects.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly campaignSaving = this._campaignSaving.asReadonly();
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
    if (!isShirePrimary()) {
      this._error.set('Shire is not configured for this Prospector workspace.');
      return;
    }

    this._loading.set(true);
    this._error.set(null);
    try {
      await this.strategy.ensureLoaded();
      const siteId = this.requireSiteId();
      const [campaigns, prospects] = await Promise.all([
        this.api.listCampaigns(siteId),
        this.api.listProspects(siteId),
      ]);
      this._campaigns.set(campaigns.campaigns);
      const rows = cloneProspects(prospects.prospects);
      this._prospects.set(rows);
      this._snapshot.set(cloneProspects(rows));
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load Prospector books.'));
    } finally {
      this._loading.set(false);
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

  async syncCampaignFromRun(run: ProspectorRunDto): Promise<void> {
    if (!isShirePrimary()) return;

    this._campaignSaving.set(true);
    this._error.set(null);
    try {
      const campaign = this.buildCampaignFromRun(run);
      const next = [campaign, ...this._campaigns().filter((row) => row.id !== campaign.id)];
      const response = await this.api.saveCampaigns(this.requireSiteId(), { campaigns: next });
      this._campaigns.set(response.campaigns);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Search ran, but campaign state was not saved.'));
    } finally {
      this._campaignSaving.set(false);
    }
  }

  addLeadsAsProspects(leads: ProspectorScoredLead[], run: ProspectorRunDto): void {
    if (leads.length === 0) return;
    const existingKeys = new Set(
      this._prospects().flatMap((prospect) =>
        prospect.sourceCandidateRefs.map((ref) => `${ref.source}:${ref.sourceId}`),
      ),
    );
    const additions = leads
      .filter((lead) => lead.placeId && !existingKeys.has(`google_maps:${lead.placeId}`))
      .map((lead) => this.prospectFromLead(lead, run));

    if (additions.length === 0) {
      this._message.set('Selected leads are already saved as prospects.');
      return;
    }

    this._prospects.update((prospects) => [...additions, ...prospects]);
    this._message.set(`${additions.length} prospect${additions.length === 1 ? '' : 's'} staged.`);
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

  private toSaveProspectsRequest(): SaveProspectsRequest {
    return {
      prospects: this._prospects().map((prospect) => ({
        ...prospect,
        id: prospect.id.startsWith('temp-') ? undefined : prospect.id,
      })),
    };
  }

  private buildCampaignFromRun(run: ProspectorRunDto): ProspectingCampaign {
    const existing = this._campaigns().find(
      (campaign) => campaign.sourceRuns.some((ref) => ref.runId === run.id) || campaign.id === run.id,
    );
    const candidates = (run.artifacts.scoredLeads ?? []).slice(0, 250).map((lead, index) =>
      this.candidateFromLead(lead, index),
    );
    return {
      id: existing?.id ?? run.id,
      name: `${run.input.category} in ${run.input.location}`,
      category: run.input.category,
      location: run.input.location,
      status: run.status === 'complete' ? 'reviewing' : run.status === 'failed' ? 'ready' : 'running',
      sources: [
        {
          source: 'google_maps',
          enabled: true,
          query: run.input.category,
          location: run.input.location,
        },
      ],
      sourceRuns: [
        {
          source: 'google_maps',
          runId: run.id,
          status: run.status === 'failed' ? 'failed' : run.status === 'complete' ? 'complete' : 'running',
          candidateCount: candidates.length,
          startedAt: run.createdAt,
          completedAt: run.status === 'complete' || run.status === 'failed' ? run.updatedAt : undefined,
        },
      ],
      candidates,
      consolidationRunId: existing?.consolidationRunId,
      notes: existing?.notes ?? '',
      createdAt: existing?.createdAt,
      updatedAt: existing?.updatedAt,
    };
  }

  private prospectFromLead(lead: ProspectorScoredLead, run: ProspectorRunDto): ProspectDraft {
    return {
      id: `temp-${crypto.randomUUID()}`,
      businessName: lead.displayName ?? 'Unnamed prospect',
      category: lead.primaryType,
      market: run.input.location,
      phone: lead.internationalPhoneNumber,
      website: lead.websiteUri,
      websiteStatus: this.websiteStatusFromLead(lead),
      priority: lead.priority,
      score: lead.score,
      topSignal: this.topSignalFromLead(lead),
      status: 'call_ready',
      sourceCampaignId: run.id,
      sourceCandidateRefs: [{ source: 'google_maps', sourceId: lead.placeId, campaignId: run.id }],
      notes: '',
    };
  }

  private candidateFromLead(lead: ProspectorScoredLead, index: number): ProspectingCandidateSummary {
    return {
      source: 'google_maps',
      sourceId: lead.placeId,
      name: lead.displayName ?? 'Unnamed lead',
      category: lead.primaryType,
      area: lead.formattedAddress,
      phone: lead.internationalPhoneNumber,
      website: lead.websiteUri,
      rating: lead.rating,
      reviewCount: lead.userRatingCount,
      rank: lead.googleRank || index + 1,
      topSignal: this.topSignalFromLead(lead),
      sourceUrl: lead.googleMapsUri,
    };
  }

  private websiteStatusFromLead(lead: ProspectorScoredLead): ProspectWebsiteStatus {
    if (!lead.websiteUri || lead.websiteQuality === 'none') return 'none';
    return lead.score >= 80 ? 'poor' : 'unknown';
  }

  private topSignalFromLead(lead: ProspectorScoredLead): string | undefined {
    return lead.scoreBreakdown.find((item) => item.pts > 0)?.label ?? lead.editorialSummary;
  }

  private requireSiteId(): string {
    const siteId = this.strategy.siteId();
    if (!siteId) {
      throw new Error('No site loaded');
    }
    return siteId;
  }
}
