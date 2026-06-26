import type { Thought } from '@hive/contracts';

/** Matches the backend orphan-takeover window for stuck "running" runs. */
export const THOUGHT_RUN_STALE_MS = 4 * 60 * 1000;

/** When a stuck Shire Thought run may be rerun from the UI. */
export function canRerunShireThought(thought: Thought | null | undefined): boolean {
  if (!thought) return false;
  if (thought.status !== 'running' && thought.status !== 'pending') return true;

  const anchor = thought.finishedAt ?? thought.startedAt;
  if (!anchor) return false;
  const anchorMs = new Date(anchor).getTime();
  return Number.isFinite(anchorMs) && Date.now() - anchorMs > THOUGHT_RUN_STALE_MS;
}

export function shireRerunBlockedReason(thought: Thought | null | undefined): string | null {
  if (!thought || canRerunShireThought(thought)) return null;
  if (thought.status === 'running' || thought.status === 'pending') {
    return 'This step is still running. Rerun unlocks after ~4 minutes with no progress.';
  }
  return null;
}
