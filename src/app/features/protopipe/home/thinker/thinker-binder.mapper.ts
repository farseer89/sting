import type { ThoughtArtifact, ThoughtEvent, ThoughtStep, ThoughtStepStatus } from '../../lab/thinker/thought.model';

export type BinderStepStatus = 'done' | 'running' | 'pending' | 'failed';

export interface BinderArtifactView {
  id: string;
  label: string;
  kind: string;
  summary?: string;
  preview: string;
}

export interface BinderStepView {
  id: string;
  num: string;
  label: string;
  status: BinderStepStatus;
  durationMs?: number;
  costUsd?: number;
  summary?: string;
  /** One-line takeaway from this step's primary output. */
  conclusion?: string;
  inputs: BinderArtifactView[];
  outputs: BinderArtifactView[];
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

function artifactPreview(artifact: ThoughtArtifact): string {
  if (typeof artifact.data === 'string') return artifact.data;
  try {
    return JSON.stringify(artifact.data, null, 2);
  } catch {
    return String(artifact.data);
  }
}

function mapArtifact(artifact: ThoughtArtifact): BinderArtifactView {
  return {
    id: artifact.id,
    label: artifact.label,
    kind: artifact.kind,
    summary: artifact.summary,
    preview: artifactPreview(artifact),
  };
}

function stepConclusion(step: ThoughtStep, outputs: BinderArtifactView[]): string | undefined {
  if (outputs[0]?.summary?.trim()) return outputs[0].summary.trim();
  if (step.summary?.trim()) return step.summary.trim();
  const preview = outputs[0]?.preview.trim();
  if (!preview) return undefined;
  const oneLine = preview.replace(/\s+/g, ' ');
  return oneLine.length > 140 ? `${oneLine.slice(0, 137)}…` : oneLine;
}

function mapEvents(events: ThoughtEvent[]): BinderStepView['events'] {
  return events.map((e) => ({
    at: formatEventTime(e.at),
    level: e.level,
    msg: e.message,
  }));
}

export function mapThoughtStep(step: ThoughtStep, index: number): BinderStepView {
  const inputs = (step.input ?? []).map(mapArtifact);
  const outputs = (step.output ?? []).map(mapArtifact);

  return {
    id: step.id,
    num: String(index + 1).padStart(2, '0'),
    label: step.label,
    status: mapStepStatus(step.status),
    durationMs: step.durationMs,
    costUsd: step.costUsd,
    summary: step.summary ?? step.description,
    conclusion: stepConclusion(step, outputs),
    inputs,
    outputs,
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
        inputs: inputs.map((a) => ({ id: a.id, label: a.label, summary: a.summary ?? null })),
        outputs: outputs.map((a) => ({ id: a.id, label: a.label, summary: a.summary ?? null })),
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
