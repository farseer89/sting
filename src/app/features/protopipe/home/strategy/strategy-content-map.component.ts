import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { ProtopipeSiteContentPlan } from '@hive/contracts';
import type { SpokeNode } from '../../lab/void-dashboard/void-content-spoke.mock';
import { VoidContentSpokeComponent } from '../../lab/void-dashboard/void-content-spoke.component';
import { ProtopipeHomeSidePanelService } from '../protopipe-home-side-panel.service';
import { ProtopipeHomeStrategyViewState } from './protopipe-home-strategy-view.state';
import { StrategyContentCalendarComponent } from './strategy-content-calendar.component';
import { StrategyContentKeywordsComponent } from './strategy-content-keywords.component';
import { StrategyContentPlanComponent } from './strategy-content-plan.component';
import { StrategyContentTuneComponent } from './strategy-content-tune.component';
import { strategyStats } from './strategy.helpers';
import { planToContentSpoke } from './strategy-content-map';
import { STRATEGY_VISUAL_VIEWS, type StrategyVisualView } from './strategy-visual-view';

const EXPANDED_VIEWS: StrategyVisualView[] = ['map', 'calendar', 'keywords', 'content', 'tune'];

@Component({
  selector: 'app-strategy-content-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    VoidContentSpokeComponent,
    StrategyContentCalendarComponent,
    StrategyContentKeywordsComponent,
    StrategyContentPlanComponent,
    StrategyContentTuneComponent,
  ],
  templateUrl: './strategy-content-map.component.html',
  styleUrl: './strategy-content-map.component.scss',
})
export class StrategyContentMapComponent {
  private readonly viewState = inject(ProtopipeHomeStrategyViewState);
  private readonly sidePanel = inject(ProtopipeHomeSidePanelService);

  readonly plan = input.required<ProtopipeSiteContentPlan>();
  readonly siteLabel = input('');
  readonly visualViews = STRATEGY_VISUAL_VIEWS;

  readonly view = this.viewState.visualView;

  readonly spoke = computed(() => {
    const plan = this.plan();
    const host = this.siteLabel() || plan.existingContent?.hostname;
    return planToContentSpoke(plan, { host: host || undefined });
  });

  readonly stats = computed(() => strategyStats(this.plan()));

  readonly isExpandedView = computed(() => EXPANDED_VIEWS.includes(this.view()));

  readonly showPlanSteps = computed(() => this.view() !== 'tune');

  readonly panelLede = computed(() => {
    switch (this.view()) {
      case 'map':
        return 'Your keywords grouped into pillars, with a publish schedule — read left to right.';
      case 'calendar':
        return 'When each article publishes — click a sticky to open details in the panel.';
      case 'keywords':
        return 'Scored search phrases — immediate focus first, then long-term and long-tail opportunities.';
      case 'content':
        return 'Articles grouped by topic cluster — pillar pieces first, then supporting content.';
      case 'tune':
        return 'Voice, inspiration, and reference links — so every article matches your style.';
    }
  });

  setView(next: StrategyVisualView): void {
    this.viewState.setVisualView(next);
  }

  isView(active: StrategyVisualView): boolean {
    return this.view() === active;
  }

  onSpokeNodeSelected(node: SpokeNode): void {
    this.viewState.selectFromSpokeNode(this.plan(), node);
    if (this.viewState.selectedArticle()) {
      this.sidePanel.setOpen(true);
    }
  }
}
