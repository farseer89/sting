import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type {
  OpenProtopipeIntakeConversationRequest,
  ProtopipeContact,
  ProtopipeIntakeTriggerType,
  ProtopipePendingConversation,
} from '@hive/contracts';
import { HttpErrorResponse } from '@angular/common/http';
import { IntakeStudioApiService } from '../../lab/intake-studio/intake-studio-api.service';
import { ProtopipeContactsApiService } from '../../settings/protopipe-contacts-api.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';

const POLL_MS = 2500;

interface TriggerCard {
  triggerType: ProtopipeIntakeTriggerType;
  title: string;
  description: string;
  actionLabel: string;
  inboundOnly?: boolean;
}

const TRIGGER_CARDS: TriggerCard[] = [
  {
    triggerType: 'onboarding',
    title: 'Onboarding',
    description: 'Scripted multi-question site interview. Each answer becomes a business profile card.',
    actionLabel: 'Send onboarding SMS',
  },
  {
    triggerType: 'journalist',
    title: 'Journalist',
    description: 'Ask one ad-hoc question. The reply becomes client-sourced article material.',
    actionLabel: 'Send journalist SMS',
  },
  {
    triggerType: 'fact_check',
    title: 'Fact check',
    description: 'Send a YES/NO confirmation for an AI-asserted claim (demo claim created if needed).',
    actionLabel: 'Send fact check SMS',
  },
  {
    triggerType: 'article_review',
    title: 'Article review',
    description: 'Article-scoped fact check — confirm or reject a flagged claim before publish.',
    actionLabel: 'Send article review SMS',
  },
  {
    triggerType: 'project_match',
    title: 'Project match',
    description: 'Inbound only — text a project update from your registered phone to trigger matching.',
    actionLabel: 'Inbound only',
    inboundOnly: true,
  },
];

function resolveTargetContact(contacts: ProtopipeContact[]): ProtopipeContact | null {
  const eligible = contacts.filter((c) => !c.optedOutAt);
  return eligible.find((c) => c.role === 'owner') ?? eligible[0] ?? null;
}

function isOpen(status: ProtopipePendingConversation['status']): boolean {
  return status === 'pending' || status === 'in_progress';
}

@Component({
  selector: 'app-protopipe-home-intake-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './protopipe-home-intake-demo.component.html',
  styleUrl: './protopipe-home-intake-demo.component.scss',
})
export class ProtopipeHomeIntakeDemoComponent implements OnInit {
  private readonly intakeApi = inject(IntakeStudioApiService);
  private readonly contactsApi = inject(ProtopipeContactsApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly siteId = input.required<string>();

  readonly triggerCards = TRIGGER_CARDS;
  readonly contacts = signal<ProtopipeContact[]>([]);
  readonly targetContact = computed(() => resolveTargetContact(this.contacts()));
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly sending = signal<ProtopipeIntakeTriggerType | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly activeConversation = signal<ProtopipePendingConversation | null>(null);

  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.stopPolling());
  }

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    const siteId = this.siteId();
    if (!siteId) return;

    this.loading.set(true);
    this.loadError.set(null);
    try {
      const { contacts } = await this.contactsApi.list(siteId);
      this.contacts.set(contacts);
    } catch (err) {
      this.loadError.set(parseProtopipeApiError(err, 'Could not load SMS contacts.'));
    } finally {
      this.loading.set(false);
    }
  }

  async sendTrigger(card: TriggerCard): Promise<void> {
    if (card.inboundOnly || this.sending()) return;

    const siteId = this.siteId();
    if (!siteId || !this.targetContact()) {
      this.actionError.set('Add an owner contact in SMS Contacts before sending.');
      return;
    }

    this.sending.set(card.triggerType);
    this.actionError.set(null);

    const body: OpenProtopipeIntakeConversationRequest = { triggerType: card.triggerType };
    if (card.triggerType === 'journalist') {
      body.questionText = "What's been your most interesting project lately?";
    }

    try {
      const { conversation } = await this.intakeApi.openConversation(siteId, body);
      this.activeConversation.set(conversation);
      this.maybePoll(conversation);
    } catch (err) {
      const msg = parseProtopipeApiError(err, 'Could not start conversation.');
      if (err instanceof HttpErrorResponse && err.status === 0) {
        this.actionError.set(
          'Could not reach the API (network/CORS). If you just deployed, wait a minute for the server to restart and try again.',
        );
      } else {
        this.actionError.set(msg);
      }
    } finally {
      this.sending.set(null);
    }
  }

  openInThinker(): void {
    const conversation = this.activeConversation();
    const siteId = this.siteId();
    if (!conversation || !siteId) return;
    void this.router.navigate([
      '/protopipe/lab/thinker/intake',
      siteId,
      conversation.id,
    ]);
  }

  progressLabel(conversation: ProtopipePendingConversation): string {
    const total = conversation.questions.length;
    const answered = conversation.questions.filter((q) => q.status === 'answered').length;
    if (conversation.status === 'complete') {
      return `Complete · ${answered} answered`;
    }
    const current = conversation.currentQuestionIndex + 1;
    return `Question ${current} of ${Math.max(total, current)}`;
  }

  currentQuestionText(conversation: ProtopipePendingConversation): string | null {
    const q = conversation.questions[conversation.currentQuestionIndex];
    return q?.text ?? conversation.questions.at(-1)?.text ?? null;
  }

  private maybePoll(conversation: ProtopipePendingConversation): void {
    if (isOpen(conversation.status)) {
      this.schedulePoll(POLL_MS);
    } else {
      this.stopPolling();
    }
  }

  private schedulePoll(delayMs: number): void {
    this.stopPolling();
    this.pollTimer = setTimeout(() => void this.pollConversation(), delayMs);
  }

  private async pollConversation(): Promise<void> {
    const siteId = this.siteId();
    const conversation = this.activeConversation();
    if (!siteId || !conversation) return;

    try {
      const { conversation: fresh } = await this.intakeApi.getConversation(siteId, conversation.id);
      this.activeConversation.set(fresh);
      this.maybePoll(fresh);
    } catch {
      this.schedulePoll(POLL_MS * 2);
    }
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
