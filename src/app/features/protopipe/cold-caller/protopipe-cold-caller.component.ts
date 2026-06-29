import { ChangeDetectionStrategy, Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  Prospect,
  SalesInteraction,
  SalesInteractionChannel,
  SalesInteractionOutcome,
  SalesInteractionPhase,
  SalesInteractionSentiment,
} from '@hive/contracts';
import type { BuildBookProspectContext } from '../build-book/build-book-context';
import { ProtopipeSalesStore } from '../sales/protopipe-sales.store';

type ColdCallerTab = 'pre-call' | 'on-call' | 'post-call';
type MeetingDateOption = { value: string; label: string; deck: string };
type MeetingTimeOption = { value: string; label: string };

function relativeTime(iso: string | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  if (h < 48) return 'yesterday';
  return `${Math.floor(h / 24)}d ago`;
}

function dateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildMeetingDateOptions(): MeetingDateOption[] {
  const formatter = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  return Array.from({ length: 14 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const value = dateValue(date);
    const label = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : formatter.format(date);
    return { value, label, deck: value };
  });
}

function buildMeetingTimeOptions(): MeetingTimeOption[] {
  return Array.from({ length: 22 }, (_, index) => {
    const totalMinutes = 8 * 60 + index * 30;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const label = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
      new Date(2000, 0, 1, hour, minute),
    );
    return { value, label };
  });
}

function localDateAndTimeToIso(dateValue: string, timeValue: string): string | undefined {
  if (!dateValue || !timeValue) return undefined;
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hour, minute] = timeValue.split(':').map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

@Component({
  selector: 'app-protopipe-cold-caller',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ProtopipeSalesStore],
  imports: [FormsModule],
  templateUrl: './protopipe-cold-caller.component.html',
  styleUrl: './protopipe-cold-caller.component.scss',
})
export class ProtopipeColdCallerComponent implements OnInit {
  readonly store = inject(ProtopipeSalesStore);
  readonly buildDemo = output<BuildBookProspectContext>();

  readonly selectedProspectId = signal<string | null>(null);
  readonly interactionPhase = signal<SalesInteractionPhase>('cold_call');
  readonly interactionChannel = signal<SalesInteractionChannel>('phone');
  readonly interactionOutcome = signal<SalesInteractionOutcome>('no_answer');
  readonly interactionSentiment = signal<SalesInteractionSentiment>('unknown');
  readonly interactionScript = signal(
    'Quick opener: I was looking at your local search presence and saw a few places where a stronger site and content system could turn more searchers into booked work.',
  );
  readonly interactionOffer = signal(
    'Offer a fast demo: a Build Book prototype showing the site, offer, and content plan we would launch for them.',
  );
  readonly interactionResearch = signal('');
  readonly interactionNotes = signal('');
  readonly interactionNextStep = signal('');
  readonly meetingDate = signal(dateValue(new Date()));
  readonly meetingTime = signal('');
  readonly meetingContact = signal('');
  readonly schedulingLink = signal('');
  readonly meetingNotes = signal('');
  readonly meetingDialogOpen = signal(false);
  readonly interactionReasonTags = signal('');
  readonly activeTab = signal<ColdCallerTab>('pre-call');

  readonly tabs: Array<{ id: ColdCallerTab; label: string; deck: string }> = [
    { id: 'pre-call', label: 'Pre call', deck: 'Research and caller context' },
    { id: 'on-call', label: 'On call', deck: 'Readable script and pitch' },
    { id: 'post-call', label: 'Post call', deck: 'Review outcome and results' },
  ];

  readonly activeProspect = computed(() => {
    const selectedId = this.selectedProspectId();
    return this.store.prospects().find((prospect) => prospect.id === selectedId)
      ?? this.callQueue()[0]
      ?? null;
  });

  readonly activeProspectInteractions = computed(() => {
    const prospect = this.activeProspect();
    return prospect ? this.store.interactionsForProspect(prospect.id) : [];
  });

  readonly callQueue = computed(() =>
    [...this.store.prospects()].sort((a, b) => {
      const priorityScore = (prospect: Prospect): number =>
        ({ critical: 0, high: 1, medium: 2, monitor: 3 })[prospect.priority] ?? 4;
      const byPriority = priorityScore(a) - priorityScore(b);
      if (byPriority !== 0) return byPriority;
      return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
    }),
  );

  readonly pastCalls = computed(() => this.store.interactions().slice(0, 80));
  readonly meetingDateOptions = computed(() => buildMeetingDateOptions());
  readonly meetingTimeOptions = buildMeetingTimeOptions();

  readonly interactionPhases: SalesInteractionPhase[] = [
    'cold_call',
    'follow_up',
    'meeting',
    'demo',
    'proposal',
    'nurture',
  ];
  readonly interactionChannels: SalesInteractionChannel[] = [
    'phone',
    'email',
    'sms',
    'video',
    'in_person',
    'referral',
    'manual',
  ];
  readonly interactionOutcomes: SalesInteractionOutcome[] = [
    'no_answer',
    'left_voicemail',
    'connected',
    'not_interested',
    'gatekeeper',
    'call_back',
    'meeting_booked',
    'qualified',
    'unqualified',
    'email_sent',
    'email_replied',
    'demo_booked',
    'proposal_sent',
    'won',
    'lost',
  ];
  readonly interactionSentiments: SalesInteractionSentiment[] = [
    'unknown',
    'cold',
    'neutral',
    'warm',
    'hot',
  ];

  async ngOnInit(): Promise<void> {
    await this.store.load();
    const first = this.callQueue()[0];
    if (first) {
      this.selectedProspectId.set(first.id);
    }
  }

  selectProspect(prospect: Prospect): void {
    this.selectedProspectId.set(prospect.id);
    this.activeTab.set('pre-call');
  }

  selectPastCall(interaction: SalesInteraction): void {
    this.selectedProspectId.set(interaction.prospectId);
    this.activeTab.set('post-call');
  }

  selectTab(tab: ColdCallerTab): void {
    this.activeTab.set(tab);
  }

  openMeetingDialog(): void {
    this.meetingDialogOpen.set(true);
  }

  closeMeetingDialog(): void {
    this.meetingDialogOpen.set(false);
  }

  markMeetingBooked(): void {
    this.interactionPhase.set('meeting');
    this.interactionOutcome.set('meeting_booked');
    this.interactionSentiment.set('warm');
    if (!this.interactionNextStep().trim()) {
      this.interactionNextStep.set('Meeting booked');
    }
  }

  async markSchedulingLinkSent(prospect: Prospect): Promise<void> {
    const link = this.schedulingLink().trim();
    const contact = this.meetingContact().trim();
    const note = this.meetingNotes().trim();
    const saved = await this.store.recordSalesInteraction({
      prospectId: prospect.id,
      phase: 'follow_up',
      channel: contact.includes('@') ? 'email' : 'manual',
      outcome: 'email_sent',
      sentiment: 'warm',
      offerSummary: this.interactionOffer(),
      researchBrief: {
        summary: prospect.topSignal,
        signals: [prospect.topSignal].filter((signal): signal is string => Boolean(signal)),
        objections: [],
        opportunities: ['Scheduling link sent'],
      },
      notes: [
        'Scheduling link sent to prospect.',
        contact ? `Contact: ${contact}` : '',
        link ? `Link: ${link}` : '',
        note,
      ].filter(Boolean).join('\n'),
      outcomeReasonTags: ['scheduling_link_sent'],
      nextStep: 'Await meeting booking',
    });
    if (saved) {
      this.meetingNotes.set('');
      this.closeMeetingDialog();
      this.activeTab.set('post-call');
    }
  }

  async saveBookedMeeting(prospect: Prospect): Promise<void> {
    const scheduledFor = localDateAndTimeToIso(this.meetingDate(), this.meetingTime());
    if (!scheduledFor) return;
    const contact = this.meetingContact().trim();
    const note = this.meetingNotes().trim();
    const saved = await this.store.recordSalesInteraction({
      prospectId: prospect.id,
      phase: 'meeting',
      channel: 'video',
      outcome: 'meeting_booked',
      sentiment: 'warm',
      offerSummary: this.interactionOffer(),
      researchBrief: {
        summary: prospect.topSignal,
        signals: [prospect.topSignal].filter((signal): signal is string => Boolean(signal)),
        objections: [],
        opportunities: ['Meeting booked'],
      },
      notes: [
        'Meeting booked from Cold Caller.',
        contact ? `Contact: ${contact}` : '',
        note,
      ].filter(Boolean).join('\n'),
      outcomeReasonTags: ['meeting_booked'],
      nextStep: 'Attend booked meeting',
      nextStepAt: scheduledFor,
    });
    if (saved) {
      this.interactionOutcome.set('meeting_booked');
      this.interactionPhase.set('meeting');
      this.interactionSentiment.set('warm');
      this.meetingTime.set('');
      this.meetingNotes.set('');
      this.closeMeetingDialog();
      this.activeTab.set('post-call');
    }
  }

  async saveInteraction(prospect: Prospect): Promise<void> {
    const tags = this.interactionReasonTags()
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const researchSummary = this.interactionResearch().trim();
    const saved = await this.store.recordSalesInteraction({
      prospectId: prospect.id,
      phase: this.interactionPhase(),
      channel: this.interactionChannel(),
      outcome: this.interactionOutcome(),
      sentiment: this.interactionSentiment(),
      scriptBody: this.interactionScript(),
      offerSummary: this.interactionOffer(),
      researchBrief: {
        summary: researchSummary || prospect.topSignal,
        signals: [prospect.topSignal, researchSummary].filter((signal): signal is string => Boolean(signal)),
        objections: [],
        opportunities: prospect.websiteStatus === 'none' ? ['No website listed'] : [],
      },
      notes: this.interactionNotes(),
      outcomeReasonTags: tags,
      nextStep: this.interactionNextStep(),
    });

    if (saved) {
      this.selectedProspectId.set(prospect.id);
      this.interactionNotes.set('');
      this.interactionNextStep.set('');
      this.interactionReasonTags.set('');
      this.activeTab.set('post-call');
    }
  }

  nextProspect(): void {
    const queue = this.callQueue();
    const currentId = this.activeProspect()?.id;
    const currentIndex = queue.findIndex((prospect) => prospect.id === currentId);
    const next = queue[currentIndex + 1] ?? queue[0] ?? null;
    if (next) {
      this.selectedProspectId.set(next.id);
      this.activeTab.set('pre-call');
    }
  }

  promoteProspect(prospect: Prospect): void {
    this.buildDemo.emit(this.store.promoteToBuildBook(prospect));
  }

  prospectForInteraction(interaction: SalesInteraction): Prospect | null {
    return this.store.prospects().find((prospect) => prospect.id === interaction.prospectId) ?? null;
  }

  label(value: string | undefined): string {
    return value ? value.replaceAll('_', ' ') : 'none';
  }

  relativeTime = relativeTime;
}
