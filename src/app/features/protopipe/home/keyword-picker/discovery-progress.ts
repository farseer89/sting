import type {
  ProtopipeDiscoveryCurrentStep,
  ProtopipeDiscoveryStep,
  ProtopipeKeywordDiscoveryRunDto,
} from '@hive/contracts';

/** Customer-facing pipeline order (excludes terminal `confirm` and sparse-only skips). */
export const DISCOVERY_PIPELINE_STEPS: ProtopipeDiscoveryStep[] = [
  'load_profile',
  'fetch_ranked',
  'spyfu_gaps',
  'resolve_discovery_seeds',
  'expand_keyword_pool',
  'geo_expansion',
  'merge_score',
  'serp_enrichment',
  'infer_avatars',
];

export function discoveryStepLabel(step: ProtopipeDiscoveryCurrentStep): string {
  switch (step) {
    case 'load_profile':
      return 'Loading your business profile…';
    case 'fetch_gsc':
      return 'Reading Search Console…';
    case 'fetch_site_snapshot':
      return 'Reading your homepage…';
    case 'fetch_ranked':
      return 'Checking what you already rank for…';
    case 'spyfu_gaps':
      return 'Scanning competitor gaps…';
    case 'resolve_discovery_seeds':
      return 'Resolving keyword seeds…';
    case 'expand_keyword_pool':
      return 'Expanding keyword ideas…';
    case 'geo_expansion':
      return 'Expanding local terms…';
    case 'merge_score':
      return 'Scoring opportunities…';
    case 'serp_enrichment':
      return 'Analyzing search results…';
    case 'infer_avatars':
      return 'Matching your audiences…';
    case 'confirm':
      return 'Almost ready…';
    default:
      return 'Discovering keywords…';
  }
}

/**
 * Progress 0–100 for the keyword-picker bar. Uses completed step events when
 * available, otherwise estimates from the current step index.
 */
export function discoveryProgressPercent(run: ProtopipeKeywordDiscoveryRunDto): number {
  if (run.status === 'ready' || run.status === 'confirmed' || run.currentStep === 'confirm') {
    return 100;
  }

  const completed = new Set(
    run.events
      .filter((e) => e.status === 'completed')
      .map((e) => e.step)
      .filter((step): step is ProtopipeDiscoveryStep =>
        (DISCOVERY_PIPELINE_STEPS as readonly string[]).includes(step),
      ),
  );

  if (completed.size > 0) {
    const done = DISCOVERY_PIPELINE_STEPS.filter((s) => completed.has(s)).length;
    const base = Math.round((done / DISCOVERY_PIPELINE_STEPS.length) * 100);
    const currentIdx = DISCOVERY_PIPELINE_STEPS.indexOf(run.currentStep as ProtopipeDiscoveryStep);
    if (currentIdx >= 0 && !completed.has(DISCOVERY_PIPELINE_STEPS[currentIdx])) {
      return Math.min(95, base + Math.round(50 / DISCOVERY_PIPELINE_STEPS.length));
    }
    return Math.min(95, base);
  }

  const idx = DISCOVERY_PIPELINE_STEPS.indexOf(run.currentStep as ProtopipeDiscoveryStep);
  if (idx < 0) return 8;
  return Math.min(
    95,
    Math.round(((idx + 0.5) / DISCOVERY_PIPELINE_STEPS.length) * 100),
  );
}
