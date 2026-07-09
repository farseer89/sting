import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
} from '@angular/core';
import {
  blogFixtureFeatured,
  blogFixturePosts,
  type BuildBookBlogFixturePost,
} from '../../build-book-blog-fixtures';
import { readStatPairs } from '../../fields/build-field.util';
import { ProtopipeBuildInlineCtaComponent } from '../../inline/build-inline-cta.component';
import { ProtopipeBuildInlineTextComponent } from '../../inline/build-inline-text.component';

export interface BuildUniversalImageEditRequest {
  propPath: string;
}

interface UniversalProcessStep {
  step: string;
  title: string;
  body: string;
  image?: string;
  imageAlt?: string;
}

interface UniversalFaqItem {
  q: string;
  a: string;
}

interface UniversalTestimonial {
  quote: string;
  name: string;
  role?: string;
}

interface UniversalService {
  title: string;
  body: string;
  image: string;
  imageAlt?: string;
  href?: string;
}

interface UniversalGalleryItem {
  image: string;
  caption: string;
  imageAlt?: string;
}

interface UniversalLogo {
  name: string;
  image: string;
  alt?: string;
}

interface UniversalBeforeAfterPanel {
  image: string;
  alt: string;
  label: string;
  headline?: string;
  detail?: string;
}

@Component({
  selector: 'app-protopipe-build-universal-baseline-block',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ProtopipeBuildInlineTextComponent, ProtopipeBuildInlineCtaComponent],
  templateUrl: './build-universal-baseline-block.component.html',
  styleUrl: './build-universal-baseline-block.component.scss',
})
export class ProtopipeBuildUniversalBaselineBlockComponent {
  readonly blockId = input.required<string>();
  readonly props = input<Record<string, unknown>>({});
  readonly editable = input(true);

  readonly propPathChange = output<{ path: string; value: unknown }>();
  readonly imageEdit = output<BuildUniversalImageEditRequest>();

  readonly steps = computed((): UniversalProcessStep[] => {
    const raw = this.props()['steps'];
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      const record = item as Record<string, unknown>;
      return {
        step: String(record['step'] ?? ''),
        title: String(record['title'] ?? ''),
        body: String(record['body'] ?? ''),
        image: typeof record['image'] === 'string' ? record['image'] : undefined,
        imageAlt: typeof record['imageAlt'] === 'string' ? record['imageAlt'] : undefined,
      };
    });
  });

  readonly stats = computed(() => readStatPairs(this.props()));

  readonly faqItems = computed((): UniversalFaqItem[] => {
    const raw = this.props()['items'];
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      const record = item as Record<string, unknown>;
      return {
        q: String(record['q'] ?? ''),
        a: String(record['a'] ?? ''),
      };
    });
  });

  readonly testimonials = computed((): UniversalTestimonial[] => {
    const raw = this.props()['testimonials'];
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      const record = item as Record<string, unknown>;
      return {
        quote: String(record['quote'] ?? ''),
        name: String(record['name'] ?? ''),
        role: typeof record['role'] === 'string' ? record['role'] : undefined,
      };
    });
  });

  readonly featuredTestimonial = computed((): UniversalTestimonial | null => {
    const items = this.testimonials();
    return items[0] ?? null;
  });

  readonly services = computed((): UniversalService[] => {
    const raw = this.props()['services'];
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      const record = item as Record<string, unknown>;
      return {
        title: String(record['title'] ?? ''),
        body: String(record['body'] ?? ''),
        image: String(record['image'] ?? ''),
        imageAlt: typeof record['imageAlt'] === 'string' ? record['imageAlt'] : undefined,
        href: typeof record['href'] === 'string' ? record['href'] : undefined,
      };
    });
  });

  readonly gallery = computed((): UniversalGalleryItem[] => {
    const raw = this.props()['gallery'];
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      const record = item as Record<string, unknown>;
      return {
        image: String(record['image'] ?? ''),
        caption: String(record['caption'] ?? ''),
        imageAlt: typeof record['imageAlt'] === 'string' ? record['imageAlt'] : undefined,
      };
    });
  });

  readonly logos = computed((): UniversalLogo[] => {
    const raw = this.props()['logos'];
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      const record = item as Record<string, unknown>;
      return {
        name: String(record['name'] ?? ''),
        image: String(record['image'] ?? ''),
        alt: typeof record['alt'] === 'string' ? record['alt'] : undefined,
      };
    });
  });

  readonly caseMetrics = computed(() => readStatPairs(this.props(), 'metrics'));

  readonly beforePanel = computed((): UniversalBeforeAfterPanel | null => {
    return this.readBeforeAfterPanel('before');
  });

  readonly afterPanel = computed((): UniversalBeforeAfterPanel | null => {
    return this.readBeforeAfterPanel('after');
  });

  readonly blogTopics = computed((): string[] => {
    const raw = this.props()['topics'];
    if (!Array.isArray(raw)) return ['All', 'Process', 'Field notes', 'Standards'];
    return raw.map((item) => String(item));
  });

  readonly featuredPost = computed((): BuildBookBlogFixturePost => {
    const rule = this.str('featuredRule', 'latest') === 'pinned' ? 'pinned' : 'latest';
    const pinnedId = this.str('pinnedPostId');
    return blogFixtureFeatured(rule, pinnedId || undefined);
  });

  readonly magazineLead = computed((): BuildBookBlogFixturePost => blogFixturePosts(1)[0]);

  readonly magazineStack = computed((): BuildBookBlogFixturePost[] => {
    const count = Number(this.props()['stackCount'] ?? 4);
    return blogFixturePosts(Math.max(1, count) + 1).slice(1);
  });

  readonly gridPosts = computed((): BuildBookBlogFixturePost[] => {
    const limit = Number(this.props()['limit'] ?? 6);
    return blogFixturePosts(Math.max(1, limit));
  });

  str(key: string, fallback = ''): string {
    const value = this.props()[key];
    return typeof value === 'string' ? value : fallback;
  }

  patch(key: string, value: string): void {
    this.propPathChange.emit({ path: key, value });
  }

  patchStep(index: number, field: keyof UniversalProcessStep, value: string): void {
    this.propPathChange.emit({ path: `steps.${index}.${field}`, value });
  }

  patchStat(index: number, field: 'value' | 'label', value: string): void {
    this.propPathChange.emit({ path: `stats.${index}.${field}`, value });
  }

  patchFaq(index: number, field: 'q' | 'a', value: string): void {
    this.propPathChange.emit({ path: `items.${index}.${field}`, value });
  }

  patchTestimonial(index: number, field: keyof UniversalTestimonial, value: string): void {
    this.propPathChange.emit({ path: `testimonials.${index}.${field}`, value });
  }

  patchService(index: number, field: keyof UniversalService, value: string): void {
    this.propPathChange.emit({ path: `services.${index}.${field}`, value });
  }

  patchGallery(index: number, field: keyof UniversalGalleryItem, value: string): void {
    this.propPathChange.emit({ path: `gallery.${index}.${field}`, value });
  }

  patchLogo(index: number, field: keyof UniversalLogo, value: string): void {
    this.propPathChange.emit({ path: `logos.${index}.${field}`, value });
  }

  patchCaseMetric(index: number, field: 'value' | 'label', value: string): void {
    this.propPathChange.emit({ path: `metrics.${index}.${field}`, value });
  }

  patchBeforeAfter(side: 'before' | 'after', field: keyof UniversalBeforeAfterPanel, value: string): void {
    this.propPathChange.emit({ path: `${side}.${field}`, value });
  }

  patchTopic(index: number, value: string): void {
    this.propPathChange.emit({ path: `topics.${index}`, value });
  }

  onPhotoEdit(event: MouseEvent, propPath: string): void {
    event.stopPropagation();
    this.imageEdit.emit({ propPath });
  }

  onLinkClick(event: MouseEvent): void {
    if (this.editable()) event.preventDefault();
  }

  stepImage(step: UniversalProcessStep): string | null {
    return step.image?.trim() ? step.image : null;
  }

  ctaImage(): string | null {
    const src = this.str('imageSrc');
    return src.trim() ? src : null;
  }

  splitImage(): string | null {
    return this.ctaImage();
  }

  caseImage(): string | null {
    return this.ctaImage();
  }

  serviceImage(service: UniversalService): string | null {
    return service.image?.trim() ? service.image : null;
  }

  galleryImage(item: UniversalGalleryItem): string | null {
    return item.image?.trim() ? item.image : null;
  }

  logoImage(logo: UniversalLogo): string | null {
    return logo.image?.trim() ? logo.image : null;
  }

  beforeAfterImage(panel: UniversalBeforeAfterPanel | null): string | null {
    return panel?.image?.trim() ? panel.image : null;
  }

  private readBeforeAfterPanel(key: 'before' | 'after'): UniversalBeforeAfterPanel | null {
    const raw = this.props()[key];
    if (!raw || typeof raw !== 'object') return null;
    const record = raw as Record<string, unknown>;
    return {
      image: String(record['image'] ?? ''),
      alt: String(record['alt'] ?? ''),
      label: String(record['label'] ?? ''),
      headline: typeof record['headline'] === 'string' ? record['headline'] : undefined,
      detail: typeof record['detail'] === 'string' ? record['detail'] : undefined,
    };
  }
}
