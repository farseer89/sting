import type { ArticleGenerationRunDto } from '@hive/contracts';
import { ARTICLE_RUN_STALE_MS } from './article-generation-run-session.service';

/** When a stuck "running" run may be rerun from the UI (matches backend takeover rules). */
export function canRerunArticleRun(run: ArticleGenerationRunDto | null | undefined): boolean {
  if (!run) return false;
  if (run.status !== 'running' && run.status !== 'pending') return true;

  const updatedMs = new Date(run.updatedAt).getTime();
  if (Number.isFinite(updatedMs) && Date.now() - updatedMs > ARTICLE_RUN_STALE_MS) {
    return true;
  }

  if (run.currentStep === 'review') {
    const events = run.events ?? [];
    const lastStart = [...events]
      .reverse()
      .find((e) => e.step === 'review' && e.status === 'started');
    if (lastStart?.startedAt) {
      const startedMs = new Date(lastStart.startedAt).getTime();
      if (Number.isFinite(startedMs) && Date.now() - startedMs > 2 * 60 * 1000) {
        const completedAfter = events.some(
          (e) =>
            e.step === 'review' &&
            e.status === 'completed' &&
            new Date(e.finishedAt ?? e.startedAt).getTime() > startedMs,
        );
        if (!completedAfter) return true;
      }
    }
  }

  return false;
}

export function rerunBlockedReason(run: ArticleGenerationRunDto | null | undefined): string | null {
  if (!run || canRerunArticleRun(run)) return null;
  if (run.status === 'running' || run.status === 'pending') {
    return 'This step is still running. Rerun unlocks after ~2 minutes on Review, or ~4 minutes with no progress.';
  }
  return null;
}
