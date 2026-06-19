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
  readonly openByTrigger = signal<Partial<Record<ProtopipeIntakeTriggerType, ProtopipePendingConversation>>>(
    {},
  );

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
      const [{ contacts }, { open }] = await Promise.all([
        this.contactsApi.list(siteId),
        this.intakeApi.listConversations(siteId),
      ]);
      this.contacts.set(contacts);
      this.syncOpenConversations(open, resolveTargetContact(contacts));
    } catch (err) {
      this.loadError.set(parseProtopipeApiError(err, 'Could not load SMS contacts.'));
    } finally {
      this.loading.set(false);
    }
  }

  hasOpenTrigger(triggerType: ProtopipeIntakeTriggerType): boolean {
    return !!this.openByTrigger()[triggerType];
  }

  selectOpen(triggerType: ProtopipeIntakeTriggerType): void {
    const conversation = this.openByTrigger()[triggerType];
    if (!conversation) return;
    this.actionError.set(null);
    this.activeConversation.set(conversation);
    this.maybePoll(conversation);
  }

  async sendTrigger(card: TriggerCard, restart = false): Promise<void> {
    if (card.inboundOnly || this.sending()) return;

    const siteId = this.siteId();
    if (!siteId || !this.targetContact()) {
      this.actionError.set('Add an owner contact in SMS Contacts before sending.');
      return;
    }

    if (!restart && this.hasOpenTrigger(card.triggerType)) {
      this.selectOpen(card.triggerType);
      return;
    }

    this.sending.set(card.triggerType);
    this.actionError.set(null);

    const body: OpenProtopipeIntakeConversationRequest = {
      triggerType: card.triggerType,
      restart,
    };
    if (card.triggerType === 'journalist') {
      body.questionText = "What's been your most interesting project lately?";
    }

    try {
      const { conversation } = await this.intakeApi.openConversation(siteId, body);
      this.activeConversation.set(conversation);
      this.openByTrigger.update((map) => ({ ...map, [card.triggerType]: conversation }));
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

  startOver(card: TriggerCard): void {
    void this.sendTrigger(card, true);
  }

  private syncOpenConversations(
    open: ProtopipePendingConversation[],
    contact: ProtopipeContact | null,
  ): void {
    if (!contact) {
      this.openByTrigger.set({});
      return;
    }
    const forContact = open.filter((c) => c.contactId === contact.phone);
    const map: Partial<Record<ProtopipeIntakeTriggerType, ProtopipePendingConversation>> = {};
    for (const conversation of forContact) {
      map[conversation.triggerType] = conversation;
    }
    this.openByTrigger.set(map);
    const preferred =
      map.onboarding ??
      forContact.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )[0];
    if (preferred) {
      this.activeConversation.set(preferred);
      this.maybePoll(preferred);
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
      if (isOpen(fresh.status)) {
        this.openByTrigger.update((map) => ({ ...map, [fresh.triggerType]: fresh }));
      } else {
        this.openByTrigger.update((map) => {
          const next = { ...map };
          delete next[fresh.triggerType];
          return next;
        });
      }
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
