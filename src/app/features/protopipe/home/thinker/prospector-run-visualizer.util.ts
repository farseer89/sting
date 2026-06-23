import { PROSPECTOR_RESULT_STEP_ID } from '../../lab/prospector/prospector-run-to-thought';
import type { ProspectorRunDto, ProspectorScoredLead } from '../../prospector/prospector-run.model';
import type { BinderStepStatus } from './thinker-binder.mapper';
import type { StepVisualizerView, VisualizerBlock } from './article-run-visualizer.util';

const PRIORITY_LABELS: Record<string, string> = {
  critical: '🔴 Critical',
  high: '🟠 High',
  medium: '🔵 Medium',
  monitor: '⚪ Monitor',
};

function pendingView(title: string): StepVisualizerView {
  return {
    title,
    emptyMessage: 'This step has not run yet. Output will appear here as the pipeline progresses.',
    blocks: [],
  };
}

function leadBlocks(leads: ProspectorScoredLead[], limit = 20): VisualizerBlock[] {
  return leads.slice(0, limit).map((lead) => {
    const ratingStr =
      lead.rating != null
        ? `★ ${lead.rating.toFixed(1)}${lead.userRatingCount ? ` (${lead.userRatingCount})` : ''}`
        : null;
    const websiteStr = lead.websiteQuality === 'none' ? 'No website' : null;
    const hintParts = [
      PRIORITY_LABELS[lead.priority] ?? lead.priority,
      websiteStr,
      ratingStr,
      lead.formattedAddress,
    ].filter(Boolean);

    return {
      kind: 'meta-row' as const,
      label: lead.displayName ?? '—',
      value: String(lead.score),
      hint: hintParts.join(' · ') || undefined,
    };
  });
}

function buildPlacesSearchBlocks(run: ProspectorRunDto): VisualizerBlock[] {
  const places = run.artifacts.placesSearch ?? [];
  const blocks: VisualizerBlock[] = [
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

  for (const p of places.slice(0, 8)) {
    blocks.push({
      kind: 'meta-row',
      label: p.displayName ?? '—',
      value: p.rating != null ? `★ ${p.rating.toFixed(1)}` : '—',
      hint: p.formattedAddress ?? undefined,
    });
  }

  return blocks;
}

function buildScoreLeadsBlocks(run: ProspectorRunDto): VisualizerBlock[] {
  const scored = run.artifacts.scoredLeads ?? [];
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

  const top = [...scored].sort((a, b) => b.score - a.score);
  return [...summary, ...leadBlocks(top)];
}

function buildResultBlocks(run: ProspectorRunDto): VisualizerBlock[] {
  const scored = [...(run.artifacts.scoredLeads ?? [])].sort((a, b) => b.score - a.score);
  return leadBlocks(scored);
}

export function buildProspectorStepVisualizer(
  run: ProspectorRunDto,
  stepId: string,
  stepStatus: BinderStepStatus,
): StepVisualizerView {
  if (stepId === PROSPECTOR_RESULT_STEP_ID) {
    const leads = run.artifacts.scoredLeads?.length ?? 0;
    return {
      title: 'Leads',
      subtitle: leads > 0 ? `${leads} businesses scored · sorted by opportunity` : undefined,
      emptyMessage: leads === 0 ? 'Scored leads appear after the pipeline completes.' : undefined,
      blocks: buildResultBlocks(run),
    };
  }

  if (stepId === 'places_search') {
    if (stepStatus === 'pending') return pendingView('Places Search');
    return {
      title: 'Google Places Search',
      subtitle: `${run.input.category} · ${run.input.location}`,
      blocks: buildPlacesSearchBlocks(run),
      emptyMessage: (run.artifacts.placesSearch?.length ?? 0) === 0
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
