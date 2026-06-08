import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ProtopipeWriterInspectorBridge } from '../../content/writer/protopipe-writer-inspector.bridge';
import { writerInspectorPanelLabel } from '../../content/writer/protopipe-writer-panels';
import { ProtopipeHomeSidePanelService } from '../protopipe-home-side-panel.service';
import { ProtopipeHomeWriterViewState } from '../protopipe-home-writer-view.state';

@Component({
  selector: 'app-protopipe-writer-context-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  templateUrl: './protopipe-writer-context-panel.component.html',
  styleUrl: './protopipe-writer-context-panel.component.scss',
})
export class ProtopipeWriterContextPanelComponent {
  private readonly writerView = inject(ProtopipeHomeWriterViewState);
  private readonly sidePanel = inject(ProtopipeHomeSidePanelService);
  readonly bridge = inject(ProtopipeWriterInspectorBridge);

  readonly activePanel = this.writerView.activePanel;

  readonly panelLabel = computed(() => writerInspectorPanelLabel(this.activePanel()));

  close(): void {
    this.writerView.clearPanel();
    this.sidePanel.setOpen(false);
  }
}
