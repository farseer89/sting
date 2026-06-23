import { PROSPECTOR_RESULT_STEP_ID } from '../../lab/prospector/prospector-run-to-thought';
import type { ProspectorRunDto, ProspectorScoredLead } from '../../prospector/prospector-run.model';
import type { BinderStepStatus } from './thinker-binder.mapper';
import type {
  LeadTableRow,
  StepVisualizerView,
  VisualizerBlock,
} from './article-run-visualizer.util';

function pendingView(title: string): StepVisualizerView {
  return {
    title,
    emptyMessage: 'This step has not run yet. Output will appear here as the pipeline progresses.',
    blocks: [],
  };
}

function toLeadTableRow(lead: ProspectorScoredLead): LeadTableRow {
  const factors = lead.scoreBreakdown
    ?.filter((b) => b.pts !== 0)
    .map((b) => `${b.label}${b.pts > 0 ? ` +${b.pts}` : ` ${b.pts}`}`);

  return {
    name: lead.displayName ?? '—',
    score: lead.score,
    priority: lead.priority,
    rating: lead.rating ?? undefined,
    ratingCount: lead.userRatingCount ?? undefined,
    hasWebsite: lead.websiteQuality !== 'none',
    websiteQuality: lead.websiteQuality,
    websiteUri: lead.websiteUri ?? undefined,
    address: lead.formattedAddress ?? undefined,
    factors: factors?.length ? factors : undefined,
    runsAds: lead.runsAds,
  };
}

function leadTableBlock(leads: ProspectorScoredLead[]): VisualizerBlock {
  return {
    kind: 'lead-table',
    leads: [...leads].sort((a, b) => b.score - a.score).map(toLeadTableRow),
  };
}

function buildPlacesSearchBlocks(run: ProspectorRunDto): VisualizerBlock[] {
  const places = run.artifacts.placesSearch ?? [];
  const summaryBlocks: VisualizerBlock[] = [
    {
      kind: 'meta-row',
      label: 'Query',
      value: `${run.input.category} in ${run.input.location}`,
    },
    {
      kind: 'meta-row',
      label: 'Results',
      value: `${places.length}`,
      hint: 'businesses returned from Google Places',
    },
  ];

  if (places.length === 0) return summaryBlocks;

  const tableBlock: VisualizerBlock = {
    kind: 'lead-table',
    leads: places.slice(0, 20).map((p) => ({
      name: p.displayName ?? '—',
      score: 0,
      priority: 'monitor' as const,
      rating: p.rating ?? undefined,
      ratingCount: p.userRatingCount ?? undefined,
      hasWebsite: Boolean(p.websiteUri),
      websiteUri: p.websiteUri ?? undefined,
      address: p.formattedAddress ?? undefined,
    })),
  };

  return [...summaryBlocks, tableBlock];
}

function buildScoreLeadsBlocks(run: ProspectorRunDto): VisualizerBlock[] {
  const scored = run.artifacts.scoredLeads ?? [];
  if (scored.length === 0) return [];

  const critical = scored.filter((l) => l.priority === 'critical').length;
  const high = scored.filter((l) => l.priority === 'high').length;
  const medium = scored.filter((l) => l.priority === 'medium').length;
  const monitor = scored.filter((l) => l.priority === 'monitor').length;

  const summary: VisualizerBlock[] = [
    { kind: 'meta-row', label: 'Total scored', value: `${scored.length}` },
    { kind: 'meta-row', label: 'Critical', value: `${critical}`, hint: 'high review gap + no website' },
    { kind: 'meta-row', label: 'High', value: `${high}` },
    { kind: 'meta-row', label: 'Medium', value: `${medium}` },
    { kind: 'meta-row', label: 'Monitor', value: `${monitor}` },
  ];

  return [...summary, leadTableBlock(scored)];
}

export function buildProspectorStepVisualizer(
  run: ProspectorRunDto,
  stepId: string,
  stepStatus: BinderStepStatus,
): StepVisualizerView {
  if (stepId === PROSPECTOR_RESULT_STEP_ID) {
    const scored = run.artifacts.scoredLeads ?? [];
    return {
      title: 'Leads',
      subtitle: scored.length > 0
        ? `${scored.length} businesses scored · sorted by opportunity`
        : undefined,
      emptyMessage: scored.length === 0
        ? 'Scored leads appear after the pipeline completes.'
        : undefined,
      blocks: scored.length > 0 ? [leadTableBlock(scored)] : [],
    };
  }

  if (stepId === 'places_search') {
    if (stepStatus === 'pending') return pendingView('Places Search');
    const places = run.artifacts.placesSearch ?? [];
    return {
      title: 'Google Places Search',
      subtitle: `${run.input.category} · ${run.input.location}`,
      blocks: buildPlacesSearchBlocks(run),
      emptyMessage: places.length === 0
        ? 'Search results will appear here once the step completes.'
        : undefined,
    };
  }

  if (stepId === 'score_leads') {
    if (stepStatus === 'pending') return pendingView('Score Leads');
    const scored = run.artifacts.scoredLeads ?? [];
    return {
      title: 'Score Leads',
      subtitle: scored.length > 0 ? `${scored.length} businesses scored` : undefined,
      blocks: buildScoreLeadsBlocks(run),
      emptyMessage: scored.length === 0
        ? 'Scores appear after the step completes.'
        : undefined,
    };
  }

  if (stepId === 'check_ads') {
    if (stepStatus === 'pending') return pendingView('Check Paid Ads');
    const sr = run.artifacts.serpResult;
    const scored = run.artifacts.scoredLeads ?? [];
    const spending = scored.filter((l) => l.runsAds).length;
    const gap = scored.filter((l) => !l.runsAds).length;

    const summaryBlocks: VisualizerBlock[] = sr
      ? [
          { kind: 'meta-row', label: 'Category query', value: sr.query },
          { kind: 'meta-row', label: 'Ads found', value: `${sr.totalAdsCount}` },
          {
            kind: 'meta-row',
            label: 'Leads spending',
            value: `${spending}`,
            hint: 'domain matched in paid ads — harder cold sell',
          },
          {
            kind: 'meta-row',
            label: 'Leads in gap',
            value: `${gap}`,
            hint: sr.totalAdsCount > 0 ? 'competitors are spending, they\'re not — pitch angle' : 'no ads in this market yet',
          },
          ...(sr.adDomains.length > 0
            ? [{ kind: 'meta-row' as const, label: 'Ad domains', value: sr.adDomains.join(', ') }]
            : []),
        ]
      : [];

    return {
      title: 'Check Paid Ads',
      subtitle: sr ? `DataForSEO SERP · "${sr.query}"` : undefined,
      blocks: [...summaryBlocks, ...(scored.length > 0 ? [leadTableBlock(scored)] : [])],
      emptyMessage: !sr ? 'Ads check will appear here once the step completes.' : undefined,
    };
  }

  return { title: 'Prospector', emptyMessage: 'Select a pipeline step.', blocks: [] };
}
