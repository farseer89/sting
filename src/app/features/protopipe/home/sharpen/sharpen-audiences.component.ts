import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
  type WritableSignal,
} from '@angular/core';
import type { ProtopipeAudienceProfile, ProtopipeContextCard } from '@hive/contracts';
import { forkJoin } from 'rxjs';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';

type AudienceDraft = ProtopipeAudienceProfile;

const MAX_TARGET_CUSTOMERS = 5;

function emptyDraft(id: string): AudienceDraft {
  return {
    id,
    label: '',
    description: '',
    intentCluster: 'Custom audience',
    exampleQueries: [],
    origin: 'user',
  };
}

@Component({
  selector: 'app-sharpen-audiences',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sharpen-audiences.component.html',
  styleUrl: './sharpen-audiences.component.scss',
})
export class SharpenAudiencesComponent implements OnInit {
  private readonly api = inject(ProtopipeApiService);
  private readonly strategy = inject(ProtopipeStrategyService);

  readonly siteId = input.required<string>();
  readonly changed = output<void>();
  readonly questionsRequested = output<void>();

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly savingTargetCustomers = signal(false);
  readonly targetCustomerStatus = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly audiences = signal<ProtopipeAudienceProfile[]>([]);
  readonly pendingCards = signal<ProtopipeContextCard[]>([]);
  readonly summaryVersion = signal(1);
  readonly editingId = signal<string | null>(null);
  readonly draft = signal<AudienceDraft | null>(null);

  readonly targetCustomerSites = signal<string[]>([]);
  readonly savedTargetCustomerSites = signal<string[]>([]);
  readonly targetCustomerDraft = signal('');
  readonly maxTargetCustomers = MAX_TARGET_CUSTOMERS;

  readonly targetCustomersDirty = computed(() => {
    const current = this.targetCustomerSites();
    const saved = this.savedTargetCustomerSites();
    if (current.length !== saved.length) return true;
    const a = [...current].sort();
    const b = [...saved].sort();
    return a.some((v, i) => v !== b[i]);
  });

  ngOnInit(): void {
    this.syncTargetCustomersFromProfile();
    this.reload();
  }

  private syncTargetCustomersFromProfile(): void {
    const saved = this.strategy.onboardingProfile()?.targetCustomerSites ?? [];
    const copy = [...saved];
    this.targetCustomerSites.set(copy);
    this.savedTargetCustomerSites.set(copy);
  }

  reload(): void {
    const siteId = this.siteId();
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      audiences: this.api.listAudiences$(siteId),
      questions: this.api.listContextCards$(siteId, {
        status: 'pending',
        type: 'question',
        geoSignal: false,
      }),
    }).subscribe({
      next: ({ audiences, questions }) => {
        this.audiences.set(audiences.audiences ?? []);
        this.summaryVersion.set(audiences.summaryVersion ?? 1);
        this.pendingCards.set(
          (questions.cards ?? []).filter(
            (c) => c.topic === 'customer_fit' && c.source.avatarId,
          ),
        );
        this.syncTargetCustomersFromProfile();
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(parseProtopipeApiError(err, 'Could not load audiences.'));
        this.loading.set(false);
      },
    });
  }

  pendingCountFor(audienceId: string): number {
    return this.pendingCards().filter((c) => c.source.avatarId === audienceId).length;
  }

  completeness(a: ProtopipeAudienceProfile): string {
    const fields = [
      a.description,
      a.intentCluster,
      a.exampleQueries?.length ? 'x' : '',
      a.emotionalState,
      a.whatTheyNeed,
      a.voiceTheyRespondTo,
    ];
    const filled = fields.filter((f) => typeof f === 'string' && f.trim()).length;
    return `${filled} of ${fields.length} fields filled`;
  }

  isEditingExisting(): boolean {
    const id = this.editingId();
    if (!id) return false;
    return this.audiences().some((a) => a.id === id);
  }

  startAdd(): void {
    const id = `user-${Date.now()}`;
    this.editingId.set(id);
    this.draft.set(emptyDraft(id));
  }

  startEdit(a: ProtopipeAudienceProfile): void {
    this.editingId.set(a.id);
    this.draft.set({ ...a, exampleQueries: [...(a.exampleQueries ?? [])] });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.draft.set(null);
  }

  updateDraftField(field: keyof AudienceDraft, value: string): void {
    const current = this.draft();
    if (!current) return;
    this.draft.set({ ...current, [field]: value });
  }

  updateDraftQueries(value: string): void {
    const current = this.draft();
    if (!current) return;
    const exampleQueries = value
      .split('\n')
      .map((q) => q.trim())
      .filter(Boolean)
      .slice(0, 10);
    this.draft.set({ ...current, exampleQueries });
  }

  queriesText(): string {
    return (this.draft()?.exampleQueries ?? []).join('\n');
  }

  addTargetCustomer(event?: Event): void {
    event?.preventDefault();
    this.commitDraft(
      this.targetCustomerDraft,
      this.targetCustomerSites,
      MAX_TARGET_CUSTOMERS,
      (v) => v.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase(),
    );
  }

  removeTargetCustomer(index: number): void {
    this.targetCustomerSites.update((list) => list.filter((_, i) => i !== index));
  }

  onTargetCustomerDraftInput(value: string): void {
    this.targetCustomerDraft.set(value);
  }

  saveTargetCustomers(): void {
    const siteId = this.siteId();
    if (!siteId || this.savingTargetCustomers()) return;

    this.savingTargetCustomers.set(true);
    this.error.set(null);
    this.targetCustomerStatus.set(null);

    this.api
      .updateTargetCustomers$(siteId, {
        targetCustomerSites: this.targetCustomerSites(),
      })
      .subscribe({
        next: (res) => {
          const saved = res.targetCustomerSites ?? [];
          this.targetCustomerSites.set(saved);
          this.savedTargetCustomerSites.set([...saved]);
          this.savingTargetCustomers.set(false);
          if (res.discoveryRunId) {
            this.targetCustomerStatus.set('Rescanning example sites for keyword fit…');
          } else {
            this.targetCustomerStatus.set('Saved.');
          }
          this.changed.emit();
        },
        error: (err) => {
          this.error.set(parseProtopipeApiError(err, 'Could not save target customer sites.'));
          this.savingTargetCustomers.set(false);
        },
      });
  }

  saveDraft(): void {
    const siteId = this.siteId();
    const draft = this.draft();
    if (!siteId || !draft?.description.trim()) {
      this.error.set('Description is required.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.api
      .upsertAudience$(siteId, draft.id, {
        profile: {
          id: draft.id,
          label: draft.label?.trim() || draft.intentCluster,
          description: draft.description.trim(),
          intentCluster: draft.intentCluster.trim() || 'Custom audience',
          exampleQueries: draft.exampleQueries ?? [],
          emotionalState: draft.emotionalState?.trim() || undefined,
          whatTheyNeed: draft.whatTheyNeed?.trim() || undefined,
          voiceTheyRespondTo: draft.voiceTheyRespondTo?.trim() || undefined,
          origin: draft.origin ?? 'user',
        },
        expectedSummaryVersion: this.summaryVersion(),
      })
      .subscribe({
        next: (res) => {
          this.summaryVersion.set(res.summaryVersion);
          this.cancelEdit();
          this.saving.set(false);
          this.reload();
          this.changed.emit();
        },
        error: (err) => {
          this.error.set(parseProtopipeApiError(err, 'Could not save audience.'));
          this.saving.set(false);
        },
      });
  }

  deleteAudience(a: ProtopipeAudienceProfile): void {
    const siteId = this.siteId();
    if (!siteId) return;
    if (!confirm(`Delete audience "${a.label || a.intentCluster}"?`)) return;

    this.saving.set(true);
    this.api
      .deleteAudience$(siteId, a.id, { expectedSummaryVersion: this.summaryVersion() })
      .subscribe({
        next: (res) => {
          this.summaryVersion.set(res.summaryVersion);
          this.saving.set(false);
          this.reload();
          this.changed.emit();
        },
        error: (err) => {
          this.error.set(parseProtopipeApiError(err, 'Could not delete audience.'));
          this.saving.set(false);
        },
      });
  }

  private commitDraft(
    draft: WritableSignal<string>,
    list: WritableSignal<string[]>,
    max: number,
    normalize?: (value: string) => string,
  ): void {
    const raw = draft();
    const parts = raw
      .split(',')
      .map((p) => (normalize ? normalize(p.trim()) : p.trim()))
      .filter(Boolean);
    if (parts.length === 0) return;
    list.update((current) => {
      const next = [...current];
      for (const part of parts) {
        if (next.length >= max) break;
        if (!next.some((e) => e.toLowerCase() === part.toLowerCase())) {
          next.push(part);
        }
      }
      return next;
    });
    draft.set('');
  }
}
