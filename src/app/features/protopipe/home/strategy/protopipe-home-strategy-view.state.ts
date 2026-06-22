import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { ProtopipeContentPlanCalendarItem, ProtopipeSiteContentPlan } from '@hive/contracts';
import { ContentPlanStore } from '../../content-plan/content-plan.store';
import type { SpokeNode } from '../../lab/void-dashboard/void-content-spoke.mock';
import { ProtopipeContentService } from '../../protopipe-content.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { ProtopipeHomeSidePanelService } from '../protopipe-home-side-panel.service';
import { ProtopipeHomeThinkerViewState } from '../protopipe-home-thinker-view.state';
import { ProtopipeHomeWriterViewState } from '../protopipe-home-writer-view.state';
import {
  calendarItemByKey,
  calendarItemForPhrase,
  calendarItemFromSpokeNode,
  calendarItemKey,
} from './strategy.helpers';
import type { StrategyVisualView } from './strategy-visual-view';

/**
 * Strategy selection + right-panel coordination.
 *
 * TROUBLESHOOT — panel visibility chain (all must be true for the slider to show):
 * 1. User is on home nav "Your strategy" → protopipe-user-home activeView() === 'strategy'
 * 2. ProtopipeHomeSidePanelService.open() === true (set here or via Brief toggle)
 * 3. protopipe-user-home template renders <app-protopipe-strategy-context-panel> in void__side-panel
 * 4. selectedArticle() set → context panel shows article block; null → strategy brief
 *
 * Brief button (strategy-hero) and article clicks must both call methods on this service
 * so they hit the same sidePanel instance provided by protopipe-user-home.
 */
@Injectable()
export class ProtopipeHomeStrategyViewState {
  private readonly sidePanel = inject(ProtopipeHomeSidePanelService);
  private readonly writerView = inject(ProtopipeHomeWriterViewState);
  private readonly thinkerView = inject(ProtopipeHomeThinkerViewState);
  private readonly contentPlan = inject(ContentPlanStore);
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly content = inject(ProtopipeContentService);

  private enterWriterFocus: (() => void) | null = null;

  private readonly _plan = signal<ProtopipeSiteContentPlan | null>(null);
  private readonly _openingWriter = signal(false);
  private readonly _siteLabel = signal('');
  private readonly _strategySummary = signal('');
  private readonly _selectedArticle = signal<ProtopipeContentPlanCalendarItem | null>(null);
  private readonly _visualView = signal<StrategyVisualView>('calendar');

  readonly plan = this._plan.asReadonly();
  readonly siteLabel = this._siteLabel.asReadonly();
  readonly strategySummary = this._strategySummary.asReadonly();
  readonly selectedArticle = this._selectedArticle.asReadonly();
  readonly visualView = this._visualView.asReadonly();
  readonly openingWriter = this._openingWriter.asReadonly();
  /** True when the content-plan store has a server-backed plan (not the UI mock fallback). */
  readonly hasLivePlan = () => this.contentPlan.plan() != null;

  setEnterWriterHandler(handler: () => void): void {
    this.enterWriterFocus = handler;
  }

  setPlan(plan: ProtopipeSiteContentPlan | null): void {
    this._plan.set(plan);
  }

  setSiteLabel(label: string): void {
    this._siteLabel.set(label);
  }

  setStrategySummary(summary: string): void {
    this._strategySummary.set(summary);
  }

  /** Same right panel as Brief — shows strategy brief (no article selected). */
  openBriefPanel(): void {
    this.clearArticle();
    this.openStrategyPanel();
  }

  /** Brief button: toggle closed when brief is showing; otherwise open brief panel. */
  toggleBriefPanel(): void {
    this.writerView.clearPanel();
    if (this.sidePanel.open() && !this._selectedArticle()) {
      this.sidePanel.setOpen(false);
      return;
    }
    this.openBriefPanel();
  }

  /** Same right panel as Brief — shows article detail in app-protopipe-strategy-context-panel. */
  openArticlePanel(item: ProtopipeContentPlanCalendarItem): void {
    this.writerView.clearPanel();
    this._selectedArticle.set(item);
    this.openStrategyPanel();
  }

  selectArticle(item: ProtopipeContentPlanCalendarItem): void {
    this.openArticlePanel(item);
  }

  openArticle(item: ProtopipeContentPlanCalendarItem): void {
    this.openArticlePanel(item);
  }

  selectFromSpokeNode(plan: ProtopipeSiteContentPlan, node: SpokeNode): void {
    const resolvedPlan = this._plan() ?? plan;
    const item = calendarItemFromSpokeNode(resolvedPlan, node);
    if (!item) {
      console.warn('[strategy-panel] Map node did not resolve to a calendar item.', {
        nodeKind: node.kind,
        nodeLabel: node.label,
        calendarItemKey: node.calendarItemKey,
      });
      return;
    }
    this.openArticlePanel(item);
  }

  selectFromKeywordPhrase(plan: ProtopipeSiteContentPlan, phrase: string): void {
    const resolvedPlan = this._plan() ?? plan;
    const item = calendarItemForPhrase(resolvedPlan, phrase);
    if (!item) {
      console.warn('[strategy-panel] Keyword row did not resolve to a scheduled article.', {
        phrase,
        calendarCount: resolvedPlan.calendar.length,
      });
      return;
    }
    this.openArticlePanel(item);
  }

  selectFromCalendarKey(plan: ProtopipeSiteContentPlan, itemKey: string): void {
    const resolvedPlan = this._plan() ?? plan;
    const item = calendarItemByKey(resolvedPlan, itemKey);
    if (!item) {
      console.warn('[strategy-panel] Calendar sticky did not resolve to a plan item.', { itemKey });
      return;
    }
    this.openArticlePanel(item);
  }

  clearArticle(): void {
    this._selectedArticle.set(null);
  }

  /** Open an existing article generation run in the Thinker view (even when complete). */
  async openInThinker(article: ProtopipeContentPlanCalendarItem): Promise<void> {
    if (this._openingWriter()) return;
    this._openingWriter.set(true);
    try {
      const postId = await this.resolvePostId(article);
      if (!postId) return;

      const siteId = this.strategy.siteId();
      if (!siteId) return;

      const { post } = await firstValueFrom(this.content.findPost$(postId, siteId));
      const runId = post.articleGenerationRunId;
      if (!runId) return;

      this.thinkerView.openRun({
        siteId,
        postId,
        runId,
        workingTitle: article.workingTitle || post.title || 'Article',
      });
    } finally {
      this._openingWriter.set(false);
    }
  }

  /** Materialize draft post if needed, then open Thinker (generation) or Writer (completed draft). */
  async openInWriter(article: ProtopipeContentPlanCalendarItem): Promise<void> {
    if (this._openingWriter()) return;
    this._openingWriter.set(true);
    try {
      await this.strategy.ensureLoaded();
      const siteId = this.strategy.siteId();
      if (!siteId) return;
      if (!this.hasLivePlan()) return;
      this.contentPlan.setSiteId(siteId);
      this.content.setEditingSiteId(siteId);

      const postId = await this.resolvePostId(article);
      if (!postId) return;

      const outcome = await this.thinkerView.openForGeneration(
        siteId,
        postId,
        article.workingTitle,
      );

      if (outcome === 'writer') {
        this.writerView.openPost(postId);
        this.enterWriterFocus?.();
      } else if (outcome === 'failed') {
        this.writerView.openPostForWriting(postId);
        this.enterWriterFocus?.();
      }
    } finally {
      this._openingWriter.set(false);
    }
  }

  /** Open the content-plan pipeline run that produced the current strategy. */
  openStrategyBuildRun(): void {
    const plan = this.contentPlan.plan();
    if (!plan?.id) return;
    this.thinkerView.openContentPlanRun(plan.siteId, plan);
  }

  setVisualView(view: StrategyVisualView): void {
    if (this._visualView() === view) {
      return;
    }
    this._visualView.set(view);
  }

  isVisualView(view: StrategyVisualView): boolean {
    return this._visualView() === view;
  }

  /** Opens the home-scoped right panel (void__side-panel). Matches Brief button behavior. */
  private openStrategyPanel(): void {
    this.sidePanel.setOpen(true);
  }

  private async resolvePostId(
    article: ProtopipeContentPlanCalendarItem,
  ): Promise<string | undefined> {
    await this.strategy.ensureLoaded();
    const siteId = this.strategy.siteId();
    if (!siteId || !this.hasLivePlan()) return undefined;

    this.contentPlan.setSiteId(siteId);
    this.content.setEditingSiteId(siteId);

    let postId = article.contentPostId;
    if (postId) {
      try {
        const { post } = await firstValueFrom(this.content.findPost$(postId, siteId));
        postId = post.id;
        this.content.setEditingSiteId(post.siteId);
      } catch {
        postId = undefined;
      }
    }

    if (!postId) {
      if (!article.proposedPublishAt) {
        return undefined;
      }
      const res = await this.contentPlan.confirmCalendarItem({
        proposedPublishAt: article.proposedPublishAt,
        workingTitle: article.workingTitle,
      });
      if (!res) return undefined;
      postId = res.contentPostId;
      const plan = this.contentPlan.plan();
      const key = calendarItemKey(article);
      const updated = plan?.calendar.find((item) => calendarItemKey(item) === key) ?? {
        ...article,
        contentPostId: postId,
      };
      this._plan.set(plan);
      this._selectedArticle.set(updated);
    }

    return postId;
  }
}
