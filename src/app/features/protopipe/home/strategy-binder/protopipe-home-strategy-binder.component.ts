import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import type { ProtopipeContentPlanCalendarItem, ProtopipeSiteContentPlan } from '@hive/contracts';
import { ProtopipeHomeStrategyViewState } from '../strategy/protopipe-home-strategy-view.state';
import {
  mapStrategyBinderView,
  type StrategyBinderKeyword,
} from './strategy-binder.mapper';

export type StrategySection = 'overview' | 'pillars' | 'calendar' | 'backlog' | 'keywords' | 'tune';

@Component({
  selector: 'app-protopipe-home-strategy-binder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-home-strategy-binder.component.html',
  styleUrl: './protopipe-home-strategy-binder.component.scss',
})
export class ProtopipeHomeStrategyBinderComponent {
  private readonly viewState = inject(ProtopipeHomeStrategyViewState);

  readonly plan = input.required<ProtopipeSiteContentPlan>();
  readonly siteLabel = input('');
  readonly strategySummary = input('');

  readonly activeSection = signal<StrategySection>('overview');

  readonly vm = computed(() =>
    mapStrategyBinderView(this.plan(), this.siteLabel(), this.strategySummary()),
  );

  readonly stats = computed(() => this.vm().stats);
  readonly narrative = computed(() => this.vm().narrative);
  readonly mastheadDeck = computed(() => this.vm().mastheadDeck);
  readonly pillars = computed(() => this.vm().pillars);
  readonly calendar = computed(() => this.vm().calendar);
  readonly calendarDeck = computed(() => this.vm().calendarDeck);
  readonly backlog = computed(() => this.vm().backlog);
  readonly keywords = computed(() => this.vm().keywords);
  readonly existingWins = computed(() => this.vm().existingWins);

  readonly immediateFocus = computed(() =>
    this.keywords().filter((k) => k.tier === 'immediate'),
  );
  readonly longTerm = computed(() => this.keywords().filter((k) => k.tier === 'long-term'));
  readonly longTail = computed(() => this.keywords().filter((k) => k.tier === 'long-tail'));

  openCalendarItem(item: ProtopipeContentPlanCalendarItem): void {
    this.viewState.selectArticle(item);
  }

  writeCalendarItem(item: ProtopipeContentPlanCalendarItem, event: Event): void {
    event.stopPropagation();
    void this.viewState.openInWriter(item);
  }

  openKeyword(kw: StrategyBinderKeyword): void {
    this.viewState.selectFromKeywordPhrase(this.plan(), kw.phrase);
  }

  difficultyLabel(n: number): string {
    if (n < 20) return 'Easy';
    if (n < 35) return 'Moderate';
    if (n < 50) return 'Hard';
    return 'Very hard';
  }

  difficultyClass(n: number): string {
    if (n < 20) return 'easy';
    if (n < 35) return 'moderate';
    return 'hard';
  }

  formatVolume(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  }
}
