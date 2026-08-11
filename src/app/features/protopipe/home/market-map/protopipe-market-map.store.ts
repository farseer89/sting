import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { ThoughtRunSession } from '../../runs/thought-run-session.service';
import { ShireApiService } from '../../shire/shire-api.service';
import {
  asRecord,
  asRecordArray,
  buildAudienceViews,
  buildClusterViews,
  buildFunnelSlices,
  buildKeywordRows,
  buildSummaryCards,
  buildTierSlices,
  recordValue,
  type MarketMapAudienceView,
  type MarketMapClusterView,
  type MarketMapFunnelSlice,
  type MarketMapKeywordRow,
  type MarketMapSummaryCard,
  type MarketMapTierSlice,
} from './protopipe-market-map.model';

@Injectable()
export class ProtopipeMarketMapStore {
  private readonly api = inject(ShireApiService);
  private readonly strategy = inject(ProtopipeStrategyService);
  readonly runSession = inject(ThoughtRunSession);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly topologyArtifacts = computed(
    () => asRecord(this.runSession.thought()?.artifacts) ?? {},
  );
  readonly clusters = computed(() => asRecordArray(this.topologyArtifacts()['clusters']));
  readonly pillars = computed(() => asRecordArray(this.topologyArtifacts()['pillars']));
  readonly scoredKeywords = computed(() => asRecordArray(this.topologyArtifacts()['scored']));
  readonly confirmedAvatars = computed(() => {
    const strategyContext = asRecord(this.topologyArtifacts()['strategyContext']);
    const business = asRecord(this.topologyArtifacts()['business']);
    const fromContext = asRecordArray(recordValue(strategyContext, 'confirmedAvatars'));
    if (fromContext.length) return fromContext;
    return asRecordArray(recordValue(business, 'confirmedAvatars'));
  });

  readonly keywordRows = computed<MarketMapKeywordRow[]>(() =>
    buildKeywordRows(asRecordArray(this.topologyArtifacts()['scored']), this.strategy.keywords()),
  );
  readonly clusterViews = computed<MarketMapClusterView[]>(() => buildClusterViews(this.clusters()));
  readonly audienceViews = computed<MarketMapAudienceView[]>(() => {
    const fromArtifacts = buildAudienceViews(this.confirmedAvatars(), this.keywordRows());
    if (fromArtifacts.length) return fromArtifacts;
    return this.strategy
      .keywords()
      .map((keyword, index) => {
        const meta = asRecord((keyword as { strategyMeta?: unknown }).strategyMeta);
        const avatarId = typeof meta?.['avatarId'] === 'string' ? meta['avatarId'] : undefined;
        if (!avatarId) return null;
        return {
          id: avatarId,
          label: avatarId,
          description: `Keywords tagged for ${avatarId}`,
          intentCluster: avatarId,
          keywords: this.keywordRows().filter((row) => row.avatarId === avatarId),
        };
      })
      .filter((row): row is MarketMapAudienceView => Boolean(row))
      .filter((row, index, rows) => rows.findIndex((candidate) => candidate.id === row.id) === index);
  });
  readonly summaryCards = computed<MarketMapSummaryCard[]>(() =>
    buildSummaryCards({
      keywordCount: this.keywordRows().length,
      clusterCount: this.clusters().length,
      pillarCount: this.pillars().length,
      audienceCount: this.audienceViews().length,
    }),
  );
  readonly funnelSlices = computed<MarketMapFunnelSlice[]>(() => buildFunnelSlices(this.keywordRows()));
  readonly tierSlices = computed<MarketMapTierSlice[]>(() => buildTierSlices(this.keywordRows()));

  readonly hasKeywords = computed(() => this.strategy.keywords().length > 0);
  readonly hasClusters = computed(() => this.clusters().length > 0);
  readonly statusLabel = computed(() => {
    const thought = this.runSession.thought();
    if (this.runSession.isActive()) {
      return `Building map · ${thought?.currentStepId ?? 'topology'}`;
    }
    if (!thought) {
      return this.hasKeywords() ? 'Map pending' : 'Confirm keywords to generate map';
    }
    if (thought.status === 'pending') return 'Map queued';
    if (thought.status === 'running') return `Building map · ${thought.currentStepId ?? 'topology'}`;
    if (thought.status === 'complete') return 'Map ready';
    if (thought.status === 'failed') return 'Map build failed';
    return thought.status;
  });

  async load(preferredRunId?: string): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;

    this.loading.set(true);
    this.error.set(null);
    await this.strategy.ensureLoaded();

    try {
      if (preferredRunId) {
        const { run } = await firstValueFrom(this.api.getRun$(siteId, preferredRunId));
        if (run.thinkerKind === 'content_plan_v2_topology') {
          this.runSession.attach(siteId, run.id, run);
          return;
        }
      }

      const current = this.runSession.thought();
      if (current?.thinkerKind === 'content_plan_v2_topology') {
        return;
      }

      const { run } = await firstValueFrom(this.api.getLatestRun$(siteId, 'content_plan_v2_topology'));
      this.runSession.attach(siteId, run.id, run);
    } catch (err) {
      if (!(err instanceof HttpErrorResponse && err.status === 404)) {
        this.error.set(parseProtopipeApiError(err, 'Could not load market map.'));
      }
    } finally {
      this.loading.set(false);
    }
  }

  async rebuild(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId || this.runSession.isActive() || !this.hasKeywords()) return;

    this.error.set(null);
    const run = await this.runSession.enqueueRun(siteId, {
      thinkerKind: 'content_plan_v2_topology',
      params: { source: 'marketMapRebuild' },
    });
    if (!run && this.runSession.loadError()) {
      this.error.set(this.runSession.loadError());
    }
  }
}
