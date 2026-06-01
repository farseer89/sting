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
import { articleRunToThought } from './article-run-to-thought';
import { ThinkerComponent, type ThinkerMode } from './thinker.component';

/** Matches the backend orphan-takeover window for stuck "running" runs. */
const STALE_RUNNING_MS = 4 * 60 * 1000;
/** Base interval between status polls while a run is active. */
const POLL_MS = 1800;
/** Consecutive poll failures tolerated before we declare the link lost. */
const MAX_POLL_FAILURES = 6;

type Connection = 'idle' | 'live' | 'reconnecting' | 'lost';

/**
 * Live Thinker run view. Loads a real ArticleGenerationRun by id and renders it
 * in the generic Thought stepper (via articleRunToThought), polling while the
 * run is active. Wrapped in void-white chrome to match the Thinker lab.
 */
@Component({
  selector: 'app-thinker-run',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThinkerComponent],
  templateUrl: './thinker-run.component.html',
  styleUrl: './thinker-run.component.scss',
})
export class ThinkerRunComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ProtopipeApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly mode = signal<ThinkerMode>('calm');
  readonly run = signal<ArticleGenerationRunDto | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly rerunning = signal(false);
  /** Live link health for the polling loop, surfaced in the status strip. */
  readonly connection = signal<Connection>('idle');

  readonly thought = computed(() => {
    const r = this.run();
    return r ? articleRunToThought(r) : null;
  });

  /** Run-level status for the status strip (queued / running / failed / done). */
  readonly statusLabel = computed(() => {
    const r = this.run();
    if (!r) return null;
    switch (r.status) {
      case 'pending':
        return 'Queued';
      case 'running':
        return 'Running';
      case 'complete':
        return 'Complete';
      case 'failed':
        return 'Failed';
      default:
        return r.status;
    }
  });

  /** Whether the run is still progressing (drives the live pulse + polling). */
  readonly isActive = computed(() => {
    const r = this.run();
    return r?.status === 'running' || r?.status === 'pending';
  });

  /** Human label for the step currently in flight (or the failed step). */
  readonly currentStepLabel = computed(() => {
    const t = this.thought();
    if (!t) return null;
    const active = t.steps.find((s) => s.id === t.currentStepId) ?? t.steps.find((s) => s.status === 'running');
    return active?.label ?? null;
  });

  /** Message + step for a failed run, surfaced prominently in the strip. */
  readonly failure = computed(() => {
    const r = this.run();
    if (!r || r.status !== 'failed') return null;
    return { step: r.error?.step ?? null, message: r.error?.message ?? 'The run failed.' };
  });

  /**
   * Allow rerun when the run is finished/failed, or when it is "running" but
   * has made no progress within the orphan window (matches the backend's
   * staleness takeover). Polling keeps run() fresh so this re-evaluates.
   */
  readonly canRerun = computed(() => {
    const r = this.run();
    if (!r) return false;
    if (r.status !== 'running' && r.status !== 'pending') return true;
    const updatedMs = new Date(r.updatedAt).getTime();
    return Number.isFinite(updatedMs) && Date.now() - updatedMs > STALE_RUNNING_MS;
  });

  private siteId = '';
  private runId = '';
  private postId: string | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollFailures = 0;

  constructor() {
    document.documentElement.classList.add('void-lab', 'void-white');
    this.destroyRef.onDestroy(() => {
      this.stopPolling();
      document.documentElement.classList.remove('void-lab', 'void-white');
    });
  }

  ngOnInit(): void {
    const pm = this.route.snapshot.paramMap;
    this.siteId = pm.get('siteId') ?? '';
    this.runId = pm.get('runId') ?? '';
    this.postId = this.route.snapshot.queryParamMap.get('postId');
    if (!this.siteId || !this.runId) {
      this.loadError.set('Missing run reference.');
      return;
    }
    this.load();
  }

  toggleMode(): void {
    this.mode.update((m) => (m === 'calm' ? 'debug' : 'calm'));
  }

  back(): void {
    if (this.postId) {
      void this.router.navigate(['/protopipe/content', this.postId]);
    } else {
      void this.router.navigate(['/protopipe/content']);
    }
  }

  onRerunStep(stepId: string): void {
    const step = stepId as ArticleGenerationStep;
    if (this.rerunning()) return;
    this.actionError.set(null);
    this.rerunning.set(true);
    this.stopPolling();
    this.api.rerunArticleStep$(this.siteId, this.runId, step).subscribe({
      next: ({ run }) => {
        this.run.set(run);
        this.rerunning.set(false);
        this.maybePoll(run);
      },
      error: (err) => {
        this.rerunning.set(false);
        this.actionError.set(parseProtopipeApiError(err, 'Failed to rerun step.'));
      },
    });
  }

  /** Manual reconnect after the link was declared lost. */
  retry(): void {
    this.loadError.set(null);
    this.pollFailures = 0;
    this.connection.set('reconnecting');
    this.load();
  }

  private load(): void {
    this.api.getArticleRun$(this.siteId, this.runId).subscribe({
      next: ({ run }) => {
        this.loadError.set(null);
        this.pollFailures = 0;
        this.run.set(run);
        this.maybePoll(run);
      },
      error: (err) => {
        this.connection.set('idle');
        this.loadError.set(parseProtopipeApiError(err, 'Could not load run.'));
      },
    });
  }

  private maybePoll(run: ArticleGenerationRunDto): void {
    if (run.status === 'running' || run.status === 'pending') {
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
    this.api.getArticleRun$(this.siteId, this.runId).subscribe({
      next: ({ run }) => {
        this.pollFailures = 0;
        this.run.set(run);
        this.maybePoll(run);
      },
      error: () => {
        // Transient errors (token refresh boundary, backend restart, blips)
        // shouldn't permanently freeze the view: back off and keep trying.
        this.pollFailures += 1;
        if (this.pollFailures >= MAX_POLL_FAILURES) {
          this.connection.set('lost');
          this.stopPolling();
          return;
        }
        this.connection.set('reconnecting');
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
