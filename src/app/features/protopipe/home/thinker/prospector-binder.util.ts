import {
  PROSPECTOR_RESULT_STEP_ID,
  PROSPECTOR_STEP_ORDER,
  type ProspectorResultStepId,
} from '../../lab/prospector/prospector-run-to-thought';
import type { ProspectorRunDto, ProspectorStep } from '../../prospector/prospector-run.model';
import type { BinderApiQueryBlock, BinderStepStatus, BinderStepView } from './thinker-binder.mapper';

export { PROSPECTOR_RESULT_STEP_ID };

export type ProspectorBinderNavStepId = ProspectorResultStepId;

export function isProspectorResultStepId(id: string): id is ProspectorResultStepId {
  return id === PROSPECTOR_RESULT_STEP_ID;
}

export function resolveProspectorBinderNavStepId(run: ProspectorRunDto): string {
  if (run.status === 'complete' || run.currentStep === 'done') {
    return PROSPECTOR_RESULT_STEP_ID;
  }
  return run.currentStep as string;
}

function resultStatus(run: ProspectorRunDto): BinderStepStatus {
  if (run.status === 'failed') return 'failed';
  if (run.status === 'complete') return 'done';
  const hasLeads = (run.artifacts.scoredLeads?.length ?? 0) > 0;
  if (hasLeads) return 'running';
  return 'pending';
}

const PROSPECTOR_API_PROVIDERS: Record<ProspectorStep, string> = {
  places_search: 'Google Places',
  score_leads: 'OpenAI',
  check_ads: 'DataForSEO',
};

const PROSPECTOR_API_STEP: Set<ProspectorStep> = new Set(['places_search', 'check_ads']);

export function buildProspectorApiQueryBlocks(
  run: ProspectorRunDto,
  step: ProspectorStep,
): BinderApiQueryBlock[] | undefined {
  if (step === 'places_search') {
    return [
      { label: 'API', value: 'Google Places (Text Search)' },
      { label: 'Query', value: `${run.input.category} in ${run.input.location}` },
      { label: 'Endpoint', value: 'places.googleapis.com/v1/places:searchText' },
      { label: 'Fields', value: 'id, displayName, formattedAddress, rating, userRatingCount, websiteUri, nationalPhoneNumber, regularOpeningHours' },
      { label: 'Max results', value: '20' },
      ...(run.artifacts.placesSearch?.length != null
        ? [{ label: 'Results returned', value: String(run.artifacts.placesSearch.length) }]
        : []),
    ];
  }
  if (step === 'score_leads') {
    return [
      { label: 'Model', value: 'Deterministic scoring (no LLM)' },
      { label: 'Input', value: `${run.artifacts.placesSearch?.length ?? 0} business records from Places search` },
      { label: 'Scoring factors', value: 'review gap, website quality, Google rank, review count' },
      { label: 'Output', value: 'Priority (critical / high / medium / monitor) + score 0–100' },
    ];
  }
  if (step === 'check_ads') {
    const sr = run.artifacts.serpResult;
    return [
      { label: 'API', value: 'DataForSEO — serp/google/organic/live/advanced' },
      { label: 'Query', value: sr?.query ?? `${run.input.category} ${run.input.location}` },
      { label: 'Depth', value: '20 results' },
      { label: 'Signal', value: 'Paid ads block — match ad URLs against lead domains' },
      ...(sr
        ? [
            { label: 'Ads found', value: String(sr.totalAdsCount) },
            ...(sr.adDomains.length > 0
              ? [{ label: 'Ad domains', value: sr.adDomains.join(', '), hint: 'Businesses confirmed running Google Ads' }]
              : []),
          ]
        : []),
    ];
  }
  return undefined;
}

export function annotateProspectorApiMeta(
  steps: BinderStepView[],
  run: ProspectorRunDto,
): BinderStepView[] {
  return steps.map((s) => {
    const prospectorStep = s.id as ProspectorStep;
    if (!PROSPECTOR_STEP_ORDER.includes(prospectorStep)) return s;
    const isApi = PROSPECTOR_API_STEP.has(prospectorStep);
    return {
      ...s,
      isApiStep: isApi,
      apiProvider: PROSPECTOR_API_PROVIDERS[prospectorStep],
      apiQueryBlocks: buildProspectorApiQueryBlocks(run, prospectorStep),
    };
  });
}

export function mapProspectorResultNavStep(
  run: ProspectorRunDto,
  mappedSteps: BinderStepView[],
): BinderStepView {
  const status = resultStatus(run);
  const leads = run.artifacts.scoredLeads?.length ?? 0;
  const critical = run.artifacts.scoredLeads?.filter((l) => l.priority === 'critical').length ?? 0;
  const high = run.artifacts.scoredLeads?.filter((l) => l.priority === 'high').length ?? 0;

  const summary =
    status === 'done'
      ? `${leads} lead(s) · ${critical} critical · ${high} high`
      : status === 'running'
        ? 'Scoring in progress…'
        : 'Results appear after scoring completes';

  const lastStep = mappedSteps.find(
    (s) => s.id === PROSPECTOR_STEP_ORDER[PROSPECTOR_STEP_ORDER.length - 1],
  );

  return {
    id: PROSPECTOR_RESULT_STEP_ID,
    num: String(PROSPECTOR_STEP_ORDER.length + 1).padStart(2, '0'),
    label: 'Leads',
    description: 'Scored and ranked business leads.',
    summary,
    status,
    isLlmStep: false,
    costUsd: run.totalCostUsd,
    inputArtifact: lastStep?.outputArtifact,
    outputArtifact: lastStep?.outputArtifact,
    subSteps: [],
    events: status === 'done' ? (lastStep?.events ?? []) : [],
    rawJson: JSON.stringify(
      { status: run.status, leadCount: leads, critical, high },
      null,
      2,
    ),
    llmCalls: [],
  };
}
