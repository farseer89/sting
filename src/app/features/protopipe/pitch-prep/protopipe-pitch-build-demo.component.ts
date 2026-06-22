import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  BrandBookImageStylePresetId,
  MediaStudioGeneratedImage,
  MediaStudioKind,
  MediaStudioImageSize,
  PitchMediaSlot,
} from '@hive/contracts';
import {
  BRAND_BOOK_IMAGE_PRESETS,
  BRAND_BOOK_INFOGRAPH_VARIANTS,
} from '../brand-book/brand-book.constants';
import { ProtopipeBrandBookService } from '../brand-book/protopipe-brand-book.service';
import { ProtopipeSiteBuilderService } from '../site-builder/protopipe-site-builder.service';
import { ProtopipeMediaStudioService } from '../protopipe-media-studio.service';
import { ProtopipePitchPrepService } from './protopipe-pitch-prep.service';
import { ProtopipePitchProspectService } from './protopipe-pitch-prospect.service';
import type { PitchLead } from './protopipe-pitch-prospect-board.component';
import {
  BUILD_DEMO_HERO_VARIANTS,
  type BuildDemoHeroVariant,
} from '../build-book/build-book-demo.catalog';

export type { BuildDemoHeroVariant as HeroVariant };

export type BuildDemoStep = 'url' | 'images' | 'theme' | 'logo' | 'style';

const STEP_ORDER: BuildDemoStep[] = ['url', 'images', 'theme', 'logo', 'style'];

const THEME_OPTIONS: { label: string; value: string; swatch: string; bg: string }[] = [
  { label: 'Ocean', value: 'ocean', swatch: '#0369a1', bg: '#e0f2fe' },
  { label: 'Classic gold', value: 'classic-gold', swatch: '#92400e', bg: '#fef3c7' },
  { label: 'Slate rose', value: 'slate-rose', swatch: '#9f1239', bg: '#fce7f3' },
  { label: 'Ink cream', value: 'ink-cream', swatch: '#1c1917', bg: '#fafaf9' },
  { label: 'Construction bold', value: 'construction-bold', swatch: '#b45309', bg: '#fffbeb' },
  { label: 'Tech agency dark', value: 'tech-agency-dark', swatch: '#1e1b4b', bg: '#e0e7ff' },
];

@Component({
  selector: 'app-protopipe-pitch-build-demo',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-pitch-build-demo.component.html',
  styleUrl: './protopipe-pitch-build-demo.component.scss',
})
export class ProtopipePitchBuildDemoComponent implements OnInit {
  private readonly prospectSvc = inject(ProtopipePitchProspectService);
  private readonly brandBookSvc = inject(ProtopipeBrandBookService);

  readonly pitchPrep = inject(ProtopipePitchPrepService);
  readonly siteBuilder = inject(ProtopipeSiteBuilderService);
  readonly studio = inject(ProtopipeMediaStudioService);

  readonly lead = input<PitchLead | null>(null);
  readonly back = output<void>();
  readonly done = output<void>();

  readonly imagePresets = BRAND_BOOK_IMAGE_PRESETS;
  readonly infographVariants = BRAND_BOOK_INFOGRAPH_VARIANTS;
  readonly themeOptions = THEME_OPTIONS;
  readonly stepOrder = STEP_ORDER;

  // ── Step state
  readonly activeStep = signal<BuildDemoStep>('url');
  readonly completedSteps = signal<Set<BuildDemoStep>>(new Set());

  // ── Step 1: URL
  readonly siteUrl = signal('');
  readonly ingesting = signal(false);
  readonly ingestError = signal<string | null>(null);
  readonly siteId = signal<string | null>(null);

  // ── Step 2: Images — media studio style
  readonly imgPrompt = signal('');
  readonly imgModel = signal('');
  readonly imgNumImages = signal(2);
  readonly galleryImages = signal<MediaStudioGeneratedImage[]>([]);
  readonly selectedUrls = signal<string[]>([]);
  readonly previewImageUrl = signal<string | null>(null);

  // ── Hero carousel
  readonly previewBrand = signal<'sparky' | 'wri' | 'consult'>('sparky');
  readonly previewHeroIdx = signal(0);

  readonly currentBrandHeroes = computed(() =>
    BUILD_DEMO_HERO_VARIANTS.filter((h) => h.brand === this.previewBrand())
  );

  readonly currentHero = computed(() => {
    const heroes = this.currentBrandHeroes();
    const idx = Math.min(this.previewHeroIdx(), heroes.length - 1);
    return heroes[Math.max(idx, 0)] ?? heroes[0];
  });

  readonly photoModelChoices = computed(() => {
    const cfg = this.studio.config();
    if (!cfg) return [];
    return cfg.models.filter((m) => m.kinds.includes('photo' as MediaStudioKind));
  });

  readonly photoKindMeta = computed(() =>
    this.studio.config()?.kinds.find((k) => k.kind === 'photo')
  );

  readonly canGenerate = computed(() =>
    this.imgPrompt().trim().length > 0 &&
    this.imgModel().length > 0 &&
    !this.studio.generating()
  );

  // ── Step 3: Theme
  readonly selectedTemplate = signal('starter-minimal-v1');
  readonly selectedTheme = signal('classic-gold');

  // ── Step 4: Logo
  readonly logoUrl = signal<string | null>(null);
  readonly logoUploading = signal(false);

  // ── Step 5: Photo style — brand book
  readonly selectedPresetId = signal<BrandBookImageStylePresetId>('industrial-clean');

  // ── Derived

  readonly stepIndex = computed(() => STEP_ORDER.indexOf(this.activeStep()));

  stepLabel(step: BuildDemoStep): string {
    return {
      url: 'Website',
      images: 'Hero images',
      theme: 'Site theme',
      logo: 'Logo',
      style: 'Photo style',
    }[step];
  }

  stepNum(step: BuildDemoStep): string {
    return String(STEP_ORDER.indexOf(step) + 1).padStart(2, '0');
  }

  isComplete(step: BuildDemoStep): boolean {
    return this.completedSteps().has(step);
  }

  isCurrent(step: BuildDemoStep): boolean {
    return this.activeStep() === step;
  }

  isPending(step: BuildDemoStep): boolean {
    return !this.isComplete(step) && !this.isCurrent(step);
  }

  goToStep(step: BuildDemoStep): void {
    if (this.isComplete(step) || this.isCurrent(step)) {
      this.activeStep.set(step);
    }
  }

  ngOnInit(): void {
    const lead = this.lead();
    if (lead) {
      const hasUrl = lead.website === 'good' || lead.website === 'fair';
      this.siteUrl.set(hasUrl ? `https://www.${lead.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com` : '');
      this.imgPrompt.set(`Professional ${lead.category.toLowerCase()} business in ${lead.area}. Clean, trustworthy, local service hero photography.`);
    }
    void this.siteBuilder.ensureTemplatesLoaded();
    void this.studio.loadConfig().then(() => {
      const meta = this.photoKindMeta();
      const choices = this.photoModelChoices();
      if (meta && choices.length) {
        const preferred = choices.find((c) => c.id === meta.defaultModel) ?? choices[0];
        this.imgModel.set(preferred.id);
      }
    });
  }

  // ── Step 1: URL

  async runIngest(): Promise<void> {
    const url = this.siteUrl().trim();
    if (!url) return;
    const lead = this.lead();
    if (!lead) return;

    this.ingesting.set(true);
    this.ingestError.set(null);

    try {
      // Create a prospect from this lead then ingest
      const prospect = await this.prospectSvc.create({ name: lead.name, sourceUrl: url });
      if (!prospect) {
        this.ingestError.set('Could not create prospect from lead');
        return;
      }
      this.siteId.set(prospect.siteId);
      await this.brandBookSvc.loadForSite(prospect.siteId);
      const context = await this.pitchPrep.ingest(prospect.siteId, url);
      if (context) {
        this.markComplete('url');
        this.activeStep.set('images');
      }
    } catch {
      this.ingestError.set('Scrape failed — check the URL and try again');
    } finally {
      this.ingesting.set(false);
    }
  }

  skipIngest(): void {
    this.markComplete('url');
    this.activeStep.set('images');
  }

  // ── Step 2: Images

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
    }
  }

  openPreview(url: string, event: Event): void {
    event.stopPropagation();
    this.previewImageUrl.set(url);
    this.previewBrand.set('sparky');
    this.previewHeroIdx.set(0);
  }

  closePreview(): void {
    this.previewImageUrl.set(null);
  }

  selectBrand(brand: 'sparky' | 'wri' | 'consult'): void {
    this.previewBrand.set(brand);
    this.previewHeroIdx.set(0);
  }

  nextHero(): void {
    const len = this.currentBrandHeroes().length;
    this.previewHeroIdx.update((i) => (i + 1) % len);
  }

  prevHero(): void {
    const len = this.currentBrandHeroes().length;
    this.previewHeroIdx.update((i) => (i - 1 + len) % len);
  }

  toggleImage(url: string): void {
    this.selectedUrls.update((prev) => {
      if (prev.includes(url)) return prev.filter((u) => u !== url);
      return [...prev, url];
    });
  }

  isSelected(url: string): boolean {
    return this.selectedUrls().includes(url);
  }

  imageSlotLabel(url: string): string {
    const idx = this.selectedUrls().indexOf(url);
    if (idx === 0) return 'Hero';
    if (idx === 1) return 'Alternate';
    if (idx === 2) return 'Section';
    return `+${idx + 1}`;
  }

  adjustNumImages(delta: number): void {
    const meta = this.photoKindMeta();
    const max = meta?.maxVariants ?? 4;
    this.imgNumImages.update((n) => Math.min(Math.max(n + delta, 1), max));
  }

  continueFromImages(): void {
    this.markComplete('images');
    this.activeStep.set('theme');
  }

  // ── Step 3: Theme

  continueFromTheme(): void {
    this.markComplete('theme');
    this.activeStep.set('logo');
  }

  // ── Step 4: Logo

  onLogoFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.logoUploading.set(true);
    const reader = new FileReader();
    reader.onload = () => {
      this.logoUrl.set(reader.result as string);
      this.logoUploading.set(false);
    };
    reader.readAsDataURL(file);
  }

  continueFromLogo(): void {
    this.markComplete('logo');
    this.activeStep.set('style');
  }

  // ── Step 5: Photo style

  selectPreset(id: BrandBookImageStylePresetId): void {
    this.selectedPresetId.set(id);
    this.brandBookSvc.patchImagePreset(id);
  }

  async finish(): Promise<void> {
    this.markComplete('style');
    const siteId = this.siteId();
    if (siteId) {
      await this.brandBookSvc.save();
    }
    this.done.emit();
  }

  // ── Helpers

  private markComplete(step: BuildDemoStep): void {
    this.completedSteps.update((s) => new Set([...s, step]));
  }
}
