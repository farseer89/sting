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
      sections.push(`### Run ${capture.runIndex + 1} (${capture.engine})`);
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
      `Run ${r.runIndex + 1}`,
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
      return output.summaryByType ? [summaryByTypeTable(output)] : [];
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
    outputs: output
      ? [
          {
            portId: 'snapshot',
            label: 'Mention snapshot',
            artifact: json('snapshot-out', 'Mention snapshot', output),
          },
        ]
      : [],
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
    outputs:
      output && !base.outputs?.length
        ? [
            {
              portId: 'snapshot',
              label: 'Mention snapshot',
              artifact: json('snapshot-out', 'Mention snapshot', output),
            },
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
