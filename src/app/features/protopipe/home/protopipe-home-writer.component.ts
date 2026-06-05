import { ChangeDetectionStrategy, Component } from '@angular/core';
import { StrategyContentWriterComponent } from './strategy/strategy-content-writer.component';

@Component({
  selector: 'app-protopipe-home-writer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StrategyContentWriterComponent],
  templateUrl: './protopipe-home-writer.component.html',
  styleUrl: './protopipe-home-writer.component.scss',
})
export class ProtopipeHomeWriterComponent {}
