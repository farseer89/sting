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
import type { ProtopipePendingConversation } from '@hive/contracts';
import { IntakeStudioApiService } from '../../lab/intake-studio/intake-studio-api.service';
import { conversationToThought } from '../../lab/intake-studio/conversation-to-thought.util';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ThinkerComponent, type ThinkerMode } from './thinker.component';

const POLL_MS = 1800;
const MAX_POLL_FAILURES = 6;

type Connection = 'idle' | 'live' | 'reconnecting' | 'lost';

function isActive(status: ProtopipePendingConversation['status']): boolean {
  return status === 'pending' || status === 'in_progress';
}

@Component({
  selector: 'app-intake-thinker-run',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThinkerComponent],
  templateUrl: './intake-thinker-run.component.html',
  styleUrl: './thinker-run.component.scss',
})
export class IntakeThinkerRunComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly intakeApi = inject(IntakeStudioApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly mode = signal<ThinkerMode>('calm');
  readonly conversation = signal<ProtopipePendingConversation | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly connection = signal<Connection>('idle');

  readonly thought = computed(() => {
    const c = this.conversation();
    return c ? conversationToThought(c) : null;
  });

  readonly statusLabel = computed(() => {
    const c = this.conversation();
    if (!c) return null;
    switch (c.status) {
      case 'pending':
        return 'Queued';
      case 'in_progress':
        return 'In progress';
      case 'complete':
        return 'Complete';
      case 'expired':
        return 'Expired';
      case 'abandoned':
        return 'Abandoned';
      default:
        return c.status;
    }
  });

  readonly isActive = computed(() => {
    const c = this.conversation();
    return c ? isActive(c.status) : false;
  });

  readonly currentStepLabel = computed(() => {
    const t = this.thought();
    if (!t) return null;
    const active =
      t.steps.find((s) => s.id === t.currentStepId) ?? t.steps.find((s) => s.status === 'running');
    return active?.label ?? null;
  });

  private siteId = '';
  private conversationId = '';
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
    this.conversationId = pm.get('conversationId') ?? '';
    if (!this.siteId || !this.conversationId) {
      this.loadError.set('Missing conversation reference.');
      return;
    }
    void this.load();
  }

  toggleMode(): void {
    this.mode.update((m) => (m === 'calm' ? 'debug' : 'calm'));
  }

  back(): void {
    void this.router.navigate(['/home'], { queryParams: { view: 'intake' } });
  }

  retry(): void {
    this.loadError.set(null);
    this.pollFailures = 0;
    this.connection.set('reconnecting');
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const { conversation } = await this.intakeApi.getConversation(this.siteId, this.conversationId);
      this.loadError.set(null);
      this.pollFailures = 0;
      this.conversation.set(conversation);
      this.maybePoll(conversation);
    } catch (err) {
      this.connection.set('idle');
      this.loadError.set(parseProtopipeApiError(err, 'Could not load conversation.'));
    }
  }

  private maybePoll(conversation: ProtopipePendingConversation): void {
    if (isActive(conversation.status)) {
      this.connection.set('live');
      this.schedulePoll(POLL_MS);
    } else {
      this.connection.set('idle');
      this.stopPolling();
    }
  }

  private schedulePoll(delayMs: number): void {
    this.stopPolling();
    this.pollTimer = setTimeout(() => void this.poll(), delayMs);
  }

  private async poll(): Promise<void> {
    try {
      const { conversation } = await this.intakeApi.getConversation(this.siteId, this.conversationId);
      this.pollFailures = 0;
      this.conversation.set(conversation);
      this.maybePoll(conversation);
    } catch {
      this.pollFailures += 1;
      if (this.pollFailures >= MAX_POLL_FAILURES) {
        this.connection.set('lost');
        this.stopPolling();
        return;
      }
      this.connection.set('reconnecting');
      this.schedulePoll(POLL_MS * Math.min(this.pollFailures + 1, 5));
    }
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
