import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ProtopipeWriterComponent } from '../content/writer/protopipe-writer.component';
import { ProtopipeWriterInspectorBridge } from '../content/writer/protopipe-writer-inspector.bridge';
import { ProtopipeHomeWriterViewState } from './protopipe-home-writer-view.state';

@Component({
  selector: 'app-protopipe-home-writer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ProtopipeWriterInspectorBridge],
  imports: [ProtopipeWriterComponent],
  templateUrl: './protopipe-home-writer.component.html',
  styleUrl: './protopipe-home-writer.component.scss',
})
export class ProtopipeHomeWriterComponent {
  readonly writerView = inject(ProtopipeHomeWriterViewState);

  onExit(): void {
    this.writerView.exitFocus();
  }
}
