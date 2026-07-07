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
import type { MediaStudioImageSize, MediaStudioKind } from '@hive/contracts';
import { ProtopipeMediaStudioService } from '../../protopipe-media-studio.service';
import { ProtopipeBuildHeroPreviewComponent } from '../build-hero-preview/protopipe-build-hero-preview.component';
import {
  DEFAULT_HERO_PREVIEW_COPY,
  type BuildHeroPreviewCopy,
} from '../build-hero-preview.types';
import { BUILD_DEMO_HERO_VARIANTS } from '../build-book-demo.catalog';
import type { BuildBookDemoBrand } from '../build-book.types';

type SiteInfoTab = 'images' | 'basic' | 'seo';

@Component({
  selector: 'app-protopipe-build-site-images-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ProtopipeBuildHeroPreviewComponent],
  templateUrl: './protopipe-build-site-images-panel.component.html',
  styleUrl: './protopipe-build-site-images-panel.component.scss',
})
export class ProtopipeBuildSiteImagesPanelComponent implements OnInit {
  readonly studio = inject(ProtopipeMediaStudioService);

  readonly heroLayout = input('sp-callout');
  readonly heroBrand = input<BuildBookDemoBrand>('sparky');
  readonly heroLabel = input('');
  readonly siteUrl = input('');
  readonly copy = input<BuildHeroPreviewCopy>(DEFAULT_HERO_PREVIEW_COPY);
  readonly selectedImageUrl = input<string | null>(null);
  readonly canUseHeroImage = input(false);

  readonly copyChange = output<BuildHeroPreviewCopy>();
  readonly imageSelected = output<string>();
  readonly previewLayoutChange = output<string>();
  readonly previewBrandChange = output<BuildBookDemoBrand>();

  readonly imgPrompt = signal('');
  readonly imgModel = signal('');
  readonly imgNumImages = signal(2);
  readonly previewImageUrl = signal<string | null>(null);
  readonly previewHeroIdx = signal(0);
  readonly localCopy = signal<BuildHeroPreviewCopy>(DEFAULT_HERO_PREVIEW_COPY);
  readonly activeTab = signal<SiteInfoTab>('images');
  readonly deletingAssetId = signal<string | null>(null);

  readonly tabs: { id: SiteInfoTab; label: string }[] = [
    { id: 'images', label: 'Images' },
    { id: 'basic', label: 'Basic Site Info' },
    { id: 'seo', label: 'SEO Plan' },
  ];

  readonly siteImageAssets = computed(() => this.studio.assets());

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
    () => this.previewImageUrl() ?? this.selectedImageUrl() ?? this.siteImageAssets()[0]?.url ?? '',
  );

  readonly previewLayout = computed(() => this.heroLayout());

  readonly previewHeroLabel = computed(() => {
    const hero = BUILD_DEMO_HERO_VARIANTS.find((h) => h.id === this.heroLayout());
    return hero?.label ?? this.currentHero()?.label ?? this.heroLabel();
  });

  readonly previewSiteUrl = computed(() => {
    const hero = BUILD_DEMO_HERO_VARIANTS.find((h) => h.id === this.heroLayout());
    return hero?.url ?? this.currentHero()?.url ?? this.siteUrl();
  });

  constructor() {
    effect(() => {
      this.localCopy.set({ ...this.copy() });
      const layoutId = this.heroLayout();
      const heroes = this.brandHeroes();
      const idx = heroes.findIndex((h) => h.id === layoutId);
      if (idx >= 0) this.previewHeroIdx.set(idx);
    });
  }

  ngOnInit(): void {
    void this.studio.loadConfig().then(() => {
      const meta = this.photoKindMeta();
      const choices = this.photoModelChoices();
      if (meta && choices.length && !this.imgModel()) {
        const preferred = choices.find((c) => c.id === meta.defaultModel) ?? choices[0];
        this.imgModel.set(preferred.id);
      }
    });
    void this.studio.loadAssets();
  }

  patchCopy(field: keyof BuildHeroPreviewCopy, value: string): void {
    this.localCopy.update((c) => {
      const next = { ...c, [field]: value };
      this.copyChange.emit(next);
      return next;
    });
  }

  selectTab(tab: SiteInfoTab): void {
    this.activeTab.set(tab);
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

    if (!result) return;
    const generatedAssetUrl =
      'assets' in result && Array.isArray(result.assets) ? result.assets[0]?.url : null;
    const generatedImageUrl = result.images[0]?.url ?? null;
    const nextPreviewUrl = generatedAssetUrl ?? generatedImageUrl;
    if (nextPreviewUrl) this.previewImageUrl.set(nextPreviewUrl);
  }

  adjustNumImages(delta: number): void {
    const max = this.photoKindMeta()?.maxVariants ?? 4;
    this.imgNumImages.update((n) => Math.min(Math.max(n + delta, 1), max));
  }

  async onSiteImageUpload(event: Event): Promise<void> {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    if (!file) return;
    const asset = await this.studio.upload(file);
    if (asset) this.previewImageUrl.set(asset.url);
    inputEl.value = '';
  }

  previewImage(url: string): void {
    this.previewImageUrl.set(url);
  }

  selectImage(url: string): void {
    if (!this.canUseHeroImage()) return;
    this.imageSelected.emit(url);
  }

  async deleteSiteImage(assetId: string, imageUrl: string): Promise<void> {
    const confirmed = window.confirm('Delete this image from the site image library?');
    if (!confirmed) return;

    this.deletingAssetId.set(assetId);
    const deleted = await this.studio.deleteAsset(assetId);
    if (deleted && this.previewImageUrl() === imageUrl) {
      this.previewImageUrl.set(null);
    }
    this.deletingAssetId.set(null);
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
}
