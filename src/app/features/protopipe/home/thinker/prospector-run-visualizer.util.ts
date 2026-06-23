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
    address: lead.formattedAddress ?? undefined,
    factors: factors?.length ? factors : undefined,
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

  return { title: 'Prospector', emptyMessage: 'Select a pipeline step.', blocks: [] };
}
