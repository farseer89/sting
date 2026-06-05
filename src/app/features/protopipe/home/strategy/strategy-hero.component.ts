import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { ProtopipeSiteContentPlan } from '@hive/contracts';
import { ProtopipeHomeSidePanelService } from '../protopipe-home-side-panel.service';
import { ProtopipeHomeStrategyViewState } from './protopipe-home-strategy-view.state';

@Component({
  selector: 'app-strategy-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './strategy-hero.component.html',
  styleUrl: './strategy-hero.component.scss',
})
export class StrategyHeroComponent {
  private readonly viewState = inject(ProtopipeHomeStrategyViewState);

  /** For Brief active state in the header — same service the home shell reads. */
  readonly sidePanel = inject(ProtopipeHomeSidePanelService);
  readonly plan = input.required<ProtopipeSiteContentPlan>();
  readonly siteLabel = input('');
  readonly readyLabel = input('Your content strategy');

  toggleBrief(): void {
    this.viewState.toggleBriefPanel();
  }
}
