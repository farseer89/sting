import type { KeywordIntent } from '../../protopipe.models';

export interface KeywordPickOption {
  id: string;
  phrase: string;
  volume: number;
  intent: KeywordIntent;
  preselected?: boolean;
  suggested?: boolean;
}

export const KEYWORD_PICK_SUGGESTED: KeywordPickOption[] = [
  { id: 'kw1', phrase: 'destination wedding painter', volume: 720, intent: 'commercial', preselected: true, suggested: true },
  { id: 'kw2', phrase: 'live wedding painting', volume: 1300, intent: 'commercial', preselected: true, suggested: true },
  { id: 'kw3', phrase: 'how much does a wedding painter cost', volume: 480, intent: 'informational', preselected: true, suggested: true },
  { id: 'kw4', phrase: 'hire painter for wedding abroad', volume: 140, intent: 'transactional', preselected: true, suggested: true },
  { id: 'kw5', phrase: 'best wedding painters in tuscany', volume: 70, intent: 'commercial', preselected: true, suggested: true },
  { id: 'kw6', phrase: 'italy destination wedding artist', volume: 90, intent: 'commercial', suggested: true },
  { id: 'kw7', phrase: 'live painter vs wedding photographer', volume: 95, intent: 'informational', suggested: true },
  { id: 'kw8', phrase: 'wedding day painting timeline', volume: 110, intent: 'informational', suggested: true },
];

export const KEYWORD_PICK_SEARCH_POOL: KeywordPickOption[] = [
  ...KEYWORD_PICK_SUGGESTED,
  { id: 'kw9', phrase: 'france wedding live painting', volume: 55, intent: 'commercial' },
  { id: 'kw10', phrase: 'maui wedding painter', volume: 210, intent: 'commercial' },
  { id: 'kw11', phrase: 'live wedding artist cost', volume: 320, intent: 'informational' },
  { id: 'kw12', phrase: 'destination wedding entertainment ideas', volume: 880, intent: 'informational' },
  { id: 'kw13', phrase: 'wedding painter amalfi coast', volume: 40, intent: 'commercial' },
  { id: 'kw14', phrase: 'book wedding painter online', volume: 65, intent: 'transactional' },
  { id: 'kw15', phrase: 'watercolor wedding ceremony painting', volume: 170, intent: 'commercial' },
  { id: 'kw16', phrase: 'what is live wedding painting', volume: 260, intent: 'informational' },
  { id: 'kw17', phrase: 'wedding painter portfolio', volume: 95, intent: 'commercial' },
  { id: 'kw18', phrase: 'luxury destination wedding vendors', volume: 390, intent: 'commercial' },
];

export const INTENT_LABELS: Record<KeywordIntent, string> = {
  commercial: 'Commercial',
  informational: 'Informational',
  transactional: 'Transactional',
};
