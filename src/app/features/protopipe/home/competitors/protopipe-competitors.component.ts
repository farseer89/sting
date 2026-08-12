import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { ProgressSpinner } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';
import type { Thought, ThoughtStep } from '@hive/contracts';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { ThoughtRunSession } from '../../runs/thought-run-session.service';
import { ShireApiService } from '../../shire/shire-api.service';

const HARDCODED_KEYWORD = 'live wedding painting';

interface KeywordCompetitionArtifact {
  keyword: string;
  serp?: {
    yourPosition: number | null;
    competitors: SerpCompetitor[];
  };
  aiVisibility?: {
    citations: AiCitationRollup[];
  };
  competitorProfiles?: CompetitorPageProfile[];
  comparison?: CompetitionComparison;
  conclusion?: CompetitionConclusion;
}

interface SerpCompetitor {
  position: number;
  title?: string;
  url?: string;
  domain: string;
  snippet?: string;
}

interface AiCitationRollup {
  url: string;
  domain?: string;
  title?: string;
  sourceEngines: string[];
  snippets: string[];
}

interface CompetitorPageProfile {
  target: {
    url: string;
    domain: string;
    title?: string;
    serpPosition: number | null;
    sources: Array<'serp' | 'ai_citation'>;
  };
  fetchStatus: 'ok' | 'blocked' | 'error';
  profile?: {
    titleTag?: string;
    h1?: string;
    wordCount?: number;
    schemaTypes?: string[];
    imageCount?: number;
    videoCount?: number;
  };
  signals: Record<string, unknown>;
}

interface CompetitionComparison {
  overlappingDomains?: string[];
  competitorContentPatterns?: string[];
  opportunityGaps?: string[];
}

interface CompetitionConclusion {
  observedEvidence?: string[];
  inferredWhyCompetitorsWin?: string[];
  suggestedStrategy?: {
    primaryRecommendation?: string;
    contentMoves?: string[];
    proofToAdd?: string[];
    questionsToAnswer?: string[];
    priority?: 'high' | 'medium' | 'low';
  };
  contentPlanInputs?: {
    opportunityType?: string;
    rationale?: string;
    proofNeeded?: string[];
    sequencingHint?: string;
  };
  confidence?: 'high' | 'medium' | 'low';
  caveats?: string[];
}

@Component({
  selector: 'app-protopipe-competitors',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Message, ProgressSpinner],
  templateUrl: './protopipe-competitors.component.html',
  styleUrl: './protopipe-competitors.component.scss',
})
export class ProtopipeCompetitorsComponent implements OnInit {
  private readonly api = inject(ShireApiService);
  private readonly strategy = inject(ProtopipeStrategyService);
  readonly runSession = inject(ThoughtRunSession);

  readonly error = signal<string | null>(null);
  readonly keyword = HARDCODED_KEYWORD;

  readonly thought = computed(() => {
    const thought = this.runSession.thought();
    return thought?.thinkerKind === 'keyword_competition' ? thought : null;
  });
  readonly artifact = computed(() => competitionArtifactFromThought(this.thought()));
  readonly conclusion = computed(() => this.artifact()?.conclusion ?? null);
  readonly profiles = computed(() => this.artifact()?.competitorProfiles ?? []);
  readonly serpCompetitors = computed(() => this.artifact()?.serp?.competitors ?? []);
  readonly aiCitations = computed(() => this.artifact()?.aiVisibility?.citations ?? []);
  readonly comparison = computed(() => this.artifact()?.comparison ?? null);
  readonly completedSteps = computed(
    () => this.steps().filter((step) => step.status === 'complete').length,
  );
  readonly steps = computed(() => this.thought()?.steps ?? []);
  readonly canRun = computed(() => Boolean(this.strategy.siteId()) && !this.runSession.isActive());
  readonly statusLabel = computed(() => {
    const thought = this.thought();
    if (!thought) return 'No competition run yet';
    if (thought.status === 'pending') return 'Queued';
    if (thought.status === 'running') return `Running ${stepLabel(thought.currentStepId)}`;
    if (thought.status === 'complete') return 'Analysis ready';
    if (thought.status === 'failed') return 'Analysis failed';
    return thought.status;
  });

  ngOnInit(): void {
    void this.attachLatestRun();
  }

  async runCompetition(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId || !this.canRun()) return;
    this.error.set(null);
    const run = await this.runSession.enqueueRun(siteId, {
      thinkerKind: 'keyword_competition',
      params: { keyword: HARDCODED_KEYWORD },
    });
    if (!run && this.runSession.loadError()) {
      this.error.set(this.runSession.loadError());
    }
  }

  async attachLatestRun(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId || this.runSession.isActive()) return;
    try {
      const { run } = await firstValueFrom(this.api.getLatestRun$(siteId, 'keyword_competition'));
      this.runSession.attach(siteId, run.id, run);
    } catch {
      // No prior competition run is expected for the first visit.
    }
  }

  signalList(profile: CompetitorPageProfile): string[] {
    return [
      signalLabel(profile, 'pricingLanguage', 'Pricing'),
      signalLabel(profile, 'processLanguage', 'Process'),
      signalLabel(profile, 'examplesOrPortfolio', 'Examples'),
      signalLabel(profile, 'trustSignals', 'Trust'),
      signalLabel(profile, 'bookingOrCta', 'CTA'),
      signalLabel(profile, 'localLanguage', 'Local'),
    ].filter((value): value is string => Boolean(value));
  }

  stepTrack(_: number, step: ThoughtStep): string {
    return step.id;
  }

  profileTrack(_: number, profile: CompetitorPageProfile): string {
    return profile.target.url;
  }
}

function competitionArtifactFromThought(
  thought: Thought | null,
): KeywordCompetitionArtifact | null {
  if (!thought) return null;
  const artifacts = asRecord(thought.artifacts);
  const fromArtifacts = asRecord(artifacts?.['keywordCompetition']);
  if (fromArtifacts) return fromArtifacts as unknown as KeywordCompetitionArtifact;
  const output = thought.outputs
    .map((port) => asRecord(port.artifact?.data))
    .find((artifact) => artifact?.['keyword'] === HARDCODED_KEYWORD);
  return output ? (output as unknown as KeywordCompetitionArtifact) : null;
}

function signalLabel(profile: CompetitorPageProfile, key: string, label: string): string | null {
  const signal = asRecord(profile.signals[key]);
  return signal?.['present'] === true ? label : null;
}

function stepLabel(stepId: string | undefined): string {
  if (!stepId) return 'competition analysis';
  return stepId.replace(/_/g, ' ');
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
