import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Subscription, interval, startWith, switchMap } from 'rxjs';
import {
  MOCK_ARTICLE_CLAIMS,
  MOCK_CONVERSATIONS,
  MOCK_INBOUND_MESSAGES,
} from './intake-studio.mock';
import { IntakeStudioApiService } from './intake-studio-api.service';
import { dtoToConversationView, dtoToInboundView } from './intake-studio.live';
import type {
  ConversationView,
  IntakeChannel,
  IntakeRoutingOutcome,
} from './intake-view.model';
import {
  TRIGGER_LABELS,
  formatAge,
  formatExpiry,
  isOpenConversation,
  renderQuestionForChannel,
  routingBadge,
  sortOpenConversations,
  unconfirmedAiClaimCount,
} from './intake-studio.util';

type StudioTab = 'dashboard' | 'inbound' | 'claims' | 'channels';

/**
 * Intake Studio (Phase 0 prototype) — a clickable, hardcoded-data surface for
 * confirming the admin observability interface before any backend exists.
 * Tabs: conversation dashboard, conversation drill-down, inbound message log,
 * claims ledger, and the channel-render preview.
 */
@Component({
  selector: 'app-intake-studio',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './intake-studio.component.html',
  styleUrl: './intake-studio.component.scss',
})
export class IntakeStudioComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(IntakeStudioApiService);

  /** Polling cadence for live data when a real site is bound. */
  private static readonly POLL_MS = 5000;

  readonly tab = signal<StudioTab>('dashboard');
  readonly selectedConversationId = signal<string | null>(MOCK_CONVERSATIONS[0]?.id ?? null);
  readonly channelPreviewId = signal<IntakeChannel>('sms');

  /** When set (?siteId=...), the studio shows live data; otherwise fixtures. */
  readonly siteId = signal<string | null>(null);
  readonly isLive = computed(() => this.siteId() !== null);
  readonly loadError = signal<string | null>(null);

  private readonly conversations = signal<ConversationView[]>(MOCK_CONVERSATIONS);
  readonly inboundMessages = signal(MOCK_INBOUND_MESSAGES);
  readonly articleClaims = signal(MOCK_ARTICLE_CLAIMS);

  readonly triggerLabels = TRIGGER_LABELS;

  private pollSub?: Subscription;

  constructor() {
    // Match the lab "void" chrome used by sibling lab routes.
    document.documentElement.classList.add('void-lab', 'void-white');
    this.destroyRef.onDestroy(() => {
      document.documentElement.classList.remove('void-lab', 'void-white');
    });

    const siteId = this.route.snapshot.queryParamMap.get('siteId');
    if (siteId) {
      this.siteId.set(siteId);
      this.startLivePolling(siteId);
    }
  }

  private startLivePolling(siteId: string): void {
    this.pollSub?.unsubscribe();
    this.pollSub = interval(IntakeStudioComponent.POLL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.api.listConversations$(siteId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.loadError.set(null);
          this.conversations.set(
            [...res.open, ...res.completed].map(dtoToConversationView),
          );
          if (!this.selectedConversationId() && res.open[0]) {
            this.selectedConversationId.set(res.open[0].id);
          }
        },
        error: () => this.loadError.set('Failed to load live intake data'),
      });

    this.api
      .listInboundMessages$(siteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.inboundMessages.set(res.messages.map(dtoToInboundView)),
        error: () => {},
      });
  }

  readonly openConversations = computed(() =>
    sortOpenConversations(this.conversations().filter(isOpenConversation)),
  );

  readonly completedConversations = computed(() =>
    this.conversations()
      .filter((c) => !isOpenConversation(c))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
  );

  readonly selectedConversation = computed<ConversationView | null>(() => {
    const id = this.selectedConversationId();
    return this.conversations().find((c) => c.id === id) ?? null;
  });

  readonly blockingCount = computed(
    () => this.openConversations().filter((c) => c.blocking).length,
  );

  readonly expiringSoonCount = computed(() => {
    const soon = Date.now() + 24 * 3_600_000;
    return this.openConversations().filter((c) => {
      const q = c.questions[c.currentQuestionIndex];
      return q ? new Date(q.expiresAt).getTime() < soon : false;
    }).length;
  });

  readonly unconfirmedClaims = computed(() =>
    unconfirmedAiClaimCount(this.articleClaims().claims),
  );

  readonly channelRenders = computed(() => {
    const conv = this.selectedConversation() ?? this.conversations()[0];
    const question = conv?.questions[conv.currentQuestionIndex] ?? conv?.questions[0];
    if (!question) return null;
    return {
      questionText: question.text,
      sms: renderQuestionForChannel(question, 'sms'),
      inApp: renderQuestionForChannel(question, 'in_app'),
    };
  });

  setTab(tab: StudioTab): void {
    this.tab.set(tab);
  }

  selectConversation(id: string): void {
    this.selectedConversationId.set(id);
    this.tab.set('dashboard');
  }

  setChannelPreview(channel: IntakeChannel): void {
    this.channelPreviewId.set(channel);
  }

  ageLabel(iso: string): string {
    return formatAge(iso);
  }

  expiryLabel(iso: string): string {
    return formatExpiry(iso);
  }

  routingBadgeFor(outcome: IntakeRoutingOutcome) {
    return routingBadge(outcome);
  }

  currentQuestionText(c: ConversationView): string {
    return c.questions[c.currentQuestionIndex]?.text ?? '—';
  }

  currentExpiry(c: ConversationView): string {
    const q = c.questions[c.currentQuestionIndex];
    return q ? formatExpiry(q.expiresAt) : '—';
  }
}
