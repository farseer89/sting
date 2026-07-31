import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { ArticleGenerationRunDto, ArticleGenerationStep, ProtopipeSiteContentPlan } from '@hive/contracts';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { ContentPlanService } from '../../content-plan/content-plan.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { discoveryRunToThought } from '../../lab/keyword-discovery/discovery-run-to-thought';
import type { KeywordDiscoveryRunDto } from '../../lab/keyword-discovery/keyword-discovery-run.types';
import { contentPlanRunToThought } from '../../lab/content-plan/content-plan-run-to-thought';
import { articleRunToThought } from '../../lab/thinker/article-run-to-thought';
import { exportThoughtRunbookPdf } from '../../lab/thinker/thought-runbook-pdf';
import { ThinkerComponent, type ThinkerMode } from '../../lab/thinker/thinker.component';
import type { Thought } from '../../lab/thinker/thought.model';

import { mentionSnapshotToThought } from '../../lab/mention-tracking/mention-tracking-run-to-thought';
import type { ProtopipeSiteMentionSnapshot } from '@hive/contracts';
import { MentionTrackingService } from '../../mention-tracking/mention-tracking.service';

export type RunbookKind = 'keyword-discovery' | 'content-plan' | 'article' | 'mention-tracking';

const POLL_MS = 1800;
const MAX_POLL_FAILURES = 6;
const STALE_RUNNING_MS = 4 * 60 * 1000;

type Connection = 'idle' | 'live' | 'reconnecting' | 'lost';

/**
 * Generic Thinker shell for onboarding runbooks inside the home workspace.
 */
@Component({
  selector: 'app-protopipe-runbook-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThinkerComponent],
  templateUrl: './protopipe-runbook-viewer.component.html',
  styleUrl: './protopipe-runbook-viewer.component.scss',
})
export class ProtopipeRunbookViewerComponent implements OnInit {
  private readonly api = inject(ProtopipeApiService);
  private readonly contentPlanApi = inject(ContentPlanService);
  private readonly mentionTrackingApi = inject(MentionTrackingService);
  private readonly destroyRef = inject(DestroyRef);

  readonly siteId = input.required<string>();
  readonly kind = input.required<RunbookKind>();
  readonly runId = input.required<string>();

  readonly back = output<void>();

  readonly mode = signal<ThinkerMode>('debug');
  readonly loadError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly exportingRunbook = signal(false);
  readonly rerunning = signal(false);
  readonly connection = signal<Connection>('idle');

  private readonly discoveryRun = signal<KeywordDiscoveryRunDto | null>(null);
  private readonly contentPlanRun = signal<ProtopipeSiteContentPlan | null>(null);
  private readonly articleRun = signal<ArticleGenerationRunDto | null>(null);
  private readonly mentionSnapshot = signal<ProtopipeSiteMentionSnapshot | null>(null);

  readonly thought = computed((): Thought | null => {
    const kind = this.kind();
    if (kind === 'keyword-discovery') {
      const run = this.discoveryRun();
      return run ? discoveryRunToThought(run) : null;
    }
    if (kind === 'content-plan') {
      const plan = this.contentPlanRun();
      return plan ? contentPlanRunToThought(plan) : null;
    }
    if (kind === 'mention-tracking') {
      const snapshot = this.mentionSnapshot();
      return snapshot ? mentionSnapshotToThought(snapshot) : null;
    }
    const run = this.articleRun();
    return run ? articleRunToThought(run) : null;
  });

  readonly statusLabel = computed(() => {
    const kind = this.kind();
    if (kind === 'keyword-discovery') {
      const run = this.discoveryRun();
      if (!run) return null;
      switch (run.status) {
        case 'pending':
          return 'Queued';
        case 'discovering':
          return 'Discovering';
        case 'ready':
          return 'Ready';
        case 'confirmed':
          return 'Confirmed';
        case 'failed':
          return 'Failed';
        default:
          return run.status;
      }
    }
    if (kind === 'content-plan') {
      const plan = this.contentPlanRun();
      if (!plan) return null;
      switch (plan.status) {
        case 'pending':
          return 'Queued';
        case 'running':
          return 'Running';
        case 'complete':
          return 'Complete';
        case 'failed':
          return 'Failed';
        default:
          return plan.status;
      }
    }
    if (kind === 'mention-tracking') {
      const snapshot = this.mentionSnapshot();
      if (!snapshot) return null;
      switch (snapshot.status) {
        case 'pending':
          return 'Queued';
        case 'running':
          return 'Running';
        case 'complete':
          return 'Complete';
        case 'failed':
          return 'Failed';
        default:
          return snapshot.status;
      }
    }
    const run = this.articleRun();
    if (!run) return null;
    switch (run.status) {
      case 'pending':
        return 'Queued';
      case 'running':
        return 'Running';
      case 'complete':
        return 'Complete';
      case 'failed':
        return 'Failed';
      default:
        return run.status;
    }
  });

  readonly isActive = computed(() => {
    const kind = this.kind();
    if (kind === 'keyword-discovery') {
      const s = this.discoveryRun()?.status;
      return s === 'pending' || s === 'discovering';
    }
    if (kind === 'content-plan') {
      const s = this.contentPlanRun()?.status;
      return s === 'pending' || s === 'running';
    }
    if (kind === 'mention-tracking') {
      const s = this.mentionSnapshot()?.status;
      return s === 'pending' || s === 'running';
    }
    const s = this.articleRun()?.status;
    return s === 'pending' || s === 'running';
  });

  readonly currentStepLabel = computed(() => {
    const t = this.thought();
    if (!t) return null;
    const active =
      t.steps.find((s) => s.id === t.currentStepId) ??
      t.steps.find((s) => s.status === 'running');
    return active?.label ?? null;
  });

  readonly failure = computed(() => {
    const kind = this.kind();
    if (kind === 'keyword-discovery') {
      const run = this.discoveryRun();
      if (!run || run.status !== 'failed') return null;
      return { step: run.error?.step ?? null, message: run.error?.message ?? 'Discovery failed.' };
    }
    if (kind === 'content-plan') {
      const plan = this.contentPlanRun();
      if (!plan || plan.status !== 'failed') return null;
      return { step: plan.currentStep ?? null, message: plan.error ?? 'Content plan failed.' };
    }
    if (kind === 'mention-tracking') {
      const snapshot = this.mentionSnapshot();
      if (!snapshot || snapshot.status !== 'failed') return null;
      return { step: snapshot.currentStep ?? null, message: snapshot.error ?? 'Mention check failed.' };
    }
    const run = this.articleRun();
    if (!run || run.status !== 'failed') return null;
    return { step: run.error?.step ?? null, message: run.error?.message ?? 'The run failed.' };
  });

  readonly canRerun = computed(() => {
    if (this.kind() !== 'article') return false;
    const r = this.articleRun();
    if (!r) return false;
    if (r.status !== 'running' && r.status !== 'pending') return true;
    const updatedMs = new Date(r.updatedAt).getTime();
    return Number.isFinite(updatedMs) && Date.now() - updatedMs > STALE_RUNNING_MS;
  });

  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollFailures = 0;

  constructor() {
    this.destroyRef.onDestroy(() => this.stopPolling());
  }

  ngOnInit(): void {
    this.load();
  }

  toggleMode(): void {
    this.mode.update((m) => (m === 'calm' ? 'debug' : 'calm'));
  }

  onBack(): void {
    this.back.emit();
  }

  async exportRunbook(): Promise<void> {
    const t = this.thought();
    if (!t || this.exportingRunbook()) return;
    this.exportingRunbook.set(true);
    this.actionError.set(null);
    try {
      await exportThoughtRunbookPdf(t, {
        runId: this.runId(),
        siteId: this.siteId(),
      });
    } catch {
      this.actionError.set('Could not export runbook PDF. Try again in a moment.');
    } finally {
      this.exportingRunbook.set(false);
    }
  }

  onRerunStep(stepId: string): void {
    if (this.kind() !== 'article' || this.rerunning()) return;
    const step = stepId as ArticleGenerationStep;
    this.actionError.set(null);
    this.rerunning.set(true);
    this.stopPolling();
    this.api.rerunArticleStep$(this.siteId(), this.runId(), step).subscribe({
      next: ({ run }) => {
        this.articleRun.set(run);
        this.rerunning.set(false);
        this.maybePoll();
      },
      error: (err) => {
        this.rerunning.set(false);
        this.actionError.set(parseProtopipeApiError(err, 'Failed to rerun step.'));
      },
    });
  }

  retry(): void {
    this.loadError.set(null);
    this.pollFailures = 0;
    this.connection.set('reconnecting');
    this.load();
  }

  private load(): void {
    const siteId = this.siteId();
    const runId = this.runId();
    const kind = this.kind();

    if (kind === 'keyword-discovery') {
      void this.api.getKeywordDiscoveryRun(siteId, runId).then(
        ({ run }) => {
          this.loadError.set(null);
          this.pollFailures = 0;
          this.discoveryRun.set(run as KeywordDiscoveryRunDto);
          this.maybePoll();
        },
        (err) => {
          this.connection.set('idle');
          this.loadError.set(parseProtopipeApiError(err, 'Could not load discovery run.'));
        },
      );
      return;
    }

    if (kind === 'content-plan') {
      void this.contentPlanApi.getRun(siteId, runId).then(
        ({ plan }) => {
          if (!plan) {
            this.loadError.set('Content plan run not found.');
            return;
          }
          this.loadError.set(null);
          this.pollFailures = 0;
          this.contentPlanRun.set(plan);
          this.maybePoll();
        },
        (err) => {
          this.connection.set('idle');
          this.loadError.set(parseProtopipeApiError(err, 'Could not load content plan run.'));
        },
      );
      return;
    }

    if (kind === 'mention-tracking') {
      void this.mentionTrackingApi.getRun(siteId, runId).then(
        ({ snapshot }) => {
          if (!snapshot) {
            this.loadError.set('Mention tracking run not found.');
            return;
          }
          this.loadError.set(null);
          this.pollFailures = 0;
          this.mentionSnapshot.set(snapshot);
          this.maybePoll();
        },
        (err) => {
          this.connection.set('idle');
          this.loadError.set(parseProtopipeApiError(err, 'Could not load mention tracking run.'));
        },
      );
      return;
    }

    this.api.getArticleRun$(siteId, runId).subscribe({
      next: ({ run }) => {
        this.loadError.set(null);
        this.pollFailures = 0;
        this.articleRun.set(run);
        this.maybePoll();
      },
      error: (err) => {
        this.connection.set('idle');
        this.loadError.set(parseProtopipeApiError(err, 'Could not load article run.'));
      },
    });
  }

  private maybePoll(): void {
    if (this.isActive()) {
      this.connection.set('live');
      this.schedulePoll(POLL_MS);
    } else {
      this.connection.set('idle');
      this.stopPolling();
    }
  }

  private schedulePoll(delayMs: number): void {
    this.stopPolling();
    this.pollTimer = setTimeout(() => this.poll(), delayMs);
  }

  private poll(): void {
    const siteId = this.siteId();
    const runId = this.runId();
    const kind = this.kind();

    if (kind === 'keyword-discovery') {
      void this.api.getKeywordDiscoveryRun(siteId, runId).then(
        ({ run }) => {
          this.pollFailures = 0;
          this.discoveryRun.set(run as KeywordDiscoveryRunDto);
          this.maybePoll();
        },
        () => this.onPollError(),
      );
      return;
    }

    if (kind === 'content-plan') {
      void this.contentPlanApi.getRun(siteId, runId).then(
        ({ plan }) => {
          if (plan) {
            this.pollFailures = 0;
            this.contentPlanRun.set(plan);
          }
          this.maybePoll();
        },
        () => this.onPollError(),
      );
      return;
    }

    if (kind === 'mention-tracking') {
      void this.mentionTrackingApi.getRun(siteId, runId).then(
        ({ snapshot }) => {
          if (snapshot) {
            this.pollFailures = 0;
            this.mentionSnapshot.set(snapshot);
          }
          this.maybePoll();
        },
        () => this.onPollError(),
      );
      return;
    }

    this.api.getArticleRun$(siteId, runId).subscribe({
      next: ({ run }) => {
        this.pollFailures = 0;
        this.articleRun.set(run);
        this.maybePoll();
      },
      error: () => this.onPollError(),
    });
  }

  private onPollError(): void {
    this.pollFailures += 1;
    if (this.pollFailures >= MAX_POLL_FAILURES) {
      this.connection.set('lost');
      this.stopPolling();
      return;
    }
    this.connection.set('reconnecting');
    const backoff = POLL_MS * Math.min(this.pollFailures + 1, 5);
    this.schedulePoll(backoff);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
