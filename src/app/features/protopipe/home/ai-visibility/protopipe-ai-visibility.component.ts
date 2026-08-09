import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import type {
  AiVisibilitySnapshot,
  AiVisibilitySource,
  AiVisibilitySourceSnapshot,
  KeywordRankingRow,
} from '@hive/contracts';
import { firstValueFrom } from 'rxjs';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { ShireApiService } from '../../shire/shire-api.service';
import {
  locationShortLabel,
  marketScopeLabel,
  rankLabel,
  rankingSerpDetail,
} from '../rankings/protopipe-home-rankings.model';

interface AiVisibilityMetric {
  id: string;
  label: string;
  value: string;
  hint: string;
}

interface AiVisibilitySourceDomain {
  domain: string;
  count: number;
  keywords: string[];
}

interface AiVisibilityKnowledgeGraphRow {
  row: KeywordRankingRow;
  graph: NonNullable<NonNullable<ReturnType<typeof rankingSerpDetail>>['knowledgeGraph']>;
}

interface AiVisibilityInputCard {
  id: string;
  label: string;
  status: 'ready' | 'missing' | 'planned';
  value: string;
  hint: string;
}

interface AiAwarenessCostScenario {
  id: string;
  label: string;
  promptCount: number;
  googleAiModeStandard: string;
  googleAiModeLive: string;
  llmResponsesLiveBase: string;
  note: string;
}

interface CaptureMarketTarget {
  locationCode: number;
  locationName: string;
}

type CaptureMarketScope = 'national' | 'local';
type AiVisibilityTab = AiVisibilitySource;

const DEFAULT_NATIONAL_MARKET: CaptureMarketTarget = {
  locationCode: 2840,
  locationName: 'United States',
};

const GOOGLE_AI_MODE_STANDARD_SERP_USD = 0.0012;
const GOOGLE_AI_MODE_LIVE_SERP_USD = 0.004;
const LLM_RESPONSES_LIVE_TASK_FEE_USD = 0.0006;

@Component({
  selector: 'app-protopipe-ai-visibility',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-ai-visibility.component.html',
  styleUrl: './protopipe-ai-visibility.component.scss',
})
export class ProtopipeAiVisibilityComponent implements OnInit {
  private readonly api = inject(ShireApiService);
  private readonly router = inject(Router);
  private readonly strategy = inject(ProtopipeStrategyService);

  readonly loading = signal(false);
  readonly capturing = signal(false);
  readonly captureMode = signal<CaptureMarketScope | null>(null);
  readonly captureProgress = signal<{
    current: number;
    total: number;
    keyword: string;
    locationName?: string;
  } | null>(null);
  readonly error = signal<string | null>(null);
  readonly rows = signal<KeywordRankingRow[]>([]);
  readonly persistedSnapshots = signal<AiVisibilitySnapshot[]>([]);
  readonly selectedSnapshotId = signal<string | null>(null);
  readonly selectedMarketScope = signal<CaptureMarketScope>('national');
  readonly activeSource = signal<AiVisibilityTab>('google_ai_mode');

  readonly ownDomain = computed(() => normalizeDomain(this.strategy.site()?.hostname));
  readonly trackedKeywordCount = computed(() => this.strategy.keywords().length);
  readonly nationalCaptureTarget = computed<CaptureMarketTarget>(() => {
    const nationalMarket = this.strategy.onboardingProfile()?.nationalMarket;
    if (nationalMarket?.serpLocationCode) {
      return {
        locationCode: nationalMarket.serpLocationCode,
        locationName: locationShortLabel(nationalMarket.serpLocationName),
      };
    }
    return DEFAULT_NATIONAL_MARKET;
  });
  readonly localCaptureTarget = computed<CaptureMarketTarget | null>(() => {
    const profile = this.strategy.onboardingProfile();
    const reach = profile?.marketReach;
    const hasLocalReach =
      reach === 'local' || reach === 'local_and_national' || reach === 'local_and_worldwide';
    const localMarket = profile?.localMarket;
    if (!hasLocalReach || !localMarket?.serpLocationCode) return null;
    return {
      locationCode: localMarket.serpLocationCode,
      locationName: locationShortLabel(localMarket.serpLocationName),
    };
  });
  readonly showMarketScopePicker = computed(() => Boolean(this.localCaptureTarget()));
  readonly nationalSnapshots = computed(() =>
    this.persistedSnapshots().filter(
      (snapshot) => this.snapshotMarketScope(snapshot) === 'national',
    ),
  );
  readonly localSnapshots = computed(() =>
    this.persistedSnapshots().filter((snapshot) => this.snapshotMarketScope(snapshot) === 'local'),
  );
  readonly visibleSnapshots = computed(() =>
    this.selectedMarketScope() === 'local'
      ? this.localSnapshots()
      : this.nationalSnapshots(),
  );
  readonly aiRows = computed(() => this.rows().filter((row) => hasAiOverview(row)));
  readonly citedRows = computed(() => this.aiRows().filter((row) => this.isOwnDomainCited(row)));
  readonly uncitedRows = computed(() =>
    [...this.aiRows()]
      .filter((row) => !this.isOwnDomainCited(row))
      .sort((a, b) => rankValue(a.latest.position) - rankValue(b.latest.position))
      .slice(0, 8),
  );
  readonly overviewRows = computed(() =>
    this.aiRows()
      .filter((row) => this.aiOverviewText(row))
      .slice(0, 5),
  );
  readonly sourceDomains = computed(() => this.buildSourceDomains());
  readonly knowledgeGraphRows = computed<AiVisibilityKnowledgeGraphRow[]>(() =>
    this.rows()
      .map((row) => ({ row, graph: rankingSerpDetail(row)?.knowledgeGraph }))
      .filter((item): item is AiVisibilityKnowledgeGraphRow => Boolean(item.graph)),
  );
  readonly capturedAt = computed(() => latestCapturedAt(this.rows()));
  readonly inputCards = computed<AiVisibilityInputCard[]>(() => {
    const hostname = this.ownDomain();
    const keywordCount = this.trackedKeywordCount();
    const rankingSnapshotCount = this.rows().length;
    const aiSnapshots = this.aiRows().length;
    const sourceCount = this.sourceDomains().length;
    const entityCount = this.knowledgeGraphRows().length;
    const persistedCaptures = this.persistedSnapshots();

    return [
      {
        id: 'site',
        label: 'Site identity',
        status: hostname ? 'ready' : 'missing',
        value: hostname ?? 'Missing',
        hint: 'Used to score whether AI answers cite this site.',
      },
      {
        id: 'keywords',
        label: 'Tracked keywords',
        status: keywordCount > 0 ? 'ready' : 'missing',
        value: plural(keywordCount, 'keyword'),
        hint: 'Defines which search and prompt themes the visibility view can inspect.',
      },
      {
        id: 'rankings',
        label: 'Ranking snapshots',
        status: rankingSnapshotCount > 0 ? 'ready' : 'missing',
        value: plural(rankingSnapshotCount, 'snapshot'),
        hint: 'Current source for AI Overview coverage, citations, and entity panels.',
      },
      {
        id: 'ai-overviews',
        label: 'AI Overview evidence',
        status: aiSnapshots > 0 ? 'ready' : 'missing',
        value: `${aiSnapshots}/${rankingSnapshotCount || 0}`,
        hint: 'Rows with AI Overview text or source data from ranking research.',
      },
      {
        id: 'sources',
        label: 'Cited source domains',
        status: sourceCount > 0 ? 'ready' : 'missing',
        value: plural(sourceCount, 'domain'),
        hint: 'External domains AI answers cite instead of, or alongside, this site.',
      },
      {
        id: 'entities',
        label: 'Entity dossiers',
        status: entityCount > 0 ? 'ready' : 'missing',
        value: plural(entityCount, 'panel'),
        hint: 'Knowledge graph facts, authority links, and related entities from ranking snapshots.',
      },
      {
        id: 'dataforseo-awareness',
        label: 'DataForSEO AI Awareness',
        status: persistedCaptures.length > 0 ? 'ready' : 'planned',
        value: persistedCaptures.length
          ? plural(persistedCaptures.length, 'keyword capture')
          : 'Cost model ready',
        hint: persistedCaptures.length
          ? `Latest run captured ${persistedCaptures.length} keyword${persistedCaptures.length === 1 ? '' : 's'} with Google AI Mode and ChatGPT.`
          : 'Run AI awareness capture to persist Google AI Mode SERP and ChatGPT responses.',
      },
    ];
  });
  readonly costScenarios = computed<AiAwarenessCostScenario[]>(() => {
    const keywordCount = this.trackedKeywordCount();
    const currentPromptCount = clamp(keywordCount || 8, 8, 24);
    const scenarios = [
      { id: 'starter', label: 'Starter test', promptCount: 8 },
      { id: 'current', label: 'Current keyword set', promptCount: currentPromptCount },
      { id: 'heavy', label: 'Heavy test', promptCount: 48 },
    ];

    return scenarios.map((scenario) => ({
      ...scenario,
      googleAiModeStandard: formatUsd(
        scenario.promptCount * GOOGLE_AI_MODE_STANDARD_SERP_USD,
      ),
      googleAiModeLive: formatUsd(scenario.promptCount * GOOGLE_AI_MODE_LIVE_SERP_USD),
      llmResponsesLiveBase: `${formatUsd(
        scenario.promptCount * LLM_RESPONSES_LIVE_TASK_FEE_USD,
      )} + model pass-through`,
      note:
        scenario.id === 'current'
          ? 'Based on the current tracked keyword count, capped for test use.'
          : 'Use this to compare small and expanded prompt clusters.',
    }));
  });
  readonly metrics = computed<AiVisibilityMetric[]>(() => {
    const snapshots = this.rows().length;
    const aiSnapshots = this.aiRows().length;
    const citedSnapshots = this.citedRows().length;
    const sourceCount = this.sourceDomains().length;
    const entityCount = this.knowledgeGraphRows().length;

    return [
      {
        id: 'coverage',
        label: 'AI Overview coverage',
        value: percentLabel(aiSnapshots, snapshots),
        hint: `${aiSnapshots} of ${snapshots} ranking snapshots trigger AI Overviews`,
      },
      {
        id: 'citations',
        label: 'Your citation rate',
        value: percentLabel(citedSnapshots, aiSnapshots),
        hint: this.ownDomain()
          ? `${citedSnapshots} AI snapshot(s) cite ${this.ownDomain()}`
          : 'Set a site hostname to score citations',
      },
      {
        id: 'sources',
        label: 'Source domains',
        value: String(sourceCount),
        hint: 'Unique domains cited by AI Overviews',
      },
      {
        id: 'entities',
        label: 'Entity panels',
        value: String(entityCount),
        hint: 'Knowledge graphs captured across ranking snapshots',
      },
      {
        id: 'opportunities',
        label: 'Uncited opportunities',
        value: String(this.uncitedRows().length),
        hint: 'AI Overviews exist, but your site is not cited yet',
      },
    ];
  });

  readonly emptyMessage = computed(() =>
    this.trackedKeywordCount() === 0
      ? 'Confirm keywords first. Then run ranking research to collect AI Overview evidence.'
      : 'Run ranking research to populate AI Overview coverage, sources, and uncited opportunities.',
  );

  readonly rankLabel = rankLabel;
  readonly marketScopeLabel = marketScopeLabel;
  readonly locationShortLabel = locationShortLabel;
  readonly formatUsd = formatUsd;
  readonly dateLabel = dateLabel;
  readonly captureEstimateUsd = computed(() => {
    const count = this.trackedKeywordCount();
    if (count <= 0) return null;
    const aiMode = count * GOOGLE_AI_MODE_LIVE_SERP_USD;
    const chatGptBase = count * LLM_RESPONSES_LIVE_TASK_FEE_USD;
    return `${formatUsd(aiMode)} AI Mode + ${formatUsd(chatGptBase)} ChatGPT base`;
  });
  readonly activeSnapshot = computed(() => {
    const snapshots = this.visibleSnapshots();
    if (snapshots.length === 0) return null;
    const selectedId = this.selectedSnapshotId();
    const selected = snapshots.find((snapshot) => snapshot.id === selectedId);
    return selected ?? snapshots.at(-1) ?? null;
  });
  readonly activeMarketLabel = computed(() => {
    const snapshot = this.activeSnapshot();
    if (!snapshot) {
      return this.selectedMarketScope() === 'local'
        ? (this.localCaptureTarget()?.locationName ?? 'Local')
        : this.nationalCaptureTarget().locationName;
    }
    return this.snapshotMarketLabel(snapshot);
  });
  readonly activePersistedSource = computed(() =>
    this.sourceSnapshotFor(this.activeSource()),
  );

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    await this.loadRankings();
  }

  async loadRankings(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const [rankingsResponse, aiVisibilityResponse] = await Promise.all([
        firstValueFrom(this.api.listRankings$(siteId)).catch((err) => {
          if (isRankingsNotReadyError(err)) return { rankings: [] };
          throw err;
        }),
        firstValueFrom(this.api.getLatestAiVisibility$(siteId)).catch(() => ({ snapshot: null })),
      ]);
      this.rows.set(rankingsResponse.rankings);
      const snapshot = aiVisibilityResponse.snapshot;
      this.persistedSnapshots.set(snapshot ? [snapshot] : []);
      if (snapshot) {
        this.selectedMarketScope.set(this.snapshotMarketScope(snapshot));
      }
      this.selectedSnapshotId.set(snapshot?.id ?? null);
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Could not load AI visibility data.'));
    } finally {
      this.loading.set(false);
    }
  }

  goToRankings(): void {
    void this.router.navigate(['/home/rankings']);
  }

  setActiveSource(source: AiVisibilityTab): void {
    this.activeSource.set(source);
  }

  selectSnapshot(snapshotId: string): void {
    this.selectedSnapshotId.set(snapshotId);
  }

  selectMarketScope(scope: CaptureMarketScope): void {
    this.selectedMarketScope.set(scope);
    const snapshots =
      scope === 'local' ? this.localSnapshots() : this.nationalSnapshots();
    this.selectedSnapshotId.set(snapshots.at(-1)?.id ?? null);
  }

  snapshotMarketScope(snapshot: AiVisibilitySnapshot): CaptureMarketScope {
    const localCode = this.localCaptureTarget()?.locationCode;
    if (localCode && snapshot.locationCode === localCode) return 'local';
    return 'national';
  }

  snapshotMarketLabel(snapshot: AiVisibilitySnapshot): string {
    if (snapshot.locationName) return snapshot.locationName;
    return this.snapshotMarketScope(snapshot) === 'local' ? 'Local market' : 'United States';
  }

  marketScopeButtonLabel(scope: CaptureMarketScope): string {
    if (scope === 'local') {
      return this.localCaptureTarget()?.locationName ?? 'Local';
    }
    return this.nationalCaptureTarget().locationName;
  }

  async captureAllKeywords(): Promise<void> {
    const target = this.nationalCaptureTarget();
    await this.captureKeywords({ mode: 'national', ...target });
  }

  async captureLocalKeywords(): Promise<void> {
    const target = this.localCaptureTarget();
    if (!target) return;
    await this.captureKeywords({ mode: 'local', ...target });
  }

  private async captureKeywords(options: {
    mode: CaptureMarketScope;
    locationCode: number;
    locationName: string;
  }): Promise<void> {
    const siteId = this.strategy.siteId();
    const keywords = this.strategy
      .keywords()
      .map((keyword) => keyword.phrase.trim())
      .filter(Boolean);
    if (!siteId || keywords.length === 0) return;

    this.capturing.set(true);
    this.captureMode.set(options.mode);
    this.selectedMarketScope.set(options.mode);
    this.error.set(null);
    const captured: AiVisibilitySnapshot[] = [];
    const failures: string[] = [];
    const captureLabel =
      options.mode === 'local'
        ? `local (${options.locationName})`
        : `national (${options.locationName})`;
    const retainedSnapshots = this.persistedSnapshots().filter(
      (snapshot) => this.snapshotMarketScope(snapshot) !== options.mode,
    );

    try {
      for (let index = 0; index < keywords.length; index += 1) {
        const keyword = keywords[index];
        this.captureProgress.set({
          current: index + 1,
          total: keywords.length,
          keyword,
          locationName: options.locationName,
        });
        try {
          const response = await firstValueFrom(
            this.api.captureAiVisibility$(siteId, {
              keyword,
              locationCode: options.locationCode,
              locationName: options.locationName,
              includeChatGpt: true,
            }),
          );
          captured.push(response.snapshot);
          this.persistedSnapshots.set(this.mergeSnapshots(retainedSnapshots, captured));
          this.selectedSnapshotId.set(response.snapshot.id);
        } catch (err) {
          failures.push(`${keyword}: ${parseProtopipeApiError(err, 'Capture failed.')}`);
        }
      }

      if (captured.length === 0) {
        this.error.set(failures[0] ?? `${captureLabel} capture failed for all keywords.`);
      } else if (failures.length > 0) {
        this.error.set(
          `Captured ${captured.length}/${keywords.length} ${captureLabel} keywords. ${failures.slice(0, 2).join(' ')}`,
        );
      }
    } finally {
      this.captureProgress.set(null);
      this.captureMode.set(null);
      this.capturing.set(false);
    }
  }

  sourceSnapshotFor(source: AiVisibilitySource): AiVisibilitySourceSnapshot | null {
    return this.activeSnapshot()?.sources.find((item) => item.source === source) ?? null;
  }

  sourceStatusLabel(source: AiVisibilitySource): string {
    if (source === 'keyword_overview') return plural(this.aiRows().length, 'AI Overview');
    const nationalCount = this.nationalSnapshots().length;
    const localCount = this.localSnapshots().length;
    if (nationalCount === 0 && localCount === 0) return 'Not captured';
    if (nationalCount > 0 && localCount > 0) {
      return `${nationalCount} national · ${localCount} local`;
    }
    if (localCount > 0) {
      return `${localCount} local`;
    }
    if (nationalCount > 1) return `${nationalCount} national`;
    const snapshot = this.sourceSnapshotFor(source);
    if (!snapshot) return 'Not captured';
    if (snapshot.status === 'failed') return 'Failed';
    return `${formatUsd(snapshot.costUsd)} national`;
  }

  sourcesFor(row: KeywordRankingRow) {
    const detail = rankingSerpDetail(row);
    return detail?.aiOverview?.sources ?? detail?.aiOverviewSources ?? [];
  }

  sourceLabel(row: KeywordRankingRow): string {
    const domains = this.sourcesFor(row)
      .map((source) => normalizeDomain(source.domain ?? domainFromUrl(source.url)))
      .filter((domain): domain is string => Boolean(domain));
    if (domains.length === 0) return 'No sources captured';
    return Array.from(new Set(domains)).slice(0, 3).join(', ');
  }

  aiOverviewText(row: KeywordRankingRow): string {
    const overview = rankingSerpDetail(row)?.aiOverview;
    const text = overview?.markdown?.trim() || overview?.text?.trim() || '';
    return cleanOverviewText(text);
  }

  entityDossierInsight(item: AiVisibilityKnowledgeGraphRow): string {
    const facts = item.graph.attributes?.length ?? 0;
    const profiles = item.graph.profiles?.length ?? 0;
    const related = item.graph.relatedEntities?.length ?? 0;
    const signals = [
      facts ? `${facts} fact${facts === 1 ? '' : 's'}` : null,
      profiles ? `${profiles} authority link${profiles === 1 ? '' : 's'}` : null,
      related ? `${related} related entit${related === 1 ? 'y' : 'ies'}` : null,
    ].filter(Boolean);
    const entityType = item.graph.subtitle || item.graph.source || 'an entity-led result';
    const signalText = signals.length ? ` We captured ${signals.join(', ')}.` : '';
    return `Google is treating "${item.row.phrase}" as ${entityType} for ${marketScopeLabel(item.row.latest.marketTier)} search.${signalText}`;
  }

  private isOwnDomainCited(row: KeywordRankingRow): boolean {
    const own = this.ownDomain();
    if (!own) return false;
    return this.sourcesFor(row).some((source) => {
      const domain = normalizeDomain(source.domain ?? domainFromUrl(source.url));
      return domain === own || domain?.endsWith(`.${own}`);
    });
  }

  private mergeSnapshots(
    retained: AiVisibilitySnapshot[],
    captured: AiVisibilitySnapshot[],
  ): AiVisibilitySnapshot[] {
    const merged = new Map<string, AiVisibilitySnapshot>();
    for (const snapshot of retained) {
      merged.set(snapshotKey(snapshot), snapshot);
    }
    for (const snapshot of captured) {
      merged.set(snapshotKey(snapshot), snapshot);
    }
    return Array.from(merged.values()).sort(
      (a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt),
    );
  }

  private buildSourceDomains(): AiVisibilitySourceDomain[] {
    const counts = new Map<string, { count: number; keywords: Set<string> }>();
    for (const row of this.aiRows()) {
      for (const source of this.sourcesFor(row)) {
        const domain = normalizeDomain(source.domain ?? domainFromUrl(source.url));
        if (!domain || domain === this.ownDomain()) continue;
        const current = counts.get(domain) ?? { count: 0, keywords: new Set<string>() };
        current.count += 1;
        current.keywords.add(row.phrase);
        counts.set(domain, current);
      }
    }

    return Array.from(counts.entries())
      .map(([domain, value]) => ({
        domain,
        count: value.count,
        keywords: Array.from(value.keywords).slice(0, 3),
      }))
      .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain))
      .slice(0, 8);
  }
}

function hasAiOverview(row: KeywordRankingRow): boolean {
  const detail = rankingSerpDetail(row);
  return Boolean(detail?.aiOverview?.present || row.latest.serpFeatures?.includes('ai_overview'));
}

function cleanOverviewText(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*(?:[-*]|\d+\.)\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\n{2,}/g, '\n')
    .trim()
    .slice(0, 420);
}

function normalizeDomain(value?: string | null): string | null {
  if (!value) return null;
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split(':')[0]
    .trim();
}

function domainFromUrl(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function percentLabel(numerator: number, denominator: number): string {
  if (denominator <= 0) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function plural(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatUsd(value: number): string {
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

function rankValue(position: number | null): number {
  return position ?? Number.POSITIVE_INFINITY;
}

function latestCapturedAt(rows: KeywordRankingRow[]): string | null {
  const latest = rows
    .map((row) => Date.parse(row.latest.capturedAt))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  return latest
    ? new Date(latest).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;
}

function dateLabel(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return 'Unknown';
  return new Date(parsed).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isRankingsNotReadyError(err: unknown): boolean {
  return err instanceof Error && /404|not found|no rankings/i.test(err.message);
}

function snapshotKey(snapshot: AiVisibilitySnapshot): string {
  return `${snapshot.keyword.trim().toLowerCase()}::${snapshot.locationCode}`;
}
