import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  MediaStudioGeneratedImage,
  MediaStudioImageSize,
  MediaStudioKind,
} from '@hive/contracts';
import { ProtopipeMediaStudioService } from '../../protopipe-media-studio.service';
import { ProtopipeBuildHeroPreviewComponent } from '../build-hero-preview/protopipe-build-hero-preview.component';
import {
  DEFAULT_HERO_PREVIEW_COPY,
  type BuildHeroPreviewCopy,
} from '../build-hero-preview.types';
import { BUILD_DEMO_HERO_VARIANTS } from '../build-book-demo.catalog';
import type { BuildBookDemoBrand } from '../build-book.types';

@Component({
  selector: 'app-protopipe-build-image-studio-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ProtopipeBuildHeroPreviewComponent],
  templateUrl: './protopipe-build-image-studio-dialog.component.html',
  styleUrl: './protopipe-build-image-studio-dialog.component.scss',
})
export class ProtopipeBuildImageStudioDialogComponent implements OnInit {
  readonly studio = inject(ProtopipeMediaStudioService);

  readonly open = input(false);
  readonly heroLayout = input('sp-callout');
  readonly heroBrand = input<BuildBookDemoBrand>('sparky');
  readonly heroLabel = input('');
  readonly siteUrl = input('');
  readonly copy = input<BuildHeroPreviewCopy>(DEFAULT_HERO_PREVIEW_COPY);
  readonly selectedImageUrl = input<string | null>(null);

  readonly closed = output<void>();
  readonly copyChange = output<BuildHeroPreviewCopy>();
  readonly imageSelected = output<string>();
  readonly previewLayoutChange = output<string>();
  readonly previewBrandChange = output<BuildBookDemoBrand>();

  readonly imgPrompt = signal('');
  readonly imgModel = signal('');
  readonly imgNumImages = signal(2);
  readonly galleryImages = signal<MediaStudioGeneratedImage[]>([]);
  readonly previewImageUrl = signal<string | null>(null);
  readonly previewHeroIdx = signal(0);
  readonly localCopy = signal<BuildHeroPreviewCopy>(DEFAULT_HERO_PREVIEW_COPY);

  readonly photoModelChoices = computed(() => {
    const cfg = this.studio.config();
    if (!cfg) return [];
    return cfg.models.filter((m) => m.kinds.includes('photo' as MediaStudioKind));
  });

  readonly photoKindMeta = computed(() =>
    this.studio.config()?.kinds.find((k) => k.kind === 'photo'),
  );

  readonly canGenerate = computed(
    () =>
      this.imgPrompt().trim().length > 0 &&
      this.imgModel().length > 0 &&
      !this.studio.generating(),
  );

  readonly previewBrand = computed(() => this.heroBrand());

  readonly brandHeroes = computed(() =>
    BUILD_DEMO_HERO_VARIANTS.filter((h) => h.brand === this.previewBrand()),
  );

  readonly currentHero = computed(() => {
    const heroes = this.brandHeroes();
    const idx = Math.min(this.previewHeroIdx(), Math.max(heroes.length - 1, 0));
    return heroes[Math.max(idx, 0)] ?? heroes[0];
  });

  readonly activePreviewUrl = computed(
    () => this.previewImageUrl() ?? this.selectedImageUrl() ?? '',
  );

  constructor() {
    effect(() => {
      if (this.open()) {
        this.localCopy.set({ ...this.copy() });
        const idx = BUILD_DEMO_HERO_VARIANTS.findIndex((h) => h.id === this.heroLayout());
        if (idx >= 0) this.previewHeroIdx.set(idx);
      }
    });
  }

  ngOnInit(): void {
    void this.studio.loadConfig().then(() => {
      const meta = this.photoKindMeta();
      const choices = this.photoModelChoices();
      if (meta && choices.length) {
        const preferred = choices.find((c) => c.id === meta.defaultModel) ?? choices[0];
        this.imgModel.set(preferred.id);
      }
    });
  }

  close(): void {
    this.closed.emit();
  }

  patchCopy(field: keyof BuildHeroPreviewCopy, value: string): void {
    this.localCopy.update((c) => {
      const next = { ...c, [field]: value };
      this.copyChange.emit(next);
      return next;
    });
  }

  async generateSiteImages(): Promise<void> {
    const meta = this.photoKindMeta();
    if (!meta || !this.imgPrompt().trim() || !this.imgModel()) return;
    const result = await this.studio.generate({
      kind: 'photo' as MediaStudioKind,
      model: this.imgModel(),
      prompt: this.imgPrompt().trim(),
      imageSize: meta.defaultImageSize as MediaStudioImageSize,
      numImages: Math.min(Math.max(this.imgNumImages(), 1), meta.maxVariants),
    });
    if (result?.images?.length) {
      this.galleryImages.update((prev) => [...result.images, ...prev]);
      if (!this.previewImageUrl()) {
        this.previewImageUrl.set(result.images[0]?.url ?? null);
      }
    }
  }

  adjustNumImages(delta: number): void {
    const max = this.photoKindMeta()?.maxVariants ?? 4;
    this.imgNumImages.update((n) => Math.min(Math.max(n + delta, 1), max));
  }

  openImagePreview(url: string, event: Event): void {
    event.stopPropagation();
    this.previewImageUrl.set(url);
    const idx = this.brandHeroes().findIndex((h) => h.id === this.heroLayout());
    this.previewHeroIdx.set(idx >= 0 ? idx : 0);
  }

  selectImage(url: string): void {
    this.imageSelected.emit(url);
    this.close();
  }

  onPreviewBrandChange(brand: BuildBookDemoBrand): void {
    this.previewBrandChange.emit(brand);
    this.previewHeroIdx.set(0);
  }

  onPreviewHeroIndexChange(index: number): void {
    this.previewHeroIdx.set(index);
    const hero = this.brandHeroes()[index];
    if (hero) this.previewLayoutChange.emit(hero.id);
  }

  onPrevHero(): void {
    const len = this.brandHeroes().length;
    if (!len) return;
    const next = (this.previewHeroIdx() - 1 + len) % len;
    this.onPreviewHeroIndexChange(next);
  }

  onNextHero(): void {
    const len = this.brandHeroes().length;
    if (!len) return;
    const next = (this.previewHeroIdx() + 1) % len;
    this.onPreviewHeroIndexChange(next);
  }
}
