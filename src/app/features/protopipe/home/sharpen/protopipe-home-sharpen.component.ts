import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import type { ProtopipeContextCard } from '@hive/contracts';
import { firstValueFrom, forkJoin } from 'rxjs';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import {
  PROTOPIPE_AGENT_POLL_INTERVAL_MS,
  PROTOPIPE_AGENT_POLL_MAX_ATTEMPTS,
} from '../../protopipe.constants';
import { SharpenOffersComponent } from './sharpen-offers.component';
import { SharpenProjectsComponent } from './sharpen-projects.component';

export type SharpenTab = 'questions' | 'facts' | 'offers' | 'projects' | 'ai-search';

@Component({
  selector: 'app-protopipe-home-sharpen',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SharpenOffersComponent, SharpenProjectsComponent, DatePipe],
  templateUrl: './protopipe-home-sharpen.component.html',
  styleUrl: './protopipe-home-sharpen.component.scss',
})
export class ProtopipeHomeSharpenComponent implements OnInit {
  private readonly api = inject(ProtopipeApiService);
  readonly strategy = inject(ProtopipeStrategyService);

  readonly activeTab = signal<SharpenTab>('questions');
  readonly hasActiveOffer = signal(false);
  readonly activeProjectCount = signal(0);
  readonly hasReadyProject = signal(false);
  readonly cardsLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly questions = signal<ProtopipeContextCard[]>([]);
  readonly claims = signal<ProtopipeContextCard[]>([]);
  readonly geoCards = signal<ProtopipeContextCard[]>([]);
  readonly questionTotal = signal(0);
  readonly claimTotal = signal(0);
  readonly geoTotal = signal(0);
  readonly answeringQuestionId = signal<string | null>(null);
  readonly answeringGeoId = signal<string | null>(null);
  readonly questionDraft = signal('');
  readonly geoDraft = signal('');
  readonly claimDrafts = signal<Record<string, string>>({});
  readonly geoRunning = signal(false);
  readonly geoError = signal<string | null>(null);
  readonly geoForceAvailable = signal(false);
  readonly lastGeoRunAt = signal<string | null>(null);

  readonly pendingTotal = () => this.questionTotal() + this.claimTotal();

  ngOnInit(): void {
    this.reload();
  }

  setTab(tab: SharpenTab): void {
    this.activeTab.set(tab);
  }

  onOffersChanged(): void {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    this.api.listOfferings$(siteId, { status: 'active' }).subscribe({
      next: (res) => {
        this.hasActiveOffer.set((res.offerings ?? []).some((o) => o.status === 'active'));
      },
    });
  }

  onProjectsChanged(): void {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    this.api.listProjects$(siteId, { status: 'active' }).subscribe({
      next: (res) => {
        const projects = res.projects ?? [];
        this.activeProjectCount.set(projects.length);
        this.hasReadyProject.set(projects.some((p) => p.storyReadiness >= 0.6));
      },
    });
  }

  reload(): void {
    const siteId = this.strategy.siteId();
    if (!siteId) {
      this.cardsLoading.set(false);
      return;
    }

    this.cardsLoading.set(true);
    this.error.set(null);

    forkJoin({
      questions: this.api.listContextCards$(siteId, {
        status: 'pending',
        type: 'question',
        geoSignal: false,
      }),
      geo: this.api.listContextCards$(siteId, {
        status: 'pending',
        type: 'question',
        geoSignal: true,
      }),
      claims: this.api.listContextCards$(siteId, {
        status: 'pending',
        type: 'claim',
      }),
      offerings: this.api.listOfferings$(siteId, { status: 'active' }),
      projects: this.api.listProjects$(siteId, { status: 'active' }),
    }).subscribe({
      next: ({ questions, geo, claims, offerings, projects }) => {
        this.questions.set(questions.cards ?? []);
        this.geoCards.set(geo.cards ?? []);
        this.claims.set(claims.cards ?? []);
        this.questionTotal.set(questions.total ?? questions.cards?.length ?? 0);
        this.geoTotal.set(geo.total ?? geo.cards?.length ?? 0);
        this.claimTotal.set(claims.total ?? claims.cards?.length ?? 0);
        this.hasActiveOffer.set((offerings.offerings ?? []).some((o) => o.status === 'active'));
        const projectList = projects.projects ?? [];
        this.activeProjectCount.set(projectList.length);
        this.hasReadyProject.set(projectList.some((p) => p.storyReadiness >= 0.6));

        const drafts: Record<string, string> = {};
        for (const card of claims.cards ?? []) {
          drafts[card.id] = card.suggestedValue ?? '';
        }
        this.claimDrafts.set(drafts);
        this.cardsLoading.set(false);
      },
      error: (err) => {
        this.error.set(parseProtopipeApiError(err, 'Could not load context cards.'));
        this.cardsLoading.set(false);
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

  citationLabel(card: ProtopipeContextCard): string | null {
    if (!card.geoSignal || !card.citationPotential) return null;
    return `${card.citationPotential} citation potential`;
  }

  async runGeoDiscovery(force = false): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId || this.geoRunning()) return;

    this.geoRunning.set(true);
    this.geoError.set(null);
    if (force) {
      this.geoForceAvailable.set(false);
    }

    try {
      const { run } = await this.api.enqueueAgentRun(siteId, {
        type: 'geo_discovery',
        params: force ? { force: true } : undefined,
      });
      await this.pollGeoRun(siteId, run.id);
      this.lastGeoRunAt.set(new Date().toISOString());
      this.geoForceAvailable.set(false);
      this.reload();
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409) {
        this.geoForceAvailable.set(true);
      }
      this.geoError.set(parseProtopipeApiError(err, 'Could not run AI search analysis.'));
    } finally {
      this.geoRunning.set(false);
    }
  }

  private async pollGeoRun(siteId: string, runId: string): Promise<void> {
    for (let i = 0; i < PROTOPIPE_AGENT_POLL_MAX_ATTEMPTS; i++) {
      await new Promise((r) => setTimeout(r, PROTOPIPE_AGENT_POLL_INTERVAL_MS));
      const res = await firstValueFrom(this.api.getAgentRun$(siteId, runId));
      const status = res?.run.status;
      if (status === 'succeeded') return;
      if (status === 'failed') {
        throw new Error(res.run.error ?? 'AI search analysis failed');
      }
    }
    throw new Error('AI search analysis timed out');
  }

  startGeo(card: ProtopipeContextCard): void {
    this.answeringGeoId.set(card.id);
    this.geoDraft.set('');
  }

  cancelGeo(): void {
    this.answeringGeoId.set(null);
    this.geoDraft.set('');
  }

  onGeoDraftInput(event: Event): void {
    this.geoDraft.set((event.target as HTMLTextAreaElement).value);
  }

  submitGeo(card: ProtopipeContextCard): void {
    const siteId = this.strategy.siteId();
    const value = this.geoDraft().trim();
    if (!siteId || !value) return;

    this.api.patchContextCard$(siteId, card.id, { status: 'answered', answer: { value } }).subscribe({
      next: () => {
        this.cancelGeo();
        this.reload();
      },
      error: (err) => {
        this.error.set(parseProtopipeApiError(err, 'Could not save your answer.'));
      },
    });
  }

  skipGeo(card: ProtopipeContextCard): void {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    this.api.patchContextCard$(siteId, card.id, { status: 'skipped' }).subscribe({
      next: () => this.reload(),
      error: (err) => {
        this.error.set(parseProtopipeApiError(err, 'Could not skip question.'));
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
