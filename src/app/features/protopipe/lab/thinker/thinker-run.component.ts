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
import type { ArticleGenerationRunDto } from '@hive/contracts';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { articleRunToThought } from './article-run-to-thought';
import { ThinkerComponent, type ThinkerMode } from './thinker.component';

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

  readonly thought = computed(() => {
    const r = this.run();
    return r ? articleRunToThought(r) : null;
  });

  private siteId = '';
  private runId = '';
  private postId: string | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

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

  private load(): void {
    this.api.getArticleRun$(this.siteId, this.runId).subscribe({
      next: ({ run }) => {
        this.run.set(run);
        this.maybePoll(run);
      },
      error: (err) => this.loadError.set(parseProtopipeApiError(err, 'Could not load run.')),
    });
  }

  private maybePoll(run: ArticleGenerationRunDto): void {
    if (run.status === 'running' || run.status === 'pending') {
      this.pollTimer = setTimeout(() => this.poll(), 1800);
    }
  }

  private poll(): void {
    this.api.getArticleRun$(this.siteId, this.runId).subscribe({
      next: ({ run }) => {
        this.run.set(run);
        this.maybePoll(run);
      },
      error: () => this.stopPolling(),
    });
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
