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
import { SPARKY_SITE_CHROME } from './sparky-site-chrome.constants';

export interface BuildSparkyImageEditRequest {
  propPath: string;
}

interface SparkyService {
  title: string;
  body: string;
  image: string;
  href?: string;
}

interface SparkyStep {
  step: string;
  title: string;
  body: string;
}

interface SparkyMetric {
  label: string;
  value: string;
}

interface SparkyCredential {
  claim: string;
  proof: string;
}

interface SparkyReview {
  name: string;
  area: string;
  text: string;
}

interface SparkyBrand {
  name: string;
  src: string;
}

interface SparkyGalleryItem {
  label: string;
  image: string;
  location: string;
}

interface SparkyArticle {
  category: string;
  title: string;
  image: string;
}

interface SparkyTrustItem {
  label: string;
  detail: string;
}

@Component({
  selector: 'app-protopipe-build-sparky-baseline-block',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ProtopipeBuildInlineTextComponent, ProtopipeBuildInlineCtaComponent],
  templateUrl: './build-sparky-baseline-block.component.html',
  styleUrl: './build-sparky-baseline-block.component.scss',
})
export class ProtopipeBuildSparkyBaselineBlockComponent {
  readonly blockId = input.required<string>();
  readonly props = input<Record<string, unknown>>({});
  readonly editable = input(true);

  readonly propPathChange = output<{ path: string; value: unknown }>();
  readonly imageEdit = output<BuildSparkyImageEditRequest>();

  readonly chrome = SPARKY_SITE_CHROME;
  readonly trust = computed((): SparkyTrustItem[] => {
    const raw = this.props()['trust'];
    return Array.isArray(raw) ? (raw as SparkyTrustItem[]) : [];
  });
  readonly stats = computed(() => readStatPairs(this.props()));
  readonly services = computed((): SparkyService[] => {
    const raw = this.props()['services'];
    return Array.isArray(raw) ? (raw as SparkyService[]) : [];
  });
  readonly brands = computed((): SparkyBrand[] => {
    const raw = this.props()['brands'];
    return Array.isArray(raw) ? (raw as SparkyBrand[]) : [];
  });
  readonly steps = computed((): SparkyStep[] => {
    const raw = this.props()['steps'];
    return Array.isArray(raw) ? (raw as SparkyStep[]) : [];
  });
  readonly reviews = computed((): SparkyReview[] => {
    const raw = this.props()['reviews'];
    return Array.isArray(raw) ? (raw as SparkyReview[]) : [];
  });
  readonly credentials = computed((): SparkyCredential[] => {
    const raw = this.props()['credentials'];
    if (!Array.isArray(raw)) return [];
    return raw.map((item) =>
      typeof item === 'string' ? { claim: item, proof: '' } : (item as SparkyCredential),
    );
  });
  readonly metrics = computed((): SparkyMetric[] => {
    const raw = this.props()['metrics'];
    if (!Array.isArray(raw)) return [];
    return raw.map((item) =>
      typeof item === 'string' ? { label: 'Metric', value: item } : (item as SparkyMetric),
    );
  });
  readonly areas = computed((): string[] => {
    const raw = this.props()['areas'];
    return Array.isArray(raw) ? raw.map(String) : [];
  });
  readonly gallery = computed((): SparkyGalleryItem[] => {
    const raw = this.props()['gallery'];
    return Array.isArray(raw) ? (raw as SparkyGalleryItem[]) : [];
  });
  readonly articles = computed((): SparkyArticle[] => {
    const raw = this.props()['articles'];
    return Array.isArray(raw) ? (raw as SparkyArticle[]) : [];
  });

  str(key: string, fallback = ''): string {
    const value = this.props()[key];
    return typeof value === 'string' ? value : fallback;
  }

  patch(key: string, value: string): void {
    this.propPathChange.emit({ path: key, value });
  }

  patchTrust(index: number, field: keyof SparkyTrustItem, value: string): void {
    this.propPathChange.emit({ path: `trust.${index}.${field}`, value });
  }

  patchStat(index: number, field: 'value' | 'label', value: string): void {
    this.propPathChange.emit({ path: `stats.${index}.${field}`, value });
  }

  patchService(index: number, field: keyof SparkyService, value: string): void {
    this.propPathChange.emit({ path: `services.${index}.${field}`, value });
  }

  patchStep(index: number, field: keyof SparkyStep, value: string): void {
    this.propPathChange.emit({ path: `steps.${index}.${field}`, value });
  }

  patchReview(index: number, field: keyof SparkyReview, value: string): void {
    this.propPathChange.emit({ path: `reviews.${index}.${field}`, value });
  }

  patchCredential(index: number, field: keyof SparkyCredential, value: string): void {
    this.propPathChange.emit({ path: `credentials.${index}.${field}`, value });
  }

  patchMetric(index: number, field: keyof SparkyMetric, value: string): void {
    this.propPathChange.emit({ path: `metrics.${index}.${field}`, value });
  }

  patchGallery(index: number, field: keyof SparkyGalleryItem, value: string): void {
    this.propPathChange.emit({ path: `gallery.${index}.${field}`, value });
  }

  patchArticle(index: number, field: keyof SparkyArticle, value: string): void {
    this.propPathChange.emit({ path: `articles.${index}.${field}`, value });
  }

  patchArea(index: number, value: string): void {
    this.propPathChange.emit({ path: `areas.${index}`, value });
  }

  onPhotoEdit(event: MouseEvent, propPath: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.imageEdit.emit({ propPath });
  }

  onLinkClick(event: MouseEvent): void {
    if (this.editable()) event.preventDefault();
  }
}
