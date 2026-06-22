import { describe, expect, it } from 'vitest';
import {
  DISCOVERY_RESULT_STEP_ID,
  discoveryRunToThought,
  resolveDiscoveryNavStepId,
} from './discovery-run-to-thought';
import { FIXTURE_MID, FIXTURE_READY } from './keyword-discovery.mock';

describe('discoveryRunToThought', () => {
  it('focuses discovery_result when the run is ready', () => {
    const thought = discoveryRunToThought(FIXTURE_READY);
    expect(thought.currentStepId).toBe(DISCOVERY_RESULT_STEP_ID);
  });

  it('focuses the active nav phase while discovering', () => {
    const thought = discoveryRunToThought(FIXTURE_MID);
    expect(thought.currentStepId).toBe('discovery:audience');
    expect(resolveDiscoveryNavStepId(FIXTURE_MID)).toBe('discovery:audience');
  });

  it('maps ready runs to complete status', () => {
    const thought = discoveryRunToThought(FIXTURE_READY);
    expect(thought.status).toBe('complete');
    expect(thought.thinkerKind).toBe('keyword-discovery');
  });
});
