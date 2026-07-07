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

export interface BuildVeilImageEditRequest {
  propPath: string;
}

interface VeilStep {
  step: string;
  title: string;
  body: string;
}

interface VeilPortfolioItem {
  couple: string;
  venue: string;
  note: string;
  image: string;
}

interface VeilPackage {
  name: string;
  range: string;
  detail: string;
}

interface VeilReview {
  quote: string;
  author: string;
  detail: string;
}

interface VeilFaqItem {
  q: string;
  a: string;
}

@Component({
  selector: 'app-protopipe-build-veil-baseline-block',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ProtopipeBuildInlineTextComponent, ProtopipeBuildInlineCtaComponent],
  templateUrl: './build-veil-baseline-block.component.html',
  styleUrl: './build-veil-baseline-block.component.scss',
})
export class ProtopipeBuildVeilBaselineBlockComponent {
  readonly blockId = input.required<string>();
  readonly props = input<Record<string, unknown>>({});
  readonly editable = input(true);

  readonly propPathChange = output<{ path: string; value: unknown }>();
  readonly imageEdit = output<BuildVeilImageEditRequest>();

  readonly steps = computed((): VeilStep[] => {
    const raw = this.props()['steps'];
    return Array.isArray(raw) ? (raw as VeilStep[]) : [];
  });

  readonly items = computed((): VeilPortfolioItem[] => {
    const raw = this.props()['items'];
    return Array.isArray(raw) ? (raw as VeilPortfolioItem[]) : [];
  });

  readonly packages = computed((): VeilPackage[] => {
    const raw = this.props()['packages'];
    return Array.isArray(raw) ? (raw as VeilPackage[]) : [];
  });

  readonly reviews = computed((): VeilReview[] => {
    const raw = this.props()['reviews'];
    return Array.isArray(raw) ? (raw as VeilReview[]) : [];
  });

  readonly faqItems = computed((): VeilFaqItem[] => {
    const raw = this.props()['items'];
    if (this.blockId() !== 'veil-baseline-fold-faq') return [];
    return Array.isArray(raw) ? (raw as VeilFaqItem[]) : [];
  });

  str(key: string, fallback = ''): string {
    const value = this.props()[key];
    return typeof value === 'string' ? value : fallback;
  }

  patch(key: string, value: string): void {
    this.propPathChange.emit({ path: key, value });
  }

  patchStep(index: number, field: keyof VeilStep, value: string): void {
    this.propPathChange.emit({ path: `steps.${index}.${field}`, value });
  }

  patchPortfolio(index: number, field: keyof VeilPortfolioItem, value: string): void {
    this.propPathChange.emit({ path: `items.${index}.${field}`, value });
  }

  patchPackage(index: number, field: keyof VeilPackage, value: string): void {
    this.propPathChange.emit({ path: `packages.${index}.${field}`, value });
  }

  patchReview(index: number, field: keyof VeilReview, value: string): void {
    this.propPathChange.emit({ path: `reviews.${index}.${field}`, value });
  }

  patchFaq(index: number, field: keyof VeilFaqItem, value: string): void {
    this.propPathChange.emit({ path: `items.${index}.${field}`, value });
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
