/** AI engines shown in the Mentions book overview (UI-only until backend supports each). */
export type MentionEngineUiStatus = 'active' | 'coming_soon';

export interface MentionEngineUiConfig {
  id: string;
  label: string;
  shortLabel: string;
  status: MentionEngineUiStatus;
  /** Shown on coming-soon cards, e.g. "v1.1" */
  eta?: string;
  /** One-line note for the engine card */
  note: string;
}

export const MENTION_ENGINES: MentionEngineUiConfig[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    shortLabel: 'Gemini',
    status: 'active',
    note: 'Live — sampled prompts run twice per check',
  },
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    shortLabel: 'ChatGPT',
    status: 'coming_soon',
    eta: 'v1.1',
    note: 'OpenAI answers & recommendations',
  },
  {
    id: 'perplexity',
    label: 'Perplexity',
    shortLabel: 'Perplexity',
    status: 'coming_soon',
    eta: 'v1.1',
    note: 'Sonar Pro citation snapshots',
  },
  {
    id: 'claude',
    label: 'Claude',
    shortLabel: 'Claude',
    status: 'coming_soon',
    eta: 'v1.1',
    note: 'Anthropic answer coverage',
  },
  {
    id: 'google_ai_overviews',
    label: 'Google AI Overviews',
    shortLabel: 'AI Overviews',
    status: 'coming_soon',
    eta: 'v1.2',
    note: 'SERP AI Overview impressions',
  },
];
