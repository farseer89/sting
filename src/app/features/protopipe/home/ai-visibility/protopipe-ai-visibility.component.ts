import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import type { KeywordRankingRow } from '@hive/contracts';
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
  readonly error = signal<string | null>(null);
  readonly rows = signal<KeywordRankingRow[]>([]);

  readonly ownDomain = computed(() => normalizeDomain(this.strategy.site()?.hostname));
  readonly trackedKeywordCount = computed(() => this.strategy.keywords().length);
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

  readonly emptyMessage = computed(() =>
    this.trackedKeywordCount() === 0
      ? 'Confirm keywords first. Then run ranking research to collect AI Overview evidence.'
      : 'Run ranking research to populate AI Overview coverage, sources, and uncited opportunities.',
  );

  readonly rankLabel = rankLabel;
  readonly marketScopeLabel = marketScopeLabel;
  readonly locationShortLabel = locationShortLabel;

  ngOnInit(): void {
    void this.loadRankings();
  }

  async loadRankings(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(this.api.listRankings$(siteId));
      this.rows.set(response.rankings);
    } catch (err) {
      if (isRankingsNotReadyError(err)) {
        this.rows.set([]);
        return;
      }
      this.error.set(parseProtopipeApiError(err, 'Could not load AI visibility data.'));
    } finally {
      this.loading.set(false);
    }
  }

  goToRankings(): void {
    void this.router.navigate(['/home/rankings']);
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

function isRankingsNotReadyError(err: unknown): boolean {
  return err instanceof Error && /404|not found|no rankings/i.test(err.message);
}
