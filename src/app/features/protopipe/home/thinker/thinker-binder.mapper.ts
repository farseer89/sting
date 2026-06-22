import type { ThoughtArtifact, ThoughtEvent, ThoughtLlmCall, ThoughtStep, ThoughtStepStatus } from '../../lab/thinker/thought.model';
import { CONTENT_PLAN_LLM_STEPS } from '../../lab/content-plan/content-plan-run-to-thought';

export type BinderStepStatus = 'done' | 'running' | 'pending' | 'failed';

export interface BinderSubStepView {
  id: string;
  num: string;
  label: string;
  detail?: string;
  status: BinderStepStatus;
  at?: string;
  isLlm?: boolean;
  costUsd?: number;
}

export interface BinderLlmCallView {
  id: string;
  label: string;
  callId: string;
  promptVersion?: string;
  model?: string;
  system: string;
  user: string;
  response: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  durationMs?: number;
  tokenSummary?: string;
}

export interface BinderStepView {
  id: string;
  num: string;
  label: string;
  status: BinderStepStatus;
  durationMs?: number;
  costUsd?: number;
  /** What this step does (stable prose). */
  description?: string;
  /** Outcome line when the step has run. */
  summary?: string;
  /** True when this step invokes an LLM (even before traces are persisted). */
  isLlmStep?: boolean;
  llmCalls: BinderLlmCallView[];
  inputArtifact?: { label: string; kind: string; preview: string };
  outputArtifact?: { label: string; kind: string; preview: string };
  subSteps: BinderSubStepView[];
  events: { at: string; level: string; msg: string }[];
  rawJson: string;
}

export function mapStepStatus(status: ThoughtStepStatus): BinderStepStatus {
  switch (status) {
    case 'complete':
    case 'skipped':
      return 'done';
    case 'running':
      return 'running';
    case 'failed':
      return 'failed';
    default:
      return 'pending';
  }
}

function formatEventTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

function artifactPreview(artifact: ThoughtArtifact | undefined): string {
  if (!artifact) return '';
  if (typeof artifact.data === 'string') return artifact.data;
  try {
    return JSON.stringify(artifact.data, null, 2);
  } catch {
    return String(artifact.data);
  }
}

function mapArtifact(artifact: ThoughtArtifact | undefined): BinderStepView['inputArtifact'] {
  if (!artifact) return undefined;
  return {
    label: artifact.label,
    kind: artifact.kind,
    preview: artifactPreview(artifact),
  };
}

function mapEvents(events: ThoughtEvent[]): BinderStepView['events'] {
  return events.map((e) => ({
    at: formatEventTime(e.at),
    level: e.level,
    msg: e.message,
  }));
}

function subStepLabel(message: string): string {
  const parts = message.split(' — ');
  if (parts.length > 1 && parts[1]?.trim()) return parts[1].trim();
  return parts[0]?.trim() || message;
}

function subStepStatus(
  event: ThoughtEvent,
  index: number,
  total: number,
  parentStatus: BinderStepStatus,
): BinderStepStatus {
  if (event.level === 'error') return 'failed';

  const head = event.message.split(' — ')[0]?.trim().toLowerCase() ?? '';
  if (head.includes('failed')) return 'failed';
  if (head.includes('started') && index === total - 1 && parentStatus === 'running') return 'running';
  if (head.includes('started') && index === total - 1 && parentStatus === 'pending') return 'pending';
  if (parentStatus === 'pending') return 'pending';
  return 'done';
}

function mapLlmCalls(calls: ThoughtLlmCall[] | undefined): BinderLlmCallView[] {
  return (calls ?? []).map((call) => ({
    id: call.id,
    label: call.label,
    callId: call.callId,
    promptVersion: call.promptVersion,
    model: call.model,
    system: call.system,
    user: call.user,
    response: call.response,
    inputTokens: call.inputTokens,
    outputTokens: call.outputTokens,
    costUsd: call.costUsd,
    durationMs: call.durationMs,
    tokenSummary:
      call.inputTokens != null || call.outputTokens != null
        ? `${call.inputTokens ?? '?'} in · ${call.outputTokens ?? '?'} out`
        : undefined,
  }));
}

function llmTokenSummary(call: ThoughtLlmCall): string | undefined {
  if (call.inputTokens == null && call.outputTokens == null) return undefined;
  return `${call.inputTokens ?? '?'} in · ${call.outputTokens ?? '?'} out`;
}

function mapSubSteps(step: ThoughtStep, parentStatus: BinderStepStatus): BinderSubStepView[] {
  const base = step.subSteps?.length
    ? step.subSteps.map((sub, index) => ({
        id: sub.id,
        num: String(index + 1).padStart(2, '0'),
        label: sub.label,
        detail: sub.detail,
        status: mapStepStatus(sub.status),
        isLlm: sub.isLlm,
        costUsd: sub.costUsd,
      }))
    : step.events.map((event, index) => ({
        id: `${index}:${event.at}`,
        num: String(index + 1).padStart(2, '0'),
        label: subStepLabel(event.message),
        status: subStepStatus(event, index, step.events.length, parentStatus),
        at: formatEventTime(event.at),
      }));

  if ((step.llmCalls?.length ?? 0) > 0 && !step.subSteps?.some((s) => s.isLlm)) {
    const llmRows: BinderSubStepView[] = (step.llmCalls ?? []).map((call, index) => ({
      id: call.id,
      num: String(base.length + index + 1).padStart(2, '0'),
      label: call.label,
      detail: call.model
        ? `${call.model}${llmTokenSummary(call) ? ` · ${llmTokenSummary(call)}` : ''}`
        : llmTokenSummary(call),
      status: 'done' as BinderStepStatus,
      isLlm: true,
    }));
    return [...base, ...llmRows];
  }

  return base;
}

function isLlmPipelineStep(step: ThoughtStep): boolean {
  if ((step.llmCalls?.length ?? 0) > 0) return true;
  if ((CONTENT_PLAN_LLM_STEPS as Set<string>).has(step.id)) return true;
  if (step.promptVersion) return true;
  return [
    'analyse_competition',
    'content_plan',
    'build_brief',
    'outline',
    'draft',
    'draft_faq',
    'review',
    'metadata',
    'cognitive_pass',
  ].includes(step.id);
}

export function mapThoughtStep(step: ThoughtStep, index: number): BinderStepView {
  const status = mapStepStatus(step.status);

  return {
    id: step.id,
    num: String(index + 1).padStart(2, '0'),
    label: step.label,
    status,
    durationMs: step.durationMs,
    costUsd: step.costUsd,
    summary: step.summary,
    description: step.description,
    isLlmStep: isLlmPipelineStep(step),
    llmCalls: mapLlmCalls(step.llmCalls),
    inputArtifact: mapArtifact(step.input?.[0]),
    outputArtifact: mapArtifact(step.output?.[0]),
    subSteps: mapSubSteps(step, status),
    events: mapEvents(step.events),
    rawJson: JSON.stringify(
      {
        id: step.id,
        label: step.label,
        status: step.status,
        durationMs: step.durationMs ?? null,
        costUsd: step.costUsd ?? null,
        attempt: step.attempt,
        error: step.error ?? null,
      },
      null,
      2,
    ),
  };
}

export function runStatusLabel(status: string | undefined): string {
  switch (status) {
    case 'pending':
      return 'Queued';
    case 'running':
      return 'Running';
    case 'complete':
      return 'Complete';
    case 'discovering':
      return 'Running';
    case 'ready':
      return 'Ready';
    case 'confirmed':
      return 'Confirmed';
    case 'failed':
      return 'Failed';
    default:
      return status ?? 'Idle';
  }
}

export function runStatusClass(status: string | undefined): string {
  switch (status) {
    case 'running':
    case 'pending':
    case 'discovering':
      return 'running';
    case 'complete':
    case 'ready':
    case 'confirmed':
      return 'done';
    case 'failed':
      return 'failed';
    default:
      return 'pending';
  }
}
