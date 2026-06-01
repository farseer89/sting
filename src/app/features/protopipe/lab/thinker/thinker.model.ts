/**
 * A Thinker is a reusable agentic *process definition* (e.g. Research, Writer,
 * UI Builder). It declares typed input/output ports and the steps it works
 * through. Running a Thinker produces a Thought (see thought.model.ts); wiring
 * Thinkers output->input forms a Train of Thought (see train.model.ts).
 */

import type { ThoughtArtifactKind } from './thought.model';

export interface PortSpec {
  id: string;
  label: string;
  artifactKind: ThoughtArtifactKind;
}

export interface StepSpec {
  id: string;
  label: string;
  description?: string;
}

export interface Thinker {
  kind: string;
  label: string;
  description?: string;
  /** void-icon id (without the `void-icon-` prefix). */
  icon?: string;
  inputs: PortSpec[];
  outputs: PortSpec[];
  stepSpecs: StepSpec[];
}
