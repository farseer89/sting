import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, Injector, OnInit, computed, effect, inject, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { ProgressSpinner } from 'primeng/progressspinner';
import type {
  AiVisibilitySnapshot,
  KeywordRankingRow,
  PageOptimizationSnapshot,
  PageSpeedSnapshot,
  SiteAuditLatestResponse,
  Thought,
} from '@hive/contracts';
import { firstValueFrom } from 'rxjs';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { ThoughtRunSession } from '../../runs/thought-run-session.service';
import { ShireApiService } from '../../shire/shire-api.service';

type BinderSection =
  | 'readiness'
  | 'business'
  | 'audience'
  | 'keywords'
  | 'rankings'
  | 'site-health'
  | 'optimization'
  | 'ai-visibility'
  | 'inventory'
  | 'raw';

interface BinderNavItem {
  id: BinderSection;
  label: string;
  count: number;
  state: 'ready' | 'partial' | 'missing';
}

interface ReadinessCheck {
  label: string;
  ok: boolean;
  detail: string;
  required?: boolean;
}

interface ClientIdentity {
  hostname: string;
  aliases: string[];
}

@Component({
  selector: 'app-protopipe-content-plan-v2',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Message, ProgressSpinner],
  templateUrl: './protopipe-content-plan-v2.component.html',
  styleUrl: './protopipe-content-plan-v2.component.scss',
})
export class ProtopipeContentPlanV2Component implements OnInit {
  private readonly api = inject(ShireApiService);
  private readonly injector = inject(Injector);
  readonly strategy = inject(ProtopipeStrategyService);
  readonly runSession = inject(ThoughtRunSession);
  readonly planRunSession = Injector.create({
    providers: [ThoughtRunSession],
    parent: this.injector,
  }).get(ThoughtRunSession);

  readonly binderSection = signal<BinderSection>('readiness');
  readonly loadingEvidence = signal(false);
  readonly evidenceError = signal<string | null>(null);
  readonly autoStartAttempted = signal(false);
  readonly planError = signal<string | null>(null);
  readonly rankings = signal<KeywordRankingRow[]>([]);
  readonly aiVisibilitySnapshots = signal<AiVisibilitySnapshot[]>([]);
  readonly latestAudit = signal<SiteAuditLatestResponse['audit'] | null>(null);
  readonly pageOptimization = signal<PageOptimizationSnapshot | null>(null);
  readonly pageSpeed = signal<PageSpeedSnapshot | null>(null);

  readonly thought = computed(() => this.contentPlanThought(this.runSession.thought()));
  readonly planThought = computed(() => this.planRunSession.thought()?.thinkerKind === 'content_plan_v2' ? this.planRunSession.thought() : null);
  readonly evidenceArtifacts = computed(() => asRecord(this.thought()?.artifacts) ?? {});
  readonly planArtifacts = computed(() => asRecord(this.planThought()?.artifacts) ?? {});
  readonly artifacts = computed(() =>
    Object.keys(this.planArtifacts()).length > 0 ? this.planArtifacts() : this.evidenceArtifacts(),
  );
  readonly business = computed(() => asRecord(this.artifacts()['business']));
  readonly strategyContext = computed(() => asRecord(this.artifacts()['strategyContext']));
  readonly audienceEvidence = computed(() => asRecord(this.artifacts()['audienceEvidence']));
  readonly aiVisibilityEvidence = computed(() => asRecord(this.artifacts()['aiVisibilityEvidence']));
  readonly notMentionedActions = computed(() => asRecordArray(recordValue(this.aiVisibilityEvidence(), 'notMentionedActions')));
  readonly mentionedNotCitedActions = computed(() =>
    asRecordArray(recordValue(this.aiVisibilityEvidence(), 'mentionedNotCitedActions')),
  );
  readonly citedWins = computed(() => asRecordArray(recordValue(this.aiVisibilityEvidence(), 'citedWins')));
  readonly competitorCitationGaps = computed(() =>
    asRecordArray(recordValue(this.aiVisibilityEvidence(), 'competitorCitationGaps')),
  );
  readonly audit = computed(() => asRecord(this.artifacts()['audit']) ?? asRecord(this.latestAudit()));
  readonly scoredKeywords = computed(() => asRecordArray(this.artifacts()['scored']));
  readonly clusters = computed(() => asRecordArray(this.artifacts()['clusters']));
  readonly calendar = computed(() => asRecordArray(this.artifacts()['calendar']));
  readonly backlog = computed(() => asRecordArray(this.artifacts()['backlog']));
  readonly focusStrategies = computed(() => asRecordArray(this.artifacts()['focusStrategies']));
  readonly pageOptimizationSignals = computed(() =>
    asRecordArray(this.artifacts()['pageOptimizationSignals']).length
      ? asRecordArray(this.artifacts()['pageOptimizationSignals'])
      : asRecordArray(this.pageOptimization()?.pages)
          .map((page) => asRecord(page['contentPlanSignal']))
          .filter((signal): signal is Record<string, unknown> => Boolean(signal)),
  );
  readonly clientSiteFixes = computed(() =>
    asRecordArray(this.artifacts()['clientSiteFixes']).length
      ? asRecordArray(this.artifacts()['clientSiteFixes'])
      : asRecordArray(this.pageOptimization()?.pages).filter((page) => asArray(page['issues']).length > 0),
  );
  readonly performanceSignals = computed(() =>
    asRecordArray(this.artifacts()['performanceSignals']).length
      ? asRecordArray(this.artifacts()['performanceSignals'])
      : asRecordArray(this.pageSpeed()?.pages),
  );
  readonly artifactKeys = computed(() => Object.keys(this.artifacts()).sort());

  readonly clientIdentity = computed<ClientIdentity>(() => {
    const site = this.strategy.site();
    const savedIdentity = this.strategy.brandIdentity();
    const business = this.business();
    const artifactIdentity = asRecord(recordValue(business, 'clientIdentity'));
    const hostname = stringValue(recordValue(business, 'hostname')) || site?.hostname || '';
    const displayName =
      stringValue(recordValue(business, 'displayName')) || site?.displayName || site?.hostname || '';
    const artifactAliases = asStringArray(recordValue(artifactIdentity, 'aliases'));
    const savedAliases =
      savedIdentity?.aliases
        .filter((alias) => alias.status === 'confirmed')
        .map((alias) => alias.value) ?? [];
    return {
      hostname: savedIdentity?.hostname || hostname,
      aliases: uniqueStrings([
        savedIdentity?.primaryName,
        ...savedAliases,
        ...artifactAliases,
        displayName,
        site?.displayName,
      ]),
    };
  });

  readonly runStatusLabel = computed(() => {
    const thought = this.thought();
    if (!thought) return this.autoStartAttempted() ? 'Starting evidence run…' : 'No evidence run yet';
    if (thought.status === 'pending') return 'Queued';
    if (thought.status === 'running') return `Running ${thought.currentStepId ?? 'evidence'}`;
    if (thought.status === 'complete') return 'Ready';
    if (thought.status === 'failed') return 'Failed';
    return thought.status;
  });

  readonly planRunStatusLabel = computed(() => {
    const thought = this.planThought();
    if (!thought) return 'No plan run yet';
    if (thought.status === 'pending') return 'Plan queued';
    if (thought.status === 'running') return `Planning ${thought.currentStepId ?? 'content plan'}`;
    if (thought.status === 'complete') return 'Plan ready';
    if (thought.status === 'failed') return 'Plan failed';
    return thought.status;
  });

  readonly canBuildPlan = computed(() => {
    const thought = this.thought();
    return Boolean(
      this.blockers().length === 0 &&
        thought?.status === 'complete' &&
        !this.runSession.isActive() &&
        !this.planRunSession.isActive(),
    );
  });

  readonly readinessChecks = computed<ReadinessCheck[]>(() => {
    const identity = this.clientIdentity();
    const keywordCount = this.strategy.keywords().length;
    const thought = this.thought();
    return [
      {
        label: 'Business identity',
        ok: Boolean(identity.hostname && identity.aliases.length),
        detail: identity.hostname
          ? `${identity.hostname} · ${identity.aliases.length} alias(es)`
          : 'Missing site hostname or brand alias',
        required: true,
      },
      {
        label: 'Confirmed keywords',
        ok: keywordCount > 0,
        detail: keywordCount > 0 ? `${keywordCount} keyword(s) available` : 'Confirm keywords first',
        required: true,
      },
      {
        label: 'Evidence run',
        ok: Boolean(thought),
        detail: thought ? `${thought.status} · ${thought.steps.length} step(s)` : 'No run found yet',
        required: true,
      },
      {
        label: 'Scored keyword evidence',
        ok: this.scoredKeywords().length > 0,
        detail: `${this.scoredKeywords().length} scored keyword row(s)`,
      },
      {
        label: 'Ranking / SERP evidence',
        ok: this.focusStrategies().length > 0 || this.rankings().length > 0,
        detail: `${this.focusStrategies().length} focus strategy row(s), ${this.rankings().length} ranking snapshot(s)`,
      },
      {
        label: 'Site audit evidence',
        ok: Boolean(this.audit()),
        detail: this.audit()
          ? `${numberValue(recordValue(this.audit(), 'scannedCount')) ?? 0} page(s) scanned`
          : 'No latest site audit snapshot',
      },
      {
        label: 'Page optimization signals',
        ok: this.pageOptimizationSignals().length > 0,
        detail: `${this.pageOptimizationSignals().length} support signal(s)`,
      },
      {
        label: 'AI visibility evidence',
        ok: this.aiVisibilitySnapshots().length > 0 || this.aiVisibilityActionCount() > 0,
        detail: `${this.aiVisibilitySnapshots().length} AI visibility snapshot(s), ${this.aiVisibilityActionCount()} planning action(s)`,
      },
    ];
  });

  readonly readinessStatus = computed(() => {
    const checks = this.readinessChecks();
    if (checks.some((check) => check.required && !check.ok)) return 'needs_input';
    if (this.runSession.isActive() && this.thought()?.thinkerKind === 'content_plan_v2_evidence') return 'needs_research';
    if (checks.some((check) => !check.ok)) return 'ready_with_warnings';
    return 'ready';
  });

  readonly blockers = computed(() =>
    this.readinessChecks().filter((check) => check.required && !check.ok),
  );
  readonly warnings = computed(() =>
    this.readinessChecks().filter((check) => !check.required && !check.ok),
  );

  readonly navItems = computed<BinderNavItem[]>(() => [
    navItem('readiness', 'Readiness', this.readinessChecks().filter((check) => check.ok).length, this.blockers().length === 0),
    navItem('business', 'Business', this.clientIdentity().aliases.length + (this.clientIdentity().hostname ? 1 : 0), Boolean(this.clientIdentity().hostname)),
    navItem('audience', 'Audience', this.confirmedAvatars().length, this.confirmedAvatars().length > 0),
    navItem('keywords', 'Keywords', this.scoredKeywords().length || this.strategy.keywords().length, this.strategy.keywords().length > 0),
    navItem('rankings', 'Rankings', this.focusStrategies().length || this.rankings().length, this.focusStrategies().length > 0 || this.rankings().length > 0),
    navItem('site-health', 'Site health', numberValue(recordValue(this.audit(), 'scannedCount')) ?? 0, Boolean(this.audit())),
    navItem('optimization', 'Optimization', this.pageOptimizationSignals().length, this.pageOptimizationSignals().length > 0),
    navItem('ai-visibility', 'AI visibility', this.aiVisibilitySnapshots().length + this.aiVisibilityActionCount(), this.aiVisibilitySnapshots().length > 0 || this.aiVisibilityActionCount() > 0),
    navItem('inventory', 'Inventory', this.calendar().length + this.backlog().length, this.calendar().length > 0 || this.backlog().length > 0),
    navItem('raw', 'Raw keys', this.artifactKeys().length, this.artifactKeys().length > 0),
  ]);

  readonly readyCheckCount = computed(() => this.readinessChecks().filter((check) => check.ok).length);

  readonly aiVisibilityActionCount = computed(
    () => this.notMentionedActions().length + this.mentionedNotCitedActions().length + this.citedWins().length,
  );

  readonly confirmedAvatars = computed(() => {
    const businessAvatars = asRecordArray(recordValue(this.business(), 'confirmedAvatars'));
    if (businessAvatars.length > 0) return businessAvatars;
    return asRecordArray(recordValue(this.strategyContext(), 'confirmedAvatars'));
  });

  constructor() {
    effect(() => {
      const thought = this.thought();
      if (thought?.status === 'complete') {
        void this.loadEvidence();
      }
    });
    effect(() => {
      if (this.planThought()?.status === 'complete' && this.binderSection() !== 'inventory') {
        queueMicrotask(() => this.binderSection.set('inventory'));
      }
    });
  }

  ngOnInit(): void {
    void this.loadInitial();
  }

  selectSection(section: BinderSection): void {
    this.binderSection.set(section);
  }

  navItem(id: BinderSection): BinderNavItem | undefined {
    return this.navItems().find((item) => item.id === id);
  }

  sectionKicker(section: BinderSection): string {
    switch (section) {
      case 'readiness':
        return 'Evidence · Readiness';
      case 'business':
        return 'Identity · Business';
      case 'audience':
        return 'Identity · Audience';
      case 'keywords':
        return 'Research · Keywords';
      case 'rankings':
        return 'Research · Rankings';
      case 'ai-visibility':
        return 'Research · AI visibility';
      case 'site-health':
        return 'Site · Health';
      case 'optimization':
        return 'Site · Optimization';
      case 'inventory':
        return 'Plan · Inventory';
      case 'raw':
        return 'Developer · Raw keys';
    }
  }

  async refresh(): Promise<void> {
    await this.loadInitial({ allowAutoStart: false });
  }

  async startEvidenceRun(auto = false): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId || this.runSession.isActive()) return;
    if (this.strategy.keywords().length === 0) {
      this.evidenceError.set('Confirm keywords before starting Content Plan V2 evidence.');
      return;
    }
    if (auto) this.autoStartAttempted.set(true);
    this.evidenceError.set(null);
    const run = await this.runSession.enqueueRun(siteId, {
      thinkerKind: 'content_plan_v2_evidence',
      params: { source: auto ? 'contentPlanV2AutoStart' : 'contentPlanV2' },
    });
    if (!run && this.runSession.loadError()) {
      this.evidenceError.set(this.runSession.loadError());
    }
  }

  async startContentPlanRun(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId || !this.canBuildPlan()) return;
    this.planError.set(null);
    const evidenceRunId = this.thought()?.id;
    const run = await this.planRunSession.enqueueRun(siteId, {
      thinkerKind: 'content_plan_v2',
      params: {
        source: 'contentPlanV2',
        ...(evidenceRunId ? { evidenceRunId } : {}),
      },
    });
    if (!run && this.planRunSession.loadError()) {
      this.planError.set(this.planRunSession.loadError());
    }
  }

  field(record: Record<string, unknown> | null, key: string, fallback = 'Not captured'): string {
    const value = recordValue(record, key);
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return fallback;
  }

  label(value: string): string {
    return value
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  formatDate(value: string | undefined): string {
    if (!value) return 'Not captured';
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) return value;
    return new Date(parsed).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  private async loadInitial(options: { allowAutoStart?: boolean } = {}): Promise<void> {
    await Promise.all([
      this.attachLatestEvidenceRun(options.allowAutoStart ?? true),
      this.attachLatestPlanRun(),
    ]);
    await this.loadEvidence();
  }

  private async attachLatestEvidenceRun(allowAutoStart: boolean): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    const current = this.runSession.thought();
    if (current?.thinkerKind === 'content_plan_v2_evidence') return;

    try {
      const { run } = await firstValueFrom(this.api.getLatestRun$(siteId, 'content_plan_v2_evidence'));
      this.runSession.attach(siteId, run.id, run);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 404 && allowAutoStart) {
        await this.startEvidenceRun(true);
        return;
      }
      if (!(err instanceof HttpErrorResponse && err.status === 404)) {
        this.evidenceError.set(parseProtopipeApiError(err, 'Could not load latest content plan run.'));
      }
    }
  }

  private async attachLatestPlanRun(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    const current = this.planRunSession.thought();
    if (current?.thinkerKind === 'content_plan_v2') return;

    try {
      const { run } = await firstValueFrom(this.api.getLatestRun$(siteId, 'content_plan_v2'));
      this.planRunSession.attach(siteId, run.id, run);
    } catch (err) {
      if (!(err instanceof HttpErrorResponse && err.status === 404)) {
        this.planError.set(parseProtopipeApiError(err, 'Could not load latest Content Plan V2 run.'));
      }
    }
  }

  private async loadEvidence(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    this.loadingEvidence.set(true);
    const [rankings, aiVisibility, audit, optimization, speed] = await Promise.allSettled([
      firstValueFrom(this.api.listRankings$(siteId)),
      firstValueFrom(this.api.listAiVisibility$(siteId)),
      firstValueFrom(this.api.getLatestSiteAudit$(siteId)),
      firstValueFrom(this.api.getLatestPageOptimization$(siteId)),
      firstValueFrom(this.api.getLatestPageSpeed$(siteId)),
    ]);

    if (rankings.status === 'fulfilled') this.rankings.set(rankings.value.rankings);
    if (aiVisibility.status === 'fulfilled') this.aiVisibilitySnapshots.set(aiVisibility.value.snapshots);
    if (audit.status === 'fulfilled') this.latestAudit.set(audit.value.audit);
    if (optimization.status === 'fulfilled') this.pageOptimization.set(optimization.value.snapshot);
    if (speed.status === 'fulfilled') this.pageSpeed.set(speed.value.snapshot);

    this.loadingEvidence.set(false);
  }

  private contentPlanThought(thought: Thought | null): Thought | null {
    return thought?.thinkerKind === 'content_plan_v2_evidence' ? thought : null;
  }
}

function navItem(
  id: BinderSection,
  label: string,
  count: number,
  ready: boolean,
): BinderNavItem {
  return {
    id,
    label,
    count,
    state: ready ? 'ready' : count > 0 ? 'partial' : 'missing',
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return asArray(value)
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item));
}

function recordValue(record: Record<string, unknown> | null | undefined, key: string): unknown {
  return record ? record[key] : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}
