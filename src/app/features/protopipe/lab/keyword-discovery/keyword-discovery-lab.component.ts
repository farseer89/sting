import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ThinkerComponent, type ThinkerMode } from '../thinker/thinker.component';
import { discoveryRunToThought } from './discovery-run-to-thought';
import { KeywordDiscoveryLabApiService } from './keyword-discovery-lab-api.service';
import {
  DISCOVERY_FIXTURES,
  discoveryFixtureById,
  type DiscoveryFixture,
} from './keyword-discovery.mock';
import type { KeywordDiscoveryRunDto } from './keyword-discovery-run.types';

type LabSource = 'fixture' | 'live';
const POLL_MS = 1800;

/**
 * Keyword Discovery Lab — dev surface that renders the discovery pipeline in the
 * same Thinker view as the article writer. Defaults to hardcoded fixtures so we
 * can iterate on the adapter + step artifacts without a backend or live account.
 * The "Live" toggle exercises the (Phase 2) backend once it exists.
 */
@Component({
  selector: 'app-keyword-discovery-lab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThinkerComponent],
  templateUrl: './keyword-discovery-lab.component.html',
  styleUrl: './keyword-discovery-lab.component.scss',
})
export class KeywordDiscoveryLabComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(KeywordDiscoveryLabApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly fixtures = DISCOVERY_FIXTURES;
  readonly source = signal<LabSource>('fixture');
  readonly mode = signal<ThinkerMode>('debug');
  readonly activeFixtureId = signal<string>(DISCOVERY_FIXTURES[0].id);

  readonly run = signal<KeywordDiscoveryRunDto | null>(DISCOVERY_FIXTURES[0].run);
  readonly loadError = signal<string | null>(null);
  readonly liveSiteId = signal<string>('');
  readonly liveRunId = signal<string>('');
  readonly liveBusy = signal(false);

  readonly thought = computed(() => {
    const r = this.run();
    return r ? discoveryRunToThought(r) : null;
  });

  readonly costTotal = computed(() => this.run()?.costSummary?.totalUsd ?? null);

  readonly statusLabel = computed(() => {
    const r = this.run();
    if (!r) return null;
    switch (r.status) {
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
        return r.status;
    }
  });

  readonly isActive = computed(() => {
    const r = this.run();
    return r?.status === 'discovering' || r?.status === 'pending';
  });

  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    document.documentElement.classList.add('void-lab', 'void-white');
    this.destroyRef.onDestroy(() => {
      this.stopPolling();
      document.documentElement.classList.remove('void-lab', 'void-white');
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const siteId = params.get('siteId')?.trim() ?? '';
      const runId = params.get('runId')?.trim() ?? '';
      if (!siteId || !runId) return;
      if (
        this.source() === 'live' &&
        this.liveSiteId() === siteId &&
        this.liveRunId() === runId &&
        this.run()?.id === runId
      ) {
        return;
      }
      this.liveSiteId.set(siteId);
      this.liveRunId.set(runId);
      this.source.set('live');
      this.run.set(null);
      this.loadLive();
    });
  }

  toggleMode(): void {
    this.mode.update((m) => (m === 'calm' ? 'debug' : 'calm'));
  }

  setSource(source: LabSource): void {
    if (this.source() === source) return;
    this.source.set(source);
    this.loadError.set(null);
    this.stopPolling();
    if (source === 'fixture') {
      this.selectFixture(this.activeFixtureId());
    } else {
      this.run.set(null);
    }
  }

  selectFixture(id: string): void {
    const fixture: DiscoveryFixture = discoveryFixtureById(id);
    this.activeFixtureId.set(fixture.id);
    this.source.set('fixture');
    this.loadError.set(null);
    this.stopPolling();
    this.run.set(fixture.run);
  }

  formatUsd(value: number | null): string {
    if (value == null) return '—';
    return `$${value.toFixed(value < 1 ? 4 : 2)}`;
  }

  back(): void {
    const returnTo = this.route.snapshot.queryParamMap.get('returnTo');
    if (returnTo?.startsWith('/')) {
      void this.router.navigateByUrl(returnTo);
      return;
    }
    void this.router.navigate(['/protopipe/lab/thinker']);
  }

  // --- Live path (Phase 2 backend) ---

  startLive(): void {
    const siteId = this.liveSiteId().trim();
    if (!siteId || this.liveBusy()) return;
    this.liveBusy.set(true);
    this.loadError.set(null);
    this.api.startRun$(siteId).subscribe({
      next: ({ run }) => {
        this.liveBusy.set(false);
        this.liveRunId.set(run.id);
        this.run.set(run);
        this.maybePoll(siteId, run);
      },
      error: (err) => {
        this.liveBusy.set(false);
        this.loadError.set(parseProtopipeApiError(err, 'Could not start discovery run.'));
      },
    });
  }

  loadLive(): void {
    const siteId = this.liveSiteId().trim();
    const runId = this.liveRunId().trim();
    if (!siteId || !runId || this.liveBusy()) return;
    this.liveBusy.set(true);
    this.loadError.set(null);
    this.api.getRun$(siteId, runId).subscribe({
      next: ({ run }) => {
        this.liveBusy.set(false);
        this.run.set(run);
        this.maybePoll(siteId, run);
      },
      error: (err) => {
        this.liveBusy.set(false);
        this.loadError.set(parseProtopipeApiError(err, 'Could not load discovery run.'));
      },
    });
  }

  onLiveSiteId(value: string): void {
    this.liveSiteId.set(value);
  }

  onLiveRunId(value: string): void {
    this.liveRunId.set(value);
  }

  private maybePoll(siteId: string, run: KeywordDiscoveryRunDto): void {
    this.stopPolling();
    if (run.status === 'discovering' || run.status === 'pending') {
      this.pollTimer = setTimeout(() => this.poll(siteId, run.id), POLL_MS);
    }
  }

  private poll(siteId: string, runId: string): void {
    this.api.getRun$(siteId, runId).subscribe({
      next: ({ run }) => {
        this.run.set(run);
        this.maybePoll(siteId, run);
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
