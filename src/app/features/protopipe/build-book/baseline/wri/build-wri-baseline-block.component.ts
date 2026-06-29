import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
} from '@angular/core';
import { ProtopipeBuildInlineTextComponent } from '../../inline/build-inline-text.component';
import { ProtopipeBuildInlineCtaComponent } from '../../inline/build-inline-cta.component';
import { readStatPairs } from '../../fields/build-field.util';

export interface BuildWriImageEditRequest {
  propPath: string;
}

interface WriCapability {
  title: string;
  body: string;
  image: string;
  href?: string;
}

interface WriLifecycleStep {
  step: string;
  title: string;
  body: string;
}

interface WriMetric {
  label: string;
  value: string;
}

interface WriCredential {
  claim: string;
  proof: string;
}

interface WriOffice {
  label: string;
  address: string;
  city: string;
  phone: string;
}

interface WriGalleryItem {
  label: string;
  image: string;
  location: string;
}

@Component({
  selector: 'app-protopipe-build-wri-baseline-block',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ProtopipeBuildInlineTextComponent, ProtopipeBuildInlineCtaComponent],
  templateUrl: './build-wri-baseline-block.component.html',
  styleUrl: './build-wri-baseline-block.component.scss',
})
export class ProtopipeBuildWriBaselineBlockComponent {
  readonly blockId = input.required<string>();
  readonly props = input<Record<string, unknown>>({});
  readonly editable = input(true);

  readonly propPathChange = output<{ path: string; value: unknown }>();
  readonly imageEdit = output<BuildWriImageEditRequest>();

  readonly stats = computed(() => readStatPairs(this.props()));
  readonly capabilities = computed((): WriCapability[] => {
    const raw = this.props()['capabilities'];
    return Array.isArray(raw) ? (raw as WriCapability[]) : [];
  });
  readonly bullets = computed((): string[] => {
    const raw = this.props()['bullets'];
    return Array.isArray(raw) ? raw.map(String) : [];
  });
  readonly lifecycleSteps = computed((): WriLifecycleStep[] => {
    const raw = this.props()['steps'];
    return Array.isArray(raw) ? (raw as WriLifecycleStep[]) : [];
  });
  readonly featuredMetrics = computed((): WriMetric[] => {
    const raw = this.props()['metrics'];
    if (!Array.isArray(raw)) return [];
    return raw.map((item) =>
      typeof item === 'string'
        ? { label: 'Metric', value: item }
        : (item as WriMetric),
    );
  });
  readonly facts = computed((): WriMetric[] => {
    const raw = this.props()['facts'];
    return Array.isArray(raw) ? (raw as WriMetric[]) : [];
  });
  readonly credentials = computed((): WriCredential[] => {
    const raw = this.props()['credentials'];
    if (!Array.isArray(raw)) return [];
    return raw.map((item) =>
      typeof item === 'string'
        ? { claim: item, proof: '' }
        : (item as WriCredential),
    );
  });
  readonly offices = computed((): WriOffice[] => {
    const raw = this.props()['offices'];
    return Array.isArray(raw) ? (raw as WriOffice[]) : [];
  });
  readonly islands = computed((): string[] => {
    const raw = this.props()['islands'] ?? this.props()['areas'];
    return Array.isArray(raw) ? raw.map(String) : [];
  });
  readonly gallery = computed((): WriGalleryItem[] => {
    const raw = this.props()['gallery'] ?? this.props()['images'];
    if (!Array.isArray(raw)) return [];
    return raw.map((item) =>
      typeof item === 'string'
        ? { label: 'Gallery image', image: item, location: 'Hawaii' }
        : (item as WriGalleryItem),
    );
  });

  str(key: string, fallback = ''): string {
    const value = this.props()[key];
    return typeof value === 'string' ? value : fallback;
  }

  patch(key: string, value: string): void {
    this.propPathChange.emit({ path: key, value });
  }

  patchStat(index: number, field: 'value' | 'label', value: string): void {
    this.propPathChange.emit({
      path: `stats.${index}.${field}`,
      value,
    });
  }

  patchBullet(index: number, value: string): void {
    this.propPathChange.emit({ path: `bullets.${index}`, value });
  }

  patchCapability(index: number, field: keyof WriCapability, value: string): void {
    this.propPathChange.emit({ path: `capabilities.${index}.${field}`, value });
  }

  patchLifecycle(index: number, field: keyof WriLifecycleStep, value: string): void {
    this.propPathChange.emit({ path: `steps.${index}.${field}`, value });
  }

  patchFeaturedMetric(index: number, field: keyof WriMetric, value: string): void {
    this.propPathChange.emit({ path: `metrics.${index}.${field}`, value });
  }

  patchFact(index: number, field: keyof WriMetric, value: string): void {
    this.propPathChange.emit({ path: `facts.${index}.${field}`, value });
  }

  patchCredential(index: number, field: keyof WriCredential, value: string): void {
    this.propPathChange.emit({ path: `credentials.${index}.${field}`, value });
  }

  patchIsland(index: number, value: string): void {
    this.propPathChange.emit({ path: `islands.${index}`, value });
  }

  patchOffice(index: number, field: keyof WriOffice, value: string): void {
    this.propPathChange.emit({ path: `offices.${index}.${field}`, value });
  }

  patchOfficeLabel(index: number, value: string): void {
    this.patchOffice(index, 'label', value.replace(/ office$/i, ''));
  }

  patchGallery(index: number, field: keyof WriGalleryItem, value: string): void {
    this.propPathChange.emit({ path: `gallery.${index}.${field}`, value });
  }

  patchProps(key: string, value: string): void {
    this.propPathChange.emit({ path: key, value });
  }

  requestImageEdit(propPath: string): void {
    this.imageEdit.emit({ propPath });
  }

  onPhotoEdit(event: MouseEvent, propPath: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.requestImageEdit(propPath);
  }

  onCapabilityLinkClick(event: MouseEvent): void {
    if (this.editable()) event.preventDefault();
  }
}
