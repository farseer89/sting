import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { BuildBookWireLayout } from '../build-book.types';
import { ProtopipeBuildInlineTextComponent } from '../inline/build-inline-text.component';
import { ProtopipeBuildInlineStatComponent } from '../inline/build-inline-stat.component';
import { patchProp } from '../fields/build-field.util';
import { readHeading } from '../canvas/build-block-renderer.registry';

@Component({
  selector: 'app-protopipe-build-proof-block',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProtopipeBuildInlineTextComponent, ProtopipeBuildInlineStatComponent],
  templateUrl: './build-proof-block.component.html',
  styleUrl: './build-proof-block.component.scss',
})
export class ProtopipeBuildProofBlockComponent {
  readonly layout = input<BuildBookWireLayout>('reviews');
  readonly props = input<Record<string, unknown>>({});
  readonly editable = input(false);

  readonly propsChange = output<Record<string, unknown>>();
  readonly propPathChange = output<{ path: string; value: unknown }>();

  readonly heading = computed(() => readHeading(this.props(), 'What clients say'));
  readonly quote = computed(() => String(this.props()['quote'] ?? ''));
  readonly attribution = computed(() => String(this.props()['attribution'] ?? ''));
  readonly role = computed(() => String(this.props()['role'] ?? ''));
  readonly cards = computed(() => {
    const raw = this.props()['cards'] ?? this.props()['testimonials'] ?? [];
    return Array.isArray(raw) ? raw : [];
  });

  patchProp(key: string, value: string): void {
    this.propsChange.emit(patchProp(this.props(), key, value));
  }

  patchPath(path: string, value: unknown): void {
    this.propPathChange.emit({ path, value });
  }

  cardMetric(item: unknown): string {
    if (typeof item === 'object' && item != null) return String((item as Record<string, unknown>)['metric'] ?? (item as Record<string, unknown>)['value'] ?? '');
    return '';
  }

  cardDetail(item: unknown): string {
    if (typeof item === 'object' && item != null) {
      const record = item as Record<string, unknown>;
      return String(record['detail'] ?? record['company'] ?? record['label'] ?? '');
    }
    return '';
  }

  cardQuote(item: unknown): string {
    if (typeof item === 'object' && item != null) return String((item as Record<string, unknown>)['quote'] ?? '');
    return '';
  }

  cardName(item: unknown): string {
    if (typeof item === 'object' && item != null) return String((item as Record<string, unknown>)['name'] ?? (item as Record<string, unknown>)['attribution'] ?? '');
    return '';
  }
}
