import { describe, expect, it } from 'vitest';
import type { ProtopipeKeywordDiscoveryRunDto } from '@hive/contracts';
import {
  DISCOVERY_RESULT_STEP_ID,
  mapDiscoveryNavPhases,
  mapDiscoveryResultNavStep,
  resolveDiscoveryBinderNavStepId,
} from './discovery-binder.util';
import { mapThoughtStep } from './thinker-binder.mapper';
import { discoveryRunToThought } from '../../lab/keyword-discovery/discovery-run-to-thought';
import { FIXTURE_MID, FIXTURE_READY } from '../../lab/keyword-discovery/keyword-discovery.mock';

function mappedSteps(run: ProtopipeKeywordDiscoveryRunDto) {
  const thought = discoveryRunToThought(run as never);
  return thought.steps.map((step, index) => mapThoughtStep(step, index));
}

describe('discovery-binder.util', () => {
  it('maps grouped nav phases from fixture events', () => {
    const phases = mapDiscoveryNavPhases(FIXTURE_MID as never, mappedSteps(FIXTURE_MID as never));
    expect(phases).toHaveLength(3);
    expect(phases[0].id).toBe('discovery:market');
    expect(phases[0].status).toBe('done');
    expect(phases[2].status).toBe('running');
  });

  it('resolves discovery_result when the run is ready', () => {
    expect(resolveDiscoveryBinderNavStepId(FIXTURE_READY as never)).toBe(DISCOVERY_RESULT_STEP_ID);
    const result = mapDiscoveryResultNavStep(FIXTURE_READY as never, mappedSteps(FIXTURE_READY as never));
    expect(result.id).toBe(DISCOVERY_RESULT_STEP_ID);
    expect(result.status).toBe('done');
  });
});
