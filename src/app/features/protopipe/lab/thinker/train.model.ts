/**
 * A Train of Thought is a directed graph of Thoughts wired output-port ->
 * input-port: a multi-agent system / pipeline (e.g. Research -> Writer -> UI
 * Builder). Nodes hold a Thought instance; edges describe data flow.
 */

import type { Thought } from './thought.model';

export interface ThoughtNode {
  id: string;
  thinkerKind: string;
  thought?: Thought;
  /** Pixel position of the node's top-left within the train canvas. */
  position: { x: number; y: number };
}

export interface ThoughtEdge {
  id: string;
  fromNode: string;
  fromPort: string;
  toNode: string;
  toPort: string;
  /** Optional label rendered on the wire (e.g. the artifact name). */
  label?: string;
}

export interface TrainOfThought {
  id: string;
  title: string;
  nodes: ThoughtNode[];
  edges: ThoughtEdge[];
}
