import type { BuildBookOption } from './build-book.types';

/** Approved baseline fold layouts — one entry per templatized fold block in the library. */
export const BASELINE_APPROVED_FOLD_LAYOUT_IDS = [
  'wri-baseline-contract-bar',
  'sparky-baseline-trust-stats',
  'wilco-baseline-stats-band',
  'wilco-baseline-trusted-by',
] as const;

export type BaselineApprovedFoldLayoutId = (typeof BASELINE_APPROVED_FOLD_LAYOUT_IDS)[number];

/** Maps baseline fold block catalog ids to their approved library layout id. */
export const BASELINE_FOLD_BLOCK_TO_APPROVED_LAYOUT: Record<string, BaselineApprovedFoldLayoutId> = {
  'wri-baseline-contract-bar': 'wri-baseline-contract-bar',
  'sparky-baseline-trust-stats': 'sparky-baseline-trust-stats',
  'wilco-baseline-stats-band': 'wilco-baseline-stats-band',
  'wilco-baseline-trusted-by': 'wilco-baseline-trusted-by',
};

export const BASELINE_APPROVED_FOLD_LIBRARY: BuildBookOption[] = [
  {
    id: 'wri-baseline-contract-bar',
    label: 'Contract credibility bar',
    desc: 'Approved WRI contract proof bar — stats and sector labels directly below the hero.',
    componentId: 'baseline-wri-contract-bar',
    layout: 'contract-bar',
    tag: 'Approved baseline',
    demo: {
      brand: 'wri',
      catalog: 'fold',
      labId: 'contract-bar',
      astroUnit: 'components/wri/fold/WriFoldContractBar.astro',
    },
  },
  {
    id: 'sparky-baseline-trust-stats',
    label: 'Trust + stats strip',
    desc: 'Approved Sparky credential bar and stat band immediately below the hero.',
    componentId: 'baseline-sparky-trust-stats',
    layout: 'stats',
    tag: 'Approved baseline',
    demo: {
      brand: 'sparky',
      catalog: 'fold',
      labId: 'trust-stats',
      astroUnit: 'components/sparky/fold/SparkyFoldTrustStats.astro',
    },
  },
  {
    id: 'wilco-baseline-stats-band',
    label: 'Stats band',
    desc: 'Approved Wilco four-stat credibility strip below the hero.',
    componentId: 'baseline-wilco-stats-band',
    layout: 'stats',
    tag: 'Approved baseline',
    demo: {
      brand: 'consult',
      catalog: 'fold',
      labId: 'stats-band',
      astroUnit: '@client-sites/theme/components/landing/ConsultStatsBand.astro',
    },
  },
  {
    id: 'wilco-baseline-trusted-by',
    label: 'Trusted by',
    desc: 'Approved Wilco partner logo strip for tribal and municipal clients.',
    componentId: 'baseline-wilco-trusted-by',
    layout: 'band',
    tag: 'Approved baseline',
    demo: {
      brand: 'consult',
      catalog: 'fold',
      labId: 'trusted-by',
      astroUnit: '@client-sites/theme/components/landing/ConsultTrustedBy.astro',
    },
  },
];

export function isBaselineApprovedFoldLayout(layoutId: string | null | undefined): boolean {
  return (
    typeof layoutId === 'string' &&
    (BASELINE_APPROVED_FOLD_LAYOUT_IDS as readonly string[]).includes(layoutId)
  );
}

export function baselineApprovedFoldLayoutForBlock(blockId: string): BaselineApprovedFoldLayoutId | null {
  return BASELINE_FOLD_BLOCK_TO_APPROVED_LAYOUT[blockId] ?? null;
}

export function baselineApprovedFoldOptionsForBlock(blockId: string): BuildBookOption[] {
  const layoutId = baselineApprovedFoldLayoutForBlock(blockId);
  if (!layoutId) return [];
  const option = BASELINE_APPROVED_FOLD_LIBRARY.find((entry) => entry.id === layoutId);
  return option ? [option] : [];
}

export function findBaselineApprovedFoldOption(optionId: string): BuildBookOption | undefined {
  return BASELINE_APPROVED_FOLD_LIBRARY.find((option) => option.id === optionId);
}

export function resolveBaselineFoldLayoutId(blockId: string, props: Record<string, unknown>): string {
  const labLayout = typeof props['labLayout'] === 'string' ? props['labLayout'] : undefined;
  if (labLayout && isBaselineApprovedFoldLayout(labLayout)) return labLayout;
  if (labLayout && !isBaselineApprovedFoldLayout(labLayout)) return labLayout;

  return baselineApprovedFoldLayoutForBlock(blockId) ?? labLayout ?? 'wri-fold-contract';
}
