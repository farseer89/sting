import { describe, expect, it } from 'vitest';
import { shireThoughtToUi } from './shire-thought.adapter';
import type { Thought as ShireThought } from '@hive/contracts';

describe('shireThoughtToUi', () => {
  it('normalizes step events for the Thinker UI model', () => {
    const input: ShireThought = {
      id: 'run-1',
      thinkerKind: 'keyword_discovery',
      title: 'Discovery',
      status: 'running',
      steps: [
        {
          id: 'load_profile',
          label: 'Load profile',
          status: 'complete',
          attempt: 1,
          events: undefined as unknown as [],
        },
      ],
      inputs: [],
      outputs: [],
    };

    const ui = shireThoughtToUi(input);
    expect(ui.steps[0].events).toEqual([]);
  });
});
