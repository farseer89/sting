import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import type { ProtopipeContextCard } from '@hive/contracts';
import { forkJoin } from 'rxjs';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';

@Component({
  selector: 'app-protopipe-home-sharpen',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-home-sharpen.component.html',
  styleUrl: './protopipe-home-sharpen.component.scss',
})
export class ProtopipeHomeSharpenComponent implements OnInit {
  private readonly api = inject(ProtopipeApiService);
  private readonly strategy = inject(ProtopipeStrategyService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly questions = signal<ProtopipeContextCard[]>([]);
  readonly claims = signal<ProtopipeContextCard[]>([]);
  readonly questionTotal = signal(0);
  readonly claimTotal = signal(0);
  readonly answeringQuestionId = signal<string | null>(null);
  readonly questionDraft = signal('');
  readonly claimDrafts = signal<Record<string, string>>({});

  readonly pendingTotal = () => this.questionTotal() + this.claimTotal();

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    const siteId = this.strategy.siteId();
    if (!siteId) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      questions: this.api.listContextCards$(siteId, {
        status: 'pending',
        type: 'question',
        geoSignal: false,
      }),
      claims: this.api.listContextCards$(siteId, {
        status: 'pending',
        type: 'claim',
      }),
    }).subscribe({
      next: ({ questions, claims }) => {
        this.questions.set(questions.cards ?? []);
        this.claims.set(claims.cards ?? []);
        this.questionTotal.set(questions.total ?? questions.cards?.length ?? 0);
        this.claimTotal.set(claims.total ?? claims.cards?.length ?? 0);

        const drafts: Record<string, string> = {};
        for (const card of claims.cards ?? []) {
          drafts[card.id] = card.suggestedValue ?? '';
        }
        this.claimDrafts.set(drafts);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(parseProtopipeApiError(err, 'Could not load context cards.'));
        this.loading.set(false);
      },
    });
  }

  startQuestion(card: ProtopipeContextCard): void {
    this.answeringQuestionId.set(card.id);
    this.questionDraft.set('');
  }

  cancelQuestion(): void {
    this.answeringQuestionId.set(null);
    this.questionDraft.set('');
  }

  onQuestionDraftInput(event: Event): void {
    this.questionDraft.set((event.target as HTMLTextAreaElement).value);
  }

  submitQuestion(card: ProtopipeContextCard): void {
    const siteId = this.strategy.siteId();
    const value = this.questionDraft().trim();
    if (!siteId || !value) return;

    this.api.patchContextCard$(siteId, card.id, { status: 'answered', answer: { value } }).subscribe({
      next: () => {
        this.cancelQuestion();
        this.reload();
      },
      error: (err) => {
        this.error.set(parseProtopipeApiError(err, 'Could not save your answer.'));
      },
    });
  }

  skipQuestion(card: ProtopipeContextCard): void {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    this.api.patchContextCard$(siteId, card.id, { status: 'skipped' }).subscribe({
      next: () => this.reload(),
      error: (err) => {
        this.error.set(parseProtopipeApiError(err, 'Could not skip question.'));
      },
    });
  }

  claimDraft(cardId: string): string {
    return this.claimDrafts()[cardId] ?? '';
  }

  setClaimDraft(cardId: string, value: string): void {
    this.claimDrafts.update((drafts) => ({ ...drafts, [cardId]: value }));
  }

  submitClaim(card: ProtopipeContextCard): void {
    const siteId = this.strategy.siteId();
    const value = this.claimDraft(card.id).trim();
    if (!siteId || !value) return;

    this.api.patchContextCard$(siteId, card.id, { status: 'answered', answer: { value } }).subscribe({
      next: () => this.reload(),
      error: (err) => {
        this.error.set(parseProtopipeApiError(err, 'Could not save claim.'));
      },
    });
  }

  skipClaim(card: ProtopipeContextCard): void {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    this.api.patchContextCard$(siteId, card.id, { status: 'skipped' }).subscribe({
      next: () => this.reload(),
      error: (err) => {
        this.error.set(parseProtopipeApiError(err, 'Could not skip claim.'));
      },
    });
  }

  dismissClaim(card: ProtopipeContextCard): void {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    this.api.patchContextCard$(siteId, card.id, { status: 'dismissed' }).subscribe({
      next: () => this.reload(),
      error: (err) => {
        this.error.set(parseProtopipeApiError(err, 'Could not dismiss claim.'));
      },
    });
  }

  topicLabel(card: ProtopipeContextCard): string {
    return card.topic.replace(/_/g, ' ');
  }

  sourceLabel(card: ProtopipeContextCard): string {
    switch (card.source.stage) {
      case 'keyword_discovery':
        return 'From keyword discovery';
      case 'plan_generation':
        return 'From content plan';
      case 'article_generation':
        return 'From article review';
      case 'geo_discovery':
        return 'From AI search analysis';
      case 'project_capture':
        return 'From a project';
      default:
        return 'From strategy';
    }
  }
}
