import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import type {
  ProtopipeContentPlanCalendarItem,
  ProtopipeSiteContentPlan,
} from '@hive/contracts';
import { ContentPlanStore } from '../../content-plan/content-plan.store';
import { ProtopipeContentService } from '../../protopipe-content.service';
import { ProtopipeHomeStrategyViewState } from '../strategy/protopipe-home-strategy-view.state';
import {
  mapStrategyBinderView,
  type StrategyBinderKeyword,
} from './strategy-binder.mapper';
import { StrategyBinderCalendarPanelComponent } from './strategy-binder-calendar-panel.component';
import type { CalendarPanelActionEvent } from './strategy-binder-calendar-panel.component';
import { calendarItemKey } from '../strategy/strategy.helpers';
import {
  buildCalendarNextActionMap,
  findPostForCalendarItem,
} from './calendar-article-action.util';

export type StrategySection = 'overview' | 'pillars' | 'calendar' | 'backlog' | 'keywords' | 'tune';

@Component({
  selector: 'app-protopipe-home-strategy-binder',
  standalone: true,
  imports: [StrategyBinderCalendarPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-home-strategy-binder.component.html',
  styleUrl: './protopipe-home-strategy-binder.component.scss',
})
export class ProtopipeHomeStrategyBinderComponent {
  private readonly viewState = inject(ProtopipeHomeStrategyViewState);
  private readonly contentPlan = inject(ContentPlanStore);
  private readonly content = inject(ProtopipeContentService);

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

  readonly selectedCalendarKey = computed(() => {
    const article = this.viewState.selectedArticle();
    return article ? calendarItemKey(article) : null;
  });

  /** Live store plan wins over input so confirm() back-links show immediately. */
  readonly livePlan = computed(() => this.contentPlan.plan() ?? this.plan());

  /** Calendar SoT: one stage + one CTA per row. */
  readonly calendarNextActions = computed(() =>
    buildCalendarNextActionMap(this.livePlan(), this.content.posts()),
  );

  readonly immediateFocus = computed(() =>
    this.keywords().filter((k) => k.tier === 'immediate'),
  );
  readonly longTerm = computed(() => this.keywords().filter((k) => k.tier === 'long-term'));
  readonly longTail = computed(() => this.keywords().filter((k) => k.tier === 'long-tail'));

  readonly showRestartBuild = this.contentPlan.needsBuildRestart;
  readonly restartingBuild = this.contentPlan.starting;

  constructor() {
    this.content.ensureCatalogLoaded();
  }

  openCalendarItem(item: ProtopipeContentPlanCalendarItem): void {
    this.viewState.selectArticle(item);
  }

  writeCalendarItem(item: ProtopipeContentPlanCalendarItem, event: Event): void {
    event.stopPropagation();
    void this.viewState.openInWriter(item);
  }

  openArticleInWriter(item: ProtopipeContentPlanCalendarItem, event: Event): void {
    event.stopPropagation();
    void this.viewState.openArticleInWriter(item);
  }

  viewArticleRun(item: ProtopipeContentPlanCalendarItem, event: Event): void {
    event.stopPropagation();
    void this.viewState.openInThinker(item);
  }

  postForItem(item: ProtopipeContentPlanCalendarItem) {
    return findPostForCalendarItem(item, this.content.posts());
  }

  onCalendarPanelAction(event: CalendarPanelActionEvent): void {
    this.executeCalendarAction(event);
  }

  private executeCalendarAction(event: CalendarPanelActionEvent): void {
    const { item, action } = event;
    const key = calendarItemKey(item);
    const next = this.calendarNextActions()[key];

    if (action === 'writer') {
      void this.viewState.openArticleInWriter(item);
      return;
    }

    if (next && (next.stage === 'review' || next.stage === 'published') && next.postId) {
      this.viewState.reviewOnBlog(
        next.postId,
        item.workingTitle || item.editorialTitle || next.post?.title,
      );
      return;
    }
    void this.viewState.openInWriter(item);
  }

  openKeyword(kw: StrategyBinderKeyword): void {
    this.viewState.selectFromKeywordPhrase(this.plan(), kw.phrase);
  }

  viewStrategyBuildRun(): void {
    this.viewState.openStrategyBuildRun();
  }

  restartBuild(): void {
    void this.contentPlan.restartBuild();
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
