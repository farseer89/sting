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
import { exportThoughtRunbookPdf } from '../../lab/thinker/thought-runbook-pdf';
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
  userRanking?: UserRanking;
  userPageProfile?: UserPageProfile | null;
  serpIntent?: SerpIntent;
  sectionPatterns?: SectionPattern[];
  comparison?: CompetitionComparison;
  proofGaps?: ProofGap[];
  aiCitationDiagnosis?: AiCitationDiagnosis[];
  presentationEvidence?: PresentationEvidence;
  contentDecision?: ContentDecision;
  writerEvidence?: WriterEvidence;
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

interface UserRanking {
  position: number | null;
  url?: string;
  domain?: string;
  title?: string;
  snippet?: string;
}

interface UserPageProfile {
  url: string;
  domain: string;
  fetchStatus: 'ok' | 'blocked' | 'error';
  error?: string;
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

interface SerpIntent {
  dominantPageType?: string;
  classification?: string;
  confidence?: 'high' | 'medium' | 'low';
  fallbackUsed?: boolean;
  evidence?: {
    dominantPageTypes?: Array<{ pageType: string; count: number }>;
    topOrganicPositions?: number[];
    sampledDomains?: string[];
  };
  pageTypeCounts?: Record<string, number>;
  recommendedContentFormat?: string;
  rationale?: string;
}

interface SerpLayout {
  organicPositions: number[];
  missingOrganicPositions: number[];
  occupiedSlots: Array<{
    position?: number;
    type: string;
    label: string;
    url?: string;
    domain?: string;
  }>;
  writerImplications: string[];
}

interface SerpLayoutPageRow {
  position: number;
  kind: 'organic' | 'feature' | 'unknown';
  label: string;
  detail?: string;
}

interface SerpLayoutSummary {
  intro: string;
  pageOneRows: SerpLayoutPageRow[];
  features: Array<{ label: string; position?: number }>;
  writerImplications: string[];
}

interface SectionPattern {
  id: string;
  label: string;
  count: number;
  domains: string[];
  exampleHeadings: string[];
}

interface ProofGap {
  proofType: string;
  label: string;
  competitorCount: number;
  competitorDomains: string[];
  userHasIt: boolean;
  importance: 'high' | 'medium' | 'low';
  competitorSnippets: string[];
  userSnippets: string[];
  recommendation: string;
}

interface AiCitationDiagnosis {
  url: string;
  domain?: string;
  title?: string;
  sourceEngines: string[];
  snippets: string[];
  overlapsSerp: boolean;
  pageType: string;
  citedFor: string;
}

interface ReasonCard {
  id: string;
  title: string;
  userFacingSummary: string;
  whyItMatters: string;
  observedFacts: string[];
  recommendation: string;
  proofNeeded: string[];
  sourceFactIds: string[];
  sourceLinks?: EvidenceSourceLink[];
  priority: 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
}

interface PresentationEvidence {
  reasonCards?: ReasonCard[];
}

interface EvidenceSourceLink {
  url: string;
  label: string;
  domain?: string;
  source: string;
  title?: string;
  evidenceRefId?: string;
}

interface ContentDecision {
  recommendedAction?: string;
  opportunityType?: string;
  recommendedContentType?: string;
  targetUrl?: string;
  primaryAngle?: string;
  keyQuestionToAnswer?: string;
  suggestedSections?: string[];
  proofNeeded?: string[];
  sequencingHint?: string;
  confidence?: 'high' | 'medium' | 'low';
}

interface WriterEvidence {
  decisionCard?: {
    keyword: string;
    recommendedAction?: string;
    targetUrl?: string;
    recommendedContentType?: string;
    primaryAngle?: string;
    keyQuestionToAnswer?: string;
    confidence?: 'high' | 'medium' | 'low';
    reasonRefs?: string[];
  };
  serpIntent?: SerpIntent;
  serpLayout?: SerpLayout;
  citationModes?: Array<{
    engine: string;
    citationMode: 'content' | 'local_listing' | 'mixed';
    citedUrls: string[];
    citedDomains: string[];
    actionImplication: string;
  }>;
  proofChecklist?: Array<{
    id: string;
    label: string;
    userHasIt: boolean;
    competitorCount: number;
    competitorDomains: string[];
    importance: 'high' | 'medium' | 'low';
    recommendation: string;
    snippets: string[];
    evidenceRefs: string[];
    sourceLinks: EvidenceSourceLink[];
  }>;
  competitorPatterns?: Array<{
    patternId: string;
    label: string;
    seenOnDomains: string[];
    exampleHeadings: string[];
    exampleSnippets: string[];
    useAs: string;
    writerInstruction: string;
  }>;
  sectionOpportunities?: Array<{
    sectionId: string;
    suggestedH2: string;
    reason: string;
    addressesProofGaps: string[];
    evidenceRefs: string[];
    sourceLinks: EvidenceSourceLink[];
    humanProofNeeded: string[];
  }>;
  humanResearchRequests?: Array<{
    requestId: string;
    type: string;
    prompt: string;
    usedForSections: string[];
    priority: 'high' | 'medium' | 'low';
    reasonEvidenceRefs: string[];
  }>;
  pageFetchSummary?: {
    attempted: number;
    cacheHits: number;
    cacheMisses: number;
    staleRefetches: number;
    blocked: number;
    errors: number;
  };
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
  readonly exportError = signal<string | null>(null);
  readonly exportingRunbook = signal(false);
  readonly keyword = HARDCODED_KEYWORD;

  readonly thought = computed(() => {
    const thought = this.runSession.thought();
    return thought?.thinkerKind === 'keyword_competition' ? thought : null;
  });
  readonly artifact = computed(() => competitionArtifactFromThought(this.thought()));
  readonly conclusion = computed(() => this.artifact()?.conclusion ?? null);
  readonly profiles = computed(() => this.artifact()?.competitorProfiles ?? []);
  readonly userRanking = computed(() => this.artifact()?.userRanking ?? null);
  readonly userPageProfile = computed(() => this.artifact()?.userPageProfile ?? null);
  readonly serpIntent = computed(() => this.artifact()?.serpIntent ?? null);
  readonly proofGaps = computed(() => this.artifact()?.proofGaps ?? []);
  readonly reasonCards = computed(() => this.artifact()?.presentationEvidence?.reasonCards ?? []);
  readonly contentDecision = computed(() => this.artifact()?.contentDecision ?? null);
  readonly writerEvidence = computed(() => this.artifact()?.writerEvidence ?? null);
  readonly writerSerpIntent = computed(() => this.writerEvidence()?.serpIntent ?? this.serpIntent());
  readonly serpLayout = computed(() => this.writerEvidence()?.serpLayout ?? null);
  readonly serpLayoutSummary = computed(() => {
    const layout = this.serpLayout();
    if (!layout) return null;
    return buildSerpLayoutSummary(layout, this.serpCompetitors());
  });
  readonly citationModes = computed(() => this.writerEvidence()?.citationModes ?? []);
  readonly proofChecklist = computed(() => this.writerEvidence()?.proofChecklist ?? []);
  readonly sectionOpportunities = computed(() => this.writerEvidence()?.sectionOpportunities ?? []);
  readonly humanResearchRequests = computed(() => this.writerEvidence()?.humanResearchRequests ?? []);
  readonly pageFetchSummary = computed(() => this.writerEvidence()?.pageFetchSummary ?? null);
  readonly serpCompetitors = computed(() => this.artifact()?.serp?.competitors ?? []);
  readonly aiCitations = computed(() => this.artifact()?.aiVisibility?.citations ?? []);
  readonly comparison = computed(() => this.artifact()?.comparison ?? null);
  readonly completedSteps = computed(
    () => this.steps().filter((step) => step.status === 'complete').length,
  );
  readonly steps = computed(() => this.thought()?.steps ?? []);
  readonly canRun = computed(() => Boolean(this.strategy.siteId()) && !this.runSession.isActive());
  readonly canExportRunbook = computed(
    () => Boolean(this.thought()) && !this.exportingRunbook() && !this.runSession.isActive(),
  );
  readonly statusLabel = computed(() => {
    const thought = this.thought();
    if (!thought) return 'No competition run yet';
    if (thought.status === 'pending') return 'Queued';
    if (thought.status === 'running') return `Running ${stepLabel(thought.currentStepId)}`;
    if (thought.status === 'complete') return 'Analysis ready';
    if (thought.status === 'failed') return 'Analysis failed';
    return thought.status;
  });
  readonly totalCostUsd = computed(() => this.thought()?.totalCostUsd);

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

  async exportRunbook(): Promise<void> {
    const thought = this.thought();
    const siteId = this.strategy.siteId();
    if (!thought || !siteId || this.exportingRunbook()) return;

    this.exportError.set(null);
    this.exportingRunbook.set(true);
    try {
      await exportThoughtRunbookPdf(thought, {
        runId: thought.id,
        siteId,
      });
    } catch {
      this.exportError.set('Could not export runbook PDF. Try again in a moment.');
    } finally {
      this.exportingRunbook.set(false);
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

  signalList(profile: { signals: Record<string, unknown> }): string[] {
    return signalList(profile.signals);
  }

  formatLabel(value: string | undefined | null): string {
    return value ? value.replace(/_/g, ' ') : 'Unknown';
  }

  formatCost(usd?: number): string {
    if (usd == null) return '—';
    return `$${usd.toFixed(3)}`;
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

function signalList(signals: Record<string, unknown>): string[] {
  return [
    signalLabel(signals, 'pricingLanguage', 'Pricing'),
    signalLabel(signals, 'processLanguage', 'Process'),
    signalLabel(signals, 'examplesOrPortfolio', 'Examples'),
    signalLabel(signals, 'trustSignals', 'Trust'),
    signalLabel(signals, 'bookingOrCta', 'CTA'),
    signalLabel(signals, 'localLanguage', 'Local'),
  ].filter((value): value is string => Boolean(value));
}

function signalLabel(signals: Record<string, unknown>, key: string, label: string): string | null {
  const signal = asRecord(signals[key]);
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

function buildSerpLayoutSummary(
  layout: SerpLayout,
  competitors: SerpCompetitor[],
): SerpLayoutSummary {
  const pageOneOrganic = new Set(
    layout.organicPositions.filter((position) => position >= 1 && position <= 10),
  );
  const missingSlots = new Set(
    layout.missingOrganicPositions.filter((position) => position >= 1 && position <= 10),
  );
  const slotByPosition = new Map<number, SerpLayout['occupiedSlots'][number]>();
  for (const slot of layout.occupiedSlots) {
    if (slot.position != null && slot.position >= 1 && slot.position <= 10) {
      slotByPosition.set(slot.position, slot);
    }
  }
  const competitorByPosition = new Map(competitors.map((row) => [row.position, row]));
  const pageOneRows: SerpLayoutPageRow[] = [];

  for (let position = 1; position <= 10; position += 1) {
    if (pageOneOrganic.has(position)) {
      const competitor = competitorByPosition.get(position);
      pageOneRows.push({
        position,
        kind: 'organic',
        label: 'Organic result',
        detail: competitor?.domain || competitor?.title || undefined,
      });
      continue;
    }

    const slot = slotByPosition.get(position);
    if (slot) {
      pageOneRows.push({
        position,
        kind: 'feature',
        label: slot.label,
        detail: slot.domain,
      });
      continue;
    }

    if (missingSlots.has(position)) {
      pageOneRows.push({
        position,
        kind: 'unknown',
        label: 'Non-organic block',
        detail: 'Ads or another SERP feature',
      });
    }
  }

  const features = layout.occupiedSlots.map((slot) => ({
    label: slot.label,
    position: slot.position,
  }));
  const featureLabels = features.map((feature) => featureLabel(feature.label));
  const intro = serpLayoutIntro(featureLabels);

  return {
    intro,
    pageOneRows,
    features,
    writerImplications: layout.writerImplications,
  };
}

function featureLabel(label: string): string {
  const normalized = label.toLowerCase();
  if (normalized.includes('local pack')) return 'local pack';
  if (normalized.includes('people also ask')) return 'People Also Ask';
  if (normalized.includes('image pack')) return 'image pack';
  if (normalized.includes('video pack')) return 'video pack';
  if (normalized.includes('featured snippet')) return 'featured snippet';
  if (normalized.includes('ai overview')) return 'AI Overview';
  if (normalized.includes('knowledge graph')) return 'knowledge graph';
  if (normalized.includes('ad')) return 'paid ads';
  return label;
}

function serpLayoutIntro(featureLabels: string[]): string {
  const unique = [...new Set(featureLabels.filter(Boolean))];
  if (unique.length === 0) {
    return 'Page 1 is mostly standard organic results for this keyword sample.';
  }
  if (unique.length === 1) {
    return `Page 1 mixes organic links with ${unique[0]}.`;
  }
  const last = unique.at(-1);
  const head = unique.slice(0, -1).join(', ');
  return `Page 1 mixes organic links with ${head}, and ${last}.`;
}
