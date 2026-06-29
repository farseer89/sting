import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, output } from '@angular/core';
import type { BuildBookWireLayout } from '../build-book.types';
import { ProtopipeBuildInlineTextComponent } from '../inline/build-inline-text.component';
import { ProtopipeBuildInlineStatComponent } from '../inline/build-inline-stat.component';
import { readStatPairs, patchProp, patchStatPair } from '../fields/build-field.util';
import { readHeading } from '../canvas/build-block-renderer.registry';

interface FoldTrustItem {
  label: string;
  detail: string;
}

interface FoldStepItem {
  step: string;
  title: string;
  body: string;
}

interface FoldCardItem {
  title: string;
  body?: string;
}

interface FoldPartnerItem {
  name: string;
}

interface FoldReviewItem {
  quote: string;
  name: string;
}

@Component({
  selector: 'app-protopipe-build-fold-block',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ProtopipeBuildInlineTextComponent, ProtopipeBuildInlineStatComponent],
  templateUrl: './build-fold-block.component.html',
  styleUrl: './build-fold-block.component.scss',
})
export class ProtopipeBuildFoldBlockComponent {
  readonly layout = input<BuildBookWireLayout>('contract-bar');
  readonly layoutId = input<string | null>(null);
  readonly props = input<Record<string, unknown>>({});
  readonly editable = input(false);

  readonly propsChange = output<Record<string, unknown>>();
  readonly propPathChange = output<{ path: string; value: unknown }>();

  readonly wireLayout = computed((): BuildBookWireLayout => {
    const layout = this.layout();
    return layout === 'metrics' ? 'stats' : layout;
  });

  readonly stats = computed(() => readStatPairs(this.props()));
  readonly heading = computed(() => {
    const props = this.props();
    return readHeading(
      props,
      typeof props['title'] === 'string'
        ? props['title']
        : typeof props['kicker'] === 'string'
          ? props['kicker']
          : 'Trusted credentials',
    );
  });
  readonly body = computed(() => String(this.props()['body'] ?? this.props()['intro'] ?? this.props()['lede'] ?? ''));
  readonly sectorsLine = computed(() => String(this.props()['sectorsLine'] ?? ''));

  readonly trustItems = computed((): FoldTrustItem[] => {
    const raw = this.props()['trust'];
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      if (typeof item !== 'object' || item == null) return { label: '', detail: '' };
      const record = item as Record<string, unknown>;
      return {
        label: String(record['label'] ?? record['claim'] ?? ''),
        detail: String(record['detail'] ?? record['proof'] ?? ''),
      };
    });
  });

  readonly steps = computed((): FoldStepItem[] => {
    const raw = this.props()['steps'];
    if (!Array.isArray(raw)) return [];
    return raw.map((item, index) => {
      if (typeof item !== 'object' || item == null) {
        return { step: String(index + 1).padStart(2, '0'), title: String(item ?? ''), body: '' };
      }
      const record = item as Record<string, unknown>;
      return {
        step: String(record['step'] ?? index + 1).padStart(2, '0'),
        title: String(record['title'] ?? ''),
        body: String(record['body'] ?? ''),
      };
    });
  });

  readonly cardItems = computed((): FoldCardItem[] => {
    const features = this.props()['features'];
    if (Array.isArray(features) && features.length) {
      return features.map((item) => {
        if (typeof item !== 'object' || item == null) return { title: String(item ?? '') };
        const record = item as Record<string, unknown>;
        return {
          title: String(record['title'] ?? record['heading'] ?? ''),
          body: String(record['body'] ?? record['desc'] ?? ''),
        };
      });
    }

    const capabilities = this.props()['capabilities'];
    if (Array.isArray(capabilities) && capabilities.length) {
      return capabilities.map((item) => {
        if (typeof item !== 'object' || item == null) return { title: String(item ?? '') };
        const record = item as Record<string, unknown>;
        return {
          title: String(record['title'] ?? record['heading'] ?? ''),
          body: String(record['body'] ?? record['desc'] ?? ''),
        };
      });
    }

    const services = this.props()['services'];
    if (Array.isArray(services) && services.length) {
      return services.map((item) => {
        if (typeof item === 'string') return { title: item };
        if (typeof item !== 'object' || item == null) return { title: String(item ?? '') };
        const record = item as Record<string, unknown>;
        return {
          title: String(record['title'] ?? record['heading'] ?? record['name'] ?? ''),
          body: String(record['body'] ?? ''),
        };
      });
    }

    return [];
  });

  readonly partners = computed((): FoldPartnerItem[] => {
    const raw = this.props()['partners'];
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      if (typeof item === 'string') return { name: item };
      if (typeof item !== 'object' || item == null) return { name: String(item ?? '') };
      const record = item as Record<string, unknown>;
      return { name: String(record['name'] ?? record['label'] ?? '') };
    });
  });

  readonly testimonials = computed((): FoldReviewItem[] => {
    const raw = this.props()['testimonials'];
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      if (typeof item !== 'object' || item == null) return { quote: String(item ?? ''), name: '' };
      const record = item as Record<string, unknown>;
      return {
        quote: String(record['quote'] ?? record['body'] ?? ''),
        name: String(record['name'] ?? record['author'] ?? ''),
      };
    });
  });

  patchProp(key: string, value: string): void {
    this.propsChange.emit(patchProp(this.props(), key, value));
  }

  patchStat(index: number, field: 'value' | 'label', value: string): void {
    this.propsChange.emit(patchStatPair(this.props(), index, field, value));
  }

  patchPath(path: string, value: unknown): void {
    this.propPathChange.emit({ path, value });
  }
}
