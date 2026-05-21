/** Mirror bagend/services/protopipe/limits.ts — client-side UX guards only; server enforces. */
export const PROTOPIPE_MAX_KEYWORDS = 200;
export const PROTOPIPE_MAX_PHRASE_LENGTH = 200;
export const PROTOPIPE_MAX_NOTES_LENGTH = 2000;

export const PROTOPIPE_CONTENT_TITLE_MAX = 200;
export const PROTOPIPE_CONTENT_META_MIN = 140;
export const PROTOPIPE_CONTENT_META_MAX = 160;
export const PROTOPIPE_CONTENT_TITLE_WARN = 60;

export const PROTOPIPE_MAX_CONTENT_HELPER_EXAMPLES = 3;
export const PROTOPIPE_MAX_CONTENT_HELPER_EXAMPLE_LENGTH = 4000;

/** Article-ideas agent run polling (Claude can take 30–90s). */
export const PROTOPIPE_AGENT_POLL_INTERVAL_MS = 1000;
export const PROTOPIPE_AGENT_POLL_MAX_ATTEMPTS = 120;
