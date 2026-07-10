import type { Thought as ShireThought } from '@hive/contracts';
import type { Thought } from '../lab/thinker/thought.model';

/** Map Shire contract Thought onto the Sting Thinker UI model. */
export function shireThoughtToUi(thought: ShireThought): Thought {
  return {
    ...thought,
    steps: thought.steps.map((step) => ({
      ...step,
      events: step.events ?? [],
    })),
    inputs: thought.inputs ?? [],
    outputs: thought.outputs ?? [],
    artifacts: thought.artifacts ?? {},
  };
}
