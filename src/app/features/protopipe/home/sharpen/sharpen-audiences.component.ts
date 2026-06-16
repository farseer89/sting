import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import type { ProtopipeAudienceProfile, ProtopipeContextCard } from '@hive/contracts';
import { forkJoin } from 'rxjs';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';

type AudienceDraft = ProtopipeAudienceProfile;

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

  readonly siteId = input.required<string>();
  readonly changed = output<void>();
  readonly questionsRequested = output<void>();

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly audiences = signal<ProtopipeAudienceProfile[]>([]);
  readonly pendingCards = signal<ProtopipeContextCard[]>([]);
  readonly summaryVersion = signal(1);
  readonly editingId = signal<string | null>(null);
  readonly draft = signal<AudienceDraft | null>(null);

  ngOnInit(): void {
    this.reload();
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
}
