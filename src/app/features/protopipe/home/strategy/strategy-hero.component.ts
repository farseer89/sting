import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { ProtopipeSiteContentPlan } from '@hive/contracts';
import { ProtopipeHomeSidePanelService } from '../protopipe-home-side-panel.service';
import { ProtopipeHomeWriterViewState } from '../protopipe-home-writer-view.state';

@Component({
  selector: 'app-strategy-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './strategy-hero.component.html',
  styleUrl: './strategy-hero.component.scss',
})
export class StrategyHeroComponent {
  private readonly writerView = inject(ProtopipeHomeWriterViewState);

  readonly sidePanel = inject(ProtopipeHomeSidePanelService);
  readonly plan = input.required<ProtopipeSiteContentPlan>();
  readonly siteLabel = input('');
  readonly readyLabel = input('Your content strategy');

  toggleBrief(): void {
    this.writerView.clearPanel();
    this.sidePanel.toggle();
  }
}
