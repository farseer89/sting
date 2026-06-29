import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { BuildBookWireLayout } from '../build-book.types';
import { ProtopipeBuildInlineTextComponent } from '../inline/build-inline-text.component';
import { patchProp } from '../fields/build-field.util';
import { readHeading } from '../canvas/build-block-renderer.registry';

@Component({
  selector: 'app-protopipe-build-areas-block',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProtopipeBuildInlineTextComponent],
  templateUrl: './build-areas-block.component.html',
  styleUrl: './build-areas-block.component.scss',
})
export class ProtopipeBuildAreasBlockComponent {
  readonly layout = input<BuildBookWireLayout>('map');
  readonly props = input<Record<string, unknown>>({});
  readonly editable = input(false);

  readonly propsChange = output<Record<string, unknown>>();
  readonly propPathChange = output<{ path: string; value: unknown }>();

  readonly heading = computed(() => readHeading(this.props(), 'Service area & process'));
  readonly items = computed(() => {
    const props = this.props();
    const raw = props['items'] ?? props['steps'] ?? [];
    return Array.isArray(raw) ? raw : [];
  });

  listKey(): string {
    return Array.isArray(this.props()['items']) ? 'items' : 'steps';
  }

  patchProp(key: string, value: string): void {
    this.propsChange.emit(patchProp(this.props(), key, value));
  }

  patchPath(path: string, value: unknown): void {
    this.propPathChange.emit({ path, value });
  }

  itemQuestion(item: unknown): string {
    if (typeof item === 'object' && item != null) {
      const record = item as Record<string, unknown>;
      return String(record['question'] ?? record['title'] ?? '');
    }
    return '';
  }

  itemAnswer(item: unknown): string {
    if (typeof item === 'object' && item != null) {
      const record = item as Record<string, unknown>;
      return String(record['answer'] ?? record['body'] ?? '');
    }
    return '';
  }

  questionField(item: unknown): string {
    if (typeof item === 'object' && item != null && 'title' in (item as Record<string, unknown>)) {
      return 'title';
    }
    return 'question';
  }

  answerField(item: unknown): string {
    if (typeof item === 'object' && item != null && 'body' in (item as Record<string, unknown>)) {
      return 'body';
    }
    return 'answer';
  }
}
