import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
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
import {
  SharpenContextCardComponent,
} from './context-card/sharpen-context-card.component';
import { SharpenAudiencesComponent } from './sharpen-audiences.component';
import { SharpenOffersComponent } from './sharpen-offers.component';
import { SharpenProjectsComponent } from './sharpen-projects.component';

export type SharpenTab = 'questions' | 'audiences' | 'facts' | 'offers' | 'projects' | 'ai-search';

@Component({
  selector: 'app-protopipe-home-sharpen',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SharpenContextCardComponent,
    SharpenAudiencesComponent,
    SharpenOffersComponent,
    SharpenProjectsComponent,
    DatePipe,
  ],
  templateUrl: './protopipe-home-sharpen.component.html',
  styleUrl: './protopipe-home-sharpen.component.scss',
})
export class ProtopipeHomeSharpenComponent implements OnInit {
  private readonly api = inject(ProtopipeApiService);
  readonly strategy = inject(ProtopipeStrategyService);

  readonly initialTab = input<SharpenTab | null>(null);
  readonly initialTabConsumed = output<void>();

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
  readonly expandedCardId = signal<string | null>(null);
  readonly submittingCardId = signal<string | null>(null);
  readonly geoRunning = signal(false);
  readonly geoError = signal<string | null>(null);
  readonly geoForceAvailable = signal(false);
  readonly lastGeoRunAt = signal<string | null>(null);

  readonly pendingTotal = () => this.questionTotal() + this.claimTotal();

  ngOnInit(): void {
    const tab = this.initialTab();
    if (tab) {
      this.activeTab.set(tab);
      this.initialTabConsumed.emit();
    }
    this.reload();
  }

  setTab(tab: SharpenTab): void {
    this.activeTab.set(tab);
    this.expandedCardId.set(null);
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
    this.expandedCardId.set(null);

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
        this.cardsLoading.set(false);
      },
      error: (err) => {
        this.error.set(parseProtopipeApiError(err, 'Could not load context cards.'));
        this.cardsLoading.set(false);
      },
    });
  }

  expandCard(cardId: string): void {
    this.expandedCardId.set(cardId);
  }

  collapseCard(): void {
    this.expandedCardId.set(null);
  }

  isCardExpanded(cardId: string): boolean {
    return this.expandedCardId() === cardId;
  }

  isCardSubmitting(cardId: string): boolean {
    return this.submittingCardId() === cardId;
  }

  onCardAnswered(card: ProtopipeContextCard, value: string): void {
    this.patchCard(card, { status: 'answered', answer: { value } });
  }

  onCardSkipped(card: ProtopipeContextCard): void {
    this.patchCard(card, { status: 'skipped' });
  }

  onCardDismissed(card: ProtopipeContextCard): void {
    this.patchCard(card, { status: 'dismissed' });
  }

  private patchCard(
    card: ProtopipeContextCard,
    body: { status: 'answered'; answer: { value: string } } | { status: 'skipped' | 'dismissed' },
  ): void {
    const siteId = this.strategy.siteId();
    if (!siteId) return;

    this.submittingCardId.set(card.id);
    this.error.set(null);

    this.api.patchContextCard$(siteId, card.id, body).subscribe({
      next: () => {
        this.submittingCardId.set(null);
        this.expandedCardId.set(null);
        this.reload();
      },
      error: (err) => {
        this.submittingCardId.set(null);
        const fallback =
          body.status === 'answered'
            ? 'Could not save your answer.'
            : body.status === 'skipped'
              ? 'Could not skip question.'
              : 'Could not dismiss claim.';
        this.error.set(parseProtopipeApiError(err, fallback));
      },
    });
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
      const msg = parseProtopipeApiError(err, 'Could not run AI search analysis.');
      if (
        (err instanceof HttpErrorResponse && err.status === 409) ||
        msg.includes('run recently')
      ) {
        this.geoForceAvailable.set(true);
      }
      this.geoError.set(msg);
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
}
