/**
 * A Thought is one run of a Thinker (an agentic process). It carries both
 * debug-grade data (events, raw artifacts, error stacks) and human-friendly
 * fields (summary, output previews) so the customer-facing "muted" rendering is
 * a presentation flag over the same model rather than a second data shape.
 */

export type ThoughtStatus =
  | 'idle'
  | 'pending'
  | 'running'
  | 'complete'
  | 'failed'
  | 'cancelled';

export type ThoughtStepStatus =
  | 'pending'
  | 'running'
  | 'complete'
  | 'failed'
  | 'skipped';

export type ThoughtArtifactKind = 'json' | 'markdown' | 'table' | 'metric' | 'text' | 'image';

export type ThoughtEventLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ThoughtArtifact {
  id: string;
  label: string;
  kind: ThoughtArtifactKind;
  /** Shape depends on `kind` — see the artifact card renderer. */
  data: unknown;
  /** One-line human summary, surfaced in customer mode. */
  summary?: string;
}

export interface ThoughtEvent {
  at: string;
  level: ThoughtEventLevel;
  message: string;
  data?: unknown;
}

export interface ThoughtStepError {
  message: string;
  stack?: string;
  /** The input that triggered the failure, for fast troubleshooting. */
  offendingInput?: ThoughtArtifact;
}

export interface ThoughtStep {
  id: string;
  label: string;
  /** Friendly one-liner for customer mode. */
  summary?: string;
  description?: string;
  status: ThoughtStepStatus;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  /** Attempt count; > 1 means this step was rerun. */
  attempt: number;
  input?: ThoughtArtifact[];
  output?: ThoughtArtifact[];
  /** Prior output retained when a step is rerun, to power the diff view. */
  previousOutput?: ThoughtArtifact[];
  events: ThoughtEvent[];
  error?: ThoughtStepError;
  promptVersion?: string;
  /** Estimated API + LLM cost for this step (USD). */
  costUsd?: number;
}

/** A typed connection point carrying an artifact between Thoughts. */
export interface PortValue {
  portId: string;
  label: string;
  artifact?: ThoughtArtifact;
}

export interface Thought {
  id: string;
  thinkerKind: string;
  title: string;
  summary?: string;
  status: ThoughtStatus;
  currentStepId?: string;
  steps: ThoughtStep[];
  inputs: PortValue[];
  outputs: PortValue[];
  startedAt?: string;
  finishedAt?: string;
  /** Sum of step costs when known (USD). */
  totalCostUsd?: number;
}
