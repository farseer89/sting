/** Block ids that cannot be removed from a baseline page stack. */
export const PINNED_BASELINE_BLOCK_IDS = new Set([
  'wri-baseline-hero-life-proof',
  'wri-baseline-contract-bar',
  'sparky-baseline-hero-callout',
  'wilco-baseline-hero-split',
  'hil-baseline-hero-canopy',
]);

export function isPinnedBaselineBlockId(blockId: string): boolean {
  return PINNED_BASELINE_BLOCK_IDS.has(blockId);
}
