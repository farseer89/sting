import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import type { ProtopipeContextCard } from '@hive/contracts';
import { ProtopipeApiService } from '../../protopipe-api.service';

@Component({
  selector: 'app-strategy-tune-content',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="strat-intel" aria-labelledby="tune-content-heading">
      <div class="strat-intel__head">
        <h2 id="tune-content-heading" class="strat-intel__title">Tune your content</h2>
        @if (pendingCount() > 0) {
          <span class="strat-intel__badge">{{ pendingCount() }}</span>
        }
      </div>
      <p class="strat-intel__lede">
        Answer a few questions so generated content matches how you actually run your business.
      </p>

      @if (loading()) {
        <p class="strat-intel__status" aria-busy="true">Loading questions…</p>
      } @else if (error()) {
        <p class="strat-intel__status strat-intel__status--error">{{ error() }}</p>
      } @else if (cards().length === 0) {
        <p class="strat-intel__status">No open questions yet — run keyword discovery to get started.</p>
      } @else {
        <ul class="strat-intel__list">
          @for (card of cards(); track card.id) {
            <li class="strat-intel__card">
              <p class="strat-intel__question">{{ card.cardText }}</p>
              @if (answeringId() === card.id) {
                <textarea
                  class="strat-intel__input"
                  rows="2"
                  [value]="draftAnswer()"
                  (input)="onDraftInput($event)"
                  placeholder="Your answer (1–2 sentences)"
                ></textarea>
                <div class="strat-intel__actions">
                  <button type="button" class="strat-intel__btn" (click)="submitAnswer(card)">Save</button>
                  <button type="button" class="strat-intel__btn strat-intel__btn--ghost" (click)="cancelAnswer()">
                    Cancel
                  </button>
                </div>
              } @else {
                <div class="strat-intel__actions">
                  <button type="button" class="strat-intel__btn" (click)="startAnswer(card)">Answer</button>
                  <button type="button" class="strat-intel__btn strat-intel__btn--ghost" (click)="skip(card)">
                    Skip
                  </button>
                </div>
              }
            </li>
          }
        </ul>
      }
    </section>
  `,
  styleUrl: './strategy-intel.shared.scss',
})
export class StrategyTuneContentComponent implements OnInit {
  readonly siteId = input.required<string>();

  private readonly api = inject(ProtopipeApiService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly cards = signal<ProtopipeContextCard[]>([]);
  readonly pendingCount = signal(0);
  readonly answeringId = signal<string | null>(null);
  readonly draftAnswer = signal('');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    const siteId = this.siteId();
    if (!siteId) return;
    this.loading.set(true);
    this.error.set(null);
    this.api
      .listContextCards$(siteId, { status: 'pending', type: 'question', geoSignal: false })
      .subscribe({
        next: (res) => {
          const top = (res.cards ?? []).slice(0, 5);
          this.cards.set(top);
          this.pendingCount.set(res.total ?? top.length);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Could not load questions.');
          this.loading.set(false);
        },
      });
  }

  startAnswer(card: ProtopipeContextCard): void {
    this.answeringId.set(card.id);
    this.draftAnswer.set('');
  }

  cancelAnswer(): void {
    this.answeringId.set(null);
    this.draftAnswer.set('');
  }

  onDraftInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.draftAnswer.set(value);
  }

  submitAnswer(card: ProtopipeContextCard): void {
    const value = this.draftAnswer().trim();
    if (!value) return;
    const siteId = this.siteId();
    this.api.patchContextCard$(siteId, card.id, { status: 'answered', answer: { value } }).subscribe({
      next: () => {
        this.cancelAnswer();
        this.reload();
      },
      error: () => this.error.set('Could not save your answer.'),
    });
  }

  skip(card: ProtopipeContextCard): void {
    const siteId = this.siteId();
    this.api.patchContextCard$(siteId, card.id, { status: 'skipped' }).subscribe({
      next: () => this.reload(),
      error: () => this.error.set('Could not skip question.'),
    });
  }
}
