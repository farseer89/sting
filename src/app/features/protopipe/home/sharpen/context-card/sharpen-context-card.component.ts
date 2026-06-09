import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import type { ProtopipeContextCard } from '@hive/contracts';
import type { ClaimVerdict } from './context-card-answer-forms';
import {
  citationLabel,
  claimCorrectionField,
  claimNotTrueField,
  composeAnswerValue,
  effectiveTopic,
  emptyDraftForCard,
  fieldsForCard,
  sourceLabel,
  topicLabel,
} from './context-card-answer-forms';

export type SharpenContextCardMode = 'question' | 'claim' | 'geo';

@Component({
  selector: 'app-sharpen-context-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sharpen-context-card.component.html',
  styleUrl: './sharpen-context-card.component.scss',
})
export class SharpenContextCardComponent {
  readonly card = input.required<ProtopipeContextCard>();
  readonly mode = input.required<SharpenContextCardMode>();
  readonly expanded = input(false);
  readonly submitting = input(false);

  readonly expandRequested = output<void>();
  readonly answered = output<string>();
  readonly skipped = output<void>();
  readonly dismissed = output<void>();
  readonly cancelled = output<void>();

  readonly isExpanded = signal(false);
  readonly draft = signal<Record<string, string>>({});
  readonly fieldErrors = signal<Record<string, string>>({});

  readonly fields = computed(() => fieldsForCard(this.card()));
  readonly topicDisplay = computed(() => topicLabel(this.card().topic));
  readonly sourceDisplay = computed(() => sourceLabel(this.card().source.stage));
  readonly citationDisplay = computed(() => citationLabel(this.card()));
  readonly citationTone = computed(() => this.card().citationPotential ?? null);
  readonly formLayout = computed(() => {
    if (this.isClaim()) return 'claim';
    return effectiveTopic(this.card());
  });
  readonly showGeoHint = computed(() => this.mode() === 'geo' || this.card().geoSignal);
  readonly isClaim = computed(() => this.card().type === 'claim');
  readonly claimVerdict = computed(() => (this.draft()['verdict'] ?? '') as ClaimVerdict);
  readonly showClaimCorrection = computed(
    () => this.isClaim() && this.claimVerdict() === 'correct',
  );
  readonly showClaimNotTrue = computed(
    () => this.isClaim() && this.claimVerdict() === 'not_true',
  );
  readonly claimVerdictOptions = computed(() => {
    const verdictField = this.fields().find((f) => f.key === 'verdict');
    return verdictField?.options ?? [];
  });

  constructor() {
    effect(() => {
      this.isExpanded.set(this.expanded());
    });

    effect(() => {
      const card = this.card();
      if (card) {
        this.draft.set(emptyDraftForCard(card));
        this.fieldErrors.set({});
      }
    });
  }

  onAnswerClick(): void {
    this.expandRequested.emit();
    this.isExpanded.set(true);
    this.fieldErrors.set({});
  }

  onCancel(): void {
    this.isExpanded.set(false);
    this.draft.set(emptyDraftForCard(this.card()));
    this.fieldErrors.set({});
    this.cancelled.emit();
  }

  onSkip(): void {
    this.skipped.emit();
  }

  onDismiss(): void {
    this.dismissed.emit();
  }

  setField(key: string, value: string): void {
    this.draft.update((d) => ({ ...d, [key]: value }));
    this.fieldErrors.update((errors) => {
      if (!errors[key]) return errors;
      const next = { ...errors };
      delete next[key];
      return next;
    });
  }

  setVerdict(value: ClaimVerdict): void {
    this.setField('verdict', value);
  }

  onFieldInput(key: string, event: Event): void {
    this.setField(key, (event.target as HTMLInputElement | HTMLTextAreaElement).value);
  }

  onSelectChange(key: string, event: Event): void {
    this.setField(key, (event.target as HTMLSelectElement).value);
  }

  onSave(): void {
    const result = composeAnswerValue(this.card(), this.draft());
    if (!result.value) {
      this.fieldErrors.set(result.fieldErrors);
      return;
    }
    this.answered.emit(result.value);
  }

  correctionField() {
    return claimCorrectionField(this.card());
  }

  notTrueField() {
    return claimNotTrueField();
  }
}
