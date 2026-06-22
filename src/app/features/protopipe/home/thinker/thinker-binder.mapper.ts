import type { ThoughtArtifact, ThoughtEvent, ThoughtStep, ThoughtStepStatus } from '../../lab/thinker/thought.model';

export type BinderStepStatus = 'done' | 'running' | 'pending' | 'failed';

export interface BinderStepView {
  id: string;
  num: string;
  label: string;
  status: BinderStepStatus;
  durationMs?: number;
  costUsd?: number;
  summary?: string;
  inputArtifact?: { label: string; kind: string; preview: string };
  outputArtifact?: { label: string; kind: string; preview: string };
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

export function mapThoughtStep(step: ThoughtStep, index: number): BinderStepView {
  return {
    id: step.id,
    num: String(index + 1).padStart(2, '0'),
    label: step.label,
    status: mapStepStatus(step.status),
    durationMs: step.durationMs,
    costUsd: step.costUsd,
    summary: step.summary ?? step.description,
    inputArtifact: mapArtifact(step.input?.[0]),
    outputArtifact: mapArtifact(step.output?.[0]),
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
      return 'running';
    case 'complete':
      return 'done';
    case 'failed':
      return 'failed';
    default:
      return 'pending';
  }
}
