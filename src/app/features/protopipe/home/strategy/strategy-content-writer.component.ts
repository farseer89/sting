import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MOCK_STRATEGY_WRITER,
  STRATEGY_WRITER_PANELS,
  type StrategyWriterPanelId,
  type StrategyWriterSection,
} from './strategy-writer.mock';

@Component({
  selector: 'app-strategy-content-writer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './strategy-content-writer.component.html',
  styleUrl: './strategy-content-writer.component.scss',
  host: {
    '[class.is-full]': 'full()',
  },
})
export class StrategyContentWriterComponent {
  readonly full = input(false);

  readonly mock = MOCK_STRATEGY_WRITER;
  readonly panels = STRATEGY_WRITER_PANELS;

  readonly activePanel = signal<StrategyWriterPanelId>('brief');

  readonly h1 = signal(this.mock.h1);
  readonly intro = signal(this.mock.intro);
  readonly sections = signal<StrategyWriterSection[]>([...this.mock.sections]);
  readonly dirty = signal(false);

  readonly saveLabel = signal('Draft saved');

  selectPanel(id: StrategyWriterPanelId): void {
    this.activePanel.set(id);
  }

  isPanel(id: StrategyWriterPanelId): boolean {
    return this.activePanel() === id;
  }

  markDirty(): void {
    this.dirty.set(true);
    this.saveLabel.set('Unsaved changes');
  }

  saveDraft(): void {
    this.dirty.set(false);
    this.saveLabel.set('Draft saved');
  }

  autoGrow(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  flaggedFactCount(): number {
    return this.mock.facts.filter((f) => f.status === 'flagged').length;
  }

  exitFocus(): void {
    // Orphan mock — no home shell wiring.
  }
}
