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
  ProtopipeContentPost,
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
import { calendarItemKey } from '../strategy/strategy.helpers';

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

  readonly calendarActionFn = (item: ProtopipeContentPlanCalendarItem): string =>
    this.calendarActionLabel(item);

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

  postForItem(item: ProtopipeContentPlanCalendarItem): ProtopipeContentPost | undefined {
    const posts = this.content.posts();
    if (item.contentPostId) {
      const byId = posts.find((post) => post.id === item.contentPostId);
      if (byId) return byId;
    }

    const keyword = this.normalizeTitle(item.suggestedKeyword);
    if (keyword) {
      const byKeyword = posts.find((post) => this.postKeyword(post) === keyword);
      if (byKeyword) return byKeyword;
    }

    const title = this.normalizeTitle(item.workingTitle);
    const editorial = this.normalizeTitle(item.editorialTitle);
    if (!title && !editorial) return undefined;
    const itemDate = this.dateKey(item.proposedPublishAt);

    return posts.find((post) => {
      const postTitle = this.normalizeTitle(post.title);
      if (postTitle !== title && (!editorial || postTitle !== editorial)) return false;
      const postDate = this.dateKey(post.publishAt);
      return !itemDate || !postDate || itemDate === postDate;
    });
  }

  calendarActionLabel(item: ProtopipeContentPlanCalendarItem): string {
    const post = this.postForItem(item);
    if (post?.articleGenerationRunId && (post.template || post.bodyMarkdown.trim())) {
      return 'View article';
    }
    if (post?.articleGenerationRunId) {
      return 'View run';
    }
    if (post) {
      return 'Open';
    }
    return 'Write';
  }

  runCalendarAction(item: ProtopipeContentPlanCalendarItem, event: Event): void {
    event.stopPropagation();
    this.executeCalendarAction(item);
  }

  onCalendarPanelAction(item: ProtopipeContentPlanCalendarItem): void {
    this.executeCalendarAction(item);
  }

  private executeCalendarAction(item: ProtopipeContentPlanCalendarItem): void {
    const post = this.postForItem(item);
    if (post?.articleGenerationRunId) {
      void this.viewState.openInThinker({ ...item, contentPostId: post.id });
      return;
    }
    if (post) {
      void this.viewState.openArticleInWriter({ ...item, contentPostId: post.id });
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

  private normalizeTitle(value: string | null | undefined): string {
    return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private postKeyword(post: ProtopipeContentPost): string {
    return this.normalizeTitle(
      post.suggestedKeyword ?? post.brief?.primaryKeywordPhrase ?? '',
    );
  }

  private dateKey(value: string | null | undefined): string | null {
    if (!value) return null;
    const ms = new Date(value).getTime();
    if (!Number.isFinite(ms)) return null;
    return new Date(ms).toISOString().slice(0, 10);
  }
}
