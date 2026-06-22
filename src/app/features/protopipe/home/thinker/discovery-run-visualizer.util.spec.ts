import { describe, expect, it } from 'vitest';
import {
  buildDiscoveryResultView,
  buildDiscoveryStepVisualizer,
} from './discovery-run-visualizer.util';
import { DISCOVERY_RESULT_STEP_ID } from '../../lab/keyword-discovery/discovery-run-to-thought';
import { FIXTURE_READY } from '../../lab/keyword-discovery/keyword-discovery.mock';

describe('discovery-run-visualizer.util', () => {
  it('buildDiscoveryResultView exposes result tabs from artifacts', () => {
    const view = buildDiscoveryResultView(FIXTURE_READY as never);
    expect(view.tabs?.map((tab) => tab.id)).toEqual(['keywords', 'audiences', 'context', 'sources']);
    expect(view.tabs?.find((tab) => tab.id === 'keywords')?.blocks.length).toBeGreaterThan(0);
    expect(view.tabs?.find((tab) => tab.id === 'audiences')?.blocks.length).toBeGreaterThan(0);
  });

  it('buildDiscoveryStepVisualizer returns tabbed result view for discovery_result', () => {
    const view = buildDiscoveryStepVisualizer(
      FIXTURE_READY as never,
      DISCOVERY_RESULT_STEP_ID,
      'done',
    );
    expect(view.tabs?.length).toBe(4);
    expect(view.defaultTabId).toBe('keywords');
  });
});
