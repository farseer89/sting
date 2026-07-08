import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
} from '@angular/core';
import { ProtopipeBuildInlineTextComponent } from '../../inline/build-inline-text.component';
import { HIL_ASSETS } from './build-book-hil-content.constants';

export interface BuildHilImageEditRequest {
  propPath: string;
}

interface HilService {
  title: string;
  body: string;
  priceFrom?: string;
  image: string;
  alt?: string;
}

interface HilGalleryImage {
  src: string;
  alt: string;
  label?: string;
}

interface HilBeforeAfterSide {
  image: string;
  alt: string;
  label: string;
  headline: string;
  detail: string;
}

interface HilFaqItem {
  q: string;
  a: string;
}

@Component({
  selector: 'app-protopipe-build-hil-baseline-block',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ProtopipeBuildInlineTextComponent],
  templateUrl: './build-hil-baseline-block.component.html',
  styleUrl: './build-hil-baseline-block.component.scss',
})
export class ProtopipeBuildHilBaselineBlockComponent {
  readonly blockId = input.required<string>();
  readonly props = input<Record<string, unknown>>({});
  readonly editable = input(true);

  readonly propPathChange = output<{ path: string; value: unknown }>();
  readonly imageEdit = output<BuildHilImageEditRequest>();

  readonly logoSrc = HIL_ASSETS.logoHorizontal;

  readonly services = computed((): HilService[] => {
    const raw = this.props()['services'];
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      const record = item as Record<string, unknown>;
      return {
        title: String(record['title'] ?? ''),
        body: String(record['body'] ?? ''),
        priceFrom: typeof record['priceFrom'] === 'string' ? record['priceFrom'] : undefined,
        image: String(record['image'] ?? ''),
        alt: typeof record['alt'] === 'string' ? record['alt'] : undefined,
      };
    });
  });

  readonly galleryImages = computed((): HilGalleryImage[] => {
    const raw = this.props()['images'];
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      const record = item as Record<string, unknown>;
      return {
        src: String(record['src'] ?? ''),
        alt: String(record['alt'] ?? ''),
        label: typeof record['label'] === 'string' ? record['label'] : undefined,
      };
    });
  });

  readonly beforeSide = computed((): HilBeforeAfterSide | null => {
    return readBeforeAfterSide(this.props()['before']);
  });

  readonly afterSide = computed((): HilBeforeAfterSide | null => {
    return readBeforeAfterSide(this.props()['after']);
  });

  readonly faqItems = computed((): HilFaqItem[] => {
    const raw = this.props()['items'];
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      const record = item as Record<string, unknown>;
      return { q: String(record['q'] ?? ''), a: String(record['a'] ?? '') };
    });
  });

  str(key: string, fallback = ''): string {
    const value = this.props()[key];
    return typeof value === 'string' ? value : fallback;
  }

  patch(key: string, value: string): void {
    this.propPathChange.emit({ path: key, value });
  }

  onPhotoEdit(event: MouseEvent, propPath: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.imageEdit.emit({ propPath });
  }
}

function readBeforeAfterSide(raw: unknown): HilBeforeAfterSide | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  return {
    image: String(record['image'] ?? ''),
    alt: String(record['alt'] ?? ''),
    label: String(record['label'] ?? ''),
    headline: String(record['headline'] ?? ''),
    detail: String(record['detail'] ?? ''),
  };
}
