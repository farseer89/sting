import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { ProgressSpinner } from 'primeng/progressspinner';
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

interface CaptureMarketTarget {
  locationCode: number;
  locationName: string;
}

type CaptureMarketScope = 'national' | 'local';

type AiVisibilityModelId =
  | AiVisibilitySource
  | 'gemini'
  | 'claude'
  | 'perplexity';

interface AiVisibilityModelOption {
  id: AiVisibilityModelId;
  label: string;
  available: boolean;
  dataSource?: AiVisibilitySource;
  description: string;
}

const AI_VISIBILITY_MODELS: readonly AiVisibilityModelOption[] = [
  {
    id: 'google_ai_mode',
    label: 'Google AI',
    available: true,
    dataSource: 'google_ai_mode',
    description: 'Live Google AI Mode answers captured per keyword.',
  },
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    available: true,
    dataSource: 'chatgpt',
    description: 'ChatGPT web-search answers captured per keyword.',
  },
  {
    id: 'keyword_overview',
    label: 'Google AI Overview',
    available: true,
    dataSource: 'keyword_overview',
    description: 'AI Overviews extracted from ranking research snapshots.',
  },
  {
    id: 'gemini',
    label: 'Gemini',
    available: false,
    description: 'Gemini answer and citation tracking is coming soon.',
  },
  {
    id: 'claude',
    label: 'Claude',
    available: false,
    description: 'Claude answer and citation tracking is coming soon.',
  },
  {
    id: 'perplexity',
    label: 'Perplexity',
    available: false,
    description: 'Perplexity answer and citation tracking is coming soon.',
  },
];

const DEFAULT_NATIONAL_MARKET: CaptureMarketTarget = {
  locationCode: 2840,
  locationName: 'United States',
};

@Component({
  selector: 'app-protopipe-ai-visibility',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Message, ProgressSpinner],
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
  readonly activeModelId = signal<AiVisibilityModelId>('google_ai_mode');
  readonly binderSectionId = signal<string>('overview');
  readonly answerDrawerOpen = signal(false);
  readonly modelOptions = AI_VISIBILITY_MODELS;

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
  readonly marketMetrics = computed<AiVisibilityMetric[]>(() => {
    const snapshots = this.visibleSnapshots();
    const dataSource = this.activeDataSource();
    if (dataSource === 'keyword_overview') {
      const rows = this.marketAiRows();
      const citedRows = rows.filter((row) => this.isOwnDomainCited(row));
      const citedDomains = new Set(
        rows.flatMap((row) =>
          this.sourcesFor(row)
            .map((source) => normalizeDomain(source.domain ?? domainFromUrl(source.url)))
            .filter((domain): domain is string => Boolean(domain)),
        ),
      );

      return [
        {
          id: 'captured-keywords',
          label: 'AI Overviews',
          value: String(rows.length),
          hint: `${rows.length} ranking snapshots in ${this.marketScopeButtonLabel(this.selectedMarketScope())} have AI Overviews`,
        },
        {
          id: 'site-cited',
          label: 'Site cited',
          value: percentLabel(citedRows.length, rows.length),
          hint: `${citedRows.length} of ${rows.length} AI Overviews cite your site`,
        },
        {
          id: 'site-mentioned',
          label: 'SERP snapshots',
          value: String(this.marketRankingRows().length),
          hint: 'Ranking snapshots available for this market',
        },
        {
          id: 'citation-map',
          label: 'Cited domains',
          value: String(citedDomains.size),
          hint: 'Unique domains cited by Google AI Overviews',
        },
        {
          id: 'answers',
          label: 'Answer text',
          value: String(rows.filter((row) => this.aiOverviewText(row)).length),
          hint: 'AI Overview answer bodies stored from ranking research',
        },
      ];
    }

    const sourceRows = dataSource
      ? snapshots
          .map((snapshot) => snapshot.sources.find((source) => source.source === dataSource))
          .filter((source): source is AiVisibilitySourceSnapshot => Boolean(source))
      : [];
    const completeSources = sourceRows.filter((source) => source.status === 'complete');
    const citedAnswers = completeSources.filter((source) => this.sourceClientCited(source)).length;
    const mentionedAnswers = completeSources.filter((source) => this.sourceClientMentioned(source)).length;
    const citedDomains = new Set(completeSources.flatMap((source) => this.sourceCitationDomains(source)));
    const fullAnswers = completeSources.filter((source) => this.sourceAnswerText(source)).length;
    const modelLabel = this.activeModel().label;

    return [
      {
        id: 'captured-keywords',
        label: 'Model answers',
        value: String(completeSources.length),
        hint: `${completeSources.length} of ${snapshots.length} ${modelLabel} captures are complete`,
      },
      {
        id: 'site-cited',
        label: 'Site cited',
        value: percentLabel(citedAnswers, completeSources.length),
        hint: `${citedAnswers} of ${completeSources.length} ${modelLabel} answers cite your site`,
      },
      {
        id: 'site-mentioned',
        label: 'Site mentioned',
        value: percentLabel(mentionedAnswers, completeSources.length),
        hint: `${mentionedAnswers} ${modelLabel} answers mention your brand or domain`,
      },
      {
        id: 'citation-map',
        label: 'Cited domains',
        value: String(citedDomains.size),
        hint: `Unique domains cited by ${modelLabel} in this market`,
      },
      {
        id: 'answers',
        label: 'Full answers',
        value: String(fullAnswers),
        hint: `${modelLabel} answers available to open in the reader`,
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
  readonly dateLabel = dateLabel;
  readonly formatAnswerForDisplay = formatAnswerForDisplay;
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
  readonly activeModel = computed(
    () =>
      AI_VISIBILITY_MODELS.find((model) => model.id === this.activeModelId()) ??
      AI_VISIBILITY_MODELS[0],
  );
  readonly activeDataSource = computed((): AiVisibilitySource | null => {
    const model = this.activeModel();
    return model.available && model.dataSource ? model.dataSource : null;
  });
  readonly isActiveModelLocked = computed(() => !this.activeModel().available);
  readonly isOverviewSection = computed(() => this.binderSectionId() === 'overview');
  readonly overviewMarketRows = computed(() => [
    {
      scope: 'national' as const,
      label: this.nationalCaptureTarget().locationName,
      snapshotCount: this.nationalSnapshots().length,
      aiOverviewCount: this.marketAiRowsForScope('national').length,
    },
    ...(this.localCaptureTarget()
      ? [
          {
            scope: 'local' as const,
            label: this.localCaptureTarget()!.locationName,
            snapshotCount: this.localSnapshots().length,
            aiOverviewCount: this.marketAiRowsForScope('local').length,
          },
        ]
      : []),
  ]);

  readonly activePersistedSource = computed(() => {
    const source = this.activeDataSource();
    if (!source || source === 'keyword_overview') return null;
    return this.sourceSnapshotFor(source);
  });

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
        firstValueFrom(this.api.listAiVisibility$(siteId)).catch(() =>
          firstValueFrom(this.api.getLatestAiVisibility$(siteId)).then(({ snapshot }) => ({
            snapshots: snapshot ? [snapshot] : [],
          })),
        ),
      ]);
      this.rows.set(rankingsResponse.rankings);
      const snapshots = this.mergeSnapshots([], aiVisibilityResponse.snapshots);
      this.persistedSnapshots.set(snapshots);
      if (snapshots[0]) {
        this.selectedMarketScope.set(this.snapshotMarketScope(snapshots[0]));
      }
      this.selectedSnapshotId.set(snapshots[0]?.id ?? null);
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Could not load AI visibility data.'));
    } finally {
      this.loading.set(false);
    }
  }

  goToRankings(): void {
    void this.router.navigate(['/home/rankings']);
  }

  selectModel(modelId: AiVisibilityModelId): void {
    this.selectBinderSection(binderSectionKey(this.selectedMarketScope(), modelId));
  }

  selectBinderSection(sectionId: string): void {
    this.binderSectionId.set(sectionId);
    if (sectionId === 'overview') {
      this.closeAnswerDrawer();
      return;
    }

    const parsed = parseBinderSectionKey(sectionId);
    if (!parsed) return;

    this.selectedMarketScope.set(parsed.scope);
    this.activeModelId.set(parsed.modelId);
    const snapshots =
      parsed.scope === 'local' ? this.localSnapshots() : this.nationalSnapshots();
    this.selectedSnapshotId.set(snapshots[0]?.id ?? null);
    this.closeAnswerDrawer();
  }

  binderSectionKey(scope: CaptureMarketScope, modelId: AiVisibilityModelId): string {
    return `${scope}:${modelId}`;
  }

  isBinderSectionActive(scope: CaptureMarketScope, modelId: AiVisibilityModelId): boolean {
    return this.binderSectionId() === this.binderSectionKey(scope, modelId);
  }

  modelCaptureCount(scope: CaptureMarketScope, modelId: AiVisibilityModelId): number {
    const model = AI_VISIBILITY_MODELS.find((item) => item.id === modelId);
    if (!model?.available) return 0;
    if (model.dataSource === 'keyword_overview') {
      return this.marketAiRowsForScope(scope).length;
    }
    if (!model.dataSource) return 0;
    const snapshots = scope === 'local' ? this.localSnapshots() : this.nationalSnapshots();
    return snapshots.filter((snapshot) =>
      snapshot.sources.some(
        (source) => source.source === model.dataSource && source.status === 'complete',
      ),
    ).length;
  }

  modelNavStatus(scope: CaptureMarketScope, modelId: AiVisibilityModelId): string {
    const model = AI_VISIBILITY_MODELS.find((item) => item.id === modelId);
    if (!model?.available) return 'Soon';
    const count = this.modelCaptureCount(scope, modelId);
    if (count === 0) return 'Not captured';
    return String(count);
  }

  selectSnapshot(snapshotId: string): void {
    this.selectedSnapshotId.set(snapshotId);
    this.closeAnswerDrawer();
  }

  selectMarketScope(scope: CaptureMarketScope): void {
    this.selectedMarketScope.set(scope);
    const snapshots =
      scope === 'local' ? this.localSnapshots() : this.nationalSnapshots();
    this.selectedSnapshotId.set(snapshots[0]?.id ?? null);
    if (this.binderSectionId() !== 'overview') {
      this.binderSectionId.set(binderSectionKey(scope, this.activeModelId()));
    }
    this.closeAnswerDrawer();
  }

  openAnswerDrawer(): void {
    const source = this.activePersistedSource();
    if (!source || this.answerParagraphs(source).length === 0) {
      return;
    }
    this.answerDrawerOpen.set(true);
  }

  closeAnswerDrawer(): void {
    this.answerDrawerOpen.set(false);
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
    this.binderSectionId.set(binderSectionKey(options.mode, this.activeModelId()));
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

  modelCaptureStatusLabel(source: AiVisibilitySource): string {
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
    return '1 national';
  }

  sourceDisplayName(source: AiVisibilitySourceSnapshot): string {
    if (source.source === 'google_ai_mode') return 'Google AI';
    if (source.source === 'chatgpt') return 'ChatGPT';
    return 'Google AI Overview';
  }

  sourceAnswerText(source: AiVisibilitySourceSnapshot): string {
    const sectionText = source.answerSections
      ?.map((section) => section.markdown || section.text)
      .filter((text): text is string => Boolean(text?.trim()))
      .join('\n\n');
    return formatAnswerForDisplay(source.answerMarkdown || sectionText || source.answerExcerpt || '');
  }

  answerParagraphs(source: AiVisibilitySourceSnapshot): string[] {
    const text = this.sourceAnswerText(source);
    if (!text) return [];
    return text.split(/\n\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);
  }

  answerPreview(source: AiVisibilitySourceSnapshot): string {
    const paragraphs = this.answerParagraphs(source);
    if (paragraphs.length === 0) return '';
    if (paragraphs.length <= 2) return paragraphs.join('\n\n');
    return `${paragraphs.slice(0, 2).join('\n\n')}\n\n…`;
  }

  answerHasMore(source: AiVisibilitySourceSnapshot): boolean {
    return this.answerParagraphs(source).length > 2;
  }

  sourceClientCited(source: AiVisibilitySourceSnapshot): boolean {
    if (source.clientCited) return true;
    const own = this.ownDomain();
    if (!own) return false;
    return this.sourceCitationDomains(source).some((domain) => domainMatchesOwn(domain, own));
  }

  sourceClientMentioned(source: AiVisibilitySourceSnapshot): boolean {
    if (source.clientMentioned) return true;
    const own = this.ownDomain();
    if (!own) return false;
    return textMentionsDomain(this.sourceAnswerText(source), own);
  }

  sourceStatusLabel(source: AiVisibilitySourceSnapshot): string {
    if (this.sourceClientCited(source)) return 'Cited';
    if (this.sourceClientMentioned(source)) return 'Mentioned';
    return 'Not cited';
  }

  citationIsOwn(citation: { domain?: string | null; url?: string | null }): boolean {
    const own = this.ownDomain();
    if (!own) return false;
    const domain = citationDomain(citation);
    return domain ? domainMatchesOwn(domain, own) : false;
  }

  snapshotCited(snapshot: AiVisibilitySnapshot | null | undefined): boolean {
    const source = this.snapshotSourceForActiveTab(snapshot);
    if (source) return this.sourceClientCited(source);
    return Boolean(snapshot?.sources.some((item) => this.sourceClientCited(item)));
  }

  snapshotMentioned(snapshot: AiVisibilitySnapshot | null | undefined): boolean {
    const source = this.snapshotSourceForActiveTab(snapshot);
    if (source) return this.sourceClientMentioned(source);
    return Boolean(snapshot?.sources.some((item) => this.sourceClientMentioned(item)));
  }

  snapshotStatusLabel(snapshot: AiVisibilitySnapshot | null | undefined): string {
    if (!snapshot) return 'Not captured';
    const source = this.snapshotSourceForActiveTab(snapshot);
    if (source) return this.sourceStatusLabel(source);
    if (this.snapshotCited(snapshot)) return 'Cited';
    if (this.snapshotMentioned(snapshot)) return 'Mentioned';
    return 'Not cited';
  }

  snapshotSourceSummary(snapshot: AiVisibilitySnapshot): string {
    const complete = snapshot.sources.filter((source) => source.status === 'complete').length;
    const domains = new Set(snapshot.sources.flatMap((source) => source.citedDomains)).size;
    return `${complete}/${snapshot.sources.length} answers · ${domains} cited domains`;
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

  private marketRankingRows(): KeywordRankingRow[] {
    return this.rows().filter((row) => this.rowMatchesSelectedMarket(row));
  }

  private marketAiRows(): KeywordRankingRow[] {
    return this.marketAiRowsForScope(this.selectedMarketScope());
  }

  private marketAiRowsForScope(scope: CaptureMarketScope): KeywordRankingRow[] {
    return this.rows().filter((row) => {
      if (!hasAiOverview(row)) return false;
      if (scope === 'local') {
        const localCode = this.localCaptureTarget()?.locationCode;
        return (
          row.latest.marketTier === 'local' ||
          Boolean(localCode && row.latest.locationCode === localCode)
        );
      }
      return row.latest.marketTier !== 'local';
    });
  }

  private rowMatchesSelectedMarket(row: KeywordRankingRow): boolean {
    const scope = this.selectedMarketScope();
    if (scope === 'local') {
      const localCode = this.localCaptureTarget()?.locationCode;
      return row.latest.marketTier === 'local' || Boolean(localCode && row.latest.locationCode === localCode);
    }
    return row.latest.marketTier !== 'local';
  }

  private snapshotSourceForActiveTab(
    snapshot: AiVisibilitySnapshot | null | undefined,
  ): AiVisibilitySourceSnapshot | null {
    if (!snapshot) return null;
    return snapshot.sources.find((source) => source.source === this.activeDataSource()) ?? null;
  }

  private sourceCitationDomains(source: AiVisibilitySourceSnapshot): string[] {
    const fromEvidence = [
      ...source.citations.map((citation) => citationDomain(citation)),
      ...(source.links ?? []).map((link) => citationDomain(link)),
    ].filter((domain): domain is string => Boolean(domain));

    if (fromEvidence.length > 0) {
      return Array.from(new Set(fromEvidence));
    }

    return Array.from(
      new Set(
        source.citedDomains
          .map((domain) => normalizeDomain(domain))
          .filter((domain): domain is string => Boolean(domain)),
      ),
    );
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

function binderSectionKey(scope: CaptureMarketScope, modelId: AiVisibilityModelId): string {
  return `${scope}:${modelId}`;
}

function parseBinderSectionKey(
  sectionId: string,
): { scope: CaptureMarketScope; modelId: AiVisibilityModelId } | null {
  const [scope, modelId] = sectionId.split(':');
  if (scope !== 'national' && scope !== 'local') return null;
  if (!AI_VISIBILITY_MODELS.some((model) => model.id === modelId)) return null;
  return { scope, modelId: modelId as AiVisibilityModelId };
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

function resolveCitationUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return trimmed;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (host !== 'google.com') return trimmed;

  if (parsed.pathname === '/url') {
    for (const key of ['q', 'url', 'u']) {
      const target = parsed.searchParams.get(key);
      if (!target) continue;
      const decoded = decodeURIComponent(target.trim());
      if (/^https?:\/\//i.test(decoded)) {
        return resolveCitationUrl(decoded);
      }
    }
  }

  return trimmed;
}

function citationDomainFromUrl(url?: string | null): string | null {
  if (!url?.trim()) return null;
  const resolved = resolveCitationUrl(url);
  return normalizeDomain(domainFromUrl(resolved));
}

function preferCitationDomain(explicitDomain: string | null, resolvedDomain: string | null): string | null {
  if (!resolvedDomain) return explicitDomain;
  if (!explicitDomain || explicitDomain === 'google.com' || explicitDomain.endsWith('.google.com')) {
    return resolvedDomain;
  }
  return explicitDomain;
}

function domainFromUrl(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function citationDomain(citation: { domain?: string | null; url?: string | null }): string | null {
  const explicit = normalizeDomain(citation.domain ?? undefined);
  const resolved = citationDomainFromUrl(citation.url ?? undefined);
  return preferCitationDomain(explicit, resolved);
}

function percentLabel(numerator: number, denominator: number): string {
  if (denominator <= 0) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function plural(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
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

function cleanAnswerText(value: string): string {
  return formatAnswerForDisplay(value);
}

function formatAnswerForDisplay(value: string): string {
  return value
    .replace(/\r/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[(\d+)\]/g, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\u3010[^\u3011]*\u3011/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function domainMatchesOwn(domain: string, own: string): boolean {
  return domain === own || domain.endsWith(`.${own}`);
}

function textMentionsDomain(text: string | undefined, domain: string): boolean {
  if (!text || !domain) return false;
  const normalized = text.toLowerCase();
  const target = domain.toLowerCase();
  return normalized.includes(target) || normalized.includes(`www.${target}`);
}
