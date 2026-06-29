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
import { WILCO_SITE_CHROME } from './wilco-site-chrome.constants';

export interface BuildWilcoImageEditRequest {
  propPath: string;
}

interface WilcoPartner {
  name: string;
  href?: string;
  logoSrc?: string;
  logoAlt?: string;
}

interface WilcoService {
  heading: string;
  body: string;
  imageSrc: string;
  imageAlt?: string;
  href?: string;
}

interface WilcoTestimonial {
  quote: string;
  name: string;
  role?: string;
}

interface WilcoFaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-protopipe-build-wilco-baseline-block',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ProtopipeBuildInlineTextComponent, ProtopipeBuildInlineCtaComponent],
  templateUrl: './build-wilco-baseline-block.component.html',
  styleUrl: './build-wilco-baseline-block.component.scss',
})
export class ProtopipeBuildWilcoBaselineBlockComponent {
  readonly blockId = input.required<string>();
  readonly props = input<Record<string, unknown>>({});
  readonly editable = input(true);

  readonly propPathChange = output<{ path: string; value: unknown }>();
  readonly imageEdit = output<BuildWilcoImageEditRequest>();

  readonly chrome = WILCO_SITE_CHROME;
  readonly stats = computed(() => readStatPairs(this.props()));
  readonly partners = computed((): WilcoPartner[] => {
    const raw = this.props()['partners'];
    return Array.isArray(raw) ? (raw as WilcoPartner[]) : [];
  });
  readonly keywords = computed((): string[] => {
    const raw = this.props()['keywords'];
    return Array.isArray(raw) ? raw.map(String) : [];
  });
  readonly services = computed((): WilcoService[] => {
    const raw = this.props()['services'];
    return Array.isArray(raw) ? (raw as WilcoService[]) : [];
  });
  readonly paragraphs = computed((): string[] => {
    const raw = this.props()['paragraphs'];
    return Array.isArray(raw) ? raw.map(String) : [];
  });
  readonly testimonials = computed((): WilcoTestimonial[] => {
    const raw = this.props()['testimonials'];
    return Array.isArray(raw) ? (raw as WilcoTestimonial[]) : [];
  });
  readonly faqItems = computed((): WilcoFaqItem[] => {
    const raw = this.props()['items'];
    return Array.isArray(raw) ? (raw as WilcoFaqItem[]) : [];
  });

  isProjectSplitBlock(): boolean {
    return this.blockId().startsWith('wilco-baseline-project-');
  }

  heroPositionClass(): string {
    return this.str('imagePosition', 'left') === 'left'
      ? 'consult-hero-split--image-left'
      : 'consult-hero-split--image-right';
  }

  projectPositionClass(): string {
    return this.str('imagePosition', 'right') === 'left'
      ? 'consult-service-split--image-left'
      : 'consult-service-split--image-right';
  }

  str(key: string, fallback = ''): string {
    const value = this.props()[key];
    return typeof value === 'string' ? value : fallback;
  }

  patch(key: string, value: string): void {
    this.propPathChange.emit({ path: key, value });
  }

  patchStat(index: number, field: 'value' | 'label', value: string): void {
    this.propPathChange.emit({ path: `stats.${index}.${field}`, value });
  }

  patchKeyword(index: number, value: string): void {
    this.propPathChange.emit({ path: `keywords.${index}`, value });
  }

  patchService(index: number, field: keyof WilcoService, value: string): void {
    this.propPathChange.emit({ path: `services.${index}.${field}`, value });
  }

  patchParagraph(index: number, value: string): void {
    this.propPathChange.emit({ path: `paragraphs.${index}`, value });
  }

  patchTestimonial(index: number, field: keyof WilcoTestimonial, value: string): void {
    this.propPathChange.emit({ path: `testimonials.${index}.${field}`, value });
  }

  patchFaq(index: number, field: keyof WilcoFaqItem, value: string): void {
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
