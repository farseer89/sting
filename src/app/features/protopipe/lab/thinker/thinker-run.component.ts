import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { ArticleGenerationRunDto, ArticleGenerationStep } from '@hive/contracts';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ThoughtRunSession } from '../../runs/thought-run-session.service';
import { canRerunShireThought } from '../../runs/thought-rerun.util';
import { isShireRunsEnabled } from '../../shire/shire-http.util';
import { shireThoughtToUi } from '../../shire/shire-thought.adapter';
import { canRerunArticleRun } from '../../article/article-run-rerun.util';
import { articleRunToThought } from './article-run-to-thought';
import { exportThoughtRunbookPdf } from './thought-runbook-pdf';
import { ThinkerComponent, type ThinkerMode } from './thinker.component';
import type { ThoughtStatus } from './thought.model';

/** Base interval between status polls while a run is active. */
const POLL_MS = 1800;
/** Consecutive poll failures tolerated before we declare the link lost. */
const MAX_POLL_FAILURES = 6;

type Connection = 'idle' | 'live' | 'reconnecting' | 'lost';

/**
 * Live Thinker run view. Polls bagend ArticleGenerationRun or Shire Thought
 * (when `SHIRE_BASE_URL` is set) and renders via the generic Thought stepper.
 */
@Component({
  selector: 'app-thinker-run',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThinkerComponent],
  providers: [ThoughtRunSession],
  templateUrl: './thinker-run.component.html',
  styleUrl: './thinker-run.component.scss',
})
export class ThinkerRunComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ProtopipeApiService);
  private readonly shireSession = inject(ThoughtRunSession);
  private readonly destroyRef = inject(DestroyRef);
  private readonly useShire = isShireRunsEnabled();

  readonly mode = signal<ThinkerMode>('calm');
  readonly run = signal<ArticleGenerationRunDto | null>(null);
  readonly bagendLoadError = signal<string | null>(null);
  readonly bagendConnection = signal<Connection>('idle');
  readonly actionError = signal<string | null>(null);
  readonly rerunning = signal(false);
  readonly exportingRunbook = signal(false);

  readonly loadError = computed(() => {
    const local = this.bagendLoadError();
    if (local) return local;
    return this.useShire ? this.shireSession.loadError() : null;
  });
  readonly connection = computed(() =>
    this.useShire ? this.shireSession.connection() : this.bagendConnection(),
  );

  readonly thought = computed(() => {
    if (this.useShire) {
      const t = this.shireSession.thought();
      return t ? shireThoughtToUi(t) : null;
    }
    const r = this.run();
    return r ? articleRunToThought(r) : null;
  });

  readonly runStatus = computed((): ThoughtStatus | ArticleGenerationRunDto['status'] | 'idle' => {
    if (this.useShire) {
      return this.shireSession.thought()?.status ?? 'idle';
    }
    return this.run()?.status ?? 'idle';
  });

  readonly statusLabel = computed(() => {
    const status = this.runStatus();
    if (status === 'idle') return null;
    switch (status) {
      case 'pending':
        return 'Queued';
      case 'running':
        return 'Running';
      case 'complete':
        return 'Complete';
      case 'failed':
        return 'Failed';
      default:
        return String(status);
    }
  });

  readonly isActive = computed(() => {
    if (this.useShire) return this.shireSession.isActive();
    const r = this.run();
    return r?.status === 'running' || r?.status === 'pending';
  });

  readonly currentStepLabel = computed(() => {
    const t = this.thought();
    if (!t) return null;
    const active =
      t.steps.find((s) => s.id === t.currentStepId) ?? t.steps.find((s) => s.status === 'running');
    return active?.label ?? null;
  });

  readonly failure = computed(() => {
    if (this.useShire) {
      const t = this.shireSession.thought();
      if (!t || t.status !== 'failed') return null;
      const failedStep = t.steps.find((s) => s.status === 'failed');
      return {
        step: failedStep?.id ?? t.currentStepId ?? null,
        message: failedStep?.error?.message ?? 'The run failed.',
      };
    }
    const r = this.run();
    if (!r || r.status !== 'failed') return null;
    return { step: r.error?.step ?? null, message: r.error?.message ?? 'The run failed.' };
  });

  readonly canRerun = computed(() => {
    if (this.useShire) {
      return canRerunShireThought(this.shireSession.thought());
    }
    return canRerunArticleRun(this.run());
  });

  private siteId = '';
  private runId = '';
  private postId: string | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollFailures = 0;

  constructor() {
    document.documentElement.classList.add('void-lab', 'void-white');
    this.destroyRef.onDestroy(() => {
      if (this.useShire) {
        this.shireSession.stop();
      } else {
        this.stopPolling();
      }
      document.documentElement.classList.remove('void-lab', 'void-white');
    });
  }

  ngOnInit(): void {
    const pm = this.route.snapshot.paramMap;
    this.siteId = pm.get('siteId') ?? '';
    this.runId = pm.get('runId') ?? '';
    this.postId = this.route.snapshot.queryParamMap.get('postId');
    if (!this.siteId || !this.runId) {
      this.bagendLoadError.set('Missing run reference.');
      return;
    }
    if (this.useShire) {
      void this.shireSession.loadRun(this.siteId, this.runId);
    } else {
      this.loadBagend();
    }
  }

  toggleMode(): void {
    this.mode.update((m) => (m === 'calm' ? 'debug' : 'calm'));
  }

  async exportRunbook(): Promise<void> {
    const t = this.thought();
    if (!t || this.exportingRunbook()) return;
    this.exportingRunbook.set(true);
    this.actionError.set(null);
    try {
      await exportThoughtRunbookPdf(t, { runId: this.runId, siteId: this.siteId });
    } catch {
      this.actionError.set('Could not export runbook PDF. Try again in a moment.');
    } finally {
      this.exportingRunbook.set(false);
    }
  }

  back(): void {
    if (this.postId) {
      void this.router.navigate(['/protopipe/content', this.postId]);
    } else {
      void this.router.navigate(['/protopipe/content']);
    }
  }

  onRerunStep(stepId: string): void {
    if (this.rerunning()) return;
    this.actionError.set(null);
    this.rerunning.set(true);

    if (this.useShire) {
      void this.shireSession.rerunStep(stepId).then((result) => {
        this.rerunning.set(false);
        if (!result.ok) {
          this.actionError.set(result.message);
        }
      });
      return;
    }

    const step = stepId as ArticleGenerationStep;
    this.stopPolling();
    this.api.rerunArticleStep$(this.siteId, this.runId, step).subscribe({
      next: ({ run }) => {
        this.run.set(run);
        this.rerunning.set(false);
        this.maybePollBagend(run);
      },
      error: (err) => {
        this.rerunning.set(false);
        this.actionError.set(parseProtopipeApiError(err, 'Failed to rerun step.'));
      },
    });
  }

  retry(): void {
    if (this.useShire) {
      this.shireSession.retryPoll();
      return;
    }
    this.bagendLoadError.set(null);
    this.pollFailures = 0;
    this.bagendConnection.set('reconnecting');
    this.loadBagend();
  }

  private loadBagend(): void {
    this.api.getArticleRun$(this.siteId, this.runId).subscribe({
      next: ({ run }) => {
        this.bagendLoadError.set(null);
        this.pollFailures = 0;
        this.run.set(run);
        this.maybePollBagend(run);
      },
      error: (err) => {
        this.bagendConnection.set('idle');
        this.bagendLoadError.set(parseProtopipeApiError(err, 'Could not load run.'));
      },
    });
  }

  private maybePollBagend(run: ArticleGenerationRunDto): void {
    if (run.status === 'running' || run.status === 'pending') {
      this.bagendConnection.set('live');
      this.schedulePoll(POLL_MS);
    } else {
      this.bagendConnection.set('idle');
      this.stopPolling();
    }
  }

  private schedulePoll(delayMs: number): void {
    this.stopPolling();
    this.pollTimer = setTimeout(() => this.pollBagend(), delayMs);
  }

  private pollBagend(): void {
    this.api.getArticleRun$(this.siteId, this.runId).subscribe({
      next: ({ run }) => {
        this.pollFailures = 0;
        this.run.set(run);
        this.maybePollBagend(run);
      },
      error: () => {
        this.pollFailures += 1;
        if (this.pollFailures >= MAX_POLL_FAILURES) {
          this.bagendConnection.set('lost');
          this.stopPolling();
          return;
        }
        this.bagendConnection.set('reconnecting');
        const backoff = POLL_MS * Math.min(this.pollFailures + 1, 5);
        this.schedulePoll(backoff);
      },
    });
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
