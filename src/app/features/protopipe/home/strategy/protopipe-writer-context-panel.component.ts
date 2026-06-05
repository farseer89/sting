import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ProtopipeHomeSidePanelService } from '../protopipe-home-side-panel.service';
import { ProtopipeHomeWriterViewState } from '../protopipe-home-writer-view.state';
import { MOCK_STRATEGY_WRITER, STRATEGY_WRITER_PANELS } from './strategy-writer.mock';

@Component({
  selector: 'app-protopipe-writer-context-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-writer-context-panel.component.html',
  styleUrl: './protopipe-writer-context-panel.component.scss',
})
export class ProtopipeWriterContextPanelComponent {
  private readonly writerView = inject(ProtopipeHomeWriterViewState);
  private readonly sidePanel = inject(ProtopipeHomeSidePanelService);

  readonly mock = MOCK_STRATEGY_WRITER;
  readonly panels = STRATEGY_WRITER_PANELS;

  readonly activePanel = this.writerView.activePanel;

  readonly panelLabel = computed(() => {
    const id = this.activePanel();
    return this.panels.find((p) => p.id === id)?.label ?? 'Writer';
  });

  close(): void {
    this.writerView.clearPanel();
    this.sidePanel.setOpen(false);
  }
}
