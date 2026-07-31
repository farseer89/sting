import type {
  ProtopipeMentionPrompt,
  ProtopipeMentionPromptType,
  ProtopipeMentionTrackingOutput,
  ProtopipeSiteMentionSnapshot,
} from '@hive/contracts';
import type {
  Thought,
  ThoughtArtifact,
  ThoughtStatus,
  ThoughtStep,
  ThoughtStepStatus,
} from '../thinker/thought.model';
import { sumCosts } from '../thinker/thinker-cost';

/**
 * Adapter: project a mention-tracking run onto the generic Thought model for
 * the Thinker binder and PDF runbook export.
 */

export const MENTION_TRACKING_STEP_ORDER = [
  'generate_prompts',
  'capture_responses',
  'parse_mentions',
  'aggregate',
  'finalize',
] as const;

export type MentionTrackingStepId = (typeof MENTION_TRACKING_STEP_ORDER)[number];

const PROMPT_TYPES: ProtopipeMentionPromptType[] = [
  'generic',
  'local',
  'comparison',
  'brand_defense',
];

const TYPE_LABELS: Record<ProtopipeMentionPromptType, string> = {
  generic: 'Generic',
  local: 'Local',
  comparison: 'Comparison',
  brand_defense: 'Brand defense',
};

const STEP_META: Record<MentionTrackingStepId, { label: string; summary: string }> = {
  generate_prompts: {
    label: 'Generate prompts',
    summary: 'Build prompt matrix from onboarding profile',
  },
  capture_responses: {
    label: 'Capture responses',
    summary: 'Run prompts against Gemini (2 runs per prompt)',
  },
  parse_mentions: {
    label: 'Parse mentions',
    summary: 'Extract brand mentions, citations, and sentiment',
  },
  aggregate: {
    label: 'Aggregate',
    summary: 'Roll up consistency scores by prompt type',
  },
  finalize: {
    label: 'Finalize',
    summary: 'Package mention snapshot for the Mentions book',
  },
};

export type MentionSourceClassification =
  | 'owned'
  | 'third_party_profile'
  | 'competitor'
  | 'authority'
  | 'directory'
  | 'noise'
  | 'unknown';

export type MentionRecommendedActionKind =
  | 'create_context_card'
  | 'update_site_facts'
  | 'create_service_page'
  | 'create_location_page'
  | 'create_comparison_page'
  | 'create_faq'
  | 'improve_profile_listing'
  | 'add_schema'
  | 'write_article'
  | 'monitor_next_run';

export interface MentionPromptPerformance {
  promptId: string;
  prompt: string;
  type: ProtopipeMentionPromptType;
  mentionRate: number;
  mentionedRuns: number;
  totalRuns: number;
  averagePosition?: number;
  sentiment: string;
  citedDomains: string[];
  citedCompetitors: string[];
  status: 'win' | 'partial' | 'gap';
}

export interface MentionSourceInsight {
  domain: string;
  classification: MentionSourceClassification;
  mentionCount: number;
  recommendation: string;
}

export interface MentionRecommendedAction {
  id: string;
  kind: MentionRecommendedActionKind;
  priority: 'high' | 'medium' | 'low';
  prompt: string;
  promptType: ProtopipeMentionPromptType;
  problem: string;
  likelyReason: string;
  recommendedFix: string;
  targetSurface: string;
  expectedImpact: string;
}

export interface MentionVisibilityReport {
  visibilityScore: number;
  presenceRate: number;
  runMentionRate: number;
  averageMentionPosition?: number;
  promptCount: number;
  responseCount: number;
  bestPromptType?: ProtopipeMentionPromptType;
  weakestPromptType?: ProtopipeMentionPromptType;
  biggestGap?: string;
  interpretation: string[];
  promptPerformance: MentionPromptPerformance[];
  sourceInsights: MentionSourceInsight[];
  recommendedActions: MentionRecommendedAction[];
}

function json(id: string, label: string, data: unknown, summary?: string): ThoughtArtifact {
  return { id, label, kind: 'json', data, summary };
}

function text(id: string, label: string, data: string, summary?: string): ThoughtArtifact {
  return { id, label, kind: 'text', data, summary };
}

function table(
  id: string,
  label: string,
  columns: string[],
  rows: string[][],
  summary?: string,
): ThoughtArtifact {
  return { id, label, kind: 'table', data: { columns, rows }, summary };
}

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function runLabel(runIndex: number): string {
  return `Run ${runIndex <= 0 ? runIndex + 1 : runIndex}`;
}

function isMentionOutput(value: unknown): value is ProtopipeMentionTrackingOutput {
  if (!value || typeof value !== 'object') return false;
  const record = value as ProtopipeMentionTrackingOutput;
  return Array.isArray(record.prompts) && record.disclaimer === 'sampled_estimate';
}

export function extractMentionOutput(source: {
  output?: ProtopipeMentionTrackingOutput;
  outputs?: Thought['outputs'];
  artifacts?: Record<string, unknown>;
}): ProtopipeMentionTrackingOutput | null {
  if (source.output && isMentionOutput(source.output)) {
    return source.output;
  }

  const fromPort = source.outputs?.find((port) => port.portId === 'snapshot')?.artifact?.data;
  if (isMentionOutput(fromPort)) return fromPort;

  const artifacts = source.artifacts as Partial<ProtopipeMentionTrackingOutput> | undefined;
  if (artifacts?.prompts && artifacts.summaryByType) {
    return {
      prompts: artifacts.prompts,
      captures: artifacts.captures ?? [],
      results: artifacts.results ?? [],
      summaryByType: artifacts.summaryByType,
      disclaimer: 'sampled_estimate',
      generatedAt: artifacts.generatedAt ?? new Date().toISOString(),
    };
  }

  if (artifacts?.prompts?.length) {
    return {
      prompts: artifacts.prompts,
      captures: artifacts.captures ?? [],
      results: artifacts.results ?? [],
      summaryByType:
        artifacts.summaryByType ??
        ({} as ProtopipeMentionTrackingOutput['summaryByType']),
      disclaimer: 'sampled_estimate',
      generatedAt: artifacts.generatedAt ?? new Date().toISOString(),
    };
  }

  return null;
}

function mapSnapshotStatus(status: ProtopipeSiteMentionSnapshot['status']): ThoughtStatus {
  if (status === 'pending' || status === 'running' || status === 'complete' || status === 'failed') {
    return status;
  }
  return 'idle';
}

function inferStepStatus(
  stepId: MentionTrackingStepId,
  stepIndex: number,
  currentStepId: string | undefined,
  runStatus: ThoughtStatus,
  baseStep?: ThoughtStep,
): ThoughtStepStatus {
  if (baseStep?.status) return baseStep.status;
  if (runStatus === 'failed' && currentStepId === stepId) return 'failed';
  if (runStatus === 'complete') return 'complete';

  const currentIndex = MENTION_TRACKING_STEP_ORDER.indexOf(
    currentStepId as MentionTrackingStepId,
  );
  if (currentIndex < 0) {
    return runStatus === 'running' && stepIndex === 0 ? 'running' : 'pending';
  }
  if (stepIndex < currentIndex) return 'complete';
  if (stepIndex === currentIndex) {
    return runStatus === 'running' || runStatus === 'pending' ? 'running' : 'complete';
  }
  return 'pending';
}

function promptsTable(prompts: ProtopipeMentionPrompt[]): ThoughtArtifact {
  const rows = prompts.map((p) => [
    TYPE_LABELS[p.promptType],
    p.text,
    p.serviceRef ?? '—',
    p.competitorRef ?? '—',
  ]);
  return table(
    'prompt-matrix',
    'Prompt matrix',
    ['Type', 'Prompt', 'Service', 'Competitor'],
    rows,
    `${prompts.length} prompt(s)`,
  );
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function classifyDomain(domain: string): MentionSourceClassification {
  const d = domain.toLowerCase();
  if (
    d.includes('google.') ||
    d.includes('yelp.') ||
    d.includes('bbb.') ||
    d.includes('angi.') ||
    d.includes('homeadvisor.') ||
    d.includes('energysage.') ||
    d.includes('solarreviews.')
  ) {
    return 'directory';
  }
  if (
    d.endsWith('.gov') ||
    d.endsWith('.edu') ||
    d.includes('hawaiianelectric.') ||
    d.includes('mauicounty.') ||
    d.includes('energy.gov')
  ) {
    return 'authority';
  }
  return 'unknown';
}

function sourceRecommendation(classification: MentionSourceClassification): string {
  switch (classification) {
    case 'directory':
      return 'Audit and strengthen the matching third-party profile with current services, location, reviews, and proof points.';
    case 'authority':
      return 'Reference this source in site content where relevant so AI can connect your business to trusted local facts.';
    case 'competitor':
      return 'Create comparison or differentiation content that explains why your business should be considered alongside this competitor.';
    case 'owned':
      return 'Keep this owned source fresh and internally linked; it is already contributing to AI visibility.';
    case 'third_party_profile':
      return 'Claim and enrich this profile so it carries accurate entity facts and review signals.';
    case 'noise':
      return 'Review whether this source is relevant; it may be distracting AI from the intended business entity.';
    case 'unknown':
    default:
      return 'Review this domain manually and decide whether it should become a citation target, profile update, or exclusion.';
  }
}

function actionForGap(
  prompt: ProtopipeMentionPrompt,
  index: number,
): MentionRecommendedAction {
  switch (prompt.promptType) {
    case 'generic':
      return {
        id: `gap-${index + 1}`,
        kind: 'create_service_page',
        priority: 'high',
        prompt: prompt.text,
        promptType: prompt.promptType,
        problem: 'The brand is absent from a generic discovery prompt.',
        likelyReason:
          'AI has category knowledge, but not enough entity evidence to recommend this business for the service.',
        recommendedFix:
          'Create or strengthen a service page with clear offer language, proof, reviews, service area, FAQs, and structured data.',
        targetSurface: 'Build Book service page + Context Card + Sharpen facts',
        expectedImpact: 'Improves discoverability for new customers who do not already know the brand.',
      };
    case 'local':
      return {
        id: `gap-${index + 1}`,
        kind: 'create_location_page',
        priority: 'high',
        prompt: prompt.text,
        promptType: prompt.promptType,
        problem: 'The brand is absent from a local discovery prompt.',
        likelyReason:
          'AI sees the market/location but lacks enough local proof connecting the business to that service area.',
        recommendedFix:
          'Build a location-specific service page and reinforce local profiles with service-area language, reviews, and citations.',
        targetSurface: 'Local service page + Google Business Profile + directory profiles',
        expectedImpact: 'Improves visibility for high-intent local buyer prompts.',
      };
    case 'comparison':
      return {
        id: `gap-${index + 1}`,
        kind: 'create_comparison_page',
        priority: 'medium',
        prompt: prompt.text,
        promptType: prompt.promptType,
        problem: 'The brand is not winning a competitor comparison prompt.',
        likelyReason:
          'AI does not have enough structured differentiation between this business and the named competitor.',
        recommendedFix:
          'Create a comparison page or FAQ that clarifies services, location, proof, licensing, and customer-fit differences.',
        targetSurface: 'Comparison page + FAQ + Context Card',
        expectedImpact: 'Improves competitive positioning when customers compare providers.',
      };
    case 'brand_defense':
    default:
      return {
        id: `gap-${index + 1}`,
        kind: 'improve_profile_listing',
        priority: 'medium',
        prompt: prompt.text,
        promptType: prompt.promptType,
        problem: 'The brand is weak or absent when users ask directly about trust/reputation.',
        likelyReason:
          'AI lacks enough review, licensing, profile, and proof signals to answer confidently.',
        recommendedFix:
          'Update site facts and third-party profiles with reviews, credentials, examples, warranty language, and trust signals.',
        targetSurface: 'Sharpen facts + Context Card + third-party profiles',
        expectedImpact: 'Improves brand-defense answers and reduces uncertainty in AI recommendations.',
      };
  }
}

export function buildMentionVisibilityReport(
  output: ProtopipeMentionTrackingOutput,
): MentionVisibilityReport {
  const resultsByPrompt = new Map<string, typeof output.results>();
  for (const result of output.results) {
    const list = resultsByPrompt.get(result.promptId) ?? [];
    list.push(result);
    resultsByPrompt.set(result.promptId, list);
  }

  const promptPerformance: MentionPromptPerformance[] = output.prompts.map((prompt) => {
    const results = resultsByPrompt.get(prompt.id) ?? [];
    const mentionedRuns = results.filter((r) => r.brandMentioned).length;
    const totalRuns = results.length;
    const mentionRate = totalRuns ? mentionedRuns / totalRuns : 0;
    const positions = results
      .map((r) => r.mentionPosition)
      .filter((p): p is number => typeof p === 'number' && Number.isFinite(p));
    const averagePosition = positions.length
      ? positions.reduce((a, b) => a + b, 0) / positions.length
      : undefined;
    const sentiments = uniqueSorted(results.map((r) => r.sentiment ?? '').filter(Boolean));
    return {
      promptId: prompt.id,
      prompt: prompt.text,
      type: prompt.promptType,
      mentionRate,
      mentionedRuns,
      totalRuns,
      averagePosition,
      sentiment: sentiments.join(', ') || '—',
      citedDomains: uniqueSorted(results.flatMap((r) => r.citedDomains)),
      citedCompetitors: uniqueSorted(results.flatMap((r) => r.citedCompetitors)),
      status: mentionRate === 1 ? 'win' : mentionRate > 0 ? 'partial' : 'gap',
    };
  });

  const totalRuns = output.results.length;
  const mentionedRuns = output.results.filter((r) => r.brandMentioned).length;
  const runMentionRate = totalRuns ? mentionedRuns / totalRuns : 0;
  const promptsWithMentions = promptPerformance.filter((p) => p.mentionedRuns > 0).length;
  const presenceRate = output.prompts.length ? promptsWithMentions / output.prompts.length : 0;
  const positions = output.results
    .filter((r) => r.brandMentioned)
    .map((r) => r.mentionPosition)
    .filter((p): p is number => typeof p === 'number' && Number.isFinite(p));
  const averageMentionPosition = positions.length
    ? positions.reduce((a, b) => a + b, 0) / positions.length
    : undefined;
  const positionScore =
    averageMentionPosition == null ? 0 : Math.max(0, (6 - Math.min(averageMentionPosition, 6)) / 5);
  const visibilityScore = Math.round(runMentionRate * 60 + presenceRate * 25 + positionScore * 15);

  const typeEntries = PROMPT_TYPES.map((type) => ({
    type,
    summary: output.summaryByType[type],
  })).filter((entry) => entry.summary);
  const bestPromptType = [...typeEntries].sort(
    (a, b) => b.summary.mentionRate - a.summary.mentionRate,
  )[0]?.type;
  const weakestPromptType = [...typeEntries].sort(
    (a, b) => a.summary.mentionRate - b.summary.mentionRate,
  )[0]?.type;
  const biggestGap =
    typeEntries.find((entry) => entry.type === 'local' && entry.summary.topGap)?.summary.topGap ??
    typeEntries.find((entry) => entry.type === 'generic' && entry.summary.topGap)?.summary.topGap ??
    typeEntries.find((entry) => entry.summary.topGap)?.summary.topGap;

  const domainCounts = new Map<string, number>();
  for (const domain of output.results.flatMap((r) => r.citedDomains)) {
    const key = domain.trim().toLowerCase();
    if (!key) continue;
    domainCounts.set(key, (domainCounts.get(key) ?? 0) + 1);
  }
  const sourceInsights = [...domainCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([domain, mentionCount]) => {
      const classification = classifyDomain(domain);
      return {
        domain,
        mentionCount,
        classification,
        recommendation: sourceRecommendation(classification),
      };
    });

  const gapPrompts = promptPerformance
    .filter((p) => p.status === 'gap')
    .map((p) => output.prompts.find((prompt) => prompt.id === p.promptId))
    .filter((p): p is ProtopipeMentionPrompt => Boolean(p));
  const recommendedActions = gapPrompts.map(actionForGap);

  const interpretation: string[] = [];
  if (weakestPromptType) {
    interpretation.push(
      `${TYPE_LABELS[weakestPromptType]} prompts are the weakest visibility area.`,
    );
  }
  if (bestPromptType) {
    interpretation.push(`${TYPE_LABELS[bestPromptType]} prompts are currently the strongest area.`);
  }
  if (
    output.summaryByType.generic?.mentionRate === 0 &&
    output.summaryByType.local?.mentionRate === 0 &&
    (output.summaryByType.brand_defense?.mentionRate ?? 0) > 0
  ) {
    interpretation.push(
      'The brand is protected when users ask directly, but it is not winning new generic or local discovery demand yet.',
    );
  }
  if (sourceInsights.length === 0) {
    interpretation.push(
      'Few citation domains were found, so source-building and profile reinforcement should be a priority.',
    );
  }

  return {
    visibilityScore,
    presenceRate,
    runMentionRate,
    averageMentionPosition,
    promptCount: output.prompts.length,
    responseCount: output.results.length,
    bestPromptType,
    weakestPromptType,
    biggestGap,
    interpretation,
    promptPerformance,
    sourceInsights,
    recommendedActions,
  };
}

function executiveBriefMarkdown(report: MentionVisibilityReport): string {
  const lines = [
    `# AI Visibility Brief`,
    '',
    `Visibility score: **${report.visibilityScore}/100**`,
    `Presence rate: **${pct(report.presenceRate)}** of prompts mention the brand at least once`,
    `Run mention rate: **${pct(report.runMentionRate)}** across ${report.responseCount} captured response(s)`,
    report.averageMentionPosition != null
      ? `Average mention position: **${report.averageMentionPosition.toFixed(1)}**`
      : `Average mention position: **—**`,
    report.bestPromptType ? `Strongest area: **${TYPE_LABELS[report.bestPromptType]}**` : '',
    report.weakestPromptType ? `Weakest area: **${TYPE_LABELS[report.weakestPromptType]}**` : '',
    report.biggestGap ? `Biggest gap: **${report.biggestGap}**` : '',
    '',
    `## What this means`,
    ...(report.interpretation.length ? report.interpretation : ['No interpretation available yet.']).map(
      (line) => `- ${line}`,
    ),
    '',
    `## Recommended next step`,
    report.recommendedActions[0]
      ? `${report.recommendedActions[0].recommendedFix}\n\nTarget surface: ${report.recommendedActions[0].targetSurface}`
      : 'Monitor the next run and keep strengthening citation sources.',
  ];
  return lines.filter((line) => line !== '').join('\n');
}

function opportunityBacklogMarkdown(report: MentionVisibilityReport): string {
  if (!report.recommendedActions.length) {
    return 'No high-priority gap actions were generated for this run. Monitor the next run for movement.';
  }
  return report.recommendedActions
    .map((action, index) =>
      [
        `## ${index + 1}. ${action.prompt}`,
        `Priority: **${action.priority.toUpperCase()}**`,
        `Action: **${action.kind}**`,
        `Problem: ${action.problem}`,
        `Likely reason: ${action.likelyReason}`,
        `Recommended fix: ${action.recommendedFix}`,
        `Target surface: ${action.targetSurface}`,
        `Expected impact: ${action.expectedImpact}`,
      ].join('\n'),
    )
    .join('\n\n');
}

function promptPerformanceTable(report: MentionVisibilityReport): ThoughtArtifact {
  const rows = report.promptPerformance.map((p) => [
    TYPE_LABELS[p.type],
    p.prompt,
    p.status,
    pct(p.mentionRate),
    `${p.mentionedRuns}/${p.totalRuns}`,
    p.averagePosition != null ? p.averagePosition.toFixed(1) : '—',
    p.sentiment,
    p.citedDomains.join(', ') || '—',
    p.citedCompetitors.join(', ') || '—',
  ]);
  return table(
    'prompt-performance',
    'Prompt performance matrix',
    ['Type', 'Prompt', 'Status', 'Mention rate', 'Runs', 'Avg position', 'Sentiment', 'Domains', 'Competitors'],
    rows,
    `${report.promptPerformance.length} prompt(s) scored`,
  );
}

function sourceMapTable(report: MentionVisibilityReport): ThoughtArtifact {
  const rows = report.sourceInsights.map((source) => [
    source.domain,
    source.classification.replace(/_/g, ' '),
    String(source.mentionCount),
    source.recommendation,
  ]);
  return table(
    'source-map',
    'Citation and source map',
    ['Domain', 'Classification', 'Mentions', 'Recommendation'],
    rows.length ? rows : [['—', '—', '0', 'No cited domains found in this run.']],
    rows.length ? `${rows.length} cited domain(s)` : 'No cited domains found',
  );
}

function reportArtifacts(output: ProtopipeMentionTrackingOutput): ThoughtArtifact[] {
  const report = buildMentionVisibilityReport(output);
  return [
    {
      id: 'visibility-brief',
      label: 'AI visibility brief',
      kind: 'markdown',
      summary: `${report.visibilityScore}/100 visibility score · ${pct(report.presenceRate)} presence`,
      data: executiveBriefMarkdown(report),
    },
    {
      id: 'opportunity-backlog',
      label: 'Opportunity backlog',
      kind: 'markdown',
      summary: `${report.recommendedActions.length} recommended action(s)`,
      data: opportunityBacklogMarkdown(report),
    },
    promptPerformanceTable(report),
    sourceMapTable(report),
    json('visibility-report', 'AI visibility report data', report, 'Derived report model'),
  ];
}

function outputPorts(output: ProtopipeMentionTrackingOutput): Thought['outputs'] {
  return [
    {
      portId: 'snapshot',
      label: 'Mention snapshot',
      artifact: json('snapshot-out', 'Mention snapshot', output),
    },
    ...reportArtifacts(output).map((artifact) => ({
      portId: artifact.id,
      label: artifact.label,
      artifact,
    })),
  ];
}

function capturesMarkdown(
  output: ProtopipeMentionTrackingOutput,
): ThoughtArtifact {
  const sections: string[] = [];

  for (const prompt of output.prompts) {
    const captures = output.captures
      .filter((c) => c.promptId === prompt.id)
      .sort((a, b) => a.runIndex - b.runIndex);
    if (!captures.length) continue;

    sections.push(`## ${TYPE_LABELS[prompt.promptType]} · ${prompt.text}`);
    for (const capture of captures) {
      sections.push(`### ${runLabel(capture.runIndex)} (${capture.engine})`);
      sections.push(capture.rawResponse.trim() || '—');
    }
    sections.push('');
  }

  return {
    id: 'gemini-captures',
    label: 'Gemini raw responses',
    kind: 'markdown',
    summary: `${output.captures.length} capture(s) across ${output.prompts.length} prompt(s)`,
    data: sections.join('\n'),
  };
}

function parseResultsTable(output: ProtopipeMentionTrackingOutput): ThoughtArtifact {
  const promptById = new Map(output.prompts.map((p) => [p.id, p]));
  const rows = output.results.map((r) => {
    const prompt = promptById.get(r.promptId);
    return [
      prompt ? TYPE_LABELS[prompt.promptType] : '—',
      prompt?.text ?? r.promptId,
      runLabel(r.runIndex),
      r.brandMentioned ? 'Yes' : 'No',
      r.mentionPosition != null ? String(r.mentionPosition) : '—',
      r.sentiment ?? '—',
      r.citedDomains.join(', ') || '—',
      r.citedCompetitors.join(', ') || '—',
    ];
  });

  return table(
    'parse-results',
    'Parsed mention results',
    ['Type', 'Prompt', 'Run', 'Mentioned', 'Position', 'Sentiment', 'Domains', 'Competitors'],
    rows,
    `${output.results.length} parsed response(s)`,
  );
}

function summaryByTypeTable(output: ProtopipeMentionTrackingOutput): ThoughtArtifact {
  const rows = PROMPT_TYPES.map((type) => {
    const summary = output.summaryByType[type];
    if (!summary) return [TYPE_LABELS[type], '—', '—', '—', '—'];
    return [
      TYPE_LABELS[type],
      String(summary.promptCount),
      pct(summary.mentionRate),
      pct(summary.consistencyScore),
      summary.topGap ?? '—',
    ];
  });

  return table(
    'summary-by-type',
    'Visibility by prompt type',
    ['Type', 'Prompts', 'Mention rate', 'Consistency', 'Top gap'],
    rows,
    'Sampled estimate — Gemini only',
  );
}

function stepOutput(
  stepId: MentionTrackingStepId,
  output: ProtopipeMentionTrackingOutput | null,
): ThoughtArtifact[] {
  if (!output) return [];

  switch (stepId) {
    case 'generate_prompts':
      return output.prompts.length ? [promptsTable(output.prompts)] : [];
    case 'capture_responses':
      return output.captures.length ? [capturesMarkdown(output)] : [];
    case 'parse_mentions':
      return output.results.length ? [parseResultsTable(output)] : [];
    case 'aggregate':
      return output.summaryByType
        ? [summaryByTypeTable(output), ...reportArtifacts(output)]
        : reportArtifacts(output);
    case 'finalize':
      return [
        json('mention-output', 'Mention tracking output', output, 'Full run payload'),
        text(
          'disclaimer',
          'Methodology',
          'Sampled estimate from Gemini v1. Prompts run twice per check for consistency. Not user session data or Google AI Overviews.',
        ),
      ];
    default:
      return [];
  }
}

function buildSteps(input: {
  output: ProtopipeMentionTrackingOutput | null;
  currentStepId?: string;
  runStatus: ThoughtStatus;
  baseSteps?: ThoughtStep[];
}): ThoughtStep[] {
  const baseById = new Map((input.baseSteps ?? []).map((s) => [s.id, s]));

  return MENTION_TRACKING_STEP_ORDER.map((stepId, index) => {
    const meta = STEP_META[stepId];
    const base = baseById.get(stepId);
    const status = inferStepStatus(
      stepId,
      index,
      input.currentStepId,
      input.runStatus,
      base,
    );
    const artifacts = stepOutput(stepId, input.output);

    return {
      id: stepId,
      label: meta.label,
      summary: base?.summary ?? meta.summary,
      description: base?.description,
      status,
      startedAt: base?.startedAt,
      finishedAt: base?.finishedAt,
      durationMs: base?.durationMs,
      attempt: base?.attempt ?? 1,
      events: base?.events ?? [],
      costUsd: base?.costUsd,
      error: base?.error,
      output: artifacts.length ? artifacts : base?.output,
    } satisfies ThoughtStep;
  });
}

/** Project a compat snapshot onto the Thought model. */
export function mentionSnapshotToThought(snapshot: ProtopipeSiteMentionSnapshot): Thought {
  const output = extractMentionOutput(snapshot);
  const runStatus = mapSnapshotStatus(snapshot.status);
  const steps = buildSteps({
    output,
    currentStepId: snapshot.currentStep,
    runStatus,
  });

  const mentionedRuns = output?.results.filter((r) => r.brandMentioned).length ?? 0;
  const totalRuns = output?.results.length ?? 0;
  const mentionRate =
    totalRuns > 0 ? Math.round((mentionedRuns / totalRuns) * 100) : null;

  return {
    id: snapshot.id,
    thinkerKind: 'mention_tracking',
    title: 'AI Mentions tracking',
    summary:
      output && mentionRate != null
        ? `${output.prompts.length} prompts · ${mentionRate}% mention rate · Gemini sampled estimate`
        : 'AI visibility check across Gemini',
    status: runStatus,
    currentStepId: snapshot.currentStep,
    steps,
    inputs: [],
    outputs: output ? outputPorts(output) : [],
    startedAt: snapshot.createdAt,
    finishedAt: snapshot.status === 'complete' ? snapshot.updatedAt : undefined,
    totalCostUsd: snapshot.costUsd,
  } satisfies Thought;
}

/** Enrich a Shire Thought with mention-tracking step artifacts for runbook export. */
export function mentionTrackingToThought(base: Thought): Thought {
  const output = extractMentionOutput(base);
  const steps = buildSteps({
    output,
    currentStepId: base.currentStepId,
    runStatus: base.status,
    baseSteps: base.steps,
  });

  const mentionedRuns = output?.results.filter((r) => r.brandMentioned).length ?? 0;
  const totalRuns = output?.results.length ?? 0;
  const mentionRate =
    totalRuns > 0 ? Math.round((mentionedRuns / totalRuns) * 100) : null;

  return {
    ...base,
    thinkerKind: 'mention_tracking',
    title: base.title?.trim() ? base.title : 'AI Mentions tracking',
    summary:
      output && mentionRate != null
        ? `${output.prompts.length} prompts · ${mentionRate}% mention rate · Gemini sampled estimate`
        : base.summary,
    steps,
    outputs: output
      ? [
          ...base.outputs.filter(
            (port) =>
              ![
                'visibility-brief',
                'opportunity-backlog',
                'prompt-performance',
                'source-map',
                'visibility-report',
              ].includes(port.portId),
          ),
          ...outputPorts(output).filter(
            (port) => port.portId !== 'snapshot' || !base.outputs.some((p) => p.portId === 'snapshot'),
          ),
        ]
      : base.outputs,
    totalCostUsd: base.totalCostUsd ?? sumCosts(steps.map((s) => s.costUsd)),
  } satisfies Thought;
}

/** Accept either a Shire Thought or compat snapshot. */
export function mentionTrackingRunToThought(
  source: Thought | ProtopipeSiteMentionSnapshot,
): Thought {
  if ('siteId' in source && 'version' in source) {
    return mentionSnapshotToThought(source);
  }
  return mentionTrackingToThought(source);
}
