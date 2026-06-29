import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { BuildBookWireLayout } from '../build-book.types';
import { ProtopipeBuildInlineTextComponent } from '../inline/build-inline-text.component';
import { patchProp } from '../fields/build-field.util';
import { readHeading, readSubhead } from '../canvas/build-block-renderer.registry';

@Component({
  selector: 'app-protopipe-build-services-block',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProtopipeBuildInlineTextComponent],
  templateUrl: './build-services-block.component.html',
  styleUrl: './build-services-block.component.scss',
})
export class ProtopipeBuildServicesBlockComponent {
  readonly layout = input<BuildBookWireLayout>('grid');
  readonly props = input<Record<string, unknown>>({});
  readonly editable = input(false);

  readonly propsChange = output<Record<string, unknown>>();
  readonly propPathChange = output<{ path: string; value: unknown }>();

  readonly heading = computed(() => readHeading(this.props(), 'Our services'));
  readonly intro = computed(() => readSubhead(this.props(), 'Full-service coverage for your market.'));

  readonly items = computed(() => {
    const props = this.props();
    const raw = props['services'] ?? props['features'] ?? props['steps'] ?? [];
    return Array.isArray(raw) ? raw : [];
  });

  listKey(): string {
    const props = this.props();
    if (Array.isArray(props['services'])) return 'services';
    if (Array.isArray(props['steps'])) return 'steps';
    if (Array.isArray(props['features'])) return 'features';
    return 'services';
  }

  patchProp(key: string, value: string): void {
    this.propsChange.emit(patchProp(this.props(), key, value));
  }

  patchPath(path: string, value: unknown): void {
    this.propPathChange.emit({ path, value });
  }

  itemTitle(item: unknown): string {
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && item != null) return String((item as Record<string, unknown>)['title'] ?? '');
    return '';
  }

  itemBody(item: unknown): string {
    if (typeof item === 'object' && item != null) return String((item as Record<string, unknown>)['body'] ?? '');
    return '';
  }
}
