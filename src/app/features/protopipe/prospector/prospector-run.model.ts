export type ProspectorStep = 'places_search' | 'score_leads' | 'check_ads';
export type ProspectorStatus = 'pending' | 'running' | 'complete' | 'failed';
export type ProspectorWebsiteQuality = 'none' | 'present';
export type ProspectorPriority = 'critical' | 'high' | 'medium' | 'monitor';

export interface ProspectorScoreBreakdown {
  label: string;
  pts: number;
}

export interface ProspectorScoredLead {
  placeId: string;
  displayName?: string;
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  primaryType?: string;
  rating?: number;
  userRatingCount?: number;
  location?: { latitude: number; longitude: number };
  editorialSummary?: string;
  score: number;
  priority: ProspectorPriority;
  scoreBreakdown: ProspectorScoreBreakdown[];
  websiteQuality: ProspectorWebsiteQuality;
  googleRank: number;
  areaBestRating: number;
  reviewGap: number;
  runsAds?: boolean;
}

export interface ProspectorStepEvent {
  step: ProspectorStep;
  status: 'started' | 'completed' | 'failed';
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  costUsd?: number;
  note?: string;
  error?: string;
}

export interface ProspectorRunDto {
  id: string;
  status: ProspectorStatus;
  currentStep: ProspectorStep | 'done';
  input: { category: string; location: string };
  artifacts: {
    placesSearch?: {
      placeId: string;
      displayName?: string;
      formattedAddress?: string;
      internationalPhoneNumber?: string;
      websiteUri?: string;
      googleMapsUri?: string;
      primaryType?: string;
      rating?: number;
      userRatingCount?: number;
    }[];
    scoredLeads?: ProspectorScoredLead[];
    serpResult?: {
      query: string;
      totalAdsCount: number;
      adDomains: string[];
    };
    /** Present when Google has more results available for this search. */
    nextPageToken?: string;
  };
  events: ProspectorStepEvent[];
  totalCostUsd?: number;
  error?: { step: string; message: string };
  createdAt: string;
  updatedAt: string;
}

export const PROSPECTOR_STEP_LABELS: Record<ProspectorStep, string> = {
  places_search: 'Google Places search',
  score_leads: 'Score leads',
  check_ads: 'Check paid ads',
};

export const PROSPECTOR_STEPS_ORDERED: ProspectorStep[] = ['places_search', 'score_leads', 'check_ads'];

// ── Lead Enrichment ───────────────────────────────────────────────────────────

export type EnrichmentStep = 'fetch_details' | 'fetch_site' | 'extract_info';
export type EnrichmentStatus = 'pending' | 'running' | 'complete' | 'failed';

export interface EnrichmentPlaceDetails {
  displayName?: string;
  primaryType?: string;
  primaryTypeDisplayName?: string;
  editorialSummary?: string;
  weekdayDescriptions?: string[];
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  formattedAddress?: string;
}

export interface EnrichmentStepEvent {
  step: EnrichmentStep;
  status: 'started' | 'completed' | 'failed';
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  costUsd?: number;
  note?: string;
  error?: string;
}

export interface EnrichmentDto {
  id: string;
  placeId: string;
  status: EnrichmentStatus;
  currentStep: EnrichmentStep | 'done';
  placeDetails?: EnrichmentPlaceDetails;
  ownerName?: string;
  services?: string[];
  description?: string;
  events: EnrichmentStepEvent[];
  totalCostUsd?: number;
  error?: { step: string; message: string };
  createdAt: string;
  updatedAt: string;
}

export const ENRICHMENT_STEP_LABELS: Record<EnrichmentStep, string> = {
  fetch_details: 'Fetch Place Details',
  fetch_site: 'Read Website',
  extract_info: 'Extract with AI',
};

export const ENRICHMENT_STEPS_ORDERED: EnrichmentStep[] = [
  'fetch_details',
  'fetch_site',
  'extract_info',
];
