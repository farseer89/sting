export type AdsVerdict = 'go' | 'marginal' | 'no-go';

export interface AdsBookProductKeyword {
  phraseKey: string;
  phrase: string;
  loading?: boolean;
  error?: string;
  avgMonthlySearches?: number;
  cpcLowMicros?: number;
  cpcHighMicros?: number;
  competition?: string;
}

export interface AdsBookProduct {
  id: string;
  name: string;
  priceUsd: number;
  marginUsd: number;
  notes?: string;
  keywords: AdsBookProductKeyword[];
}

export interface AdsBookAssumptions {
  clickToLeadRate: number;
  leadToCloseRate: number;
  marginShareForAds: number;
}

export interface PitchEconomicsConfig {
  protopipeFeeUsd: number;
  adSpendUsd: number;
  allInMode: boolean;
  allInMonthlyUsd: number;
}

export interface AdsBookDraft {
  products: AdsBookProduct[];
  assumptions: AdsBookAssumptions;
  selectedProductId?: string;
  simulatorCpcUsd?: number;
  pitch?: Partial<PitchEconomicsConfig>;
}

export interface AdsSimulatorResult {
  budgetUsd: number;
  avgCpcUsd: number;
  clicks: number;
  leads: number;
  costPerLead: number;
  jobs: number;
  revenue: number;
  grossProfit: number;
  netAfterAds: number;
  maxAffordableCpc: number;
  verdict: AdsVerdict;
}

export interface PitchEconomicsResult extends AdsSimulatorResult {
  protopipeFeeUsd: number;
  adSpendUsd: number;
  totalMonthlyCost: number;
  jobsToCoverFee: number;
  jobsToCoverFeeAndAds: number;
  netToOwner: number;
  breakEvenAdSpend: number | null;
  pitchVerdict: AdsVerdict;
  narrative: string;
}

export const DEFAULT_ADS_ASSUMPTIONS: AdsBookAssumptions = {
  clickToLeadRate: 0.05,
  leadToCloseRate: 0.25,
  marginShareForAds: 0.3,
};

export const DEFAULT_PITCH_CONFIG: PitchEconomicsConfig = {
  protopipeFeeUsd: 450,
  adSpendUsd: 450,
  allInMode: false,
  allInMonthlyUsd: 450,
};

export const SIMULATOR_BUDGET_PRESETS = [450, 750, 1200] as const;

export function createProductId(): string {
  return `prod_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function effectivePitchCosts(config: PitchEconomicsConfig): {
  protopipeFeeUsd: number;
  adSpendUsd: number;
  totalMonthlyCost: number;
} {
  if (config.allInMode) {
    const total = Math.max(0, config.allInMonthlyUsd);
    return { protopipeFeeUsd: 0, adSpendUsd: 0, totalMonthlyCost: total };
  }
  const fee = Math.max(0, config.protopipeFeeUsd);
  const ads = Math.max(0, config.adSpendUsd);
  return { protopipeFeeUsd: fee, adSpendUsd: ads, totalMonthlyCost: fee + ads };
}

export function computeMaxAffordableCpc(marginUsd: number, assumptions: AdsBookAssumptions): number {
  if (marginUsd <= 0 || assumptions.leadToCloseRate <= 0 || assumptions.clickToLeadRate <= 0) {
    return 0;
  }
  const clicksPerLead = 1 / assumptions.clickToLeadRate;
  return (marginUsd * assumptions.marginShareForAds) / (clicksPerLead * assumptions.leadToCloseRate);
}


/** Max ad spend S where margin × jobs(S) = fee + S. Null when funnel cannot break even. */
export function solveBreakEvenAdSpend(input: {
  protopipeFeeUsd: number;
  avgCpcUsd: number;
  marginUsd: number;
  assumptions: AdsBookAssumptions;
}): number | null {
  const { protopipeFeeUsd, avgCpcUsd, marginUsd, assumptions } = input;
  if (avgCpcUsd <= 0 || marginUsd <= 0 || protopipeFeeUsd < 0) return null;

  const k = (assumptions.clickToLeadRate * assumptions.leadToCloseRate) / avgCpcUsd;
  const denom = marginUsd * k - 1;
  if (denom <= 0) return null;

  const s = protopipeFeeUsd / denom;
  return s > 0 && Number.isFinite(s) ? s : null;
}

export function computePitchVerdict(input: {
  netToOwner: number;
  projectedJobs: number;
  jobsToCoverFee: number;
  jobsToCoverFeeAndAds: number;
  grossProfit: number;
  feeUsd: number;
  breakEvenAdSpend: number | null;
}): AdsVerdict {
  const { netToOwner, projectedJobs, jobsToCoverFee, jobsToCoverFeeAndAds, grossProfit, feeUsd, breakEvenAdSpend } =
    input;

  if (breakEvenAdSpend != null && breakEvenAdSpend <= 0) return 'no-go';

  if (netToOwner > 0 && projectedJobs >= jobsToCoverFeeAndAds) {
    if (grossProfit > 0 && netToOwner < grossProfit * 0.15) return 'marginal';
    return 'go';
  }

  if (grossProfit >= feeUsd || projectedJobs >= jobsToCoverFee) {
    return 'marginal';
  }

  return 'no-go';
}

export function buildPitchNarrative(input: {
  productName: string;
  pitch: PitchEconomicsResult;
  config: PitchEconomicsConfig;
}): string {
  const { productName, pitch, config } = input;
  const jobsNeeded = pitch.jobsToCoverFeeAndAds.toFixed(1);
  const jobsProjected = pitch.jobs.toFixed(1);
  const verdict = pitch.pitchVerdict === 'go' ? 'Go' : pitch.pitchVerdict === 'marginal' ? 'Marginal' : 'No-go';

  if (config.allInMode) {
    return `At ${formatUsd(pitch.totalMonthlyCost)}/mo all-in and ${formatUsdPrecise(pitch.avgCpcUsd)} CPC, ${productName} needs ~${jobsNeeded} jobs/mo to break even. Ads project ~${jobsProjected} jobs — ${verdict}.`;
  }

  return `At ${formatUsd(pitch.adSpendUsd)} ad spend, ${formatUsd(pitch.protopipeFeeUsd)} Protopipe fee, and ${formatUsdPrecise(pitch.avgCpcUsd)} CPC, you need ~${jobsNeeded} ${productName} jobs/mo to cover fee + ads. This market projects ~${jobsProjected} — ${verdict}.`;
}

export function computePitchEconomics(input: {
  adSpendUsd: number;
  avgCpcUsd: number;
  priceUsd: number;
  marginUsd: number;
  assumptions: AdsBookAssumptions;
  pitchConfig: PitchEconomicsConfig;
  productName: string;
}): PitchEconomicsResult {
  const { adSpendUsd, avgCpcUsd, priceUsd, marginUsd, assumptions, pitchConfig, productName } = input;
  const costs = effectivePitchCosts(pitchConfig);
  const maxAffordableCpc = computeMaxAffordableCpc(marginUsd, assumptions);

  const feeForBreakEven = pitchConfig.allInMode ? costs.totalMonthlyCost : costs.protopipeFeeUsd;

  if (adSpendUsd <= 0 || avgCpcUsd <= 0 || marginUsd <= 0) {
    const jobsToCoverFee = costs.protopipeFeeUsd / marginUsd;
    const jobsToCoverFeeAndAds = costs.totalMonthlyCost / marginUsd;
    const base: PitchEconomicsResult = {
      budgetUsd: adSpendUsd,
      avgCpcUsd,
      clicks: 0,
      leads: 0,
      costPerLead: 0,
      jobs: 0,
      revenue: 0,
      grossProfit: 0,
      netAfterAds: 0,
      maxAffordableCpc,
      verdict: 'no-go',
      protopipeFeeUsd: costs.protopipeFeeUsd,
      adSpendUsd,
      totalMonthlyCost: costs.totalMonthlyCost,
      jobsToCoverFee,
      jobsToCoverFeeAndAds,
      netToOwner: -costs.totalMonthlyCost,
      breakEvenAdSpend: solveBreakEvenAdSpend({ protopipeFeeUsd: feeForBreakEven, avgCpcUsd, marginUsd, assumptions }),
      pitchVerdict: 'no-go',
      narrative: '',
    };
    base.narrative = buildPitchNarrative({ productName, pitch: base, config: pitchConfig });
    return base;
  }

  const clicks = adSpendUsd / avgCpcUsd;
  const leads = clicks * assumptions.clickToLeadRate;
  const costPerLead = leads > 0 ? adSpendUsd / leads : 0;
  const jobs = leads * assumptions.leadToCloseRate;
  const revenue = jobs * priceUsd;
  const grossProfit = jobs * marginUsd;
  const netAfterAds = grossProfit - adSpendUsd;
  const netToOwner = grossProfit - costs.totalMonthlyCost;

  const jobsToCoverFee = pitchConfig.allInMode
    ? costs.totalMonthlyCost / marginUsd
    : costs.protopipeFeeUsd > 0
      ? costs.protopipeFeeUsd / marginUsd
      : 0;
  const jobsToCoverFeeAndAds = costs.totalMonthlyCost / marginUsd;

  const breakEvenAdSpend = solveBreakEvenAdSpend({
    protopipeFeeUsd: feeForBreakEven,
    avgCpcUsd,
    marginUsd,
    assumptions,
  });

  const pitchVerdict = computePitchVerdict({
    netToOwner,
    projectedJobs: jobs,
    jobsToCoverFee,
    jobsToCoverFeeAndAds,
    grossProfit,
    feeUsd: pitchConfig.allInMode ? costs.totalMonthlyCost : costs.protopipeFeeUsd,
    breakEvenAdSpend,
  });

  const verdict = pitchVerdict;

  const result: PitchEconomicsResult = {
    budgetUsd: adSpendUsd,
    avgCpcUsd,
    clicks,
    leads,
    costPerLead,
    jobs,
    revenue,
    grossProfit,
    netAfterAds,
    maxAffordableCpc,
    verdict,
    protopipeFeeUsd: costs.protopipeFeeUsd,
    adSpendUsd,
    totalMonthlyCost: costs.totalMonthlyCost,
    jobsToCoverFee,
    jobsToCoverFeeAndAds,
    netToOwner,
    breakEvenAdSpend,
    pitchVerdict,
    narrative: '',
  };
  result.narrative = buildPitchNarrative({ productName, pitch: result, config: pitchConfig });
  return result;
}

export function computeSimulator(input: {
  budgetUsd: number;
  avgCpcUsd: number;
  priceUsd: number;
  marginUsd: number;
  assumptions: AdsBookAssumptions;
}): AdsSimulatorResult {
  return computePitchEconomics({
    ...input,
    adSpendUsd: input.budgetUsd,
    pitchConfig: { ...DEFAULT_PITCH_CONFIG, adSpendUsd: input.budgetUsd },
    productName: 'job',
  });
}

export function isKeywordOverBudget(
  keyword: AdsBookProductKeyword,
  maxAffordableCpc: number,
): boolean {
  if (maxAffordableCpc <= 0) return false;
  const highUsd = keyword.cpcHighMicros != null ? keyword.cpcHighMicros / 1e6 : undefined;
  const lowUsd = keyword.cpcLowMicros != null ? keyword.cpcLowMicros / 1e6 : undefined;
  const probe = highUsd ?? lowUsd;
  return probe != null && probe > maxAffordableCpc;
}

export function avgCpcFromKeyword(keyword: AdsBookProductKeyword): number | undefined {
  const low = keyword.cpcLowMicros != null ? keyword.cpcLowMicros / 1e6 : undefined;
  const high = keyword.cpcHighMicros != null ? keyword.cpcHighMicros / 1e6 : undefined;
  if (low != null && high != null) return (low + high) / 2;
  return low ?? high;
}

function formatUsd(value: number): string {
  return '$' + Math.round(value).toLocaleString();
}

function formatUsdPrecise(value: number): string {
  return '$' + value.toFixed(2);
}

export function draftStorageKey(siteId: string): string {
  return `protopipe-ads-book:${siteId}`;
}

export function loadAdsBookDraft(siteId: string): AdsBookDraft | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(draftStorageKey(siteId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdsBookDraft;
    if (!Array.isArray(parsed.products)) return null;
    return {
      products: parsed.products,
      assumptions: { ...DEFAULT_ADS_ASSUMPTIONS, ...parsed.assumptions },
      selectedProductId: parsed.selectedProductId,
      simulatorCpcUsd: parsed.simulatorCpcUsd,
      pitch: parsed.pitch,
    };
  } catch {
    return null;
  }
}

export function saveAdsBookDraft(siteId: string, draft: AdsBookDraft): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(draftStorageKey(siteId), JSON.stringify(draft));
  } catch {
    // ignore quota errors
  }
}
